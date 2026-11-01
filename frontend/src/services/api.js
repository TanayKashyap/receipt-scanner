/**
 * Backend API Client for Receipt Scanner
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Backend not reachable, running in standalone/demo mode:", err.message);
    return { status: "offline", gemini_configured: false };
  }
}

export async function extractReceiptOCR(imageBase64, mimeType = "image/jpeg") {
  const res = await fetch(`${API_BASE_URL}/api/ocr/extract-base64`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_base64: imageBase64,
      mime_type: mimeType
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const message = formatErrorMessage(errData, `OCR Extraction failed (${res.status})`);
    throw new Error(message);
  }

  return await res.json();
}

function formatErrorMessage(errData, fallback) {
  if (!errData || !errData.detail) return fallback;
  if (typeof errData.detail === "string") return errData.detail;
  if (Array.isArray(errData.detail)) {
    return errData.detail.map(d => `${d.loc ? d.loc.slice(-1)[0] + ': ' : ''}${d.msg || JSON.stringify(d)}`).join(', ');
  }
  if (typeof errData.detail === "object") {
    return JSON.stringify(errData.detail);
  }
  return fallback;
}

export async function uploadReceiptToDrive({
  imageBase64,
  filename,
  mimeType,
  store,
  date,
  amount,
  accessToken
}) {
  const tokenToUse = accessToken || localStorage.getItem("receipt_scanner_google_token");
  
  if (!tokenToUse) {
    throw new Error("Google Drive access token missing. Please sign in with Google.");
  }

  const res = await fetch(`${API_BASE_URL}/api/drive/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_base64: imageBase64,
      filename: filename,
      mime_type: mimeType || "image/jpeg",
      store: store,
      date: date,
      amount: amount,
      access_token: tokenToUse
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(formatErrorMessage(errData, `Drive upload failed (${res.status})`));
  }

  return await res.json();
}

export async function exportReceiptsToSheets({
  accessToken,
  records,
  sheetTitle
}) {
  const tokenToUse = accessToken || localStorage.getItem("receipt_scanner_google_token");

  if (!tokenToUse) {
    throw new Error("Google Sheets access token missing. Please sign in with Google to grant permission.");
  }

  const res = await fetch(`${API_BASE_URL}/api/sheets/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: tokenToUse,
      records: records,
      sheet_title: sheetTitle
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(formatErrorMessage(errData, `Sheets export failed (${res.status})`));
  }

  return await res.json();
}
