import React from "react";
import { Check, Trash2, ExternalLink, Inbox } from "lucide-react";

export default function ReceiptList({ receipts, onDelete }) {
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "Recent";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const formatAmountDisplay = (amount) => {
    const num = parseFloat(amount) || 0;
    return `$${num.toFixed(2)}`;
  };

  return (
    <div className="receipts-table-card animate-fade-in">
      <div className="receipts-table-title">RECEIPTS</div>

      {receipts.length > 0 ? (
        <>
          <div className="receipts-table-head">
            <div>DATE</div>
            <div>STORE</div>
            <div style={{ textAlign: "right" }}>AMOUNT</div>
          </div>

          <div className="receipts-table-body">
            {receipts.map((receipt) => (
              <div className="receipt-row" key={receipt.id || receipt.createdAt}>
                {/* Date Column */}
                <div className="receipt-row-date">
                  {formatDateDisplay(receipt.Date)}
                </div>

                {/* Store Column */}
                <div className="receipt-row-store" title={receipt.Store}>
                  {receipt.Store}
                </div>

                {/* Amount Column */}
                <div className="receipt-row-amount-col">
                  <div className="receipt-row-amount">
                    <span>{formatAmountDisplay(receipt.Amount)}</span>
                    <Check size={14} className="check-icon" strokeWidth={3} />
                  </div>
                  <div className="receipt-row-saved">saved to drive</div>

                  {/* Subtle actions for drive link & delete */}
                  <div className="receipt-row-actions">
                    {receipt.Drive_Image_URL && (
                      <a 
                        href={receipt.Drive_Image_URL} 
                        target="_blank" 
                        rel="noreferrer" 
                        title="View Receipt in Google Drive"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                    <button 
                      onClick={() => onDelete(receipt.id)} 
                      title="Delete record"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="receipts-empty-state">
          <Inbox size={32} color="#94a3b8" />
          <div>No receipts recorded yet.</div>
          <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
            Tap 'Scan Receipt' below to capture your first expense.
          </div>
        </div>
      )}
    </div>
  );
}
