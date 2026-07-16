import React, { useState, useRef } from 'react';
import { Card, Button } from '../../components';
import { UploadCloud, FileArchive, Package, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../ToastContext';

export default function ProjectUpdater() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'extracting' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith('.zip')) {
        setFile(selectedFile);
        setStatus('idle');
        setProgress(0);
      } else {
        showToast('لطفا فقط فایل ZIP انتخاب کنید', 'error');
        e.target.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const selectedFile = e.dataTransfer.files[0];
      if (selectedFile.name.endsWith('.zip')) {
        setFile(selectedFile);
        setStatus('idle');
        setProgress(0);
      } else {
        showToast('لطفا فقط فایل ZIP انتخاب کنید', 'error');
      }
    }
  };

  const simulateUpdate = async () => {
    if (!file) return;

    setStatus('uploading');
    setProgress(0);

    // Simulate upload
    for (let i = 0; i <= 100; i += 10) {
      setProgress(i);
      await new Promise(r => setTimeout(r, 200));
    }

    setStatus('extracting');
    setProgress(0);
    
    // Simulate extraction and installation
    const steps = [
      { p: 20, delay: 1000 },
      { p: 40, delay: 1500 },
      { p: 60, delay: 1200 },
      { p: 80, delay: 1000 },
      { p: 100, delay: 500 },
    ];

    try {
      for (const step of steps) {
        setProgress(step.p);
        await new Promise(r => setTimeout(r, step.delay));
      }
      
      setStatus('success');
      showToast('پروژه با موفقیت آپدیت شد', 'success');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setStatus('error');
      showToast('خطا در آپدیت پروژه', 'error');
    }
  };

  return (
    <Card className="p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 shadow-xl rounded-[32px] overflow-hidden relative h-full">
      <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-orange-400 to-red-500" />
      
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
          <Package className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">آپدیت پروژه (سورس کد)</h3>
          <p className="text-xs text-slate-400 font-medium mt-0.5">بارگذاری فایل زیپ و اعمال تغییرات جدید کدها</p>
        </div>
      </div>

      <div 
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
          file ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
        }`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !file && fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".zip" 
          className="hidden" 
        />
        
        {file ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
              <FileArchive className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white dir-ltr">{file.name}</p>
              <p className="text-xs text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            
            {status === 'idle' && (
              <Button onClick={(e) => { e.stopPropagation(); simulateUpdate(); }} className="mt-4 h-auto py-3.5 px-8 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold flex items-center justify-center flex-wrap gap-2 w-full sm:w-auto">
                <RefreshCw className="w-4 h-4 shrink-0" />
                شروع آپدیت سیستم
              </Button>
            )}
            
            {(status === 'uploading' || status === 'extracting') && (
              <div className="w-full max-w-xs mt-6 space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                  <span>{status === 'uploading' ? 'در حال آپلود...' : 'در حال جایگزینی فایل‌ها...'}</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${progress}%` }} 
                    className="h-full bg-orange-500" 
                  />
                </div>
              </div>
            )}
            
            {status === 'success' && (
              <div className="mt-4 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 rounded-xl">
                <CheckCircle className="w-5 h-5" />
                آپدیت با موفقیت انجام شد
              </div>
            )}
            
            {status === 'error' && (
              <div className="mt-4 flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm bg-red-50 dark:bg-red-500/10 px-4 py-2 rounded-xl">
                <AlertCircle className="w-5 h-5" />
                خطا در اعمال آپدیت
              </div>
            )}

            {(status === 'success' || status === 'error' || status === 'idle') && (
               <button 
                  onClick={(e) => { e.stopPropagation(); setFile(null); setStatus('idle'); }} 
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline mt-4"
               >
                 انتخاب فایل دیگر
               </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">برای انتخاب فایل زیپ کلیک کنید</p>
              <p className="text-xs text-slate-500">یا فایل را اینجا رها کنید (Drag & Drop)</p>
            </div>
            <div className="mt-4 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-lg inline-block">
              نکته: با این کار هیچ اطلاعاتی از دیتابیس حذف نخواهد شد.
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
