import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  auth, 
  googleProvider, 
  isFirebaseConfigured 
} from "../services/firebase";
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider 
} from "firebase/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(!isFirebaseConfigured);

  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
        setLoading(false);
      });
      return unsubscribe;
    } else {
      // Set default demo user for seamless exploration
      setCurrentUser({
        uid: "demo_user_01",
        displayName: "Demo Explorer",
        email: "demo@receiptscanner.app",
        photoURL: null
      });
      setAccessToken("demo_token_user");
      setLoading(false);
    }
  }, []);

  const loginWithGoogle = async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      // Switch into demo login
      setCurrentUser({
        uid: "demo_user_01",
        displayName: "Demo Explorer",
        email: "demo@receiptscanner.app",
        photoURL: null
      });
      setAccessToken("demo_token_user");
      setDemoMode(true);
      return;
    }

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential) {
        setAccessToken(credential.accessToken);
      }
      setCurrentUser(result.user);
      setDemoMode(false);
      return result.user;
    } catch (err) {
      console.error("Google SSO failed:", err);
      throw err;
    }
  };

  const logout = async () => {
    if (isFirebaseConfigured && auth) {
      await signOut(auth);
    }
    setCurrentUser(null);
    setAccessToken(null);
  };

  const toggleDemoMode = () => {
    if (demoMode) {
      setDemoMode(false);
    } else {
      setDemoMode(true);
      if (!currentUser) {
        setCurrentUser({
          uid: "demo_user_01",
          displayName: "Demo Explorer",
          email: "demo@receiptscanner.app",
          photoURL: null
        });
        setAccessToken("demo_token_user");
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      accessToken,
      loading,
      demoMode,
      isFirebaseConfigured,
      loginWithGoogle,
      logout,
      toggleDemoMode
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
