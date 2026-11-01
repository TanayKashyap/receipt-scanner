import React, { useState } from "react";
import { 
  Pencil, 
  Calendar, 
  DollarSign, 
  Sparkles,
  RotateCw,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import confetti from "canvas-confetti";

export default function CorrectionLoop({ 
  receiptImage, 
  extractedData, 
  onSave, 
  isSaving 
}) {
  const [store, setStore] = useState(extractedData?.Store || "");
  const [date, setDate] = useState(extractedData?.Date || new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState(
    extractedData?.Amount !== undefined && extractedData.Amount !== null 
      ? String(extractedData.Amount) 
      : ""
  );

  // Zoom & Rotate state for image viewer
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.75));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!store.trim()) {
      alert("Please enter a valid store / merchant name.");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      alert("Please enter a valid amount.");
      return;
    }

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch {
      // ignore
    }

    onSave({
      Store: store.trim(),
      Date: date,
      Amount: parsedAmount,
      image: receiptImage
    });
  };

  return (
    <div className="verify-card animate-fade-in">
      {/* 1. Image Preview with Green Reticle Frame */}
      <div className="verify-image-box">
        <img 
          src={receiptImage} 
          alt="Scanned Receipt" 
          className="verify-receipt-img"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transition: "transform 0.15s ease"
          }}
        />

        {/* Viewfinder Reticle Framing */}
        <div className="verify-reticle">
          <span className="verify-corner verify-corner-tl" />
          <span className="verify-corner verify-corner-tr" />
          <span className="verify-corner verify-corner-bl" />
          <span className="verify-corner verify-corner-br" />
        </div>

        {/* Toolbar for Zoom & Rotation */}
        <div className="verify-img-toolbar">
          <button type="button" className="verify-toolbar-btn" onClick={handleZoomIn} title="Zoom In">
            <ZoomIn size={14} />
          </button>
          <button type="button" className="verify-toolbar-btn" onClick={handleZoomOut} title="Zoom Out">
            <ZoomOut size={14} />
          </button>
          <button type="button" className="verify-toolbar-btn" onClick={handleRotate} title="Rotate">
            <RotateCw size={14} />
          </button>
        </div>
      </div>

      {/* 2. Form Section */}
      <div>
        <h2 className="verify-form-title">Verify & Edit Details</h2>
      </div>

      <form onSubmit={handleSubmit} className="verify-form">
        {/* STORE Field */}
        <div className="verify-field-group">
          <label className="verify-field-label">STORE</label>
          <div className="verify-input-wrapper">
            <input 
              type="text"
              required
              className="verify-input"
              value={store}
              onChange={(e) => setStore(e.target.value)}
              placeholder="e.g. Starbucks, The Home Depot"
            />
            <Pencil size={16} className="verify-input-icon" />
          </div>
        </div>

        {/* DATE Field */}
        <div className="verify-field-group">
          <label className="verify-field-label">DATE</label>
          <div className="verify-input-wrapper">
            <input 
              type="date"
              required
              className="verify-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Calendar size={16} className="verify-input-icon" />
          </div>
        </div>

        {/* AMOUNT Field */}
        <div className="verify-field-group">
          <label className="verify-field-label">AMOUNT (CAD)</label>
          <div className="verify-input-wrapper">
            <input 
              type="number"
              step="0.01"
              min="0"
              required
              className="verify-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            <DollarSign size={16} className="verify-input-icon" />
          </div>
        </div>

        {/* Confirm & Save to Drive Button */}
        <button 
          type="submit" 
          className="confirm-save-btn" 
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Sparkles size={18} className="animate-spin" />
              <span>Saving to Drive & Sheets...</span>
            </>
          ) : (
            <span>Confirm & Save to Drive</span>
          )}
        </button>
      </form>
    </div>
  );
}
