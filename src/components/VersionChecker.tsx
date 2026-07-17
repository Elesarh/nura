import React, { useState } from 'react';
import { checkForUpdates, getAppVersion, downloadApk, installApk } from '../updateChecker';
import { RefreshCw, Download, AlertTriangle, CheckCircle, X } from 'lucide-react';

export function VersionChecker() {
  const [version, setVersion] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const handleClick = async () => {
    if (checking) return;
    setChecking(true);
    setResult(null);
    try {
      const ver = await getAppVersion();
      setVersion(ver);
      const info = await checkForUpdates();
      if (info?.hasUpdate) {
        setResult({
          msg: `نسخه ${info.version} موجود است! برای دانلود کلیک کنید.`,
          type: 'info'
        });
      } else {
        setResult({
          msg: `نسخه ${ver} — آخرین نسخه`,
          type: 'success'
        });
      }
    } catch {
      setResult({ msg: 'خطا در بررسی آپدیت', type: 'error' });
    }
    setChecking(false);
  };

  const handleDownload = async () => {
    const info = await checkForUpdates();
    if (!info?.apkUrl) return;
    setResult({ msg: 'در حال دانلود...', type: 'info' });
    const blob = await downloadApk(info.apkUrl, () => {});
    if (blob) {
      await installApk(blob);
      setResult({ msg: 'فایل دانلود شد. آن را باز کنید و نصب کنید.', type: 'success' });
    } else {
      setResult({ msg: 'خطا در دانلود', type: 'error' });
    }
  };

  return (
    <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-800">
      <button
        onClick={handleClick}
        disabled={checking}
        className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
      >
        <span className="flex items-center gap-1.5">
          {checking ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : result?.type === 'success' ? (
            <CheckCircle className="w-3 h-3 text-emerald-500" />
          ) : (
            <Download className="w-3 h-3" />
          )}
          {version ? `نسخه ${version}` : 'نسخه اپ'}
        </span>
        <span>{checking ? 'در حال بررسی...' : 'بررسی آپدیت'}</span>
      </button>
      {result && (
        <div className={`mt-2 p-2 rounded-lg text-[10px] font-medium flex items-center gap-1.5 ${
          result.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' :
          result.type === 'error' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400' :
          'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
        }`}>
          <span className="flex-1">{result.msg}</span>
          {result.type === 'info' && (
            <button onClick={handleDownload} className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-bold underline-offset-2">
              دانلود
            </button>
          )}
          <button onClick={() => setResult(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}