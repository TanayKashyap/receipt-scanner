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
  HelpCircle, 
  Sparkles, 
  CheckCircle2, 
  Server, 
  Cloud, 
  ExternalLink 
} from "lucide-react";

export default function App() {
  const { currentUser, accessToken, demoMode } = useAuth();

  // Navigation view: 'scan' | 'dashboard' | 'guide'
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
      addToast("Sending receipt to Gemini AI for extraction...", "info");
      const ocrResult = await extractReceiptOCR(base64Image, mimeType);
      setExtractedData(ocrResult);
      if (ocrResult.is_mock) {
        addToast("Receipt parsed using demo OCR. Configure Gemini API key for live inference.", "info");
      } else {
        addToast("Gemini successfully extracted receipt fields!", "success");
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
        accessToken: accessToken
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
  const handleTriggerExport = (sheetTitle) => {
    setIsExporting(true);
    setExportResult(null);

    exportReceiptsToSheets({
      accessToken: accessToken,
      records: receipts,
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
      <Navbar onOpenSetupGuide={() => setActiveTab("guide")} />

      {/* Main Tab Navigation */}
      <nav className="view-tabs">
        <button 
          className={`view-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => {
            if (capturedImage && !window.confirm("Leave receipt review? Changes will be discarded.")) return;
            setCapturedImage(null);
            setExtractedData(null);
            setActiveTab("dashboard");
          }}
        >
          <LayoutDashboard size={17} />
          <span>Dashboard & Records</span>
        </button>

        <button 
          className={`view-tab ${activeTab === 'scan' ? 'active' : ''}`}
          onClick={() => setActiveTab("scan")}
        >
          <Camera size={17} />
          <span>Scan Receipt</span>
        </button>

        <button 
          className={`view-tab ${activeTab === 'guide' ? 'active' : ''}`}
          onClick={() => setActiveTab("guide")}
        >
          <HelpCircle size={17} />
          <span>Setup & Docs</span>
        </button>
      </nav>

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

        {/* Interactive In-App Setup Guide View */}
        {activeTab === "guide" && !capturedImage && (
          <div className="glass-panel animate-fade-in" style={{ padding: "28px" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "8px" }}>
              🛠️ Configuration & Architecture Guide
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "20px" }}>
              Review system health, API scopes, and follow the step-by-step instructions to connect live Google Cloud credentials.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "24px" }}>
              {/* Backend Status Card */}
              <div style={{ padding: "16px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, marginBottom: "6px" }}>
                  <Server size={18} color="var(--accent-cyan)" />
                  <span>FastAPI Backend</span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Status: <strong style={{ color: backendStatus.status === "healthy" ? "var(--accent-emerald)" : "var(--accent-amber)" }}>{backendStatus.status}</strong>
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  Gemini API: {backendStatus.gemini_configured ? "✅ Configured" : "⚠️ Demo Mode (Add key to backend/.env)"}
                </div>
              </div>

              {/* Google Drive / Sheets Card */}
              <div style={{ padding: "16px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, marginBottom: "6px" }}>
                  <Cloud size={18} color="var(--accent-indigo)" />
                  <span>Google Cloud Integration</span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  OAuth Scope: <code>https://www.googleapis.com/auth/drive.file</code>
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  Drive Folder: <code>Receipt_Scanner_App/Images/</code>
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: "16px", marginBottom: "12px" }}>
              Quick Setup Steps
            </h3>
            <ol style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.9rem", color: "var(--text-muted)" }}>
              <li>
                <strong>Google AI Studio:</strong> Obtain a free Gemini API key from <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" style={{ color: "var(--accent-cyan)" }}>Google AI Studio</a> and set <code>GEMINI_API_KEY</code> in <code>backend/.env</code>.
              </li>
              <li>
                <strong>Google Cloud Console:</strong> Enable <em>Google Drive API</em> and <em>Google Sheets API</em>, configure the OAuth Consent Screen with scope <code>drive.file</code>, and create a Web Client ID.
              </li>
              <li>
                <strong>Firebase Authentication & Firestore:</strong> In <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" style={{ color: "var(--accent-cyan)" }}>Firebase Console</a>, enable Google SSO under Authentication and create a Cloud Firestore database. Paste your config into <code>frontend/.env</code>.
              </li>
              <li>
                <strong>Detailed Walkthrough:</strong> Refer to <code>SETUP_GUIDE.md</code> at the repository root for copy-paste code snippets, security rules, and Google Cloud Run deployment commands!
              </li>
            </ol>
          </div>
        )}
      </main>

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
