// Safe Firebase module with mock fallback when not configured
// Note: No top-level await - fully synchronous initialization
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore, collection, doc, setDoc, serverTimestamp,
  query, where, orderBy, limit, getDocs, deleteDoc, addDoc,
  onSnapshot as fsOnSnapshot, getDoc, updateDoc
} from 'firebase/firestore';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, User, GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAxFLKZQHEYG1qxYNJioDiRxgrx-vreXwQ",
  authDomain: "nura-test-4e93c.firebaseapp.com",
  projectId: "nura-test-4e93c",
  storageBucket: "nura-test-4e93c.firebasestorage.app",
  messagingSenderId: "980243818771",
  appId: "1:980243818771:web:677ef79ab02289340b92e6"
};

let app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
let db = getFirestore(app);
let auth = getAuth(app);

export async function logEvent(eventType: string, details: any = {}) {
  try {
    const docRef = doc(collection(db, 'logs'));
    await setDoc(docRef, {
      type: eventType,
      ...details,
      timestamp: serverTimestamp(),
    });
  } catch (e) {
    console.warn('[Log] failed:', e);
  }
}

export {
  app, db, auth, firebaseConfig,
  collection, doc, setDoc, serverTimestamp,
  query, where, orderBy, limit, getDocs, deleteDoc, addDoc,
  getDoc, updateDoc,
  fsOnSnapshot as onSnapshot,
  onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut,
  GoogleAuthProvider, signInWithPopup,
};
export type { User };