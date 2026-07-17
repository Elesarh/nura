import React, { useState, useEffect, useCallback } from 'react';
import { APP_VERSION, checkForUpdates, downloadApk, installApk } from '../updateChecker';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

export function UpdateModal() {
  const [updateInfo, setUpdateInfo] = useState<{
    hasUpdate: boolean;
    version: string;
    url: string;
    apkUrl?: string;
  } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Download state
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState('');
  const [downloaded, setDownloaded] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (dismissed) return;
    const doCheck = async () => {
      const info = await checkForUpdates();
      setUpdateInfo(info);
      if (info?.hasUpdate) {
        // Show modal after 1.5s delay (after login/load)
        setTimeout(() => setShowModal(true), 1500);
      }
    };
    doCheck();
    const interval = setInterval(doCheck, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [dismissed]);

  const handleDownload = useCallback(async () => {
    if (!updateInfo?.apkUrl) return;
    setDownloading(true);
    setError('');

    try {
      const blob = await downloadApk(updateInfo.apkUrl, (pct, spd) => {
        setProgress(pct);
        setSpeed(spd);
      });

      if (!blob) {
        setError('خطا در دانلود. لطفاً از طریق دکمه دستی اقدام کنید.');
        setDownloading(false);
        return;
      }

      setProgress(100);
      setDownloaded(true);
      setInstalling(true);

      const success = await installApk(blob);
      if (success) {
        setTimeout(() => {
          setInstalling(false);
          setShowModal(false);
          setDismissed(true);
        }, 2000);
      } else {
        setError('لطفاً فایل را از پوشه Downloads نصب کنید.');
        setInstalling(false);
      }
    } catch (e: any) {
      setError(e.message || 'خطا در دانلود');
    }
    setDownloading(false);
  }, [updateInfo]);

  if (!showModal || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={() => { if (!downloading && !installing) setShowModal(false); }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="max-w-sm w-full"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-indigo-100 dark:border-indigo-900/50 overflow-hidden">
            
            {/* Header gradient */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 text-white relative overflow-hidden">
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Download className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-black">نسخه جدید موجود است!</h2>
                  <p className="text-sm text-white/80 font-medium">NURA {updateInfo?.version || ''}</p>
                </div>
              </div>
              <button
                onClick={() => { if (!downloading && !installing) setShowModal(false); }}
                className="absolute top-4 left-4 text-white/60 hover:text-white transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
              {!downloading && !downloaded && !error && (
                <>
                  <div className="flex items-center gap-3 mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
                      نسخه فعلی شما <span className="font-black">{APP_VERSION}</span> است. نسخه جدید با قابلیت‌های بیشتر و بهبودها آماده شده است.
                    </p>
                  </div>

                  <button
                    onClick={handleDownload}
                    className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    دانلود و نصب نسخه جدید
                  </button>

                  <div className="mt-3 text-center">
                    <button
                      onClick={() => setShowModal(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium"
                    >
                      بعداً انجام می‌دهم
                    </button>
                  </div>
                </>
              )}

              {/* Progress */}
              {downloading && !downloaded && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">در حال دانلود...</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">{progress}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>دریافت: {progress}%</span>
                    <span>سرعت: {speed}</span>
                  </div>
                </div>
              )}

              {/* Downloaded */}
              {downloaded && !error && (
                <div className="text-center py-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-16 h-16 mx-auto mb-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"
                  >
                    {installing ? (
                      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                    ) : (
                      <CheckCircle className="w-8 h-8 text-emerald-500" />
                    )}
                  </motion.div>
                  <p className="text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                    {installing ? 'در حال نصب...' : 'دانلود کامل شد!'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {installing ? 'فایل در حال ذخیره در پوشه Downloads است' : 'فایل در پوشه Downloads ذخیره شد'}
                  </p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                    <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
                  </div>
                  <a
                    href={updateInfo?.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full block text-center py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    دانلود دستی از GitHub
                  </a>
                  <button
                    onClick={handleDownload}
                    className="w-full py-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                  >
                    تلاش مجدد
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}