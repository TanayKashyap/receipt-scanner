from fastapi import APIRouter, HTTPException
from app.models import SheetsExportRequest, SheetsExportResponse
from app.services.sheets_service import export_receipts_to_sheet

router = APIRouter(prefix="/api/sheets", tags=["Google Sheets"])

@router.post("/export", response_model=SheetsExportResponse)
async def export_to_google_sheets(payload: SheetsExportRequest):
    """
    Exports receipt entries to a beautifully formatted Google Sheet
    in user's Google Drive inside Receipt_Scanner_App folder,
    grouped by Store and sorted chronologically by Date.
    """
    if not payload.records:
        raise HTTPException(status_code=400, detail="Cannot export empty list of receipts.")
        
    try:
        result = export_receipts_to_sheet(
            access_token=payload.access_token,
            records=payload.records,
            sheet_title=payload.sheet_title
        )
        return SheetsExportResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
