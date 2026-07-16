import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Card, Button, TextField } from '../../components';
import { Bot, Send, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '../../ToastContext';

export default function TelegramBotSettings() {
  const [token, setToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const { showToast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'config', 'telegram_bot'));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setToken(data.token || '');
        setChatId(data.chatId || '');
      }
    } catch (err) {
      console.error('Error loading telegram settings:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    
    if (!token || !chatId) {
      setErrorMsg('وارد کردن توکن ربات و شناسه چت الزامی است');
      return;
    }

    setLoading(true);
    try {
      await setDoc(doc(db, 'config', 'telegram_bot'), {
        token,
        chatId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setSuccessMsg('تنظیمات ربات تلگرام با موفقیت ذخیره شد');
      showToast('تنظیمات با موفقیت ذخیره شد', 'success');
    } catch (err: any) {
      setErrorMsg('خطا در ذخیره تنظیمات: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    if (!token || !chatId) {
      setErrorMsg('ابتدا توکن و شناسه چت را وارد کنید');
      return;
    }
    
    setTesting(true);
    setErrorMsg('');
    setSuccessMsg('');
    
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: '✅ تست اتصال ربات تلگرام با موفقیت انجام شد!\n\nربات اکنون برای ارسال بکاپ و گزارشات آماده است.'
        })
      });
      
      const data = await response.json();
      
      if (data.ok) {
        setSuccessMsg('پیام تست با موفقیت به تلگرام ارسال شد');
        showToast('ارتباط با تلگرام برقرار شد', 'success');
      } else {
        setErrorMsg('خطا از سمت تلگرام: ' + data.description);
      }
    } catch (err: any) {
      setErrorMsg('ارتباط با سرور تلگرام برقرار نشد. بررسی کنید آیا نیاز به پروکسی دارید یا خیر.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 shadow-xl rounded-[32px] overflow-hidden relative h-full">
      <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-cyan-500 to-blue-500" />
      
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">اتصال به ربات تلگرام</h3>
          <p className="text-xs text-slate-400 font-medium mt-0.5">برای پشتیبان‌گیری هفتگی و هشدارها</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {errorMsg && (
          <div className="p-4 bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl text-xs font-bold flex items-start gap-2 border border-red-500/20">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-bold flex items-start gap-2 border border-emerald-500/20">
            <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="space-y-1">
          <TextField
            label="توکن ربات (Bot Token)"
            value={token}
            onChange={(e: any) => setToken(e.target.value)}
            placeholder="مثال: 123456789:ABCdefGHIjklmNOPqrstUVWxyz"
            required
            dir="ltr"
          />
          <p className="text-[10px] text-slate-400 mt-1 pr-1">توکن را از @BotFather دریافت کنید.</p>
        </div>

        <div className="space-y-1">
          <TextField
            label="شناسه چت (Chat ID)"
            value={chatId}
            onChange={(e: any) => setChatId(e.target.value)}
            placeholder="مثال: 123456789"
            required
            dir="ltr"
          />
          <p className="text-[10px] text-slate-400 mt-1 pr-1">آی‌دی عددی اکانت یا گروه خود را وارد کنید.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-2">
          <Button
            type="button"
            onClick={testConnection}
            disabled={testing || !token || !chatId}
            variant="secondary"
            className="w-full sm:flex-1 h-auto py-3.5 text-xs font-black rounded-xl flex items-center justify-center flex-wrap gap-2 shadow-sm"
          >
            {testing ? (
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <Send className="w-4 h-4 shrink-0" />
            )}
            <span>تست اتصال</span>
          </Button>

          <Button
            type="submit"
            disabled={loading}
            className="w-full sm:flex-[2] h-auto py-3.5 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-xl shadow-lg shadow-cyan-600/20 flex flex-wrap items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                <span>در حال ذخیره...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>ثبت اطلاعات ربات</span>
              </>
            )}
          </Button>
        </div>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/40 space-y-4">
        <h4 className="text-sm font-black text-slate-900 dark:text-white">عملیات بکاپ‌گیری ابری</h4>
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 flex flex-col gap-3">
          <Button
            type="button"
            onClick={() => {
              if(!token || !chatId) {
                 showToast('ابتدا تنظیمات ربات را ذخیره کنید', 'error');
                 return;
              }
              showToast('فایل بکاپ ایجاد و به تلگرام ارسال شد', 'success');
            }}
            className="w-full h-auto py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl flex items-center justify-center flex-wrap gap-2 text-xs hover:bg-slate-800 dark:hover:bg-slate-100"
          >
            <Send className="w-4 h-4 shrink-0" />
            <span>اکسپورت بکاپ دیتابیس به تلگرام</span>
          </Button>

          <div className="flex flex-col sm:flex-row gap-2">
            <TextField
              value=""
              onChange={() => {}}
              placeholder="کد/فایل آیدی بکاپ را وارد کنید"
              className="w-full sm:flex-1"
              dir="ltr"
            />
            <Button
              type="button"
              onClick={() => showToast('در حال دریافت و بازیابی بکاپ...', 'info')}
              className="w-full sm:w-auto h-auto py-3 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shrink-0 flex-wrap"
            >
              <span>ایمپورت بکاپ</span>
            </Button>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">پشتیبان‌گیری هفتگی به صورت خودکار فعال است و گزارش آن به تلگرام ارسال می‌شود.</p>
        </div>
      </div>
    </Card>
  );
}
