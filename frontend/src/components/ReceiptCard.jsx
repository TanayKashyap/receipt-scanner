import React from "react";
import { Store, Calendar, ExternalLink, Trash2, Tag } from "lucide-react";

export default function ReceiptCard({ receipt, onDelete }) {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(receipt.Amount || 0);

  return (
    <div className="receipt-card glass-panel animate-fade-in">
      <div className="receipt-info-left">
        <div className="store-badge-icon">
          <Store size={22} />
        </div>
        <div>
          <div className="receipt-store-title">{receipt.Store}</div>
          <div className="receipt-date-sub">
            <span>{receipt.Date}</span>
            {receipt.notes && (
              <span style={{ marginLeft: "8px", color: "var(--accent-cyan)" }}>
                • {receipt.notes}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="receipt-info-right">
        <div className="receipt-amount-display">
          {formattedAmount}
        </div>

        {/* View in Drive Link */}
        {receipt.Drive_Image_URL && (
          <a 
            href={receipt.Drive_Image_URL} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn btn-secondary btn-icon"
            title="View original receipt image in Google Drive"
          >
            <ExternalLink size={16} />
          </a>
        )}

        {/* Delete Record */}
        <button 
          className="btn btn-danger btn-icon" 
          onClick={() => onDelete(receipt.id)}
          title="Delete receipt record"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
