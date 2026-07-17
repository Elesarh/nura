import React, { useState, useEffect } from 'react';
import { APP_VERSION, checkForUpdates } from '../updateChecker';
import { Button, Card } from './components';
import { Download, X, RefreshCw, Package } from 'lucide-react';

interface UpdateBannerProps {
  onDismiss?: () => void;
}

export function UpdateBanner({ onDismiss }: UpdateBannerProps) {
  const [updateInfo, setUpdateInfo] = useState<{ hasUpdate: boolean; version: string; url: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    // Check for updates on mount and every 30 minutes
    doCheck();
    const interval = setInterval(doCheck, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [dismissed]);

  const doCheck = async () => {
    setChecking(true);
    const info = await checkForUpdates();
    setUpdateInfo(info);
    setChecking(false);
  };

  if (dismissed || !updateInfo?.hasUpdate) return null;

  if (checking) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="p-4 flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
          <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin" />
          <span className="text-sm font-medium">بررسی آپدیت...</span>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-10 fade-in">
      <Card className="p-5 bg-emerald-50 dark:bg-emerald-900/30 border-2 border-emerald-400 dark:border-emerald-600 shadow-xl shadow-emerald-500/10">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-black text-sm text-emerald-800 dark:text-emerald-300">نسخه جدید موجود است!</h4>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">نسخه {updateInfo.version} آماده نصب است</p>
            <p className="text-[10px] text-emerald-500 dark:text-emerald-500 mt-1">نسخه فعلی: {APP_VERSION}</p>
            <div className="flex gap-2 mt-3">
              <a href={updateInfo.url} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors">
                <Download className="w-3.5 h-3.5" />
                دانلود نسخه جدید
              </a>
              <button onClick={() => { setDismissed(true); onDismiss?.(); }}
                      className="px-3 py-1.5 bg-emerald-200/50 dark:bg-emerald-800/50 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold hover:bg-emerald-200 dark:hover:bg-emerald-700 transition-colors">
                بعداً
              </button>
            </div>
          </div>
          <button onClick={() => { setDismissed(true); onDismiss?.(); }}
                  className="text-emerald-400 hover:text-emerald-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </Card>
    </div>
  );
}