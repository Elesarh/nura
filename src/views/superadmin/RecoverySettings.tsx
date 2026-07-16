import React, { useState } from 'react';
import { Card, Button, ErrorWidget } from '../../components';
import { auth, logEvent } from '../../firebase';
import { GoogleAuthProvider, linkWithPopup, unlink, fetchSignInMethodsForEmail } from 'firebase/auth';
import { Mail, Shield, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';
import { useToast } from '../../ToastContext';

export default function RecoverySettings() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const user = auth.currentUser;
  
  // Check if user is already linked with Google
  const [isLinked, setIsLinked] = useState(
    user?.providerData.some(provider => provider.providerId === 'google.com') || false
  );
  const [googleEmail, setGoogleEmail] = useState(
    user?.providerData.find(provider => provider.providerId === 'google.com')?.email || ''
  );

  const handleLink = async () => {
    if (!user) return;
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await linkWithPopup(user, provider);
      
      setIsLinked(true);
      setGoogleEmail(result.user.providerData.find(p => p.providerId === 'google.com')?.email || '');

      await logEvent({
        type: 'admin',
        userId: user.uid,
        userEmail: user.email || 'unknown',
        action: 'RECOVERY_EMAIL_LINKED',
        details: `پست الکترونیک بازیابی متصل شد: ${result.user.email}`
      });

      showToast('جیمیل پشتیبان با موفقیت متصل شد', 'success');
    } catch (err: any) {
      if (err.code === 'auth/credential-already-in-use') {
        setError('این جیمیل در حال حاضر به یک حساب دیگر متصل است.');
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'خطا در اتصال به گوگل');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (!user) return;
    setError('');
    setLoading(true);
    try {
      await unlink(user, 'google.com');
      
      await logEvent({
        type: 'admin',
        userId: user.uid,
        userEmail: user.email || 'unknown',
        action: 'RECOVERY_EMAIL_UNLINKED',
        details: `پست الکترونیک بازیابی حذف شد`
      });

      setIsLinked(false);
      setGoogleEmail('');

      showToast('اتصال جیمیل پشتیبان لغو شد', 'info');
    } catch (err: any) {
      setError(err.message || 'خطا در لغو اتصال');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 shadow-xl rounded-[32px] overflow-hidden relative h-full">
      <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500" />
      
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">جیمیل پشتیبان و بازیابی</h3>
          <p className="text-xs text-slate-400 font-medium mt-0.5">افزودن جیمیل واقعی جهت ورود و بازیابی در صورت فراموشی</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
          برای امنیت بیشتر و عدم نیاز به سرور ایمیل، پیشنهاد می‌شود حساب پنل خود را مستقیماً به حساب گوگل (Gmail) خود متصل کنید. در این صورت اگر روزی ایمیل یا رمز عبور پنل خود را فراموش کردید، می‌توانید با کلیک روی «ورود با جیمیل پشتیبان» مستقیماً و بدون نیاز به رمز عبور وارد پنل شده و اطلاعات خود را تغییر دهید.
        </div>

        {error && <ErrorWidget message={error} />}

        {isLinked ? (
          <div className="p-6 rounded-2xl border-2 border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-500/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  متصل به جیمیل پشتیبان
                </h4>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1" dir="ltr">
                  {googleEmail || 'نامشخص'}
                </p>
              </div>
            </div>
            
            <Button
              onClick={handleUnlink}
              disabled={loading}
              variant="ghost"
              className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-bold whitespace-nowrap"
            >
              {loading ? 'در حال لغو...' : 'لغو اتصال'}
            </Button>
          </div>
        ) : (
          <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Mail className="w-8 h-8 text-slate-400" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-1">هیچ جیمیلی متصل نیست</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                توصیه می‌شود حتماً یک حساب گوگل (Gmail) به عنوان پشتیبان متصل کنید تا در صورت بروز هرگونه مشکل، امکان بازیابی مدیریت را داشته باشید.
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={handleLink}
              disabled={loading}
              className="mt-2 h-auto py-3 font-black rounded-xl shadow-sm px-6 flex items-center justify-center flex-wrap gap-2 w-full sm:w-auto"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>{loading ? 'در حال اتصال...' : 'اتصال امن به حساب گوگل'}</span>
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
