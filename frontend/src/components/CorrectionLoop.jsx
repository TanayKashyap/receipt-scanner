import React, { useState } from "react";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  RefreshCcw, 
  Check, 
  X, 
  Store as StoreIcon, 
  Calendar, 
  DollarSign, 
  FileText,
  CloudUpload,
  Sparkles
} from "lucide-react";
import confetti from "canvas-confetti";

export default function CorrectionLoop({ 
  receiptImage, 
  extractedData, 
  onSave, 
  onRetake, 
  isSaving 
}) {
  // Form fields for human-in-the-loop verification
  const [store, setStore] = useState(extractedData?.Store || "");
  const [date, setDate] = useState(extractedData?.Date || new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState(extractedData?.Amount !== undefined ? extractedData.Amount : "");
  const [notes, setNotes] = useState("");

  // Image manipulation controls (zoom, pan, rotate)
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3.0));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.75));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleResetView = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!store.trim()) {
      alert("Please enter a valid store/merchant name.");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      alert("Please enter a valid positive amount.");
      return;
    }

    // Trigger celebratory confetti effect
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch (err) {
      // ignore
    }

    onSave({
      Store: store.trim(),
      Date: date,
      Amount: parsedAmount,
      notes: notes.trim(),
      image: receiptImage
    });
  };

  return (
    <div className="correction-loop-grid animate-fade-in">
      {/* Left Column: Image Viewer with Pan/Zoom & Rotate */}
      <div className="image-viewer-card glass-panel">
        <img 
          src={receiptImage} 
          alt="Captured Receipt" 
          className="preview-receipt-image"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`
          }}
        />

        {/* Toolbar Controls */}
        <div className="viewer-toolbar">
          <button 
            type="button" 
            className="btn btn-secondary btn-icon" 
            style={{ width: 32, height: 32 }}
            onClick={handleZoomIn} 
            title="Zoom In"
          >
            <ZoomIn size={15} />
          </button>
          <button 
            type="button" 
            className="btn btn-secondary btn-icon" 
            style={{ width: 32, height: 32 }}
            onClick={handleZoomOut} 
            title="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>
          <button 
            type="button" 
            className="btn btn-secondary btn-icon" 
            style={{ width: 32, height: 32 }}
            onClick={handleRotate} 
            title="Rotate 90°"
          >
            <RotateCw size={15} />
          </button>
          <button 
            type="button" 
            className="btn btn-secondary btn-icon" 
            style={{ width: 32, height: 32 }}
            onClick={handleResetView} 
            title="Reset View"
          >
            <RefreshCcw size={15} />
          </button>
        </div>
      </div>

      {/* Right Column: Verification & Manual Override Form */}
      <div className="verification-form glass-panel">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Verify Receipt Details</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Check extracted fields against the image preview and edit if needed.
            </p>
          </div>
          {extractedData?.is_mock && (
            <span className="badge badge-demo">Simulated AI</span>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Store Name */}
          <div className="form-group">
            <label className="form-label">
              <StoreIcon size={15} />
              <span>Store / Merchant</span>
            </label>
            <div className="input-wrapper">
              <StoreIcon size={18} className="input-icon" />
              <input 
                type="text" 
                required
                className="form-input" 
                placeholder="e.g. Tim Hortons, Loblaws, Canadian Tire"
                value={store}
                onChange={(e) => setStore(e.target.value)}
              />
            </div>
          </div>

          {/* Transaction Date */}
          <div className="form-group">
            <label className="form-label">
              <Calendar size={15} />
              <span>Transaction Date</span>
            </label>
            <div className="input-wrapper">
              <Calendar size={18} className="input-icon" />
              <input 
                type="date" 
                required
                className="form-input" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* Total Amount */}
          <div className="form-group">
            <label className="form-label">
              <DollarSign size={15} />
              <span>Total Amount Paid (CAD $)</span>
            </label>
            <div className="input-wrapper">
              <DollarSign size={18} className="input-icon" />
              <input 
                type="number" 
                step="0.01"
                min="0"
                required
                className="form-input amount-input" 
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <span className="currency-badge-input">CAD</span>
            </div>
          </div>

          {/* Optional Notes */}
          <div className="form-group">
            <label className="form-label">
              <FileText size={15} />
              <span>Notes / Expense Category (Optional)</span>
            </label>
            <div className="input-wrapper">
              <FileText size={18} className="input-icon" />
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Groceries, Dinner with team, Hardware"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onRetake}
              disabled={isSaving}
              style={{ flex: 1 }}
            >
              <X size={16} />
              <span>Discard & Retake</span>
            </button>

            <button 
              type="submit" 
              className="btn btn-success" 
              disabled={isSaving}
              style={{ flex: 1.5 }}
            >
              {isSaving ? (
                <>
                  <Sparkles size={16} className="animate-spin" />
                  <span>Archiving to Drive...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Confirm & Save</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
