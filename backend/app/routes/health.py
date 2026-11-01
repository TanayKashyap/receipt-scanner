from fastapi import APIRouter
from app.config import settings
from app.models import HealthResponse

router = APIRouter(tags=["System"])

@router.get("/api/health", response_model=HealthResponse)
async def health_check():
    """System health check and configuration status"""
    has_gemini = bool(
        settings.GEMINI_API_KEY and 
        settings.GEMINI_API_KEY != "your_gemini_api_key_here" and
        len(settings.GEMINI_API_KEY) > 10
    )
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        gemini_configured=has_gemini,
        gemini_model=settings.GEMINI_MODEL
    )
