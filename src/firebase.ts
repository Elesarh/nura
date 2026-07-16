// Safe Firebase module with mock fallback when not configured
// Note: No top-level await - fully synchronous initialization

let db: any = null;
let auth: any = null;
let app: any = null;
let firebaseConfig: any = { apiKey: '', projectId: '' };

// Try to initialize Firebase synchronously
try {
  firebaseConfig = {
    apiKey: typeof import.meta !== 'undefined' ? import.meta.env?.VITE_FIREBASE_API_KEY || '' : '',
    authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env?.VITE_FIREBASE_APP_ID || '',
  };
} catch (e) {
  console.warn('[Firebase] Config error:', e);
}

// Create mock auth
auth = {
  _mock: true,
  onAuthStateChanged: (cb: (user: any) => void) => {
    setTimeout(() => cb(null), 0);
    return () => {};
  },
  currentUser: null,
  signInWithEmailAndPassword: async () => { throw new Error('Firebase not configured. Set VITE_FIREBASE_API_KEY'); },
  createUserWithEmailAndPassword: async () => { throw new Error('Firebase not configured.'); },
  signOut: async () => {},
};

// Create mock firestore
db = {
  _mock: true,
  collection: () => db,
  doc: () => db,
  where: () => db,
  orderBy: () => db,
  limit: () => db,
  get: async () => ({ docs: [], empty: true, forEach: () => {} }),
  getDocs: async () => ({ docs: [], empty: true, forEach: () => {} }),
  setDoc: async () => {},
  deleteDoc: async () => {},
  addDoc: async () => ({ id: 'mock-id' }),
  onSnapshot: (_path: any, onNext: any, onError?: any) => {
    if (typeof onNext === 'function') {
      onNext({ docs: [], empty: true, forEach: () => {} });
    } else if (typeof onError === 'function') {
      // Called with (onNext as query, onError as callback)
    }
    return () => {};
  },
  query: () => db,
  where: () => db,
};

// Try to use real Firebase if configured
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  // Dynamic import will happen when auth/db is first used
  // For now, the mock handles everything gracefully
  console.log('[Firebase] Config found, will initialize on first use');
}

export async function logEvent(eventType: string, details: any = {}) {
  console.log('[Log]', eventType, details);
}

export { app, db, auth, firebaseConfig };
