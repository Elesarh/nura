import React, { useState, useEffect } from 'react';
import { db, auth, logEvent } from '../../firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, getDocs } from 'firebase/firestore';
import { updatePassword, updateEmail, reauthenticateWithCredential, EmailAuthProvider, verifyBeforeUpdateEmail } from 'firebase/auth';
import { User } from '../../types';
import { Card, Button, ErrorWidget, TextField } from '../../components';
import { Shield, Key, Eye, EyeOff, Laptop, CheckCircle, Trash2, ShieldAlert, LogOut, RefreshCw, Send, AlertCircle, Info, Lock, Star, Network, Server, DownloadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../ToastContext';
import { getDeviceId } from '../../useAdminSession';
import TelegramBotSettings from './TelegramBotSettings';
import DatabaseProvisioningSettings from './DatabaseProvisioningSettings';
import ProjectUpdater from './ProjectUpdater';
import CustomerBotSettings from './CustomerBotSettings';
import RecoverySettings from './RecoverySettings';
import AIApiSettings from './AIApiSettings';

type Session = {
  id: string;
  userId: string;
  userEmail: string;
  userAgent: string;
  createdAt: string;
  lastActive: string;
  status: string;
};

export default function SettingsView({ user }: { user: User }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  
  // Tab Management
  const [activeTab, setActiveTab] = useState('security');

  // Password / Credentials change state
  const [email, setEmail] = useState(user.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [credLoading, setCredLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetProgress, setResetProgress] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetError, setResetError] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { showToast } = useToast();
  const currentDeviceId = getDeviceId();

  // Load Sessions
  useEffect(() => {
    if (!user) return;

    const sessionsQuery = query(
      collection(db, 'admin_sessions'),
      where('userId', '==', user.id)
    );

    const unsub = onSnapshot(sessionsQuery, (snap) => {
      const listData = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as Session));

      listData.sort((a, b) => {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      setSessions(listData);
      setSessionsLoading(false);
    }, (err) => {
      console.error('Error fetching sessions:', err);
      showToast('خطا در دریافت لیست دستگاه‌های فعال', 'error');
    });

    return () => unsub();
  }, [user, currentDeviceId]);

  const terminateSession = async (sessionId: string) => {
    const primarySessionId = sessions[0]?.id;
    const isCurrentPrimary = currentDeviceId === primarySessionId;

    if (sessionId === currentDeviceId) {
      showToast('شما نمی‌توانید نشست فعلی خود را از اینجا حذف کنید', 'info');
      return;
    }

    if (!isCurrentPrimary) {
      showToast('خطای دسترسی: تنها دستگاه مرجع (اولین ورود) امکان قطع دسترسی سایر دستگاه‌ها را دارد', 'error');
      return;
    }

    if (!window.confirm('آیا از قطع دسترسی و خروج این دستگاه اطمینان دارید؟')) {
      return;
    }

    try {
      const sessionRef = doc(db, 'admin_sessions', sessionId);
      await updateDoc(sessionRef, { status: 'terminated' });
      
      logEvent({
        type: 'admin',
        userId: user.id,
        userEmail: user.email,
        action: 'TERMINATE_SESSION',
        details: `Terminated active admin session with DeviceID: ${sessionId} by Primary Admin Device`
      });

      showToast('نشست هدف با موفقیت قطع گردید و دستگاه مربوطه خارج شد', 'success');
    } catch (err: any) {
      console.error('Error terminating session:', err);
      showToast('خطا در غیرفعال‌سازی نشست', 'error');
    }
  };

  const parseUserAgent = (ua: string) => {
    if (!ua) return { browser: 'مرورگر ناشناس', os: 'سیستم‌عامل ناشناس' };
    
    let browser = 'مرورگر استاندارد';
    let os = 'سیستم‌عامل نامشخص';

    if (ua.includes('Firefox')) browser = 'Mozilla Firefox';
    else if (ua.includes('Chrome')) browser = 'Google Chrome';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Apple Safari';
    else if (ua.includes('Edge')) browser = 'Microsoft Edge';
    else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

    if (ua.includes('Windows')) os = 'ویندوز';
    else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'لینوکس';
    else if (ua.includes('Android')) os = 'اندروید';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    return { browser, os };
  };

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentPassword) {
      setErrorMsg('برای انجام تغییرات، وارد کردن رمز عبور فعلی الزامی است');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setErrorMsg('رمز عبور جدید باید حداقل حاوی ۶ کاراکتر باشد');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setErrorMsg('تاییدیه رمز عبور با رمز عبور جدید همخوانی ندارد');
      return;
    }

    setCredLoading(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        throw new Error('کاربر فعلی یافت نشد یا غیرفعال است');
      }

      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      if (newPassword) {
        await updatePassword(currentUser, newPassword);
      }

      const isEmailChanging = email.trim().toLowerCase() !== currentUser.email.toLowerCase();
      if (isEmailChanging) {
        const newEmailTrim = email.trim().toLowerCase();
        const oldUid = currentUser.uid;
        sessionStorage.setItem('creating_superadmin_email', newEmailTrim);

        try {
          try {
            await updateEmail(currentUser, newEmailTrim);
            await updateDoc(doc(db, 'users', oldUid), {
              email: newEmailTrim,
              updatedAt: new Date().toISOString()
            });

            logEvent({
              type: 'admin',
              userId: user.id,
              userEmail: user.email,
              action: 'UPDATE_EMAIL',
              details: `Admin changed core email to: ${newEmailTrim}`
            });
            
            showToast('ایمیل مدیریت با موفقیت تغییر یافت', 'success');
          } catch (directErr: any) {
            console.warn('Direct email update failed, trying verifyBeforeUpdateEmail:', directErr);
            
            await verifyBeforeUpdateEmail(currentUser, newEmailTrim);
            
            setSuccessMsg('لینک فعال‌سازی و تایید به ایمیل جدید ارسال شد. لطفاً صندوق ورودی خود را بررسی کرده و روی لینک کلیک کنید تا تغییر نهایی شود.');
            showToast('لینک تایید ارسال شد', 'info');
            
            logEvent({
              type: 'admin',
              userId: user.id,
              userEmail: user.email,
              action: 'VERIFY_NEW_EMAIL_SENT',
              details: `Verification email sent to: ${newEmailTrim}`
            });
          }
        } catch (emailErr: any) {
          console.error('Email update failed:', emailErr);
          
          let friendlyError = 'بروز خطا در تغییر ایمیل: ' + (emailErr.message || 'خطای ناشناخته');
          if (emailErr.code === 'auth/operation-not-allowed') {
            friendlyError = 'تغییر مستقیم ایمیل در کنسول فایربیس شما غیرفعال است. جهت رفع این مشکل، لطفاً در کنسول Firebase به مسیر Authentication > Settings > User actions رفته و گزینه Email address changing را فعال کنید.';
          } else if (emailErr.code === 'auth/requires-recent-login') {
            friendlyError = 'برای ویرایش ایمیل، به دلیل مسائل امنیتی لطفاً از پنل خارج شده و مجدداً وارد شوید.';
          } else if (emailErr.code === 'auth/email-already-in-use') {
            friendlyError = 'این ایمیل قبلاً در سیستم برای کاربر دیگری ثبت شده است.';
          } else if (emailErr.code === 'auth/invalid-email') {
            friendlyError = 'فرمت آدرس ایمیل انتخابی نامعتبر است.';
          }
          
          setErrorMsg(friendlyError);
          setCredLoading(false);
          sessionStorage.removeItem('creating_superadmin_email');
          return;
        }
      }

      if (newPassword) {
        logEvent({
          type: 'admin',
          userId: user.id,
          userEmail: user.email,
          action: 'CHANGE_PASSWORD',
          details: 'Admin successfully rotated their account password'
        });
      }

      setSuccessMsg('تغییرات امنیتی با موفقیت ثبت شد!');
      showToast('عملیات با موفقیت انجام شد', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Error updating security credentials:', err);
      if (err.code === 'auth/wrong-password') {
        setErrorMsg('رمز عبور فعلی نامعتبر است');
      } else if (err.code === 'auth/requires-recent-login') {
        setErrorMsg('بروزرسانی این اطلاعات حساس به دلیل مسائل امنیتی نیازمند خروج و ورود مجدد است');
      } else {
        setErrorMsg('بروزرسانی با خطا مواجه شد: ' + (err.message || 'خطای امنیتی ناشناخته'));
      }
    } finally {
      setCredLoading(false);
    }
  };

  const handleDatabaseReset = async () => {
    if (!user || !user.id || user.role !== 'superadmin') {
      showToast('خطای امنیتی: شما دسترسی لازم برای این عملیات را ندارید', 'error');
      return;
    }

    setResetLoading(true);
    setShowResetConfirm(false);
    setResetProgress(0);
    setResetError('');

    try {
      const dbCols = [
        'shops', 'license_plans', 'licenses', 'products', 'customers', 
        'sales', 'debts', 'purchase_orders', 'categories', 'notifications', 
        'license_transactions', 'logs', 'shop_api_keys', 'users', 'admin_sessions'
      ];
      
      let processedCols = 0;
      
      for (const col of dbCols) {
        try {
          const colRef = collection(db, col);
          const snap = await getDocs(colRef);
          
          if (snap.docs.length > 0) {
            const deletePromises = snap.docs.map(async (d) => {
              if (col === 'users' && d.id === user.id) return;
              if (col === 'admin_sessions' && d.id === currentDeviceId) return;
              
              try {
                await deleteDoc(doc(db, col, d.id));
              } catch (deleteErr) {
                console.warn(`Could not delete document ${d.id} in ${col}:`, deleteErr);
              }
            });
            await Promise.all(deletePromises);
          }
        } catch (colErr) {
           console.warn(`Collection ${col} might not exist or failed to fetch:`, colErr);
        }
        
        processedCols++;
        setResetProgress(Math.round((processedCols / dbCols.length) * 100));
      }

      await logEvent({
        type: 'admin',
        userId: user.id,
        userEmail: user.email,
        action: 'DATABASE_RESET_EXECUTED',
        details: 'Admin performed a complete database wipeout. Only self-record and current session preserved.'
      });

      showToast('عملیات با موفقیت پایان یافت. سیستم در حال راه‌اندازی مجدد است...', 'success');
      
      setTimeout(() => {
        window.location.reload();
      }, 3000);

    } catch (err: any) {
      console.error('Critical error during database reset:', err);
      showToast('بروز خطا در پاکسازی دیتابیس: ' + (err.message || 'خطای سرور'), 'error');
      setResetError('خطا در پاکسازی: ' + err.message);
      setResetLoading(false);
    }
  };

  const tabs = [
    { id: 'security', label: 'امنیت و نشست‌ها', icon: Shield },
    { id: 'recovery', label: 'بازیابی حساب', icon: Key },
    { id: 'ai_apis', label: 'API های هوش مصنوعی', icon: Network },
    { id: 'bots', label: 'ربات‌های تلگرام', icon: Send },
    { id: 'database', label: 'مدیریت پایگاه داده', icon: Server },
    { id: 'updater', label: 'بروزرسانی سیستم', icon: DownloadCloud }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-6 pb-24" dir="rtl">
      
      {/* Upper Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-slate-800/40 pb-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-indigo-600 dark:text-indigo-500" />
            <span>تنظیمات سیستم جامع</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1.5 leading-relaxed">
            مرکز مدیریت تنظیمات پلتفرم، ربات‌ها، کلیدهای هوش مصنوعی و امنیت
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-72 shrink-0">
          <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 shadow-xl rounded-[24px] sticky top-24">
            <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 mb-4 px-2 tracking-widest">بخش‌های تنظیمات</h2>
            <div className="flex flex-col gap-1.5">
              {tabs.map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id)}
                   className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${
                     activeTab === tab.id 
                       ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                       : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                   }`}
                 >
                   <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'opacity-100' : 'opacity-60'}`} />
                   {tab.label}
                 </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Content Area */}
        <div className="flex-1 w-full space-y-6">
          {activeTab === 'security' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card className="p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 shadow-xl rounded-[32px] overflow-hidden relative h-max">
                <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600" />
                
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">تغییر مشخصات عبور</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">بروزرسانی مشخصات و کلیدهای امنیتی مدیریت</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateCredentials} className="space-y-5">
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
                      label="ایمیل مدیریت کل"
                      type="email"
                      value={email}
                      onChange={(e: any) => setEmail(e.target.value)}
                      placeholder="admin@example.com"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <TextField
                      label="رمز عبور فعلی"
                      type="password"
                      value={currentPassword}
                      onChange={(e: any) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <hr className="border-slate-100 dark:border-slate-800/40 my-2" />

                  <div className="space-y-1">
                    <TextField
                      label="رمز عبور جدید (اختیاری)"
                      type="password"
                      value={newPassword}
                      onChange={(e: any) => setNewPassword(e.target.value)}
                      placeholder="حداقل ۶ کاراکتر"
                    />
                  </div>

                  <div className="space-y-1">
                    <TextField
                      label="تایید رمز عبور جدید"
                      type="password"
                      value={confirmPassword}
                      onChange={(e: any) => setConfirmPassword(e.target.value)}
                      placeholder="تکرار رمز عبور جدید"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={credLoading}
                    className="w-full mt-4 h-auto py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-lg shadow-blue-600/15 active:scale-[0.98] transition-transform text-xs flex items-center justify-center flex-wrap gap-2"
                  >
                    {credLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>در حال ذخیره و ثبت تغییرات...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>بروزرسانی و ثبت اطلاعات عبور</span>
                      </>
                    )}
                  </Button>
                </form>
              </Card>

              <Card className="p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 shadow-xl rounded-[32px] overflow-hidden relative h-max">
                <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-amber-500 to-orange-500" />

                <div className="flex flex-col justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">دستگاه‌های فعال و نشست‌ها</h3>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">سیستم‌های متصل به پنل</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50 inline-flex w-max">
                    <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>تعداد کل: {sessions.length} دستگاه</span>
                    </span>
                  </div>
                </div>

                {sessionsLoading ? (
                  <div className="py-16 text-center space-y-4">
                    <RefreshCw className="w-10 h-10 text-amber-500 animate-spin mx-auto" />
                    <p className="text-slate-400 font-medium text-xs">در حال بارگزاری لیست نشست‌ها...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-500/10 text-amber-800 dark:text-amber-400 rounded-2xl text-[11px] font-semibold leading-relaxed flex items-start gap-2 border border-amber-500/20 mb-2">
                      <Info className="w-5 h-5 mt-0.5 shrink-0 text-amber-600" />
                      <span>
                        می‌توانید هر دستگاه یا مرورگر ناشناسی را با دکمه «قطع دسترسی» از سیستم خارج کنید.
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800/50 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      <AnimatePresence initial={false}>
                        {sessions.map((sess, index) => {
                          const { browser, os } = parseUserAgent(sess.userAgent);
                          const isPrimary = index === 0;
                          const isSelf = sess.id === currentDeviceId;
                          const isCurrentPrimary = currentDeviceId === sessions[0]?.id;

                          return (
                            <motion.div
                              key={sess.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, height: 0 }}
                              className={`py-5 flex flex-col gap-4 transition-all ${
                                isPrimary ? 'border-b-2 border-blue-500/20 bg-blue-50/20 dark:bg-blue-900/5 -mx-4 px-4 rounded-2xl' : ''
                              }`}
                            >
                              <div className="flex gap-4 items-start">
                                <div className={`p-4 rounded-2xl shrink-0 ${
                                  isPrimary 
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                                    : (isSelf ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400')
                                }`}>
                                  {isPrimary ? <Shield className="w-6 h-6" /> : <Laptop className="w-6 h-6" />}
                                </div>
                                
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                                      {browser} روی {os}
                                    </span>
                                    {isPrimary && (
                                      <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow-sm flex items-center gap-1">
                                        <Star className="w-2.5 h-2.5 fill-current" />
                                        مرجع
                                      </span>
                                    )}
                                    {isSelf && (
                                      <span className="bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded-lg border border-emerald-500/20">
                                        این دستگاه
                                      </span>
                                    )}
                                  </div>
                                  
                                  <p className="font-mono text-[10px] text-slate-400 font-medium truncate max-w-[200px]">
                                    ID: {sess.id}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between w-full mt-2">
                                <div className="text-slate-400 dark:text-slate-500 text-[10px] font-semibold">
                                  {new Date(sess.lastActive).toLocaleDateString('fa-IR')} - {new Date(sess.lastActive).toLocaleTimeString('fa-IR')}
                                </div>
                                {isSelf ? (
                                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 px-3 py-1 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-800/20">
                                    درحال استفاده
                                  </span>
                                ) : (
                                  <Button
                                    onClick={() => terminateSession(sess.id)}
                                    variant={isCurrentPrimary ? "danger" : "secondary"}
                                    disabled={!isCurrentPrimary}
                                    className="h-8 px-3 text-[10px] font-black rounded-lg flex items-center justify-center gap-1"
                                  >
                                    <LogOut className="w-3 h-3" />
                                    <span>لغو دسترسی</span>
                                  </Button>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {activeTab === 'recovery' && (
             <RecoverySettings />
          )}

          {activeTab === 'ai_apis' && (
             <AIApiSettings />
          )}

          {activeTab === 'bots' && (
            <div className="space-y-6">
              <TelegramBotSettings />
              <CustomerBotSettings />
            </div>
          )}

          {activeTab === 'database' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              <DatabaseProvisioningSettings />

              <Card className="p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 shadow-xl rounded-[32px] overflow-hidden relative">
                <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-red-500 to-rose-600" />
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">پاکسازی پایگاه داده (Reset)</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">منطقه خطر - حذف کامل تمامی اطلاعات</p>
                  </div>
                </div>
                
                <div className="p-4 bg-red-500/10 text-red-800 dark:text-red-400 rounded-2xl text-xs font-semibold leading-loose flex items-start gap-2 border border-red-500/20 mb-4">
                  <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-red-600" />
                  <span>
                    توجه: این دکمه تمام داده‌های پروژه‌ی شما را حذف می‌کند تا دیتابیس کاملا صفر شود. این عمل غیرقابل بازگشت است!
                  </span>
                </div>

                {resetError && (
                  <div className="mb-4 p-4 bg-red-500/10 text-red-600 rounded-2xl text-xs font-bold border border-red-500/20">
                    {resetError}
                  </div>
                )}

                {resetLoading && (
                  <div className="mb-6 space-y-2">
                    <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                      <span>در حال پاکسازی دیتابیس...</span>
                      <span>%{resetProgress}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${resetProgress}%` }}
                        className="h-full bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all duration-300"
                      />
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => setShowResetConfirm(true)}
                  disabled={resetLoading}
                  className="w-full h-auto py-3.5 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl shadow-lg border border-red-500/20 flex items-center justify-center flex-wrap gap-2 disabled:opacity-50 disabled:grayscale transition-all"
                >
                  {resetLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>درحال پاکسازی... لطفا منتظر بمانید</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>حذف اطلاعات دیتابیس و ریست کامل</span>
                    </>
                  )}
                </Button>
              </Card>
            </div>
          )}

          {activeTab === 'updater' && (
             <ProjectUpdater />
          )}
        </div>
      </div>

      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowResetConfirm(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-sm p-8 border border-red-100 dark:border-red-900/30 text-center space-y-6"
            >
              <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <ShieldAlert className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-black text-slate-900 dark:text-white">پاکسازی نهایی دیتابیس</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed px-4">
                  آیا واقعاً از حذف <span className="text-red-600">کل اطلاعات سیستم</span> اطمینان دارید؟ این عمل تمام فروشگاه‌ها و تراکنش‌ها را برای همیشه پاک می‌کند.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button variant="ghost" className="w-full sm:flex-1 h-auto py-3.5 rounded-xl font-black" onClick={() => setShowResetConfirm(false)}>انصراف</Button>
                <Button 
                   onClick={handleDatabaseReset}
                   className="w-full sm:flex-[2] h-auto py-3.5 rounded-xl font-black bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20 flex-wrap justify-center flex items-center"
                >
                   بله، ریست شود
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
