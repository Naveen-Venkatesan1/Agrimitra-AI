import logging
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from .service import process_send_otp

logger = logging.getLogger("auth.router")

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)

class SendOTPRequest(BaseModel):
    phone: str = Field(..., description="10-digit Indian mobile number")

class SendOTPResponse(BaseModel):
    success: bool
    message: str
    phone: str

@router.post("/send-otp", response_model=SendOTPResponse)
async def send_otp_endpoint(payload: SendOTPRequest):
    """
    Step 1 Endpoint: Generates a secure OTP and dispatches it via the configured SMS provider.
    Never returns the OTP in response.
    """
    success, clean_phone, message = process_send_otp(payload.phone)

    if not success:
        if "wait" in message.lower():
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=message
            )
        elif "valid" in message.lower() or "invalid" in message.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=message
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=message
            )

    return SendOTPResponse(
        success=True,
        message=message,
        phone=clean_phone
    )
