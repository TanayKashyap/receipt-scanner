import React, { useState } from "react";
import { 
  FileSpreadsheet, 
  ExternalLink, 
  CheckCircle, 
  Sparkles, 
  X, 
  Copy, 
  FolderCheck,
  Calendar
} from "lucide-react";
import confetti from "canvas-confetti";

export default function ExportModal({ 
  isOpen, 
  onClose, 
  receipts, 
  onExport, 
  isExporting, 
  exportResult 
}) {
  const today = new Date().toISOString().split("T")[0];
  const [sheetTitle, setSheetTitle] = useState(`Receipts_Export_${today}`);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleStartExport = () => {
    onExport(sheetTitle);
  };

  const handleCopyLink = () => {
    if (exportResult?.spreadsheet_url) {
      navigator.clipboard.writeText(exportResult.spreadsheet_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: "var(--radius-md)",
              background: "rgba(16, 185, 129, 0.15)",
              color: "var(--accent-emerald)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Export to Google Sheets</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                Grouped by Store & Chronologically Sorted
              </p>
            </div>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose} style={{ width: 32, height: 32 }}>
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        {!exportResult ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="form-group">
              <label className="form-label">
                <FileSpreadsheet size={15} />
                <span>Spreadsheet Name</span>
              </label>
              <div className="input-wrapper">
                <FileSpreadsheet size={18} className="input-icon" />
                <input 
                  type="text" 
                  className="form-input" 
                  value={sheetTitle}
                  onChange={(e) => setSheetTitle(e.target.value)}
                  placeholder="Receipts_Export_2026-11-01"
                />
              </div>
            </div>

            <div style={{
              padding: "12px 14px",
              background: "rgba(255, 255, 255, 0.04)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              fontSize: "0.85rem",
              color: "var(--text-muted)",
              display: "flex",
              flexDirection: "column",
              gap: "6px"
            }}>
              <div>📊 <strong>Entries to Export:</strong> {receipts.length} receipts</div>
              <div>🏬 <strong>Unique Stores:</strong> {new Set(receipts.map(r => r.Store)).size} stores</div>
              <div>📁 <strong>Destination:</strong> Google Drive &gt; <code>Receipt_Scanner_App/</code></div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
              <button className="btn btn-secondary" onClick={onClose} disabled={isExporting} style={{ flex: 1 }}>
                Cancel
              </button>
              <button 
                className="btn btn-success" 
                onClick={handleStartExport} 
                disabled={isExporting} 
                style={{ flex: 1.5 }}
              >
                {isExporting ? (
                  <>
                    <Sparkles size={16} className="animate-spin" />
                    <span>Generating Sheet...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet size={16} />
                    <span>Generate Spreadsheet</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Export Success View */
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "center", alignItems: "center" }}>
            <div style={{
              width: 58,
              height: 58,
              borderRadius: "50%",
              background: "rgba(16, 185, 129, 0.2)",
              color: "var(--accent-emerald)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(16, 185, 129, 0.3)"
            }}>
              <CheckCircle size={32} />
            </div>

            <div>
              <h4 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "4px" }}>
                Spreadsheet Ready!
              </h4>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", maxWidth: "360px" }}>
                Saved directly to your Google Drive inside <code>Receipt_Scanner_App/</code>.
              </p>
            </div>

            <div style={{
              width: "100%",
              padding: "12px 16px",
              background: "rgba(15, 23, 42, 0.8)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px"
            }}>
              <span style={{ 
                fontFamily: "var(--font-mono)", 
                fontSize: "0.8rem", 
                color: "var(--accent-cyan)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}>
                {exportResult.spreadsheet_url}
              </span>
              <button 
                className="btn btn-secondary btn-icon" 
                style={{ width: 30, height: 30, flexShrink: 0 }}
                onClick={handleCopyLink}
                title="Copy link"
              >
                <Copy size={14} />
              </button>
            </div>

            {copied && (
              <span style={{ fontSize: "0.8rem", color: "var(--accent-emerald)" }}>
                Copied to clipboard!
              </span>
            )}

            <div style={{ display: "flex", gap: "12px", width: "100%", marginTop: "8px" }}>
              <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
                Close
              </button>
              <a 
                href={exportResult.spreadsheet_url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-primary"
                style={{ flex: 1.5 }}
              >
                <ExternalLink size={16} />
                <span>Open in Google Sheets</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
