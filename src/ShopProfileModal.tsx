import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Store as StoreIcon, Shield, Plus, Trash2, Calendar, Clock, Star, Check } from 'lucide-react';
import { Shop, LicensePlan } from './types';
import { TextField, Button } from './components';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

interface ShopProfileModalProps {
  isOpen: boolean;
  shopInfo: Shop | null;
  isDarkMode: boolean;
  onClose: () => void;
  onUpdate: (e: any) => void;
  setShopInfo: (shop: Shop) => void;
  readOnly?: boolean;
}

export default function ShopProfileModal({ isOpen, shopInfo, isDarkMode, onClose, onUpdate, setShopInfo, readOnly = false }: ShopProfileModalProps) {
  if (!shopInfo) return null;

  const [plan, setPlan] = useState<LicensePlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  useEffect(() => {
    if (isOpen && shopInfo?.licensePlanId) {
      setLoadingPlan(true);
      getDoc(doc(db, 'license_plans', shopInfo.licensePlanId))
        .then((docSnap) => {
          if (docSnap.exists()) {
            setPlan({ id: docSnap.id, ...docSnap.data() } as LicensePlan);
          } else {
            setPlan(null);
          }
        })
        .catch((err) => {
          console.error("Error fetching license plan:", err);
          setPlan(null);
        })
        .finally(() => {
          setLoadingPlan(false);
        });
    } else {
      setPlan(null);
    }
  }, [isOpen, shopInfo?.licensePlanId]);

  const addBankCard = () => {
    if (readOnly) return;
    const cards = shopInfo.bankCards || [];
    setShopInfo({ ...shopInfo, bankCards: [...cards, { number: '', bankName: '', ownerName: '' }] });
  };

  const removeBankCard = (idx: number) => {
    if (readOnly) return;
    const cards = [...(shopInfo.bankCards || [])];
    cards.splice(idx, 1);
    setShopInfo({ ...shopInfo, bankCards: cards });
  };

  const updateBankCard = (idx: number, field: string, value: string) => {
    if (readOnly) return;
    const cards = [...(shopInfo.bankCards || [])];
    cards[idx] = { ...cards[idx], [field]: value };
    setShopInfo({ ...shopInfo, bankCards: cards });
  };

// Feature list mapping
  const toPersianDigits = (str: string | number): string => {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(str).replace(/[0-9]/g, (w) => persianDigits[parseInt(w, 10)]);
  };

  // Calculation of subscription details
  const rawActivationDateStr = shopInfo.createdAt 
    ? new Date(shopInfo.createdAt).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }) 
    : 'نامشخص';
  const activationDateStr = toPersianDigits(rawActivationDateStr);

  const expirationDate = shopInfo.licenseExpiresAt ? new Date(shopInfo.licenseExpiresAt) : null;
  const now = new Date();
  let remainingText = '';
  let isActive = true;

  if (expirationDate) {
    const diffTime = expirationDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      remainingText = `${toPersianDigits(diffDays)} روز باقی‌مانده`;
      isActive = shopInfo.status === 'active';
    } else {
      remainingText = 'منقضی شده';
      isActive = false;
    }
  } else {
    remainingText = 'نامحدود (دائمی)';
    isActive = shopInfo.status === 'active';
  }

  const featureTranslations: Record<string, string> = {
    'ai_assistant': 'دستیار هوشمند ESH’RA (هوش مصنوعی)',
    'advanced_reports': 'گزارش‌دهی و نمودارهای پیشرفته مالی',
    'chat_support': 'پشتیبانی آنلاین اختصاصی',
    'unlimited_customers': 'ثبت نامحدود مشتریان و فاکتورها',
    'unlimited_products': 'تعریف نامحدود کالاها و بارکدها',
    'sms_sending': 'سیستم ارسال پیامک هوشمند به مشتریان',
    'multi_user': 'تعریف کاربر فرعی و مدیریت دسترسی کارمندان',
    'inventory_alerts': 'سیستم هشدار کسری موجودی کالا',
    'customer_crm': 'سامانه مدیریت ارتباط با مشتریان (CRM)',
    'products': 'مدیریت پیشرفته محصولات و انبار',
    'customers': 'مدیریت و دسته‌بندی اطلاعات مشتریان',
    'sales': 'پایانه فروش هوشمند و صدور فاکتور سریع',
    'transactions': 'تاریخچه تراکنش‌ها و گزارش پرداخت‌ها',
    'orders': 'سیستم فاکتوردهی و ثبت سفارشات عمده',
    'debts': 'سامانه مدیریت دفاتر بدهی و حساب نسیه',
    'reports': 'تحلیل هوشمند مالی و گزارش‌گیری پیشرفته'
  };

  const planNameTranslations: Record<string, string> = {
    'golden': 'سه ماهه طلایی',
    'gold': 'طلایی',
    'silver': 'نقره‌ای',
    'bronze': 'برنزی',
    'free': 'پایه / رایگان',
    'basic': 'پایه',
    'premium': 'ویژه / پرمیوم',
    'golden 3 months': 'سه ماهه طلایی',
  };

  const defaultBasicFeatures = [
    'ثبت کالاها و مدیریت موجودی انبار فروشگاه',
    'ثبت مشتریان و مدیریت حساب بدهی‌ها و بستانکاری‌ها',
    'صدور، فیلتر و چاپ فوق‌العاده سریع فاکتورهای فروش',
    'گزارش مبالغ دریافتی کارت‌خوان، آنلاین و نقدی'
  ];

  // Try to read active features from shopInfo first, and fall back to plan features
  const activeFeatures = (shopInfo.features && shopInfo.features.length > 0)
    ? shopInfo.features
    : (plan?.features && plan.features.length > 0 ? plan.features : null);

  const displayFeatures = activeFeatures
    ? activeFeatures.map(f => {
        const cleaned = f.trim().toLowerCase();
        return featureTranslations[cleaned] || featureTranslations[f] || f;
      })
    : defaultBasicFeatures;

  const rawPlanName = plan?.name || 'پایه/رایگان';
  const displayPlanName = planNameTranslations[rawPlanName.trim().toLowerCase()] || rawPlanName;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="profile-modal-backdrop"
          initial={{opacity:0}} 
          animate={{opacity:1}} 
          exit={{opacity:0}} 
          onClick={onClose} 
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100]" 
        />
      )}
      {isOpen && (
        <motion.div 
          key="profile-modal-content"
          initial={{ opacity: 0, scale: 0.9, y: 30 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          className={`fixed inset-0 z-[101] flex items-center justify-center p-4`}
          dir="rtl"
        >
          <form onSubmit={onUpdate} className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[32px] shadow-2xl ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-gray-100'}`}>
            <section className="relative p-6 md:p-8">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-blue-600/10 via-transparent to-indigo-600/5 dark:from-blue-500/5 pointer-events-none" />

              <button type="button" onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 z-50 transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>

            <div className="text-center mb-8 pt-4">
               <div className="mx-auto w-24 h-24 rounded-3xl overflow-hidden shadow-2xl mb-4 border-4 border-white dark:border-slate-800 flex items-center justify-center bg-blue-50">
                {shopInfo.logoUrl ? (
                  <img src={shopInfo.logoUrl} alt={shopInfo.name} className="w-full h-full object-cover" />
                ) : (
                  <StoreIcon className="w-12 h-12 text-blue-500" />
                )}
              </div>
               <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{shopInfo.name}</h3>
               <p className="text-blue-500 font-bold text-sm mt-1">شناسه فروشگاه: {shopInfo.id.slice(0, 8)}</p>
            </div>

             <div className="space-y-6">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <TextField label="نام فروشگاه" value={shopInfo.name} onChange={(e:any)=>setShopInfo({...shopInfo, name: e.target.value})} required disabled={readOnly} />
                 <TextField label="نام مدیریت" value={shopInfo.ownerName} onChange={(e:any)=>setShopInfo({...shopInfo, ownerName: e.target.value})} required disabled={readOnly} />
                 <TextField label="شماره تماس" value={shopInfo.phone} onChange={(e:any)=>setShopInfo({...shopInfo, phone: e.target.value})} required disabled={readOnly} />
                 <TextField label="آدرس فروشگاه" value={shopInfo.address} onChange={(e:any)=>setShopInfo({...shopInfo, address: e.target.value})} disabled={readOnly} />
               </div>

               <div className="pt-6 border-t dark:border-slate-800">
                 <div className="flex justify-between items-center mb-4">
                    <h4 className="font-black text-sm text-gray-700 dark:text-slate-300 flex items-center gap-2">
                      <span className="text-lg">💳</span>
                      مدیریت شماره کارت‌ها
                    </h4>
                    {!readOnly && (
                       <Button variant="outline" className="text-[10px] h-7 px-2" onClick={(e:any) => { e.preventDefault(); addBankCard(); }}>
                          <Plus className="w-3 h-3 ml-1" /> افزودن کارت
                       </Button>
                    )}
                 </div>
                 
                 <div className="space-y-4">
                    {(shopInfo.bankCards || []).map((card, idx) => (
                      <div key={idx} className="p-4 rounded-3xl bg-white dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
                         <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-50 dark:border-slate-700/50">
                            <div className="flex items-center gap-2">
                               <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold">
                                  {idx + 1}
                               </div>
                               <span className="text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">کارت متصل</span>
                            </div>
                            {!readOnly && (
                               <button 
                                  type="button" 
                                  onClick={() => removeBankCard(idx)} 
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all group"
                               >
                                  <Trash2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                  <span className="text-[10px] font-bold">حذف</span>
                               </button>
                            )}
                         </div>
                         
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                               <TextField 
                                  label="شماره کارت" 
                                  value={card.number} 
                                  onChange={(e:any)=>updateBankCard(idx, 'number', e.target.value)} 
                                  placeholder="0000 0000 0000 0000" 
                                  className="text-center font-mono tracking-widest relative" 
                                  dir="ltr" 
                                  disabled={readOnly}
                               />
                            </div>
                            <TextField label="نام بانک" value={card.bankName} onChange={(e:any)=>updateBankCard(idx, 'bankName', e.target.value)} placeholder="مثلا ملت" disabled={readOnly} />
                            <TextField label="صاحب حساب" value={card.ownerName} onChange={(e:any)=>updateBankCard(idx, 'ownerName', e.target.value)} placeholder="مثال: رضا احمدی" disabled={readOnly} />
                         </div>
                      </div>
                    ))}
                    {(!shopInfo.bankCards || shopInfo.bankCards.length === 0) && (
                      <p className="text-xs text-gray-400 text-center py-4 italic">هنوز هیچ شماره کارتی ثبت نشده است.</p>
                    )}
                 </div>
               </div>

                <div className="p-6 rounded-3xl border border-blue-100 dark:border-blue-900/40 relative overflow-hidden bg-gradient-to-br from-blue-50/60 to-indigo-50/20 dark:from-blue-500/5 dark:to-transparent">
                   <div className="flex items-center justify-between mb-5 relative z-10">
                      <h4 className="font-extrabold text-sm text-blue-700 dark:text-blue-400 flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        وضعیت و جزئیات اشتراک
                      </h4>
                      <span className={`px-3 py-1 text-[11px] font-black rounded-full shadow-sm ${isActive ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                        {isActive ? 'فعال' : 'غیرفعال / منقضی'}
                      </span>
                   </div>

                   <div className="space-y-3.5 relative z-10 text-xs text-gray-700 dark:text-slate-300">
                      <div className="flex justify-between items-center bg-white/50 dark:bg-slate-850/40 p-2.5 rounded-2xl border border-gray-100/50 dark:border-slate-800/30">
                         <span className="text-gray-500 dark:text-slate-400 font-bold flex items-center gap-1.5">
                           <Star className="w-4 h-4 text-amber-500" />
                           نام اشتراک:
                         </span>
                         <span className="font-black text-slate-800 dark:text-white bg-blue-100/60 dark:bg-blue-900/30 px-2.5 py-1 rounded-xl text-[11px]">
                           {loadingPlan ? 'در حال بارگذاری...' : displayPlanName}
                         </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                         <div className="flex flex-col gap-1 p-2.5 rounded-2xl bg-white/50 dark:bg-slate-850/40 border border-gray-100/50 dark:border-slate-800/30">
                            <span className="text-[10px] text-gray-500 dark:text-slate-400 font-bold flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-blue-500" />
                              تاریخ فعال‌سازی
                            </span>
                            <span className="font-extrabold text-slate-800 dark:text-white text-right mt-0.5">
                              {activationDateStr}
                            </span>
                         </div>

                         <div className="flex flex-col gap-1 p-2.5 rounded-2xl bg-white/50 dark:bg-slate-850/40 border border-gray-100/50 dark:border-slate-800/30">
                            <span className="text-[10px] text-gray-500 dark:text-slate-400 font-bold flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-indigo-500" />
                              زمان باقی‌مانده
                            </span>
                            <span className="font-extrabold text-blue-600 dark:text-blue-400 text-right mt-0.5" dir="rtl">
                              {remainingText}
                            </span>
                         </div>
                      </div>

                      <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                         <p className="text-[11px] font-black text-gray-500 dark:text-slate-400 mb-2.5 flex items-center gap-1">
                           <Check className="w-3.5 h-3.5 text-emerald-500" />
                           دسترسی‌ها و قابلیت‌های فعال:
                         </p>
                         <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                           {displayFeatures.map((feat, index) => (
                             <div key={index} className="flex items-start gap-2 text-[11px] font-semibold text-gray-600 dark:text-slate-300 leading-relaxed bg-white/30 dark:bg-slate-900/20 p-2 rounded-xl border border-gray-50/50 dark:border-slate-800/20">
                               <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                               <span>{feat}</span>
                             </div>
                           ))}
                         </div>
                      </div>
                   </div>
                </div>

               <div className="pt-6 flex gap-3">
                 {readOnly ? (
                   <Button type="button" className="flex-1 h-12 rounded-xl" onClick={onClose}>بستن</Button>
                 ) : (
                   <>
                     <Button type="submit" className="flex-1 h-12 rounded-xl">ذخیره تغییرات</Button>
                     <Button variant="ghost" className="h-12 rounded-xl" onClick={onClose}>انصراف</Button>
                   </>
                 )}
               </div>
             </div>
             </section>
           </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
