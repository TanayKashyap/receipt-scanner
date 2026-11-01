import React, { useState, useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import CameraScanner from "./components/CameraScanner";
import CorrectionLoop from "./components/CorrectionLoop";
import ReceiptList from "./components/ReceiptList";
import StatsOverview from "./components/StatsOverview";
import ExportModal from "./components/ExportModal";
import Toast from "./components/Toast";

import { 
  extractReceiptOCR, 
  uploadReceiptToDrive, 
  exportReceiptsToSheets,
  checkBackendHealth 
} from "./services/api";
import { 
  saveReceiptRecord, 
  fetchUserReceipts, 
  deleteReceiptRecord 
} from "./services/firebase";

import { 
  Camera, 
  LayoutDashboard, 
  Sparkles, 
  CheckCircle2 
} from "lucide-react";

export default function App() {
  const { currentUser, accessToken, demoMode } = useAuth();

  // Navigation view: 'scan' | 'dashboard'
  const [activeTab, setActiveTab] = useState("dashboard");

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

  // Backend Health check status
  const [backendStatus, setBackendStatus] = useState({ status: "checking", gemini_configured: false });

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

  // Initial load: Fetch receipts & health
  useEffect(() => {
    loadReceipts();
    checkBackendHealth().then(status => setBackendStatus(status));
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

    try {
      addToast("Sending receipt to Gemini AI for fast CAD extraction...", "info");
      const ocrResult = await extractReceiptOCR(base64Image, mimeType);
      setExtractedData(ocrResult);
      if (ocrResult.is_mock) {
        addToast("Receipt parsed using demo OCR. Configure Gemini API key for live inference.", "info");
      } else {
        addToast("Gemini successfully extracted receipt fields in CAD!", "success");
      }
    } catch (err) {
      console.error("OCR Error:", err);
      addToast(`OCR failed: ${err.message}`, "error");
      // Fallback data so user is not stuck
      setExtractedData({
        Store: "Unknown Store",
        Date: new Date().toISOString().split("T")[0],
        Amount: 0.0,
        is_mock: true
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
      addToast("Archiving original image to Google Drive...", "info");

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
      const newRecord = await saveReceiptRecord(currentUser?.uid, {
        Store: verifiedData.Store,
        Date: verifiedData.Date,
        Amount: verifiedData.Amount,
        notes: verifiedData.notes,
        Drive_Image_URL: driveUpload.webViewLink
      });

      addToast("Receipt archived to Drive and saved to Database!", "success");

      // Reset capture flow and refresh list
      setCapturedImage(null);
      setExtractedData(null);
      await loadReceipts();
      setActiveTab("dashboard");
    } catch (err) {
      console.error("Save error:", err);
      addToast(`Failed to save receipt: ${err.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setExtractedData(null);
    setIsProcessingOCR(false);
  };

  // Delete Receipt
  const handleDeleteReceipt = async (receiptId) => {
    if (!window.confirm("Are you sure you want to delete this receipt record?")) return;
    try {
      await deleteReceiptRecord(currentUser?.uid, receiptId);
      setReceipts(prev => prev.filter(r => r.id !== receiptId));
      addToast("Receipt record deleted.", "info");
    } catch (err) {
      addToast("Failed to delete receipt.", "error");
    }
  };

  // Step 5: Google Sheets Export
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

  return (
    <div className="app-container">
      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Top Navbar */}
      <Navbar />

      {/* Main Content Areas */}
      <main>
        {/* Verification / Correction Loop View */}
        {capturedImage && extractedData && (
          <CorrectionLoop 
            receiptImage={capturedImage}
            extractedData={extractedData}
            onSave={handleSaveReceipt}
            onRetake={handleRetake}
            isSaving={isSaving}
          />
        )}

        {/* Camera Scanner View */}
        {activeTab === "scan" && !extractedData && (
          <CameraScanner 
            onCapture={handlePhotoCapture} 
            isProcessing={isProcessingOCR}
          />
        )}

        {/* Dashboard View */}
        {activeTab === "dashboard" && !capturedImage && (
          <div className="animate-fade-in">
            <StatsOverview receipts={receipts} />
            <ReceiptList 
              receipts={receipts} 
              onDelete={handleDeleteReceipt}
              onExportClick={() => {
                setExportResult(null);
                setExportModalOpen(true);
              }}
            />
          </div>
        )}
      </main>

      {/* Floating Bottom Navigation Bar (Optimized for Pixel 9 Ergonomic Reach) */}
      {!capturedImage && (
        <nav className="mobile-nav-bar" aria-label="Main Navigation">
          <button 
            className={`mobile-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => {
              setCapturedImage(null);
              setExtractedData(null);
              setActiveTab("dashboard");
            }}
          >
            <LayoutDashboard size={18} />
            <span>Records</span>
          </button>

          <button 
            className={`mobile-nav-item ${activeTab === 'scan' ? 'active' : ''}`}
            onClick={() => setActiveTab("scan")}
          >
            <Camera size={18} />
            <span>Scan Receipt</span>
          </button>
        </nav>
      )}

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
