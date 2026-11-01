import pytest
from app.models import ReceiptRecord
from app.services.drive_service import upload_receipt_image
from app.services.sheets_service import export_receipts_to_sheet

def test_drive_upload_demo_token():
    dummy_bytes = b"fake-jpeg-image-bytes"
    res = upload_receipt_image(
        access_token="demo_token_123",
        image_bytes=dummy_bytes,
        filename="Test_Receipt.jpg",
        store="Trader Joe's",
        date="2026-10-25",
        amount=42.50
    )
    assert res["file_id"].startswith("demo_drive_file_")
    assert "drive.google.com" in res["webViewLink"]
    assert res["folder_id"] == "demo_images_folder_id"

def test_sheets_export_grouping_and_subtotals():
    records = [
        ReceiptRecord(Store="Target", Date="2026-10-20", Amount=25.00, Drive_Image_URL="http://img1"),
        ReceiptRecord(Store="Whole Foods", Date="2026-10-18", Amount=50.00, Drive_Image_URL="http://img2"),
        ReceiptRecord(Store="Target", Date="2026-10-15", Amount=15.00, Drive_Image_URL="http://img3"),
    ]
    
    res = export_receipts_to_sheet(
        access_token="demo_token_456",
        records=records,
        sheet_title="Test_Export_2026"
    )
    
    assert res["records_count"] == 3
    assert res["stores_count"] == 2
    assert res["total_amount"] == 90.00
    assert "docs.google.com/spreadsheets" in res["spreadsheet_url"]
    assert res["title"] == "Test_Export_2026"
