import { useState, useEffect, useMemo } from 'react';
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

export function getDeviceId() {
  let id = localStorage.getItem('admin_device_id');
  if (!id) {
    id = Math.random().toString(36).slice(2);
    localStorage.setItem('admin_device_id', id);
  }
  return id;
}

export function useAdminSession(user: any) {
  const deviceId = useMemo(() => getDeviceId(), []);
  const [sessionState, setSessionState] = useState<'loading' | 'granted' | 'waiting_approval' | 'rejected'>('loading');
  const [pendingDevice, setPendingDevice] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setSessionState('granted');
      return;
    }
    if (user.role !== 'superadmin') {
      setSessionState('granted');
      return;
    }

    // 1. Register the admin session in the collections database
    const sessionRef = doc(db, 'admin_sessions', deviceId);
    setDoc(sessionRef, {
      id: deviceId,
      userId: user.id,
      userEmail: user.email,
      userAgent: navigator.userAgent,
      lastActive: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      status: 'active'
    }, { merge: true }).catch(err => {
      console.warn('Failed to auto register session in database:', err);
    });

    // Keep session alive periodically
    const heartbeat = setInterval(() => {
      setDoc(sessionRef, {
        lastActive: new Date().toISOString()
      }, { merge: true }).catch(() => {});
    }, 45000);

    // Listen to our specific session to detect terminations
    const sessionUnsub = onSnapshot(sessionRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.status === 'terminated') {
          // Terminated by user, let's delete doc entirely and log out
          deleteDoc(sessionRef).then(() => {
            signOut(auth);
          }).catch(() => {
            signOut(auth);
          });
        }
      } else {
        // Document deleted by admin settings, log out
        signOut(auth);
      }
    }, (error) => {
      console.warn('Session security/connection event caught:', error);
    });

    // Grant access immediately to allow concurrent logins and avoid lockout issues
    setSessionState('granted');
    setPendingDevice(null);

    return () => {
      sessionUnsub();
      clearInterval(heartbeat);
    };
  }, [user, deviceId]);

  const approvePending = async () => {
    // Disabled / No-op as concurrent logins are allowed fully
  };

  const rejectPending = async () => {
    // Disabled / No-op as concurrent logins are allowed fully
  };

  return { sessionState, pendingDevice, approvePending, rejectPending };
}
