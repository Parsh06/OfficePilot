# Environment Variables & Configuration — WorkTrip AI

## 1. Variable Reference Matrix

| Variable | Scope | Required | Description | Example / Notes |
|---|---|---|---|---|
| `VITE_APP_NAME` | Client | Yes | UI Title & Branding | `WorkTrip AI` |
| `VITE_APP_ENV` | Client | Yes | Runtime Mode | `production` / `development` |
| `VITE_API_BASE_URL` | Client | No | Custom API Host | Blank for same-domain serverless |
| `VITE_FIREBASE_API_KEY` | Client | Yes | Firebase Web Client Key | `client-key-string` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Client | Yes | Auth Domain for OAuth | `project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Client | Yes | GCP Project ID | `worktrip-ai-prod` |
| `VITE_FIREBASE_STORAGE_BUCKET`| Client | Yes | Storage Bucket URI | `worktrip-ai-prod.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Client | Yes | Cloud Messaging Sender | `123456789012` |
| `VITE_FIREBASE_APP_ID` | Client | Yes | Firebase Application ID | `1:123:web:abc` |
| `FIREBASE_PROJECT_ID` | Server | Yes | Admin Service Account Project | Matches `VITE_FIREBASE_PROJECT_ID` |
| `FIREBASE_CLIENT_EMAIL` | Server | Yes | Service Account Email | `firebase-adminsdk@...` |
| `FIREBASE_PRIVATE_KEY` | Server | Yes | Service Account Private Key | Wrapped in quotes with `\n` |
| `MONGODB_URI` | Server | Yes | MongoDB Atlas Connection String| `mongodb+srv://...` |
| `MONGODB_DB_NAME` | Server | Yes | Database Name | `worktrip_ai` |
| `GROQ_API_KEY` | Server | Yes | Groq AI Inference Key | `gsk_...` |
| `GROQ_MODEL_FAST` | Server | Yes | Fast Inference Model | `llama-3.1-8b-instant` |
| `GROQ_MODEL_REASONING` | Server | Yes | Reasoning Model | `llama-3.3-70b-versatile` |
| `CRON_SECRET` | Server | Yes | Bearer Token for Vercel Cron | Min 32 characters |
| `FCM_SERVER_KEY` | Server | No | Firebase Cloud Messaging Key | Optional for push notifications |

---

## 2. Security Boundaries

- **Client Variables (`VITE_*`)**:
  - Bundled into client JavaScript.
  - Safe for public exposure (Firebase Web API keys are non-secret identifiers).
- **Server Variables**:
  - Injected directly into Vercel Serverless Function runtime.
  - **Never prefixed with `VITE_`** to prevent bundling.
  - Enforced via `.gitignore` to prevent repository leaks.
