# Production Deployment Guide — WorkTrip AI

## 1. Vercel Deployment Steps

1. **Push Code**: Push repository to GitHub/GitLab.
2. **Import Project into Vercel**: Connect repository to Vercel.
3. **Configure Environment Variables**:
   - Add all frontend (`VITE_*`) and backend variables from `.env.example` in Vercel Project Settings → Environment Variables.
4. **Deploy**:
   ```bash
   npx vercel --prod
   ```

---

## 2. Post-Deployment Checklist

- [ ] Firebase Auth authorized domain contains your production Vercel domain (`*.vercel.app`).
- [ ] Firestore Security Rules deployed via `firebase deploy --only firestore:rules`.
- [ ] MongoDB Atlas Network Access allows `0.0.0.0/0` (or Vercel IP range).
- [ ] Cron job active in Vercel Dashboard → Settings → Cron Jobs.
- [ ] Test Health Endpoint: `GET https://<your-domain>/api/v1/health`.
