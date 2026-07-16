// Error translator stub — Persian error messages
const errorMap: Record<string, string> = {
  'auth/user-not-found': 'کاربر یافت نشد',
  'auth/wrong-password': 'رمز عبور اشتباه است',
  'auth/email-already-in-use': 'این ایمیل قبلاً ثبت شده است',
  'auth/weak-password': 'رمز عبور باید حداقل ۶ کاراکتر باشد',
};

export function translateError(code: string): string {
  return errorMap[code] || code || 'خطای ناشناخته';
}
