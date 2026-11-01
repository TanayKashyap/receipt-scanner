# Receipt Scanner Web App (PWA)

A mobile-responsive Progressive Web App (PWA) to digitize, verify, and organize physical receipts with zero manual friction. Powered by Google Gemini AI, Google Drive archiving, and formatted Google Sheets export.

---

## 🌟 Highlights & Features

- **📱 Mobile-First PWA:** Fast, responsive, installable on iOS and Android with camera integration and offline caching.
- **✨ Gemini AI OCR:** Instant entity extraction (`Store`, `Date`, `Amount`) using Gemini Multimodal models with strict schema enforcement.
- **🔍 The Human-in-the-Loop Correction Loop:** High-res preview with interactive pan/zoom alongside editable fields to verify or tweak parsed receipts before committing.
- **📁 Google Drive Archiving:** Automatically stores receipt images in your dedicated Google Drive folder (`Receipt_Scanner_App/Images/`) using the user-restricted `drive.file` scope.
- **📊 Formatted Google Sheets Export:** Generates beautifully organized Google Sheets grouped by store and sorted chronologically with headers, styling, and sums.
- **🔒 Privacy-Focused Auth:** Direct Google Single Sign-On (SSO) with restricted permissions protecting the rest of your Drive.
- **☁️ Cloud Run Ready:** Containerized Python FastAPI backend ready for Google Cloud Run free-tier deployment.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Frontend (PWA)                       │
│    React + Vite + Vanilla CSS System (Modern Glass)   │
│  - WebRTC / Camera Capture                             │
│  - Interactive Side-by-Side Correction Loop           │
│  - Firebase Auth (Google SSO + drive.file scope)      │
│  - Firestore Client Sync                              │
└───────────────┬────────────────────────▲───────────────┘
                │                        │
         REST API (FastAPI)       Direct Google SSO
                │                        │
┌───────────────▼────────────────────────┴───────────────┐
│              Backend Service (FastAPI)                 │
│  - /api/ocr: Gemini 1.5/2.5 Flash/Pro OCR Extractor    │
│  - /api/drive/upload: Google Drive v3 Image Archiving  │
│  - /api/sheets/export: Google Sheets v4 Grouped Export │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
                ▼                        ▼
       Google AI Studio             Google Drive
       (Gemini Models)            & Google Sheets
```

---

## 🚀 Sprint Progress

| Sprint | Description | Status |
|---|---|---|
| **Sprint 1** | Architecture, Monorepo Setup, Docker, Documentation & Manual Setup Guide | ✅ Completed |
| **Sprint 2** | Backend Core Services (Gemini OCR, Google Drive & Sheets APIs, FastAPI Endpoints & Tests) | 🔄 In Progress |
| **Sprint 3** | Frontend PWA UI & Design System (Camera, Correction Loop, Dashboard, Glassmorphism) | ⏳ Next |
| **Sprint 4** | Firebase Auth Integration, Firestore Storage, End-to-End Testing & Verification | ⏳ Next |

---

## 🛠️ Quickstart

### 1. Manual Setup
See [SETUP_GUIDE.md](SETUP_GUIDE.md) for full instructions on configuring Google Cloud OAuth, Firebase Auth/Firestore, and the Gemini API key.

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
# source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Visit `http://localhost:5173` to open the app!
