import io
import re
import json
import logging
from datetime import datetime
from typing import Dict, Any, Tuple
from PIL import Image

from app.config import settings
from app.models import ReceiptExtractionResult

logger = logging.getLogger(__name__)

EXTRACTION_PROMPT = """
You are an expert financial OCR system. Analyze the receipt image and extract these 3 fields:
1. "Store": Name of the merchant/store/business (string).
2. "Date": Date of transaction in strictly "YYYY-MM-DD" format (string).
3. "Amount": Total amount paid as a decimal number (float). Strip any currency signs ($/€/£).

Return ONLY valid JSON matching this exact structure:
{
  "Store": "Trader Joe's",
  "Date": "2026-10-24",
  "Amount": 42.75
}
Do not include markdown formatting or commentary.
"""

def normalize_date(date_str: str) -> str:
    """Normalize extracted date string to YYYY-MM-DD"""
    if not date_str or not isinstance(date_str, str):
        return datetime.now().strftime("%Y-%m-%d")
    
    clean_date = date_str.strip()
    
    # Already YYYY-MM-DD
    if re.match(r"^\d{4}-\d{2}-\d{2}$", clean_date):
        return clean_date

    # Try common formats
    formats = [
        "%m/%d/%Y", "%m-%d-%Y", "%d/%m/%Y", "%d-%m-%Y",
        "%m/%d/%y", "%m-%d-%y", "%d/%m/%y", "%d-%m-%y",
        "%B %d, %Y", "%b %d, %Y", "%d %B %Y", "%d %b %Y",
        "%Y/%m/%d", "%Y.%m.%d"
    ]
    for fmt in formats:
        try:
            parsed = datetime.strptime(clean_date, fmt)
            return parsed.strftime("%Y-%m-%d")
        except ValueError:
            continue

    # Fallback to current date
    return datetime.now().strftime("%Y-%m-%d")

def normalize_amount(amount_val: Any) -> float:
    """Normalize amount to float"""
    if isinstance(amount_val, (int, float)):
        return round(float(amount_val), 2)
    
    if isinstance(amount_val, str):
        # Remove currency symbols, commas, spaces
        cleaned = re.sub(r"[^\d.-]", "", amount_val)
        try:
            return round(float(cleaned), 2)
        except ValueError:
            pass
            
    return 0.0

def clean_json_response(raw_text: str) -> Dict[str, Any]:
    """Extract and parse JSON from model response text"""
    text = raw_text.strip()
    # Strip markdown codeblocks
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
        text = re.sub(r"\s*```$", "", text, flags=re.MULTILINE)
        text = text.strip()
        
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Search for first JSON object
        match = re.search(r"\{[^{}]*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise ValueError(f"Could not parse valid JSON from model response: {text[:200]}")

def extract_receipt_data(image_bytes: bytes, mime_type: str = "image/jpeg") -> ReceiptExtractionResult:
    """
    Extract Store, Date, and Amount from receipt image using Gemini API.
    Provides graceful demo fallback if API key is not configured.
    """
    api_key = settings.GEMINI_API_KEY.strip()
    is_key_missing = (
        not api_key or
        api_key == "your_gemini_api_key_here" or
        len(api_key) < 10
    )

    if is_key_missing:
        logger.warning("Gemini API key not configured. Returning simulated demo extraction.")
        # Inspect image size to provide deterministic mock data
        img_len = len(image_bytes)
        mock_stores = ["Whole Foods Market", "Target", "Trader Joe's", "Costco Wholesale", "Starbucks Coffee"]
        mock_store = mock_stores[img_len % len(mock_stores)]
        mock_amount = round(15.50 + (img_len % 85) + 0.49, 2)
        
        return ReceiptExtractionResult(
            Store=mock_store,
            Date=datetime.now().strftime("%Y-%m-%d"),
            Amount=mock_amount,
            is_mock=True,
            raw_response="Demo Mode: Set GEMINI_API_KEY in backend/.env to use live Gemini model."
        )

    # Validate image with Pillow
    try:
        pil_image = Image.open(io.BytesIO(image_bytes))
        # Ensure image is in RGB format for processing
        if pil_image.mode not in ("RGB", "L"):
            pil_image = pil_image.convert("RGB")
    except Exception as e:
        raise ValueError(f"Invalid image file: {str(e)}")

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        
        # Determine candidate models
        candidate_models = [
            settings.GEMINI_MODEL,
            "gemini-3.8-flash",
            "gemini-2.5-flash",
            "gemini-flash-latest",
            "gemini-1.5-flash"
        ]
        # De-duplicate while preserving order
        candidate_models = list(dict.fromkeys(candidate_models))
        
        last_error = None
        for model_name in candidate_models:
            try:
                model = genai.GenerativeModel(
                    model_name=model_name,
                    generation_config={
                        "temperature": 0.1,
                        "response_mime_type": "application/json"
                    }
                )
                
                response = model.generate_content([
                    EXTRACTION_PROMPT,
                    pil_image
                ])
                
                raw_text = response.text or "{}"
                parsed = clean_json_response(raw_text)
                
                store = str(parsed.get("Store", "Unknown Store")).strip() or "Unknown Store"
                date_val = normalize_date(str(parsed.get("Date", "")))
                amount_val = normalize_amount(parsed.get("Amount", 0.0))
                
                return ReceiptExtractionResult(
                    Store=store,
                    Date=date_val,
                    Amount=amount_val,
                    is_mock=False,
                    raw_response=raw_text
                )
            except Exception as model_err:
                last_error = model_err
                logger.warning(f"Model {model_name} invocation failed: {model_err}, trying fallback...")
                continue
                
        raise RuntimeError(f"All Gemini models failed. Last error: {str(last_error)}")

    except Exception as e:
        logger.error(f"Gemini OCR extraction failed: {e}")
        raise RuntimeError(f"Receipt extraction failed: {str(e)}")
