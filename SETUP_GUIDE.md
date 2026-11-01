# Receipt Scanner — Manual Setup Guide

This guide walks you through setting up all necessary external cloud services: **Google Cloud**, **Firebase**, and **Google AI Studio (Gemini)**.

---

## 1. Google AI Studio (Gemini API Key)

The backend uses Gemini (Gemini 1.5/2.5 Flash/Pro) for zero-shot receipt entity extraction (`Store`, `Date`, `Amount`).

1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **Get API key** in the top navigation / sidebar.
4. Click **Create API key** (you can create one in a new or existing Google Cloud project).
5. Copy the generated key.
6. Set it in `backend/.env`:
   ```bash
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

---

## 2. Google Cloud Console (Drive & Sheets OAuth)

The app accesses the user's personal Google Drive and Google Sheets using the restricted `https://www.googleapis.com/auth/drive.file` scope.

### Step 2.1: Create or Select a Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g. `receipt-scanner-app`) or select an existing one.

### Step 2.2: Enable Required APIs
In the Google Cloud Console search bar, search for and enable each of these APIs:
1. **Google Drive API**
2. **Google Sheets API**

### Step 2.3: Configure the OAuth Consent Screen
1. In the sidebar, navigate to **APIs & Services** > **OAuth consent screen**.
2. Select **External** (unless you are using Google Workspace internal accounts) and click **Create**.
3. Fill in:
   - **App name**: `Receipt Scanner`
   - **User support email**: your email
   - **Developer contact information**: your email
4. Click **Save and Continue**.
5. On the **Scopes** page:
   - Click **Add or Remove Scopes**.
   - Filter and select:
     - `https://www.googleapis.com/auth/drive.file` ("See, edit, create, and delete only the specific Google Drive files you use with this app")
   - Click **Update** and **Save and Continue**.
6. On the **Test Users** page:
   - Add your own Google email address (while the app is in "Testing" mode, only listed test users can authenticate).
7. Save and finish.

### Step 2.4: Create OAuth 2.0 Client Credentials
1. Go to **APIs & Services** > **Credentials**.
2. Click **Create Credentials** > **OAuth client ID**.
3. Application type: **Web application**.
4. Name: `Receipt Scanner Web Client`.
5. **Authorized JavaScript origins**:
   - `http://localhost:5173` (Frontend dev server)
   - `http://localhost:3000`
   - Your production frontend domain (e.g. `https://your-app.web.app`)
6. **Authorized redirect URIs**:
   - `http://localhost:5173`
   - Firebase Auth handler: `https://<YOUR_FIREBASE_PROJECT_ID>.firebaseapp.com/__/auth/handler`
7. Click **Create** and copy your **Client ID** and **Client Secret**.

---

## 3. Firebase Project (Authentication & Firestore)

Firebase handles Google Single Sign-On (SSO) and Firestore stores user receipt metadata.

### Step 3.1: Create Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and link it to the Google Cloud Project you created in Step 2 (or create a new one).
3. Disable Google Analytics (optional, for speed) and click **Create Project**.

### Step 3.2: Enable Google Authentication
1. In the Firebase console left menu, go to **Build** > **Authentication**.
2. Click **Get Started**.
3. Under the **Sign-in method** tab, choose **Google**.
4. Enable the toggle.
5. Set your support email.
6. Under **Web SDK configuration**, expand it and make sure your Google OAuth Client ID and Secret from Step 2 match.
7. Click **Save**.

### Step 3.3: Enable Cloud Firestore
1. In the Firebase console left menu, go to **Build** > **Firestore Database**.
2. Click **Create database**.
3. Choose a region (e.g., `us-central1`).
4. Select **Start in test mode** for development, or use these security rules for production:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/receipts/{receiptId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```
5. Click **Enable**.

### Step 3.4: Register Web App & Get Firebase Config
1. In Firebase Console, click the Gear icon (Project Settings) > **General**.
2. Scroll down to **Your apps** and click the **Web icon (`</>`)**.
3. App nickname: `Receipt Scanner Web`.
4. (Optional) Check "Also set up Firebase Hosting".
5. Register app and copy the `firebaseConfig` object:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`
6. Add these to `frontend/.env`:
   ```bash
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:...
   VITE_API_BASE_URL=http://localhost:8000
   ```

---

## 4. Google Cloud Run Deployment (Backend)

The backend is built with FastAPI and packaged in a lightweight Docker container.

### Step 4.1: Prerequisites
- Install Google Cloud CLI (`gcloud`): [https://cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)
- Log in and set your project:
  ```bash
  gcloud auth login
  gcloud config set project YOUR_PROJECT_ID
  ```

### Step 4.2: Build and Deploy to Cloud Run
Run from the `backend/` directory:
```bash
# Submit build to Cloud Build
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/receipt-scanner-backend

# Deploy to Cloud Run (fully managed serverless)
gcloud run deploy receipt-scanner-backend \
  --image gcr.io/YOUR_PROJECT_ID/receipt-scanner-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=YOUR_GEMINI_KEY
```

Once deployed, copy the Cloud Run service URL and update `VITE_API_BASE_URL` in your frontend environment.

---

## 5. Summary of Environment Variables

### Backend (`backend/.env`)
| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio Gemini API Key |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins (e.g. `http://localhost:5173,https://your-domain.com`) |
| `PORT` | Server port (default: `8000`) |

### Frontend (`frontend/.env`)
| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | URL of FastAPI backend (`http://localhost:8000` or Cloud Run URL) |
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase Web App ID |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Web Client ID |

*Note: For local testing without credentials, the app includes a Demo / Sandbox toggle so you can immediately inspect and test the full UI, camera scanner, correction loop, and simulated exports!*
