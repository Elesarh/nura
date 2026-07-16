import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Card, Button, TextField } from '../../components';
import { BotMessageSquare, Save, Settings, Receipt, HelpCircle, CheckCircle, List } from 'lucide-react';
import { useToast } from '../../ToastContext';

export default function CustomerBotSettings() {
  const [token, setToken] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('سلام! به ربات پشتیبانی و فروش خوش آمدید. 👋\nبرای مشاهده لایسنس‌ها از منوی زیر استفاده کنید.');
  const [helpMessage, setHelpMessage] = useState('راهنما:\n۱. برای خرید لایسنس روی دکمه "خرید لایسنس" کلیک کنید.\n۲. فیش واریزی را ارسال کنید.\n۳. پس از تایید مدیر، نام فروشگاه خود را بفرستید.\n۴. حساب کاربری شما ساخته شده و ارسال می‌گردد.');
  const [licensesText, setLicensesText] = useState('🔹 پلن ۱ ماهه: ۱۰۰,۰۰۰ تومان\n🔹 پلن ۳ ماهه: ۲۵۰,۰۰۰ تومان\n🔹 پلن ۱ ساله: ۹۰۰,۰۰۰ تومان\n\nشماره کارت جهت واریز:\n۱۲۳۴-۵۶۷۸-۱۲۳۴-۵۶۷۸');
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'receipts'>('config');

  const { showToast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'config', 'customer_bot'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setToken(data.token || '');
          setWelcomeMessage(data.welcomeMessage || welcomeMessage);
          setHelpMessage(data.helpMessage || helpMessage);
          setLicensesText(data.licensesText || licensesText);
        }
      } catch (err) {
        console.error('Error loading customer bot settings:', err);
      }
    };
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await setDoc(doc(db, 'config', 'customer_bot'), {
        token,
        welcomeMessage,
        helpMessage,
        licensesText,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      showToast('تنظیمات ربات مشتریان ذخیره شد', 'success');
    } catch (err: any) {
      showToast('خطا در ذخیره تنظیمات', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 shadow-xl rounded-[32px] overflow-hidden relative h-full">
      <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-blue-400 to-indigo-500" />
      
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <BotMessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">ربات تلگرام مشتریان (فروش)</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">مدیریت پیام‌ها، لایسنس‌ها و ساخت خودکار اکانت</p>
          </div>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'config' 
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            تنظیمات ربات
          </button>
          <button
            onClick={() => setActiveTab('receipts')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'receipts' 
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            درخواست‌ها و رسیدها
          </button>
        </div>
      </div>

      {activeTab === 'config' ? (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-1">
            <TextField
              label="توکن ربات مشتریان (متفاوت از ربات ادمین)"
              value={token}
              onChange={(e: any) => setToken(e.target.value)}
              placeholder="مثال: 123456789:ABC..."
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <BotMessageSquare className="w-4 h-4 text-blue-500" /> پیام خوش‌آمدگویی (Start)
              </label>
              <textarea
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                className="w-full h-32 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                placeholder="سلام..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-orange-500" /> پیام راهنما
              </label>
              <textarea
                value={helpMessage}
                onChange={(e) => setHelpMessage(e.target.value)}
                className="w-full h-32 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <List className="w-4 h-4 text-emerald-500" /> لیست لایسنس‌ها و شماره کارت
              </label>
              <textarea
                value={licensesText}
                onChange={(e) => setLicensesText(e.target.value)}
                className="w-full h-32 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-auto py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-lg shadow-indigo-600/20 flex flex-wrap items-center justify-center gap-2"
            >
              <Save className="w-4 h-4 shrink-0" />
              <span>{loading ? 'در حال ذخیره...' : 'ذخیره تنظیمات ربات و پیام‌ها'}</span>
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-center h-48 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex-col gap-3 text-slate-500">
             <Receipt className="w-8 h-8 opacity-50" />
             <p className="text-sm font-semibold">هیچ درخواست و رسید جدیدی یافت نشد</p>
             <p className="text-xs opacity-70 max-w-xs text-center">زمانی که مشتری فیش واریزی را در ربات ارسال کند و شما تایید کنید، سیستم به صورت خودکار اطلاعات فروشگاه را از کاربر دریافت کرده و پس از ساخت اکانت، اطلاعات ورود را برای او ارسال می‌کند.</p>
          </div>
        </div>
      )}
    </Card>
  );
}
