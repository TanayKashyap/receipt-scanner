import base64
from fastapi import APIRouter, HTTPException
from app.models import DriveUploadRequest, DriveUploadResponse
from app.services.drive_service import upload_receipt_image

router = APIRouter(prefix="/api/drive", tags=["Google Drive"])

@router.post("/upload", response_model=DriveUploadResponse)
async def upload_image_to_drive(payload: DriveUploadRequest):
    """
    Archives a receipt image to user's Google Drive inside Receipt_Scanner_App/Images/
    using their delegated OAuth access_token with drive.file scope.
    """
    try:
        raw_b64 = payload.image_base64
        if "," in raw_b64:
            header, raw_b64 = raw_b64.split(",", 1)
            
        image_bytes = base64.b64decode(raw_b64)
        if len(image_bytes) == 0:
            raise HTTPException(status_code=400, detail="Decoded image is empty.")
            
        result = upload_receipt_image(
            access_token=payload.access_token,
            image_bytes=image_bytes,
            filename=payload.filename,
            mime_type=payload.mime_type or "image/jpeg",
            store=payload.store,
            date=payload.date,
            amount=payload.amount
        )
        return DriveUploadResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
