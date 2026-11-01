from typing import Optional, List, Any, Union
from pydantic import BaseModel, Field, ConfigDict, field_validator

class ReceiptExtractionResult(BaseModel):
    Store: str = Field(..., description="Name of the store or merchant")
    Date: str = Field(..., description="Date of transaction in YYYY-MM-DD format")
    Amount: float = Field(..., description="Total purchase amount as a decimal float")
    is_mock: bool = Field(default=False, description="Flag indicating if returned via demo/mock fallback")
    raw_response: Optional[str] = Field(default=None, description="Raw model output for debugging")

class OCRExtractBase64Request(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded receipt image")
    mime_type: Optional[str] = Field(default="image/jpeg", description="MIME type of the image")

class DriveUploadRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded image to archive in Drive")
    filename: Optional[str] = Field(default=None, description="Target filename")
    mime_type: Optional[str] = Field(default="image/jpeg", description="Image MIME type")
    store: Optional[str] = Field(default=None, description="Store name for tagging")
    date: Optional[str] = Field(default=None, description="Receipt date")
    amount: Optional[float] = Field(default=None, description="Receipt amount")
    access_token: str = Field(..., description="Google OAuth access token with drive.file scope")

class DriveUploadResponse(BaseModel):
    file_id: str
    name: str
    webViewLink: str
    webContentLink: Optional[str] = None
    folder_id: str
class ReceiptRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: Optional[str] = None
    Store: str = Field(default="Unknown")
    Date: str = Field(default="")
    Amount: float = Field(default=0.0)
    Drive_Image_URL: Optional[str] = None
    createdAt: Optional[Any] = None
    notes: Optional[str] = None

    @field_validator("Amount", mode="before")
    @classmethod
    def parse_amount(cls, v):
        if isinstance(v, (int, float)):
            return float(v)
        if isinstance(v, str):
            try:
                import re
                cleaned = re.sub(r"[^\d.-]", "", v)
                return float(cleaned)
            except Exception:
                return 0.0
        return 0.0

class SheetsExportRequest(BaseModel):
    access_token: str = Field(..., description="Google OAuth access token with drive.file scope")
    records: List[ReceiptRecord] = Field(..., description="List of receipts to export")
    sheet_title: Optional[str] = Field(default=None, description="Custom title for spreadsheet")

class SheetsExportResponse(BaseModel):
    spreadsheet_id: str
    spreadsheet_url: str
    title: str
    records_count: int
    stores_count: int
    total_amount: float
    folder_id: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    version: str
    gemini_configured: bool
    gemini_model: str
