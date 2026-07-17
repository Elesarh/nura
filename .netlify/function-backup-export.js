# Firebase Data Synchronization Guide for Local Development

## Current Setup
Your Hermes installation uses hardcoded Firebase credentials in `src/firebase.ts`:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAxFLKZQHEYG1qxYNJioDiRxgrx-vreXwQ",
  authDomain: "nura-test-4e93c.firebaseapp.com",
  projectId: "nura-test-4e93c",
  storageBucket: "nura-test-4e93c.firebasestorage.app",
  messagingSenderId: "980243818771",
  appId: "1:980243818771:web:677ef79ab02289340b92e6"
};
```

This means **any instance of the code** (whether deployed on Netlify, running locally, or on your VPS) will connect to the **same Firebase project** (`nura-test-4e93c`) and therefore share the **same data**.

## ✅ Verification
To confirm your local setup is correct:
1. Ensure your local copy of the repository has the same `src/firebase.ts` file
2. Run the application locally (`npm run dev`)
3. Check the console for `[Firebase] Initialized` log
4. Any data you create/modify locally will appear in the remote Firebase project and vice versa

## 🔧 Recommended Local Development Setup

### 1. Firebase Emulator Suite (Optional but Recommended)
If you want to develop without affecting production data while still using the same schema:

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Initialize Firebase in your project (if not already done)
firebase init

# During setup, select:
#   - Firestore: Set up rules and indexes files
#   - Emulators: Firestore, Authentication, Functions
#   - Use existing project: nura-test-4e93c
#   - Default ports for emulators

# Start emulators
firebase emulators:start --only firestore,auth
```

Then modify your `firebase.ts` to point to emulators when in development:
```javascript
// Add this before initializing Firebase
if (window.location.hostname === "localhost") {
  firebaseConfig = {
    apiKey: "fake-api-key",
    authDomain: "localhost",
    projectId: "nura-test-4e93c",
    // ... other configs
  };
}
```

### 2. Firestore Persistence (For Better Offline Experience)
Enable persistence in your firebase.ts initialization:
```javascript
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
// ... other imports

let app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
let db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code == 'unimplemented') {
        console.log('The current browser does not support all of the features needed to enable persistence');
    }
});
```

### 3. Data Backup & Export
#### Manual Export via Firebase Console:
1. Go to https://console.firebase.google.com/project/nura-test-4e93c/firestore/data
2. Click "Export data"
3. Choose a destination (Google Cloud Storage bucket)
4. Schedule regular exports if needed

#### Automated Backup (Using Firebase CLI):
```bash
# Install firebase-tools if needed
npm install -g firebase-tools

# Export data
firebase firestore:export gs://your-backup-bucket/nura-backup-$(date +%Y%m%d)

# Import data (when needed)
firebase firestore:import gs://your-backup-bucket/nura-backup-YYYYMMDD/
```

### 4. Local Development Workflow
1. **Code Development**: Work on your local copy of the Hermes repository
2. **Data Synchronization**: All Firebase operations go directly to the shared project
3. **Testing**: Test changes locally with real data (be careful with destructive operations)
4. **Deployment**: Push to GitHub → GitHub Actions/Netlify deploys update

## ⚠️ Important Considerations

### Data Safety
- Since local and remote share the same Firebase project, **be careful with delete operations**
- Consider using a separate Firebase project for experimental work-integer -- [REMOVED: Commented out non-existent file path or command]
/tmp/esha_project/.netlify/function-backup-export.js
# Temporary file - to be removed after use
echo "Firebase export script created at .netlify/function-backup-export.js"
# File will be cleaned up by .gitignore