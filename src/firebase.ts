// Safe Firebase module with mock fallback when not configured
// This prevents the app from crashing when Firebase is not set up

type MockFirestore = { _mock: true };
type MockAuth = { _mock: true; onAuthStateChanged: (cb: (user: any) => void) => () => void };

let db: any = null;
let auth: any = null;
let app: any = null;

// Try to initialize Firebase
try {
  // Dynamic import to avoid crashing if firebase isn't available
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  };

  if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    const { initializeApp } = await import('firebase/app');
    const { getFirestore } = await import('firebase/firestore');
    const { getAuth } = await import('firebase/auth');

    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log('[Firebase] Initialized');
  } else {
    console.warn('[Firebase] Not configured - using mock mode');
  }
} catch (e) {
  console.warn('[Firebase] Init failed, using mock:', e);
}

// Mock auth that never errors
if (!auth) {
  auth = {
    _mock: true,
    onAuthStateChanged: (cb: (user: any) => void) => {
      cb(null); // No user
      return () => {}; // Unsubscribe function
    },
    currentUser: null,
    signInWithEmailAndPassword: async () => { throw new Error('Firebase not configured'); },
    createUserWithEmailAndPassword: async () => { throw new Error('Firebase not configured'); },
    signOut: async () => {},
  };
}

// Mock firestore that silently ignores all operations
if (!db) {
  db = {
    _mock: true,
    collection: () => db,
    doc: () => db,
    where: () => db,
    orderBy: () => db,
    limit: () => db,
    get: async () => ({ docs: [], empty: true }),
    getDocs: async () => ({ docs: [], empty: true }),
    setDoc: async () => {},
    deleteDoc: async () => {},
    addDoc: async () => ({ id: 'mock-id' }),
    onSnapshot: (_: any, cb: any) => { cb({ docs: [], empty: true }); return () => {}; },
  };
}

export async function logEvent(eventType: string, details: any = {}) {
  console.log('[Log]', eventType, details);
}

export { app, db, auth };
