import React from "react";
import { useAuth } from "../context/AuthContext";
import { Scan, LogIn, LogOut, ShieldCheck, Sparkles, AlertCircle } from "lucide-react";

export default function Navbar({ onOpenSetupGuide }) {
  const { currentUser, loginWithGoogle, logout, demoMode, isFirebaseConfigured, toggleDemoMode } = useAuth();

  return (
    <header className="navbar glass-panel">
      <div className="nav-brand">
        <div className="brand-icon">
          <Scan size={22} color="#ffffff" />
        </div>
        <div>
          <div className="brand-title">Receipt Scanner</div>
          <div className="brand-subtitle">Gemini AI • Drive Archiver • Sheets Export</div>
        </div>
      </div>

      <div className="nav-actions">
        {/* Demo Mode Toggle Badge */}
        <button 
          className={`badge ${demoMode ? 'badge-demo' : 'badge-success'}`}
          onClick={toggleDemoMode}
          title={demoMode ? "Running in Demo Mode. Click to switch." : "Live Firebase Auth enabled."}
          style={{ cursor: "pointer", border: "none" }}
        >
          {demoMode ? (
            <>
              <Sparkles size={13} />
              <span>Demo Mode</span>
            </>
          ) : (
            <>
              <ShieldCheck size={13} />
              <span>Live Auth</span>
            </>
          )}
        </button>

        {/* User Account / Sign In */}
        {currentUser ? (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
                  background: "var(--accent-indigo)",
                  fontWeight: "bold",
                  fontSize: "0.85rem"
                }}
              >
                {(currentUser.displayName || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <button 
              className="btn btn-secondary btn-icon" 
              onClick={logout} 
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={loginWithGoogle}>
            <LogIn size={16} />
            <span>Sign in with Google</span>
          </button>
        )}
      </div>
    </header>
  );
}
