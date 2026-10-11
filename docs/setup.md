# Local Setup & Development Guide — WorkTrip AI

This guide walks through configuring and running WorkTrip AI locally.

---

## 1. Prerequisites

- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **Package Manager**: `npm`
- **Git**: Installed and configured
- **Firebase Account**: Access to Firebase Console (Auth + Firestore enabled)
- **MongoDB Atlas**: Free M0 cluster or local MongoDB instance

---

## 2. Installation Steps

```bash
# 1. Clone the project repository
git clone <repo-url>
cd Project

# 2. Install all dependencies
npm install

# 3. Create local environment file
cp .env.example .env
```

---

## 3. Environment Variable Configuration

Edit `.env` and fill in the required credentials:

```bash
# Frontend (Client Public)
VITE_APP_NAME="WorkTrip AI"
VITE_FIREBASE_API_KEY="your_api_key"
VITE_FIREBASE_AUTH_DOMAIN="your_project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your_project_id"
VITE_FIREBASE_STORAGE_BUCKET="your_project.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
VITE_FIREBASE_APP_ID="your_app_id"

# Backend (Server Private)
MONGODB_URI="mongodb+srv://<user>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority"
MONGODB_DB_NAME="worktrip_ai"
FIREBASE_PROJECT_ID="your_project_id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@your_project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GROQ_API_KEY="gsk_..."
GROQ_MODEL_FAST="llama-3.1-8b-instant"
GROQ_MODEL_REASONING="llama-3.3-70b-versatile"
CRON_SECRET="your_32_character_secret_token"
```

---

## 4. Development Workflow Commands

```bash
# Run local Vite development server
npm run dev

# Run Vitest test suite
npm test

# Watch mode for testing
npm run test:watch

# Run TypeScript typecheck
npm run typecheck

# Run linter
npm run lint

# Build production bundle
npm run build
```
