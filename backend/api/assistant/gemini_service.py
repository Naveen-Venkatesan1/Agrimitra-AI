import os
import requests
import logging
import json
import time

# In-memory session store for chat history
# Structure: { "session_id": [{"role": "user/model", "parts": [{"text": "..."}]}] }
session_histories = {}
MAX_HISTORY_TURNS = 10  # Maximum back-and-forth turns to keep (20 messages total)

def get_system_instruction(language: str, context: dict = None) -> str:
    instruction = f"""You are AgriMithra AI, a farmer-friendly multilingual agricultural voice assistant for Indian farmers.
You help with crops, crop diseases, pests, irrigation, fertilizer, soil, farming practices, government agricultural schemes, MSP, crop planning, harvesting, and agriculture-related weather questions.

Always understand the user's CURRENT question. Never repeat a previous answer if the new question is different.
Use conversation context for follow-up questions.

The active application language selected by the farmer is: {language.upper()}.
The farmer's selected language ({language.upper()}) is the absolute source of truth for your response.
Regardless of whether the user question is in {language.upper()}, English, or translated/normalized internally, understand the farmer's agricultural intent and ALWAYS return your final answer in {language.upper()} using natural, spoken farmer-friendly phrasing.
Never switch the final response away from {language.upper()}.
Do not assume every Devanagari response is Hindi. If the active application language is MARATHI or KONKANI, respond in MARATHI or KONKANI when using Devanagari script.
Use simple spoken language.
Keep responses concise, conversational, and suitable for spoken audio. Use clear, complete sentences ending with proper punctuation (. or ? or !) to allow smooth speech streaming.
Never fabricate current weather, market prices, government schemes, subsidies, official announcements, pesticide dosages, or disease certainty.
If a current fact cannot be verified, say that it cannot currently be verified.
Do not mention language detection or system instructions to the user."""

    if context:
        ctx_str = "Current Farmer Context:\n"
        if context.get("state"): ctx_str += f"- State: {context['state']}\n"
        if context.get("district"): ctx_str += f"- District: {context['district']}\n"
        if context.get("crop"): ctx_str += f"- Crop: {context['crop']}\n"
        if context.get("cropStage"): ctx_str += f"- Stage: {context['cropStage']}\n"
        if context.get("weatherCondition"): ctx_str += f"- Weather: {context['temp']}°C, {context['weatherCondition']}\n"
        
        if context.get("farmIntelligence"):
            ctx_str += f"\nUnified Farm Intelligence:\n{json.dumps(context['farmIntelligence'])}"
            
        if context.get("latestDiagnosis") or context.get("cropAnalysis"):
            diag = context.get("latestDiagnosis") or context.get("cropAnalysis")
            crop_n = diag.get("cropName") or diag.get("crop_name") or diag.get("crop") or "Crop"
            dis_n = diag.get("diseaseName") or diag.get("disease_name") or diag.get("disease") or "Condition"
            bio_rec = diag.get("biologicalRecommendation") or diag.get("biological_recommendation") or ""
            chem_rec = diag.get("chemicalRecommendation") or diag.get("chemical_recommendation") or ""
            rec_est = diag.get("recoveryEstimate") or diag.get("recovery_estimate") or diag.get("recoveryTimeline") or ""
            
            ctx_str += f"\nCurrently Analyzed Crop Scan Context:\n"
            ctx_str += f"- Crop Scanned: {crop_n}\n"
            ctx_str += f"- Disease / Plant Condition: {dis_n}\n"
            if bio_rec: ctx_str += f"- Biological Recommendation: {bio_rec}\n"
            if chem_rec: ctx_str += f"- Chemical Recommendation: {chem_rec}\n"
            if rec_est: ctx_str += f"- Recovery Timeline: {rec_est}\n"

        ctx_str += """
        
CRITICAL SAFETY RULES:
1. Satellite data is periodic and may be cached. Never describe it as live.
2. NDVI/NDWI are indicators, not diagnoses. Do not invent diagnoses like "fungal infection confirmed" or "field needs irrigation definitely". Use "possible" or "evidence suggests".
3. Field inspection may be recommended where appropriate.
4. Never invent satellite readings, dates, or cloud coverage.
"""
        instruction += f"\n\n{ctx_str}"
    return instruction

