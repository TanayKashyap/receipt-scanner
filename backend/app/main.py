import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routes import health, ocr, drive, sheets

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("receipt_scanner")

app = FastAPI(
    title="Receipt Scanner API",
    description="FastAPI service for Gemini AI receipt OCR, Google Drive image archiving, and Google Sheets grouped export.",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins if settings.allowed_origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health.router)
app.include_router(ocr.router)
app.include_router(drive.router)
app.include_router(sheets.router)

@app.get("/")
async def root():
    return JSONResponse({
        "app": "Receipt Scanner API",
        "status": "online",
        "docs": "/docs",
        "version": "1.0.0"
    })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
