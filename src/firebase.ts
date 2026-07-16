import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, serverTimestamp, query, where, orderBy, limit, getDocs, deleteDoc, addDoc, onSnapshot as fsOnSnapshot } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User } from 'firebase/auth';

// Firebase configuration — hardcoded from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyAxFLKZQHEYG1qxYNJioDiRxgrx-vreXwQ",
  authDomain: "nura-test-4e93c.firebaseapp.com",
  projectId: "nura-test-4e93c",
  storageBucket: "nura-test-4e93c.firebasestorage.app",
  messagingSenderId: "980243818771",
  appId: "1:980243818771:web:677ef79ab02289340b92e6"
};

// Initialize Firebase
let app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
let db = getFirestore(app);
let auth = getAuth(app);

export {
  app, db, auth, firebaseConfig,
  // Re-export Firestore utilities
  collection, doc, setDoc, serverTimestamp, query, where, orderBy, limit, getDocs, deleteDoc, addDoc, fsOnSnapshot as onSnapshot,
  // Re-export Auth utilities
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
};
export type { User };

// Log events to Firestore for admin monitoring
export async function logEvent(eventType: string, details: any = {}) {
  try {
    const logRef = doc(collection(db, 'logs'));
    await setDoc(logRef, {
      type: eventType,
      details,
      timestamp: serverTimestamp(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    });
  } catch (e) {
    console.warn('[Log] Failed:', e);
  }
}
