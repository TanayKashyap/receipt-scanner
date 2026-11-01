import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

// Check if Firebase is actually configured
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "your_firebase_api_key" &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== "your_project_id"
);

let app = null;
let auth = null;
let db = null;
let googleProvider = null;

if (isFirebaseConfigured) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    
    googleProvider = new GoogleAuthProvider();
    // PRD Scope Requirement: drive.file
    googleProvider.addScope("https://www.googleapis.com/auth/drive.file");
  } catch (err) {
    console.error("Firebase initialization failed:", err);
  }
}

export { auth, db, googleProvider };

// LocalStorage mock fallback receipts for Demo Mode
const LOCAL_STORAGE_KEY = "receipt_scanner_demo_records";

const INITIAL_DEMO_RECORDS = [
  {
    id: "rec_1",
    Store: "Tim Hortons",
    Date: "2026-10-28",
    Amount: 14.85,
    Drive_Image_URL: "https://drive.google.com/file/d/demo_receipt_1/view",
    notes: "Coffee & breakfast box",
    createdAt: new Date("2026-10-28T14:20:00").toISOString()
  },
  {
    id: "rec_2",
    Store: "Canadian Tire",
    Date: "2026-10-25",
    Amount: 89.99,
    Drive_Image_URL: "https://drive.google.com/file/d/demo_receipt_2/view",
    notes: "Home tools & winter wiper fluid",
    createdAt: new Date("2026-10-25T11:15:00").toISOString()
  },
  {
    id: "rec_3",
    Store: "Costco Wholesale",
    Date: "2026-10-22",
    Amount: 164.50,
    Drive_Image_URL: "https://drive.google.com/file/d/demo_receipt_3/view",
    notes: "Paper towels, pantry stock, olive oil",
    createdAt: new Date("2026-10-22T16:45:00").toISOString()
  },
  {
    id: "rec_4",
    Store: "Loblaws",
    Date: "2026-10-18",
    Amount: 42.40,
    Drive_Image_URL: "https://drive.google.com/file/d/demo_receipt_4/view",
    notes: "Fresh produce & organic milk",
    createdAt: new Date("2026-10-18T09:30:00").toISOString()
  }
];

function getLocalRecords() {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_RECORDS));
    return INITIAL_DEMO_RECORDS;
  }
  try {
    return JSON.parse(saved);
  } catch {
    return INITIAL_DEMO_RECORDS;
  }
}

// Database Operations
export async function saveReceiptRecord(userId, receiptData) {
  if (isFirebaseConfigured && db && userId && !userId.startsWith("demo_")) {
    try {
      const userReceiptsRef = collection(db, "users", userId, "receipts");
      const docRef = await addDoc(userReceiptsRef, {
        Store: receiptData.Store,
        Date: receiptData.Date,
        Amount: parseFloat(receiptData.Amount) || 0.0,
        Drive_Image_URL: receiptData.Drive_Image_URL || "",
        notes: receiptData.notes || "",
        createdAt: serverTimestamp()
      });
      return { id: docRef.id, ...receiptData };
    } catch (err) {
      console.error("Firestore save error, saving to local store:", err);
    }
  }

  // Fallback / Demo save
  const current = getLocalRecords();
  const newRecord = {
    id: `local_${Date.now()}`,
    Store: receiptData.Store,
    Date: receiptData.Date,
    Amount: parseFloat(receiptData.Amount) || 0.0,
    Drive_Image_URL: receiptData.Drive_Image_URL || "",
    notes: receiptData.notes || "",
    createdAt: new Date().toISOString()
  };
  const updated = [newRecord, ...current];
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  return newRecord;
}

export async function fetchUserReceipts(userId) {
  if (isFirebaseConfigured && db && userId && !userId.startsWith("demo_")) {
    try {
      const userReceiptsRef = collection(db, "users", userId, "receipts");
      const q = query(userReceiptsRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const list = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        let createdAtStr = "";
        if (data.createdAt) {
          if (typeof data.createdAt.toDate === "function") {
            createdAtStr = data.createdAt.toDate().toISOString();
          } else if (data.createdAt.seconds) {
            createdAtStr = new Date(data.createdAt.seconds * 1000).toISOString();
          } else {
            createdAtStr = String(data.createdAt);
          }
        }
        list.push({ 
          id: docSnap.id, 
          ...data,
          createdAt: createdAtStr || new Date().toISOString()
        });
      });
      return list;
    } catch (err) {
      console.warn("Firestore fetch error, returning local records:", err);
    }
  }

  return getLocalRecords();
}

export async function deleteReceiptRecord(userId, receiptId) {
  if (isFirebaseConfigured && db && userId && !userId.startsWith("demo_")) {
    try {
      const receiptDocRef = doc(db, "users", userId, "receipts", receiptId);
      await deleteDoc(receiptDocRef);
      return true;
    } catch (err) {
      console.error("Firestore delete error:", err);
    }
  }

  const current = getLocalRecords();
  const filtered = current.filter(r => r.id !== receiptId);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
  return true;
}
