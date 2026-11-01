import React from "react";
import { useAuth } from "../context/AuthContext";
import { Scan, LogIn, LogOut, ShieldCheck, Sparkles } from "lucide-react";

export default function Navbar() {
  const { currentUser, loginWithGoogle, logout, demoMode, toggleDemoMode } = useAuth();

  return (
    <header className="navbar glass-panel">
      <div className="nav-brand">
        <div className="brand-icon">
          <Scan size={20} color="#ffffff" />
        </div>
        <div>
          <div className="brand-title">
            <span>Receipt Scanner</span>
            <span className="badge badge-cad" style={{ fontSize: "0.68rem", padding: "2px 7px" }}>CAD $</span>
          </div>
          <div className="brand-subtitle">Gemini AI • Drive Archiver • Sheets Export</div>
        </div>
      </div>

      <div className="nav-actions">
        {/* Demo / Live Auth Toggle */}
        <button 
          className={`badge ${demoMode ? 'badge-demo' : 'badge-success'}`}
          onClick={toggleDemoMode}
          title={demoMode ? "Running in Demo Mode. Click to switch." : "Live Firebase Auth enabled."}
          style={{ cursor: "pointer", border: "none" }}
        >
          {demoMode ? (
            <>
              <Sparkles size={12} />
              <span>Demo</span>
            </>
          ) : (
            <>
              <ShieldCheck size={12} />
              <span>Auth</span>
            </>
          )}
        </button>

        {/* User Account / Sign In */}
        {currentUser ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {currentUser.photoURL ? (
              <img 
                src={currentUser.photoURL} 
                alt={currentUser.displayName || "User"} 
                className="user-avatar"
              />
            ) : (
              <div 
                className="user-avatar" 
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  background: "var(--accent-emerald-dark)",
                  fontWeight: "bold",
                  fontSize: "0.85rem",
                  color: "#ffffff"
                }}
              >
                {(currentUser.displayName || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <button 
              className="btn btn-secondary btn-icon" 
              onClick={logout} 
              title="Sign Out"
              style={{ width: 36, height: 36, minHeight: 36 }}
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={loginWithGoogle} style={{ padding: "8px 14px", minHeight: 40, fontSize: "0.85rem" }}>
            <LogIn size={15} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
