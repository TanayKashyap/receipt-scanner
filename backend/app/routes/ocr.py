import base64
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.models import ReceiptExtractionResult, OCRExtractBase64Request
from app.services.ocr_service import extract_receipt_data

router = APIRouter(prefix="/api/ocr", tags=["OCR"])

@router.post("/extract", response_model=ReceiptExtractionResult)
async def extract_from_file(file: UploadFile = File(...)):
    """Extract receipt data from an uploaded image file"""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")
    
    try:
        contents = await file.read()
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="Empty file uploaded.")
        
        result = extract_receipt_data(contents, mime_type=file.content_type)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/extract-base64", response_model=ReceiptExtractionResult)
async def extract_from_base64(payload: OCRExtractBase64Request):
    """Extract receipt data from a base64 encoded image string"""
    try:
        raw_b64 = payload.image_base64
        # Strip data URL prefix if present (e.g. data:image/jpeg;base64,...)
        if "," in raw_b64:
            header, raw_b64 = raw_b64.split(",", 1)
            
        image_bytes = base64.b64decode(raw_b64)
        if len(image_bytes) == 0:
            raise HTTPException(status_code=400, detail="Decoded image is empty.")
            
        result = extract_receipt_data(image_bytes, mime_type=payload.mime_type or "image/jpeg")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
