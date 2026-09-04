from pydantic import BaseModel
from typing import Optional

class ChatRequest(BaseModel):
    message: str
    language: str = "English"
    session_id: str
    context: Optional[dict] = None

class ChatResponse(BaseModel):
    success: bool
    reply: str
    language: str
    session_id: str
    
class ResetSessionRequest(BaseModel):
    session_id: str
