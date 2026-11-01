import React from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => {
        const isSuccess = toast.type === "success";
        const isError = toast.type === "error";

        return (
          <div 
            key={toast.id} 
            className={`toast-item ${isSuccess ? 'toast-success' : isError ? 'toast-error' : 'toast-info'}`}
          >
            {isSuccess && <CheckCircle size={18} />}
            {isError && <AlertCircle size={18} />}
            {!isSuccess && !isError && <Info size={18} />}

            <div style={{ flex: 1, fontSize: "0.875rem", fontWeight: 500 }}>
              {toast.message}
            </div>

            <button 
              onClick={() => onDismiss(toast.id)} 
              style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "flex" }}
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
