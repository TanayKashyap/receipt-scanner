import io
import pytest
from PIL import Image
from app.services.ocr_service import (
    normalize_date,
    normalize_amount,
    clean_json_response,
    extract_receipt_data
)

def create_dummy_image_bytes():
    """Generates a small in-memory test image"""
    img = Image.new("RGB", (100, 100), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()

def test_normalize_date():
    assert normalize_date("2026-10-15") == "2026-10-15"
    assert normalize_date("10/15/2026") == "2026-10-15"
    assert normalize_date("10-15-2026") == "2026-10-15"
    assert normalize_date("October 15, 2026") == "2026-10-15"
    assert normalize_date("15 Oct 2026") == "2026-10-15"
    # Fallback to valid format when empty
    fallback = normalize_date("")
    assert len(fallback) == 10 and fallback.count("-") == 2

def test_normalize_amount():
    assert normalize_amount(45.50) == 45.50
    assert normalize_amount(100) == 100.0
    assert normalize_amount("$45.50") == 45.50
    assert normalize_amount(" $ 1,234.56 ") == 1234.56
    assert normalize_amount("Total: 89.99") == 89.99
    assert normalize_amount("invalid") == 0.0

def test_clean_json_response():
    # Direct json
    assert clean_json_response('{"Store": "Target", "Date": "2026-10-24", "Amount": 15.00}') == {
        "Store": "Target", "Date": "2026-10-24", "Amount": 15.00
    }
    # Markdown wrapped
    raw_markdown = """```json
    {
      "Store": "Costco",
      "Date": "2026-10-20",
      "Amount": 182.40
    }
    ```"""
    res = clean_json_response(raw_markdown)
    assert res["Store"] == "Costco"
    assert res["Amount"] == 182.40

    # Embedded in explanatory text
    raw_text = "Here is the extracted information:\n{\"Store\": \"Trader Joe's\", \"Date\": \"2026-10-18\", \"Amount\": 34.22}\nHope this helps!"
    res2 = clean_json_response(raw_text)
    assert res2["Store"] == "Trader Joe's"
    assert res2["Amount"] == 34.22

def test_extract_receipt_data_demo_fallback(monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    dummy_bytes = create_dummy_image_bytes()
    result = extract_receipt_data(dummy_bytes)
    assert result.Store != ""
    assert result.Amount > 0
    assert len(result.Date) == 10
    assert result.is_mock is True
