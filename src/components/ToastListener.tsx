import React, { useState, useEffect } from 'react';

interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'info';
}

export function ToastListener() {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as ToastMessage;
      setToast(detail);
      setTimeout(() => setToast(null), 3000);
    };
    document.addEventListener('nura-toast', handler);
    return () => document.removeEventListener('nura-toast', handler);
  }, []);

  if (!toast) return null;

  const bg = toast.type === 'success' ? 'bg-emerald-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] animate-in fade-in slide-in-from-top-2">
      <div className={`${bg} text-white px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm`}>
        {toast.message}
      </div>
    </div>
  );
}