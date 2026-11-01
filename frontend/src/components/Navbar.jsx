import React from "react";
import { useAuth } from "../context/AuthContext";
import { ChevronLeft, User, LogIn, LogOut } from "lucide-react";

export default function Navbar({ view = "dashboard", onBack }) {
  const { currentUser, loginWithGoogle, logout } = useAuth();

  // If on Scan / Verify view, render the Navigation bar matching the right screen
  if (view === "scan" || view === "verify") {
    return (
      <header className="navy-header">
        <button 
          className="navy-header-back-btn" 
          onClick={onBack}
          title="Return to Dashboard"
        >
          <ChevronLeft size={20} />
          <span>Dashboard</span>
        </button>

        <h1 className="navy-header-title">Scan & Verify</h1>

        {/* Spacer for symmetrical centering */}
        <div style={{ width: 68 }} />
      </header>
    );
  }

  // Dashboard View Header matching the left screen
  const userName = currentUser?.displayName 
    ? (currentUser.displayName.split(" ").length > 1 
        ? `${currentUser.displayName.split(" ")[0].charAt(0)}. ${currentUser.displayName.split(" ")[1]}`
        : currentUser.displayName)
    : "J. Doe";

  return (
    <header className="navy-header">
      <h1 className="navy-header-title">Receipt Scanner</h1>

      <div className="navy-header-user">
        {currentUser ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div className="user-pill">
              {currentUser.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt={userName} 
                  className="user-avatar-circle"
                />
              ) : (
                <div className="user-avatar-circle">
                  <User size={16} />
                </div>
              )}
              <span>{userName}</span>
            </div>

            <button 
              onClick={logout} 
              title="Sign Out"
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255, 255, 255, 0.7)",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center"
              }}
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button 
            className="user-pill" 
            onClick={loginWithGoogle}
            title="Sign In with Google"
          >
            <div className="user-avatar-circle">
              <User size={16} />
            </div>
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
