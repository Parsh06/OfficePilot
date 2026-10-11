# Firestore Security Rules — WorkTrip AI

## 1. Security Rules Implementation

Firestore rules enforce strict document-level tenant isolation, ensuring authenticated users can only read and write their own documents.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Global Helper Functions
    function isAuthenticated() {
      return request.auth != null && request.auth.uid != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // User Profile Document
    match /users/{userId} {
      allow read: if isOwner(userId);
      allow create: if isOwner(userId);
      allow update: if isOwner(userId);
      allow delete: if isOwner(userId);

      // User Preferences Subcollection
      match /preferences/{docId} {
        allow read, write: if isOwner(userId);
      }

      // Work Schedule Configuration Subcollection
      match /workSchedules/{docId} {
        allow read, write: if isOwner(userId);
      }

      // Travel Profile Subcollection
      match /travelProfiles/{docId} {
        allow read, write: if isOwner(userId);
      }

      // Accommodation Profile Subcollection
      match /accommodationProfiles/{docId} {
        allow read, write: if isOwner(userId);
      }

      // Expense Defaults Subcollection
      match /expenseDefaults/{docId} {
        allow read, write: if isOwner(userId);
      }

      // Schedule Exceptions Subcollection
      match /scheduleExceptions/{exceptionId} {
        allow read, write: if isOwner(userId);
      }
    }
  }
}
```

---

## 2. Deployment Instructions

Deploy rules using Firebase CLI:
```bash
firebase deploy --only firestore:rules
```