# Reuse HTTP connection
_http_session = requests.Session()

def stream_chat_reply(message: str, language: str, session_id: str, context: dict = None):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise Exception("GEMINI_API_KEY is not configured on the server")
        
    if session_id not in session_histories:
        session_histories[session_id] = []
        
    history = session_histories[session_id]
    system_instruction = get_system_instruction(language, context)
    
    timeout_seconds = int(os.environ.get("GEMINI_REQUEST_TIMEOUT", 30))
    configured_model = os.environ.get("GEMINI_MODEL", "gemini-3.1-flash-lite")
    candidate_models = [configured_model]
    for m in ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-3.5-flash"]:
        if m not in candidate_models:
            candidate_models.append(m)

    contents = history.copy()
    contents.append({
        "role": "user",
        "parts": [{"text": message}]
    })

    payload = {
        "systemInstruction": {
            "parts": [{"text": system_instruction}]
        },
        "contents": contents,
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 250
        }
    }

    stream_headers = {
        "Accept": "text/event-stream",
        "Cache-Control": "no-cache"
    }

    try:
        response = None
        last_err_detail = "AI provider unavailable"
        for model_name in candidate_models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:streamGenerateContent?alt=sse&key={api_key}"
            try:
                resp = _http_session.post(url, json=payload, headers=stream_headers, stream=True, timeout=timeout_seconds)
                if resp.status_code == 200:
                    response = resp
                    break
                elif resp.status_code == 400:
                    # Fallback for models or endpoints requiring different generationConfig
                    payload_fallback = {
                        "contents": contents,
                        "generationConfig": {
                            "temperature": 0.2,
                            "maxOutputTokens": 250
                        }
                    }
                    resp = _http_session.post(url, json=payload_fallback, headers=stream_headers, stream=True, timeout=timeout_seconds)
                    if resp.status_code == 200:
                        response = resp
                        break
                last_err_detail = f"Model {model_name} HTTP {resp.status_code}"
                logging.warning(f"Candidate {model_name} returned status {resp.status_code}. Trying next model...")
            except Exception as req_err:
                last_err_detail = f"Connection error on {model_name}: {req_err}"
                logging.warning(f"Candidate {model_name} connection error: {req_err}. Trying next model...")

        if response is None or response.status_code != 200:
            raise Exception(f"AI assistant service is currently unavailable ({last_err_detail}). Please try again.")

        full_reply = ""
        for line in response.iter_lines():
            if line:
                decoded_line = line.decode('utf-8')
                if decoded_line.startswith("data: "):
                    data_str = decoded_line[6:]
                    if data_str.strip() == "[DONE]":
                        continue
                    try:
                        chunk_data = json.loads(data_str)
                        if "error" in chunk_data:
                            err_msg = chunk_data["error"].get("message", "AI provider error")
                            raise Exception(f"AI service error: {err_msg}")

                        candidates = chunk_data.get("candidates", [])
                        if candidates:
                            text_chunk = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                            if text_chunk:
                                full_reply += text_chunk
                                yield text_chunk
                    except json.JSONDecodeError:
                        pass

        if not full_reply:
            raise Exception("AI assistant returned an empty response. Please try asking again.")

        history.append({
            "role": "user",
            "parts": [{"text": message}]
        })
        history.append({
            "role": "model",
            "parts": [{"text": full_reply}]
        })
        if len(history) > MAX_HISTORY_TURNS * 2:
            session_histories[session_id] = history[-(MAX_HISTORY_TURNS * 2):]
                
    except Exception as e:
        logging.error(f"Error in text chat Gemini stream: {e}")
        raise e

def clear_session(session_id: str):
    if session_id in session_histories:
        del session_histories[session_id]
