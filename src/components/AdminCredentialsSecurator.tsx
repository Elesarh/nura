import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Button, TextField, Card } from '../components';
import { Shield, Mail, Lock, CheckCircle } from 'lucide-react';

interface Props {
  user: any;
  onDone: (newEmail: string) => void;
  isDarkMode: boolean;
  setIsDarkMode: (v: boolean) => void;
}

export function AdminCredentialsSecurator({ user, onDone, isDarkMode, setIsDarkMode }: Props) {
  const [email, setEmail] = useState(user.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('لطفاً ایمیل و رمز عبور را وارد کنید');
      return;
    }
    if (password.length < 6) {
      setError('رمز عبور باید حداقل ۶ کاراکتر باشد');
      return;
    }
    if (password !== confirmPassword) {
      setError('رمز عبور و تکرار آن مطابقت ندارند');
      return;
    }

    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Not authenticated');

      // Update email if changed
      if (email !== user.email) {
        await updateEmail(currentUser, email);
      }

      // Update password
      await updatePassword(currentUser, password);

      // Update Firestore user record
      await setDoc(doc(db, 'users', currentUser.uid), {
        email: email,
        hasChangedCredentials: true,
      }, { merge: true });

      setSuccess(true);
      setTimeout(() => onDone(email), 1500);
    } catch (err: any) {
      setError(err.message || 'خطا در تغییر اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-md p-8 text-center">
        <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-xl font-black mb-2">اطلاعات با موفقیت تغییر کرد</h2>
        <p className="text-sm text-gray-500">در حال انتقال به داشبورد...</p>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md p-8">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="text-xl font-black">🔐 امنیت حساب مدیر</h2>
        <p className="text-sm text-gray-500 mt-1">برای افزایش امنیت، لطفاً رمز عبور پیش‌فرض را تغییر دهید</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="ایمیل جدید"
          type="email"
          value={email}
          onChange={(e: any) => setEmail(e.target.value)}
          placeholder="admin@example.com"
          dir="ltr"
        />

        <TextField
          label="رمز عبور جدید"
          type="password"
          value={password}
          onChange={(e: any) => setPassword(e.target.value)}
          placeholder="حداقل ۶ کاراکتر"
          dir="ltr"
        />

        <TextField
          label="تکرار رمز عبور"
          type="password"
          value={confirmPassword}
          onChange={(e: any) => setConfirmPassword(e.target.value)}
          placeholder="رمز را دوباره وارد کنید"
          dir="ltr"
        />

        {error && (
          <div className="text-red-500 text-sm font-medium bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'در حال ذخیره...' : 'ذخیره و ورود به داشبورد'}
        </Button>
      </form>
    </Card>
  );
}

export default AdminCredentialsSecurator;
