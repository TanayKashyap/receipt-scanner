import React, { useState, useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import CameraScanner from "./components/CameraScanner";
import CorrectionLoop from "./components/CorrectionLoop";
import ReceiptList from "./components/ReceiptList";
import ExportModal from "./components/ExportModal";
import Toast from "./components/Toast";

import { 
  extractReceiptOCR, 
  uploadReceiptToDrive, 
  exportReceiptsToSheets 
} from "./services/api";
import { 
  saveReceiptRecord, 
  fetchUserReceipts, 
  deleteReceiptRecord 
} from "./services/firebase";

import { Camera, FileSpreadsheet } from "lucide-react";

export default function App() {
  const { currentUser, accessToken, demoMode, loginWithGoogle } = useAuth();

  // Navigation view: 'dashboard' | 'scan' | 'verify'
  const [activeView, setActiveView] = useState("dashboard");

  // Receipt capture & OCR flow state
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedMimeType, setCapturedMimeType] = useState("image/jpeg");
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Stored Receipts State
  const [receipts, setReceipts] = useState([]);
  const [loadingReceipts, setLoadingReceipts] = useState(true);

  // Google Sheets Export Modal State
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState(null);

  // Floating Toast notifications
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    loadReceipts();
  }, [currentUser]);

  const loadReceipts = async () => {
    setLoadingReceipts(true);
    try {
      const data = await fetchUserReceipts(currentUser?.uid);
      setReceipts(data || []);
    } catch (err) {
      console.error("Error loading receipts:", err);
      addToast("Failed to load receipts from storage.", "error");
    } finally {
      setLoadingReceipts(false);
    }
  };

  // Step 2 & 3: Camera Capture -> Gemini OCR Extraction
  const handlePhotoCapture = async (base64Image, mimeType) => {
    setCapturedImage(base64Image);
    setCapturedMimeType(mimeType);
    setIsProcessingOCR(true);
    setActiveView("verify");

    try {
      addToast("Analyzing receipt with Gemini Flash AI...", "info");
      const ocrResult = await extractReceiptOCR(base64Image, mimeType);
      setExtractedData(ocrResult);
      addToast("Receipt details extracted!", "success");
    } catch (err) {
      console.error("OCR Error:", err);
      addToast(`OCR extraction failed: ${err.message}. You can enter details manually.`, "error");
      setExtractedData({
        Store: "",
        Date: new Date().toISOString().split("T")[0],
        Amount: 0.0,
        is_mock: false
      });
    } finally {
      setIsProcessingOCR(false);
    }
  };

  // Step 4: Confirm & Save (Drive Upload + Firestore record)
  const handleSaveReceipt = async (verifiedData) => {
    let token = accessToken || localStorage.getItem("receipt_scanner_google_token");
    if (!token && !demoMode) {
      addToast("Please sign in with Google to save to Drive.", "info");
      try {
        await loginWithGoogle();
        token = localStorage.getItem("receipt_scanner_google_token");
      } catch (e) {
        addToast("Google Sign-In required to archive to Drive.", "error");
        return;
      }
    }

    setIsSaving(true);
    try {
      addToast("Archiving image to Google Drive...", "info");

      // 1. Upload to user's Google Drive
      const driveUpload = await uploadReceiptToDrive({
        imageBase64: capturedImage,
        mimeType: capturedMimeType,
        store: verifiedData.Store,
        date: verifiedData.Date,
        amount: verifiedData.Amount,
        accessToken: token
      });

      // 2. Save document to Firestore
      await saveReceiptRecord(currentUser?.uid, {
        Store: verifiedData.Store,
        Date: verifiedData.Date,
        Amount: verifiedData.Amount,
        Drive_Image_URL: driveUpload.webViewLink
      });

      addToast("Receipt saved to Drive and database!", "success");

      // Reset capture flow and refresh list
      setCapturedImage(null);
      setExtractedData(null);
      await loadReceipts();
      setActiveView("dashboard");
    } catch (err) {
      console.error("Save error:", err);
      addToast(`Failed to save receipt: ${err.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReturnToDashboard = () => {
    if (capturedImage && !window.confirm("Discard current receipt scan?")) return;
    setCapturedImage(null);
    setExtractedData(null);
    setIsProcessingOCR(false);
    setActiveView("dashboard");
  };

  const handleDeleteReceipt = async (receiptId) => {
    if (!window.confirm("Delete this receipt record?")) return;
    try {
      await deleteReceiptRecord(currentUser?.uid, receiptId);
      setReceipts(prev => prev.filter(r => r.id !== receiptId));
      addToast("Receipt record deleted.", "info");
    } catch (err) {
      addToast("Failed to delete receipt.", "error");
    }
  };

  const handleTriggerExport = async (sheetTitle) => {
    let token = accessToken || localStorage.getItem("receipt_scanner_google_token");
    if (!token && !demoMode) {
      addToast("Please sign in with Google to authorize Google Sheets export.", "info");
      try {
        await loginWithGoogle();
        token = localStorage.getItem("receipt_scanner_google_token");
      } catch (e) {
        addToast("Google Sign-In required for Sheets export.", "error");
        return;
      }
    }

    setIsExporting(true);
    const sanitizedRecords = receipts.map(r => ({
      id: r.id || "",
      Store: r.Store || "Unknown Store",
      Date: r.Date || new Date().toISOString().split("T")[0],
      Amount: parseFloat(r.Amount) || 0.0,
      Drive_Image_URL: r.Drive_Image_URL || "",
      notes: r.notes || "",
      createdAt: typeof r.createdAt === "object" && r.createdAt !== null
        ? (r.createdAt.seconds ? new Date(r.createdAt.seconds * 1000).toISOString() : JSON.stringify(r.createdAt))
        : String(r.createdAt || "")
    }));

    exportReceiptsToSheets({
      accessToken: token,
      records: sanitizedRecords,
      sheetTitle: sheetTitle
    })
      .then(res => {
        setExportResult(res);
        addToast("Successfully created Google Sheet in your Drive!", "success");
      })
      .catch(err => {
        console.error("Export error:", err);
        addToast(`Google Sheets export failed: ${err.message}`, "error");
      })
      .finally(() => {
        setIsExporting(false);
      });
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="app-wrapper">
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Top Navbar matching mockup header */}
      <Navbar 
        view={activeView === "dashboard" ? "dashboard" : (capturedImage ? "verify" : "scan")}
        onBack={handleReturnToDashboard}
      />

      <div className="app-content">
        {/* VIEW 1: Dashboard (Left Screen Mockup) */}
        {activeView === "dashboard" && !capturedImage && (
          <>
            {/* Drive Connected Status Badge */}
            <div className="drive-status-row">
              <div className="drive-status-badge">
                <svg width="14" height="14" viewBox="0 0 87.3 78" fill="none">
                  <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                  <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
                  <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                  <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                  <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                  <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                </svg>
                <span>Drive Connected</span>
              </div>
            </div>

            {/* Green Google Sheets Export Banner */}
            <button 
              className="sheets-banner-card animate-fade-in"
              onClick={() => {
                setExportResult(null);
                setExportModalOpen(true);
              }}
              title="Export all receipts to formatted Google Sheet"
            >
              <div className="sheets-banner-icon">
                <FileSpreadsheet size={22} />
              </div>
              <div className="sheets-banner-text">
                <div className="sheets-banner-title">Export to Google Sheets</div>
                <div className="sheets-banner-sub">Sheets/Receipts_Export_{todayStr}</div>
              </div>
            </button>

            {/* Receipts Table Card */}
            <ReceiptList 
              receipts={receipts} 
              onDelete={handleDeleteReceipt}
            />

            {/* Bottom Navy Scan Receipt Button */}
            <div className="bottom-scan-bar">
              <button 
                className="scan-main-btn" 
                onClick={() => setActiveView("scan")}
              >
                <Camera size={20} />
                <span>Scan Receipt</span>
              </button>
            </div>
          </>
        )}

        {/* VIEW 2: Camera Scanner (Live camera or file upload) */}
        {activeView === "scan" && !extractedData && (
          <CameraScanner 
            onCapture={handlePhotoCapture}
            isProcessing={isProcessingOCR}
          />
        )}

        {/* VIEW 3: Scan & Verify (Right Screen Mockup) */}
        {capturedImage && (
          <CorrectionLoop 
            receiptImage={capturedImage}
            extractedData={extractedData}
            onSave={handleSaveReceipt}
            isSaving={isSaving}
          />
        )}
      </div>

      {/* Google Sheets Export Modal */}
      <ExportModal 
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        receipts={receipts}
        onExport={handleTriggerExport}
        isExporting={isExporting}
        exportResult={exportResult}
      />
    </div>
  );
}
