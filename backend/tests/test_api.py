import base64
import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app

client = TestClient(app)

def create_base64_image():
    img = Image.new("RGB", (50, 50), color=(100, 150, 200))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")

def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "version" in data

def test_root_endpoint():
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"

def test_ocr_extract_base64_demo(monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    b64 = create_base64_image()
    res = client.post("/api/ocr/extract-base64", json={
        "image_base64": b64,
        "mime_type": "image/jpeg"
    })
    assert res.status_code == 200
    data = res.json()
    assert "Store" in data
    assert "Date" in data
    assert "Amount" in data
    assert isinstance(data["Amount"], (int, float))

def test_drive_upload_endpoint():
    b64 = create_base64_image()
    payload = {
        "image_base64": b64,
        "filename": "Test_Receipt.jpg",
        "mime_type": "image/jpeg",
        "store": "Costco",
        "date": "2026-10-22",
        "amount": 75.30,
        "access_token": "demo_test_token"
    }
    res = client.post("/api/drive/upload", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "file_id" in data
    assert "webViewLink" in data

def test_sheets_export_endpoint():
    payload = {
        "access_token": "demo_test_token",
        "records": [
            {"Store": "Starbucks", "Date": "2026-10-21", "Amount": 6.75},
            {"Store": "Starbucks", "Date": "2026-10-22", "Amount": 7.25},
            {"Store": "Apple Store", "Date": "2026-10-20", "Amount": 199.00}
        ],
        "sheet_title": "October_Expenses"
    }
    res = client.post("/api/sheets/export", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["records_count"] == 3
    assert data["stores_count"] == 2
    assert data["total_amount"] == 213.00
    assert "spreadsheet_url" in data
