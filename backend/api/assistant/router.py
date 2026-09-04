from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from .schemas import ChatRequest, ChatResponse, ResetSessionRequest
from .gemini_service import stream_chat_reply, clear_session
import os
import json
import logging
import asyncio
import websockets

router = APIRouter(prefix="/api/assistant", tags=["assistant"])

from fastapi.responses import StreamingResponse

@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        def stream_generator():
            try:
                for chunk in stream_chat_reply(
                    message=request.message,
                    language=request.language,
                    session_id=request.session_id,
                    context=request.context
                ):
                    yield f"data: {json.dumps({'text': chunk})}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                logging.error(f"Stream generation error: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                yield "data: [DONE]\n\n"

        return StreamingResponse(stream_generator(), media_type="text/event-stream")
    except Exception as e:
        logging.error(f"Chat endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to communicate with AI service: {str(e)}")

@router.post("/session/reset")
async def reset_session(request: ResetSessionRequest):
    clear_session(request.session_id)
    return {"success": True, "message": "Session cleared"}

@router.websocket("/live")
async def gemini_live_proxy(websocket: WebSocket):
    await websocket.accept()
    api_key = os.environ.get("GEMINI_API_KEY")
    
    if not api_key:
        await websocket.send_json({"type": "error", "message": "GEMINI_API_KEY not configured on server"})
        await websocket.close(code=1011)
        return

    gemini_ws_url = f"wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key={api_key}"

    try:
        async with websockets.connect(gemini_ws_url) as gemini_ws:
            async def client_to_gemini():
                try:
                    while True:
                        data = await websocket.receive_text()
                        try:
                            import json
                            payload = json.loads(data)
                            if "setup" in payload and "model" in payload["setup"]:
                                client_model = payload["setup"]["model"]
                                voice_model = os.environ.get("GEMINI_VOICE_MODEL")
                                if voice_model:
                                    if not voice_model.startswith("models/"):
                                        voice_model = f"models/{voice_model}"
                                    payload["setup"]["model"] = voice_model
                                    logging.info(f"Overriding live model from setup to configured GEMINI_VOICE_MODEL: {voice_model}")
                                elif "gemini-2.0-flash" in client_model or "gemini-2.0-flash-exp" in client_model:
                                    fallback_live_model = "models/gemini-2.5-flash-native-audio-latest"
                                    payload["setup"]["model"] = fallback_live_model
                                    logging.info(f"Rewriting obsolete live model {client_model} to working {fallback_live_model}")
                                data = json.dumps(payload)
                        except Exception as pe:
                            logging.error(f"Error parsing client payload in proxy: {pe}")
                        await gemini_ws.send(data)
                except WebSocketDisconnect:
                    logging.info("Client disconnected from Gemini Live proxy")
                except Exception as e:
                    logging.error(f"Error in client_to_gemini: {e}")

            async def gemini_to_client():
                try:
                    async for message in gemini_ws:
                        await websocket.send_text(message)
                except websockets.exceptions.ConnectionClosed:
                    logging.info("Gemini closed the connection")
                except Exception as e:
                    logging.error(f"Error in gemini_to_client: {e}")

            task1 = asyncio.create_task(client_to_gemini())
            task2 = asyncio.create_task(gemini_to_client())
            
            done, pending = await asyncio.wait(
                [task1, task2],
                return_when=asyncio.FIRST_COMPLETED
            )
            
            for task in pending:
                task.cancel()
                
    except websockets.exceptions.InvalidURI:
        logging.error("Invalid Gemini WS URI")
        await websocket.close(code=1011)
    except Exception as e:
        logging.error(f"Failed to connect to Gemini Live: {e}")
        try:
            await websocket.close(code=1011)
        except Exception:
            pass
