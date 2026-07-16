import { translateError } from '../../lib/errorTranslator';
import { useState, useEffect, ReactNode, FormEvent, ChangeEvent } from 'react';
import { useSearchParams } from 'react-router';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, firebaseConfig } from '../../firebase';
import { User, Shop, LicensePlan, LicenseTransaction } from '../../types';
import { Card, DataTable, LoadingWidget, ErrorWidget, Button, TextField } from '../../components';
import { useToast } from '../../ToastContext';
import { downloadInvoicePDF, directPrintElement } from '../../lib/pdfGenerator';
import { Store, Activity, AlertCircle, DollarSign, Plus, X, Building, CheckCircle2, User as UserIcon, MapPin, Phone, Mail, Power, Trash2, ShieldCheck, ChevronRight, Key, Calendar, Zap, Bookmark, Upload, ArrowRightLeft, TrendingUp, Clock, BarChart3, Edit3, Download, Printer, FileText, PieChart, CreditCard, Sparkles, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function LicenseManagement({ plans, fetchPlans }: { plans: LicensePlan[], fetchPlans: () => void }) {
  const [loading, setLoading] = useState(false); // Since parent handles loading
  const [error, setError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingPlan, setEditingPlan] = useState<LicensePlan | null>(null);
  const [newPlan, setNewPlan] = useState<Partial<LicensePlan>>({ features: [] });
  const [actionLoading, setActionLoading] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<LicensePlan | null>(null);
  const { showToast } = useToast();

  const [durationUnit, setDurationUnit] = useState<'months' | 'days'>('months');

  const handleSavePlan = async (e: FormEvent) => {
    e.preventDefault();
    const duration = durationUnit === 'months' ? newPlan.durationMonths : newPlan.durationDays;
    if (!newPlan.name || !duration || newPlan.price === undefined) return;
    setActionLoading(true);
    try {
      const docData = {
        ...newPlan,
        durationMonths: durationUnit === 'months' ? Number(newPlan.durationMonths) : 0,
        durationDays: durationUnit === 'days' ? Number(newPlan.durationDays) : 0,
        status: 'active',
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, "license_plans"), docData);
      showToast('پلن لایسنس جدید با موفقیت ثبت شد');
      setIsAdding(false);
      setNewPlan({ features: [] });
      setDurationUnit('months');
    } catch (e: any) {
      setError('خطا در ثبت: ' + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePlan = async (e: FormEvent) => {
    e.preventDefault();
    const duration = durationUnit === 'months' ? editingPlan?.durationMonths : editingPlan?.durationDays;
    if (!editingPlan || !editingPlan.name || !duration || editingPlan.price === undefined) return;
    setActionLoading(true);
    try {
      const { id, ...docData } = editingPlan;
      // Ensure other unit is cleared or handled
      const updatedData = {
        ...docData,
        durationMonths: durationUnit === 'months' ? Number(editingPlan.durationMonths) : 0,
        durationDays: durationUnit === 'days' ? (editingPlan.durationDays || 0) : 0,
      };
      await updateDoc(doc(db, "license_plans", id), updatedData);
      showToast('تغییرات پلن با موفقیت ذخیره شد');
      setEditingPlan(null);
    } catch (e: any) {
      setError('خطا در بروزرسانی: ' + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    setActionLoading(true);
    try {
      await deleteDoc(doc(db, "license_plans", planToDelete.id));
      showToast('پلن با موفقیت حذف شد');
      setPlanToDelete(null);
    } catch (e: any) {
      setError('خطا در حذف: ' + e.message);
      showToast('خطا در حذف پلن: ' + e.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleFeature = (feature: string, isEdit = false) => {
    if (isEdit && editingPlan) {
      const f = editingPlan.features || [];
      const updatedFeatures = f.includes(feature) 
        ? f.filter(x => x !== feature) 
        : [...f, feature];
      setEditingPlan({ ...editingPlan, features: updatedFeatures });
    } else {
      const f = newPlan.features || [];
      const updatedFeatures = f.includes(feature) 
        ? f.filter(x => x !== feature) 
        : [...f, feature];
      setNewPlan({ ...newPlan, features: updatedFeatures });
    }
  };

  if (loading && plans.length === 0) return <LoadingWidget />;

  const featureOptions = [
    { id: 'products', name: 'مدیریت محصولات' },
    { id: 'customers', name: 'مدیریت مشتریان' },
    { id: 'sales', name: 'پایانه فروش هوشمند' },
    { id: 'transactions', name: 'تاریخچه تراکنش‌ها' },
    { id: 'orders', name: 'سفارشات عمده' },
    { id: 'debts', name: 'سامانه مدیریت نسیه' },
    { id: 'reports', name: 'تحلیل داده و گزارش‌گیری' },
    { id: 'ai_assistant', name: 'دستیار هوش مصنوعی "ESH’RA"' }
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-[#1e293b] p-8 rounded-[36px] border border-gray-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors" />
        <div className="relative flex flex-col md:flex-row items-center gap-5">
           <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-7 h-7" />
           </div>
           <div className="text-center md:text-right">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">مهندسی پلن‌های عضویت</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">سامانه مدیریت سطوح لایسنس</p>
           </div>
        </div>
        <Button 
          onClick={() => {
            setEditingPlan(null);
            setIsAdding(!isAdding);
          }} 
          className={`h-12 px-8 rounded-xl font-black transition-all ${isAdding ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300' : 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20'}`}
        >
          {isAdding ? 'انصراف' : 'تعریف پکیج جدید'}
        </Button>
      </div>

      {error && <ErrorWidget message={error} />}

      <AnimatePresence mode="wait">
        {isAdding && (
          <motion.div key="adding" initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}}>
            <Card className="p-10 bg-white dark:bg-[#1e293b] border border-emerald-100/50 dark:border-emerald-500/20 rounded-[48px] shadow-2xl">
              <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-50 dark:border-slate-800">
                <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                <h4 className="text-xl font-black text-gray-900 dark:text-white">تعریف لایسنس جدید</h4>
              </div>
              <form onSubmit={handleSavePlan} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <TextField label="عنوان پکیج" value={newPlan.name || ''} onChange={(e:any)=>setNewPlan({...newPlan, name: e.target.value})} required />
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 mb-1">
                    <button 
                      type="button" 
                      onClick={() => setDurationUnit('months')} 
                      className={`flex-1 h-8 rounded-lg text-[10px] font-black transition-all ${durationUnit === 'months' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400 dark:bg-slate-800'}`}
                    >
                      ماهانه
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setDurationUnit('days')} 
                      className={`flex-1 h-8 rounded-lg text-[10px] font-black transition-all ${durationUnit === 'days' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400 dark:bg-slate-800'}`}
                    >
                      روزانه
                    </button>
                  </div>
                  {durationUnit === 'months' ? (
                    <TextField label="زمان (ماه)" type="number" value={newPlan.durationMonths ?? ''} onChange={(e:any)=>setNewPlan({...newPlan, durationMonths: Number(e.target.value), durationDays: 0})} required />
                  ) : (
                    <TextField label="زمان (روز)" type="number" value={newPlan.durationDays ?? ''} onChange={(e:any)=>setNewPlan({...newPlan, durationDays: Number(e.target.value), durationMonths: 0})} required />
                  )}
                </div>
                <TextField label="قیمت (تومان)" type="number" value={newPlan.price ?? ''} onChange={(e:any)=>setNewPlan({...newPlan, price: Number(e.target.value)})} required />
                <div className="lg:col-span-1">
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">دسترسی‌های پکیج</label>
                  <div className="flex flex-wrap gap-2">
                    {featureOptions.map(fo => (
                      <button 
                        key={fo.id} type="button" 
                        onClick={() => toggleFeature(fo.id)}
                        className={`text-[10px] h-9 px-4 rounded-xl border-2 font-black transition-all ${newPlan.features?.includes(fo.id) ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white border-gray-100 text-gray-400 dark:bg-slate-900 dark:border-slate-800'}`}
                      >
                        {fo.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-full pt-8 border-t border-gray-50 flex justify-end gap-3">
                  <Button variant="ghost" type="button" onClick={() => setIsAdding(false)}>انصراف</Button>
                  <Button type="submit" disabled={actionLoading} className="bg-emerald-600 px-10">تایید و ثبت نهایی</Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {plans.map((plan, idx) => {
          const isEditing = editingPlan?.id === plan.id;
          return (
          <motion.div 
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group"
          >
            <Card className={`p-8 relative overflow-hidden rounded-[48px] border transition-all duration-500 ${isEditing ? 'border-blue-500/50 bg-blue-50/10 shadow-2xl ring-4 ring-blue-500/5' : 'border-gray-100 dark:border-slate-800/50 bg-white dark:bg-[#1e293b] hover:shadow-2xl hover:shadow-blue-500/5 hover:-translate-y-2'}`}>
              {!isEditing ? (
                <>
                  <div className="absolute -right-8 -top-8 w-24 h-24 bg-emerald-500/5 rounded-full group-hover:scale-150 transition-transform duration-700" />
                  
                  <div className="flex justify-between items-start mb-8">
                    <div className="flex gap-2">
                      <div className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
                        <Bookmark className="w-6 h-6" />
                      </div>
                      <button 
                        onClick={() => setPlanToDelete(plan)}
                        disabled={actionLoading}
                        className="p-3 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl hover:bg-rose-100 transition-all shadow-sm border border-rose-100 dark:border-rose-500/20 disabled:opacity-50"
                        title="حذف پلن"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-900 px-4 py-2 rounded-2xl flex flex-col items-center border border-gray-100 dark:border-slate-800 shadow-inner">
                       <span className="text-[16px] font-black text-gray-900 dark:text-white tabular-nums leading-none">
                         {plan.durationDays && plan.durationDays > 0 ? plan.durationDays : plan.durationMonths}
                       </span>
                       <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter mt-1">
                         {plan.durationDays && plan.durationDays > 0 ? 'روز دوره' : 'ماه دوره'}
                       </span>
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-6">
                    <h4 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{plan.name}</h4>
                    <div className="flex items-baseline gap-2 flex-wrap">
                       {plan.price === 0 ? (
                         <span className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight italic">
                           رایگان
                         </span>
                       ) : (
                         <>
                           <span className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter italic truncate max-w-full">
                             {plan.price.toLocaleString('fa-IR')}
                           </span>
                           <span className="text-xs font-black text-gray-400">تومان</span>
                         </>
                       )}
                    </div>
                    
                    <div className="pt-8 border-t border-gray-50 dark:border-slate-800/50 space-y-4">
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-4">دسترسی‌های فعال</p>
                      <div className="grid grid-cols-1 gap-3">
                        {featureOptions.map(fo => {
                          const hasF = plan.features?.includes(fo.id);
                          return (
                            <div key={fo.id} className={`flex items-center gap-3 transition-all ${hasF ? 'opacity-100 translate-x-1' : 'opacity-20 grayscale scale-95'}`}>
                              <div className={`w-5 h-5 rounded-lg flex items-center justify-center ${hasF ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 shadow-sm' : 'bg-gray-100 text-gray-400'}`}>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-xs font-bold text-gray-600 dark:text-slate-300">{fo.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-10 pt-6 border-t border-gray-50 dark:border-slate-800/50">
                    <Button 
                      onClick={() => {
                        setEditingPlan(plan);
                        setDurationUnit(plan.durationDays && plan.durationDays > 0 ? 'days' : 'months');
                      }}
                      variant="ghost" 
                      className="w-full h-14 rounded-2xl text-[11px] font-black bg-gray-50 dark:bg-slate-900 hover:bg-blue-600 hover:text-white transition-all uppercase tracking-widest text-gray-400"
                    >
                      ویرایش پیکربندی
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                    <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                    <h4 className="text-xl font-black text-gray-900 dark:text-white">ویرایش پلن</h4>
                  </div>
                  <form onSubmit={handleUpdatePlan} className="space-y-6">
                    <TextField label="عنوان پکیج" value={editingPlan.name || ''} onChange={(e:any)=>setEditingPlan({...editingPlan, name: e.target.value})} required />
                    
                    <div className="flex gap-2">
                       <button 
                        type="button" 
                        onClick={() => setDurationUnit('months')} 
                        className={`flex-1 h-10 rounded-xl text-[10px] font-black transition-all ${durationUnit === 'months' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400 dark:bg-slate-800'}`}
                      >
                        ماهانه
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setDurationUnit('days')} 
                        className={`flex-1 h-10 rounded-xl text-[10px] font-black transition-all ${durationUnit === 'days' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400 dark:bg-slate-800'}`}
                      >
                        روزانه
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {durationUnit === 'months' ? (
                        <TextField label="زمان (ماه)" type="number" value={editingPlan.durationMonths ?? ''} onChange={(e:any)=>setEditingPlan({...editingPlan, durationMonths: Number(e.target.value), durationDays: 0})} required />
                      ) : (
                        <TextField label="زمان (روز)" type="number" value={editingPlan.durationDays ?? ''} onChange={(e:any)=>setEditingPlan({...editingPlan, durationDays: Number(e.target.value), durationMonths: 0})} required />
                      )}
                      <TextField label="قیمت (تومان)" type="number" value={editingPlan.price ?? ''} onChange={(e:any)=>setEditingPlan({...editingPlan, price: Number(e.target.value)})} required />
                    </div>
                    
                    <div>
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">دسترسی‌ها</label>
                      <div className="flex flex-wrap gap-2">
                        {featureOptions.map(fo => (
                          <button 
                            key={fo.id} type="button" 
                            onClick={() => toggleFeature(fo.id, true)}
                            className={`text-[10px] h-8 px-4 rounded-xl border-2 font-black transition-all ${editingPlan.features?.includes(fo.id) ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white border-gray-100 text-gray-400 dark:bg-slate-900 dark:border-slate-800'}`}
                          >
                            {fo.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="pt-6 border-t border-gray-100 dark:border-slate-800 flex gap-3">
                      <Button variant="ghost" className="flex-1" type="button" onClick={() => setEditingPlan(null)}>انصراف</Button>
                      <Button type="submit" className="flex-1 bg-blue-600" disabled={actionLoading}>ذخیره</Button>
                    </div>
                  </form>
                </div>
              )}
            </Card>
          </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {planToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
               onClick={() => setPlanToDelete(null)}
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }} 
               animate={{ opacity: 1, scale: 1, y: 0 }} 
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative bg-white dark:bg-[#1e293b] rounded-[32px] shadow-2xl w-full max-w-sm p-8 border border-gray-100 dark:border-slate-800 text-center space-y-6"
               dir="rtl"
             >
                <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                   <AlertCircle className="w-10 h-10" />
                </div>
                <div>
                   <h4 className="text-xl font-black text-gray-900 dark:text-white mb-2">تایید حذف پلن</h4>
                   <p className="text-xs text-gray-500 dark:text-slate-400 font-bold leading-relaxed">
                      آیا از حذف دائمی پکیج «<span className="text-rose-600">{planToDelete.name}</span>» اطمینان دارید؟ این عمل قابل بازگشت نیست.
                   </p>
                </div>
                <div className="flex gap-3 pt-2">
                   <Button variant="ghost" className="flex-1 h-12 rounded-xl font-black" onClick={() => setPlanToDelete(null)}>انصراف</Button>
                   <Button 
                      onClick={handleDeletePlan}
                      disabled={actionLoading}
                      className="flex-[2] h-12 rounded-xl font-black bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/20"
                   >
                      {actionLoading ? 'در حال حذف...' : 'بله، حذف کن'}
                   </Button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const IRAN_BANKS: { [key: string]: string } = {
  '603799': 'ملی',
  '589210': 'سپه',
  '627353': 'تجارت',
  '628023': 'مسکان',
  '627760': 'پست بانک',
  '502229': 'پاسارگاد',
  '627412': 'اقتصاد نوین',
  '621986': 'سامان',
  '639346': 'سینا',
  '639607': 'سرمایه',
  '603769': 'صادرات',
  '610433': 'ملت',
  '627381': 'انصار',
  '589463': 'رفاه',
  '622106': 'پارسیان',
  '504172': 'رسالت',
  '636214': 'آینده',
  '502806': 'شهر',
  '505410': 'کوثر',
  '505785': 'ایران زمین',
};

function detectBankName(number: string): string {
  const prefix = number.replace(/\D/g, '').substring(0, 6);
  return IRAN_BANKS[prefix] || 'سایر بانک‌ها';
}

function formatCardNumber(number: string): string {
  const digits = number.replace(/\D/g, '').substring(0, 16);
  const groups = digits.match(/.{1,4}/g);
  return groups ? groups.join('-') : digits;
}

function BankCardsManager({ cards, onChange }: { cards: any[], onChange: (cards: any[]) => void }) {
  const addCard = () => onChange([...cards, { number: '', bankName: '', ownerName: '' }]);
  const removeCard = (index: number) => onChange(cards.filter((_, i) => i !== index));
  const updateCard = (index: number, field: string, value: string) => {
    const newCards = [...cards];
    newCards[index] = { ...newCards[index], [field]: value };
    if (field === 'number') {
      newCards[index].number = formatCardNumber(value);
      newCards[index].bankName = detectBankName(newCards[index].number);
    }
    onChange(newCards);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <label className="block text-sm font-black text-gray-700 dark:text-slate-300">شماره کارت‌های متصل</label>
        <button type="button" onClick={addCard} className="flex items-center gap-1 text-[11px] text-blue-600 font-black hover:bg-blue-50 dark:hover:bg-blue-500/10 px-2 py-1 rounded-lg transition-colors">
          <Plus className="w-3 h-3" /> افزودن کارت
        </button>
      </div>
      {cards.length === 0 && (
        <div className="text-center py-8 bg-gray-50/50 dark:bg-slate-800/30 rounded-2xl border-2 border-dashed border-gray-100 dark:border-slate-800">
           <p className="text-[10px] font-bold text-gray-400">هیچ شماره کارتی برای این فروشگاه ثبت نشده است</p>
        </div>
      )}
      <div className="space-y-4">
        {cards.map((card, idx) => (
          <div key={idx} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm space-y-4 relative group transition-all hover:border-blue-200 dark:hover:border-blue-500/30">
            <div className="flex justify-between items-center pb-2 border-b border-gray-50 dark:border-slate-800/50">
               <span className="text-[10px] font-black text-blue-600/50 uppercase tracking-tighter">کارت شما #{idx + 1}</span>
               <button 
                  type="button" 
                  onClick={() => removeCard(idx)} 
                  className="flex items-center gap-1 p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                  title="حذف کارت"
               >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold">حذف</span>
               </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="sm:col-span-2">
                 <TextField 
                   label="شماره ۱۶ رقمی کارت"
                   placeholder="0000-0000-0000-0000" 
                   value={card.number} 
                   onChange={(e:any) => updateCard(idx, 'number', e.target.value)}
                   dir="ltr"
                   className="text-center font-mono tracking-widest text-lg"
                 />
               </div>
               <TextField 
                 label="نام بانک"
                 placeholder="بانک ملت، ملی..." 
                 value={card.bankName} 
                 onChange={(e:any) => updateCard(idx, 'bankName', e.target.value)}
               />
               <TextField 
                 label="نام صاحب حساب"
                 placeholder="نام و نام خانوادگی" 
                 value={card.ownerName || ''} 
                 onChange={(e:any) => updateCard(idx, 'ownerName', e.target.value)}
               />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SuperAdminDashboard({ user }: { user: User }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTabParam = searchParams.get('tab') as 'shops' | 'licenses' | 'revenue' | null;
  const activeTab = activeTabParam || 'shops';

  const setActiveTab = (tab: 'shops' | 'licenses' | 'revenue') => {
    setSearchParams({ tab });
  };

  const [shops, setShops] = useState<Shop[]>([]);
  const [licensePlans, setLicensePlans] = useState<LicensePlan[]>([]);
  const [transactions, setTransactions] = useState<LicenseTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isAdding, setIsAdding] = useState(false);
  const [newShop, setNewShop] = useState<Partial<Shop>>({ licensePlanId: '', bankCards: [], geminiApiKeys: [] });
  const [generatedUser, setGeneratedUser] = useState({ username: '', password: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [isRenewing, setIsRenewing] = useState(false);
  const [licenseActionType, setLicenseActionType] = useState<'renew' | 'change'>('renew');
  const [replaceImmediately, setReplaceImmediately] = useState(false);
  const [renewalPlanId, setRenewalPlanId] = useState('');
  const [renewalDurationValue, setRenewalDurationValue] = useState(12);
  const [renewalDurationUnit, setRenewalDurationUnit] = useState<'months' | 'days'>('months');
  const [discount, setDiscount] = useState<string>('');
  const [discountType, setDiscountType] = useState<'toman' | 'percent'>('toman');
  const [isEditingShop, setIsEditingShop] = useState(false);
  const [editedShop, setEditedShop] = useState<Partial<Shop>>({});
  const [actionLoading, setActionLoading] = useState(false);
  const [shopToDelete, setShopToDelete] = useState<Shop | null>(null);
  const { showToast } = useToast();
  const [isFinancialReportOpen, setIsFinancialReportOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<any>(null);
  const [invoiceExportLoading, setInvoiceExportLoading] = useState(false);
  const [licPaymentType, setLicPaymentType] = useState<'Cash' | 'Card' | 'Online' | 'Debt'>('Online');
  const [renewalPaymentType, setRenewalPaymentType] = useState<'Cash' | 'Card' | 'Online' | 'Debt'>('Online');

  const handleDownloadFinancialReportPDF = async () => {
    setInvoiceExportLoading(true);
    try {
      await downloadInvoicePDF('financial-report-print-area', `financial_report_${new Date().toISOString().substring(0, 10)}.pdf`);
      showToast('گزارش جامع مالی با موفقیت به صورت فایل PDF ذخیره شد');
    } catch (err) {
      console.error(err);
      showToast('خطا در بارگیری و آماده‌سازی فایل PDF گزارش', 'error');
    } finally {
      setInvoiceExportLoading(false);
    }
  };

  const handleDownloadInvoicePDF = async () => {
    if (!activeInvoice) return;
    setInvoiceExportLoading(true);
    try {
      await downloadInvoicePDF('invoice-print-area', `invoice_${activeInvoice.invoiceId}.pdf`);
      showToast('پیش فاکتور با موفقیت به صورت فایل PDF ذخیره شد');
    } catch (err) {
      console.error(err);
      showToast('خطا در بارگیری و آماده‌سازی فایل PDF', 'error');
    } finally {
      setInvoiceExportLoading(false);
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Resize to max 400px while maintaining aspect ratio
          const MAX_SIZE = 400;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Get high-compression JPEG
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
          
          if (isEdit) {
            setEditedShop({ ...editedShop, logoUrl: compressedBase64 });
          } else {
            setNewShop({ ...newShop, logoUrl: compressedBase64 });
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    // Real-time subscription for Shops
    const unsubShops = onSnapshot(collection(db, "shops"), (snap) => {
      const shopsData = snap.docs.map(docSnap => {
        let data = { id: docSnap.id, ...docSnap.data() } as Shop;
        
        // Auto-activate queued license logic moved to a separate check or handled here
        return data;
      });
      // Sort newest first
      shopsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setShops(shopsData);
      setLoading(false);
    }, (err) => {
      setError(translateError(err));
      setLoading(false);
    });

    // Real-time subscription for License Plans
    const unsubPlans = onSnapshot(collection(db, "license_plans"), (snap) => {
      setLicensePlans(snap.docs.map(d => ({ id: d.id, ...d.data() } as LicensePlan)));
    });

    // Real-time subscription for Transactions (optional, but good for revenue tab)
    const unsubTxs = onSnapshot(collection(db, "license_transactions"), (snap) => {
      const txs = snap.docs.map(d => ({ id: d.id, ...d.data() } as LicenseTransaction));
      txs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTransactions(txs);
    });

    return () => {
      unsubShops();
      unsubPlans();
      unsubTxs();
    };
  }, []);

  const [testingKey, setTestingKey] = useState<{index: number, mode: 'create' | 'edit'} | null>(null);

  const handleTestKey = async (apiKey: string, model: string, index: number, mode: 'create' | 'edit') => {
    if (!apiKey) {
      showToast('لطفاً ابتدا کلید API را وارد کنید', 'error');
      return;
    }
    setTestingKey({ index, mode });
    try {
      const response = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, model })
      });
      const data = await response.json();
      if (data.success) {
        showToast(`اتصال با موفقیت برقرار شد (تأخیر: ${data.latency} میلی‌ثانیه)`, 'success');
      } else {
        showToast(data.error || 'خطا در برقراری ارتباط با هوش مصنوعی', 'error');
      }
    } catch (err) {
      showToast('خطای شبکه در بررسی کلید API', 'error');
    } finally {
      setTestingKey(null);
    }
  };

  const fetchData = async () => {
    // No longer needed due to onSnapshot, but keeping signature for avoid breaking other calls if any
  };

  const fetchPlans = async () => {
    // No longer needed due to onSnapshot
  };

  const generateCredentials = () => {
    return {
      username: `store_${Math.random().toString(36).substring(2, 6)}@shop.com`,
      password: Math.random().toString(36).substring(2, 10).toUpperCase()
    };
  };

  const handleSaveStore = async (e: FormEvent) => {
    e.preventDefault();
    if (!newShop.name || !newShop.ownerName || !newShop.phone || !newShop.email || !newShop.address) {
      setError('لطفا تمامی فیلدها را پر کنید');
      return;
    }
    setError('');
    setIsSaving(true);
    let secondaryApp;
    try {
      const creds = generateCredentials();
      
      let licenseExpiresAt = null;
      let features: string[] = [];
      
      if (newShop.licensePlanId) {
        const selectedPlan = licensePlans.find(p => p.id === newShop.licensePlanId);
        if (selectedPlan) {
          const expirationDate = new Date();
          if (selectedPlan.durationDays && selectedPlan.durationDays > 0) {
            expirationDate.setDate(expirationDate.getDate() + selectedPlan.durationDays);
          } else {
            expirationDate.setMonth(expirationDate.getMonth() + selectedPlan.durationMonths);
          }
          licenseExpiresAt = expirationDate.toISOString();
          features = selectedPlan.features || [];
        }
      }

      const shopDoc = {
        ...newShop,
        logoUrl: newShop.logoUrl || '',
        bankCards: newShop.bankCards || [],
        status: 'active',
        licenseExpiresAt,
        features,
        createdAt: new Date().toISOString(),
        storeAccountEmail: creds.username,
        storeAccountPassword: creds.password,
      };
      
      const docRef = await addDoc(collection(db, "shops"), shopDoc);
      
      // Log transaction if a plan was selected
      if (newShop.licensePlanId) {
        const plan = licensePlans.find(p => p.id === newShop.licensePlanId);
        if (plan) {
          await addDoc(collection(db, "license_transactions"), {
            shopId: docRef.id,
            shopName: newShop.name,
            planId: plan.id,
            planName: plan.name,
            amount: plan.price,
            months: plan.durationMonths,
            paymentType: licPaymentType,
            createdAt: new Date().toISOString()
          });

          setActiveInvoice({
            invoiceId: `L-INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${docRef.id.slice(0, 4).toUpperCase()}`,
            date: new Date().toISOString(),
            type: 'license',
            seller: 'مرکز توسعه لایسنسینگ سیستم مرکزی ابری',
            buyer: {
              name: newShop.ownerName,
              brand: newShop.name,
              phone: newShop.phone,
              email: newShop.email,
              address: newShop.address
            },
            items: [
              {
                name: `فعال‌سازی لایسنس: ${plan.name}`,
                months: plan.durationMonths,
                price: plan.price
              }
            ],
            amount: plan.price,
            paymentType: licPaymentType
          });
        }
      }
      
      // Initialize secondary auth app to create user without overriding current sign-in
      secondaryApp = initializeApp(firebaseConfig, "SecondaryAuthApp" + Date.now().toString());
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, creds.username, creds.password);
      
      await setDoc(doc(db, "users", userCred.user.uid), {
        email: creds.username,
        role: 'storeadmin',
        shopId: docRef.id,
        createdAt: new Date().toISOString()
      });
      
      await secondaryAuth.signOut();
      await deleteApp(secondaryApp);
      
      setGeneratedUser(creds);
      showToast('فروشگاه جدید با موفقیت ایجاد شد');
      setIsAdding(false);
      setNewShop({});
      fetchData();
    } catch (err: any) {
      if (secondaryApp) {
        try { await deleteApp(secondaryApp); } catch (e) {}
      }
      setError('خطا در ذخیره فروشگاه: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (shop: Shop) => {
    setActionLoading(true);
    try {
      const newStatus = shop.status === 'active' ? 'expired' : 'active';
      await updateDoc(doc(db, "shops", shop.id), { status: newStatus });
      showToast(`وضعیت فروشگاه به ${newStatus === 'active' ? 'فعال' : 'غیرفعال'} تغییر یافت`);
      setSelectedShop({ ...shop, status: newStatus });
      setShops(shops.map(s => s.id === shop.id ? { ...s, status: newStatus } : s));
    } catch (e: any) {
      setError('خطا در تغییر وضعیت: ' + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const executeDelete = async () => {
    if (!shopToDelete) return;
    setActionLoading(true);
    try {
      await deleteDoc(doc(db, "shops", shopToDelete.id));
      setSelectedShop(null);
      setShops(shops.filter(s => s.id !== shopToDelete.id));
      setShopToDelete(null);
    } catch (e: any) {
      setError('خطا در حذف: ' + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateShop = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedShop) return;
    setActionLoading(true);
    let secondaryApp;
    try {
      const credsChanged = 
        (editedShop.storeAccountEmail && editedShop.storeAccountEmail !== selectedShop.storeAccountEmail) ||
        (editedShop.storeAccountPassword && editedShop.storeAccountPassword !== selectedShop.storeAccountPassword);

      if (credsChanged && selectedShop.storeAccountEmail && selectedShop.storeAccountPassword) {
        const { signInWithEmailAndPassword, updatePassword, updateEmail } = await import('firebase/auth');
        secondaryApp = initializeApp(firebaseConfig, "SecondaryAuthAppUpdate" + Date.now().toString());
        const secondaryAuth = getAuth(secondaryApp);
        
        try {
          const userCred = await signInWithEmailAndPassword(secondaryAuth, selectedShop.storeAccountEmail, selectedShop.storeAccountPassword);
          
          if (editedShop.storeAccountEmail && editedShop.storeAccountEmail !== selectedShop.storeAccountEmail) {
            await updateEmail(userCred.user, editedShop.storeAccountEmail);
            await updateDoc(doc(db, "users", userCred.user.uid), { email: editedShop.storeAccountEmail });
          }
          
          if (editedShop.storeAccountPassword && editedShop.storeAccountPassword !== selectedShop.storeAccountPassword) {
            await updatePassword(userCred.user, editedShop.storeAccountPassword);
          }
        } catch (authError: any) {
           console.error("Auth update failed:", authError);
           throw new Error("خطا در بروزرسانی رمز/ایمیل ورود. ممکن است رمز قبلی در سیستم نامعتبر شده باشد.");
        }
        
        await secondaryAuth.signOut();
        await deleteApp(secondaryApp);
      }

      await updateDoc(doc(db, "shops", selectedShop.id), editedShop);
      const updatedShop = { ...selectedShop, ...editedShop } as Shop;
      setSelectedShop(updatedShop);
      setShops(shops.map(s => s.id === updatedShop.id ? updatedShop : s));
      setIsEditingShop(false);
    } catch (e: any) {
      if (secondaryApp) {
        try { await deleteApp(secondaryApp); } catch (err) {}
      }
      setError('خطا در بروزرسانی: ' + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openEditMode = () => {
    if (selectedShop) {
      setEditedShop({
        name: selectedShop.name,
        logoUrl: selectedShop.logoUrl || '',
        bankCards: selectedShop.bankCards || [],
        ownerName: selectedShop.ownerName,
        phone: selectedShop.phone,
        email: selectedShop.email,
        address: selectedShop.address,
        geminiApiKey: selectedShop.geminiApiKey || '',
        geminiApiKeys: selectedShop.geminiApiKeys || [],
        storeAccountEmail: selectedShop.storeAccountEmail,
        storeAccountPassword: selectedShop.storeAccountPassword
      });
      setIsEditingShop(true);
    }
  };

  const handleRenewLicense = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedShop || !renewalPlanId) return;
    
    setActionLoading(true);
    try {
      const plan = licensePlans.find(p => p.id === renewalPlanId);
      if (!plan) throw new Error('پلن معتبری انتخاب نشده است');

      let updatedShop: Shop = { ...selectedShop };
      const durationValue = Number(renewalDurationValue);
      
      const calculateBasePrice = () => {
        if (plan.durationDays && plan.durationDays > 0) {
          // If it's a daily plan, calculate price based on days
          if (renewalDurationUnit === 'days') {
            return Math.round((plan.price / plan.durationDays) * durationValue);
          } else {
            // Plan is daily but user chose months (unlikely but handle it)
            return Math.round((plan.price / plan.durationDays) * (durationValue * 30));
          }
        } else {
          // It's a monthly plan
          if (renewalDurationUnit === 'months') {
            return Math.round((plan.price / plan.durationMonths) * durationValue);
          } else {
            // Monthly plan but user chose days
            return Math.round((plan.price / (plan.durationMonths * 30)) * durationValue);
          }
        }
      };

      let transactionParams: any = {
        shopId: selectedShop.id,
        shopName: selectedShop.name,
        planId: plan.id,
        planName: plan.name,
        amount: (() => {
          const basePrice = calculateBasePrice();
          const disc = Number(discount) || 0;
          return discountType === 'toman' 
            ? Math.max(0, basePrice - disc)
            : Math.max(0, basePrice - Math.round(basePrice * disc / 100));
        })(),
        months: renewalDurationUnit === 'months' ? durationValue : 0,
        days: renewalDurationUnit === 'days' ? durationValue : 0,
        paymentType: renewalPaymentType,
        createdAt: new Date().toISOString()
      };

      if (licenseActionType === 'renew') {
        const currentExpiry = selectedShop.licenseExpiresAt ? new Date(selectedShop.licenseExpiresAt) : new Date();
        const newExpiry = new Date(currentExpiry);
        if (renewalDurationUnit === 'months') {
          newExpiry.setMonth(newExpiry.getMonth() + durationValue);
        } else {
          newExpiry.setDate(newExpiry.getDate() + durationValue);
        }
        
        updatedShop = {
          ...updatedShop,
          licensePlanId: renewalPlanId,
          licenseExpiresAt: newExpiry.toISOString(),
          features: plan.features || [],
          status: 'active'
        };
      } else {
        // Change Plan
        if (replaceImmediately || !selectedShop.licensePlanId) {
           const newExpiry = new Date();
           if (renewalDurationUnit === 'months') {
             newExpiry.setMonth(newExpiry.getMonth() + durationValue);
           } else {
             newExpiry.setDate(newExpiry.getDate() + durationValue);
           }
           updatedShop = {
             ...updatedShop,
             licensePlanId: renewalPlanId,
             licenseExpiresAt: newExpiry.toISOString(),
             features: plan.features || [],
             status: 'active'
           };
        } else {
           // Queue
           updatedShop = {
             ...updatedShop,
             queuedLicensePlanId: renewalPlanId,
             queuedLicenseMonths: renewalDurationUnit === 'months' ? durationValue : 0,
             queuedLicenseDays: renewalDurationUnit === 'days' ? durationValue : 0
           };
           transactionParams.amount = 0; 
        }
      }
      
      const { id, ...dataToSave } = updatedShop;
      await updateDoc(doc(db, "shops", selectedShop.id), dataToSave);

      // Log transaction
      const txDocRef = await addDoc(collection(db, "license_transactions"), transactionParams);
      
      setShops(shops.map(s => s.id === selectedShop.id ? updatedShop : s));
      showToast(licenseActionType === 'renew' ? 'لایسنس فروشگاه با موفقیت تمدید شد' : 'لایسنس با موفقیت تغییر کرد');
      setSelectedShop(updatedShop);
      setIsRenewing(false);

      setActiveInvoice({
        invoiceId: `L-INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${txDocRef.id.slice(0, 4).toUpperCase()}`,
        date: new Date().toISOString(),
        type: 'license',
        seller: 'مرکز توسعه لایسنسینگ سیستم مرکزی ابری',
        buyer: {
          name: selectedShop.ownerName,
          brand: selectedShop.name,
          phone: selectedShop.phone,
          email: selectedShop.email,
          address: selectedShop.address
        },
        items: [
          {
            name: licenseActionType === 'renew' ? `تمدید لایسنس: ${plan.name}` : `تغییر پلن لایسنس به: ${plan.name}`,
            months: Number(durationValue),
            price: transactionParams.amount
          }
        ],
        amount: transactionParams.amount,
        paymentType: renewalPaymentType
      });

    } catch (e: any) {
      setError('خطا در ثبت لایسنس: ' + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && shops.length === 0) return <LoadingWidget />;

  const activeShops = shops.filter(s => s.status === 'active').length;
  const expiredShops = shops.filter(s => s.status === 'expired').length;

  const calculateRevenue = (period: 'day' | 'week' | 'month' | 'year') => {
    const now = new Date();
    let startDate = new Date();
    
    if (period === 'day') startDate.setHours(0, 0, 0, 0);
    else if (period === 'week') startDate.setDate(now.getDate() - 7);
    else if (period === 'month') startDate.setMonth(now.getMonth() - 1);
    else if (period === 'year') startDate.setFullYear(now.getFullYear() - 1);
    
    return transactions
      .filter(tx => new Date(tx.createdAt) >= startDate)
      .reduce((sum, tx) => sum + tx.amount, 0);
  };

  const dayRevenue = calculateRevenue('day');
  const weekRevenue = calculateRevenue('week');
  const monthRevenue = calculateRevenue('month');
  const yearRevenue = calculateRevenue('year');

  const statCards = [
    { title: 'کل فروشگاه‌ها', value: shops.length, icon: Store, gradient: 'from-blue-600 to-indigo-700', trend: '۰٪' },
    { title: 'فروشگاه‌های فعال', value: activeShops, icon: Activity, gradient: 'from-emerald-500 to-teal-600', trend: '۰٪' },
    { title: 'لایسنس‌های منقضی', value: expiredShops, icon: AlertCircle, gradient: 'from-rose-500 to-orange-600', trend: '۰٪' },
    { title: 'درآمد ماهانه لایسنس', value: monthRevenue.toLocaleString('fa-IR'), icon: DollarSign, gradient: 'from-violet-600 to-purple-700', trend: '۰٪', unit: 'تومان' }, 
  ];

  const columns = [
    { header: 'فروشگاه', cell: (row: Shop) => (
      <div className="flex items-center gap-3">
        {row.logoUrl ? (
          <img src={row.logoUrl} className="w-10 h-10 rounded-xl object-cover border border-gray-100 shadow-sm" alt="" />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Store className="w-5 h-5" />
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-gray-900 dark:text-white font-black text-[13px]">{row.name}</span>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter tabular-nums">شناسه: {row.id.slice(0, 8)}</span>
        </div>
      </div>
    )},
    { header: 'مدیریت', accessor: 'ownerName' },
    { header: 'تاریخ شروع', cell: (row: Shop) => (
      <div className="flex flex-col">
        <span className="text-gray-700 dark:text-slate-300 font-bold text-xs">
          {new Date(row.createdAt).toLocaleDateString('fa-IR')}
        </span>
        <span className="text-[10px] text-gray-400 font-medium">ثبت نام اولیه</span>
      </div>
    )},
    { header: 'وضعیت لایسنس', cell: (row: Shop) => {
      const isExpired = row.status === 'expired' || (row.licenseExpiresAt && new Date(row.licenseExpiresAt) < new Date());
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isExpired ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
            <span className={`text-[11px] font-black ${isExpired ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {isExpired ? 'منقضی شده' : 'فعال و معتبر'}
            </span>
          </div>
          {row.queuedLicensePlanId && (
            <span className="text-[9px] font-black w-max bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">تغییر رزرو شده</span>
          )}
        </div>
      );
    }},
    { header: 'عملیات', cell: (row: Shop) => (
      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedShop(row); }} className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10">
        مشاهده جزئیات
      </Button>
    )}
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 px-4">
      {/* Premium Header Section */}
      <div className="relative overflow-hidden bg-white dark:bg-[#1e293b] p-8 rounded-[40px] shadow-2xl shadow-blue-500/5 border border-gray-100 dark:border-slate-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 blur-[100px] -ml-32 -mb-32" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 border border-blue-100 dark:border-blue-500/20">
              <ShieldCheck className="w-3 h-3" />
              دسترسی سطح مدیر کل
            </div>
            <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">پنل ابری مدیریت</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 font-medium max-w-md leading-relaxed">
              مرکز کنترل و نظارت بر کلیه فروشگاه‌های فعال در شبکه سیستم مدیریتی هوشمند.
            </p>
          </div>
          
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-6 w-full lg:w-auto">
            <div className="grid grid-cols-3 sm:flex bg-gray-100/80 dark:bg-slate-900/80 p-1.5 rounded-[28px] border border-gray-100 dark:border-slate-800 backdrop-blur-xl w-full sm:w-auto shadow-inner">
              <button 
                onClick={() => setActiveTab('shops')}
                className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-[22px] text-[10px] sm:text-[11px] font-black transition-all duration-300 ${activeTab === 'shops' ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 shadow-lg' : 'text-gray-400 hover:text-gray-600 dark:hover:text-slate-300'}`}
              >
                <span>فروشگاه‌ها</span>
                <Store className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setActiveTab('licenses')}
                className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-[22px] text-[10px] sm:text-[11px] font-black transition-all duration-300 ${activeTab === 'licenses' ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 shadow-lg' : 'text-gray-400 hover:text-gray-600 dark:hover:text-slate-300'}`}
              >
                <span>لایسنس‌ها</span>
                <Zap className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setActiveTab('revenue')}
                className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-[22px] text-[10px] sm:text-[11px] font-black transition-all duration-300 ${activeTab === 'revenue' ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 shadow-lg' : 'text-gray-400 hover:text-gray-600 dark:hover:text-slate-300'}`}
              >
                <span>تحلیل درآمد</span>
              </button>
            </div>
            
            {activeTab === 'shops' && (
              <button 
                onClick={() => {
                  setIsAdding(true);
                  setError('');
                }} 
                className="group relative h-14 w-full sm:w-auto px-10 rounded-2xl font-black text-sm transition-all duration-500 overflow-hidden shadow-xl hover:shadow-blue-500/40 active:scale-95"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 bg-[length:200%_100%] animate-gradient group-hover:bg-right transition-all duration-1000" />
                <div className="relative flex items-center justify-center gap-3 text-white">
                  <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-500">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span>راه‌اندازی ایستگاه جدید</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <ErrorWidget message={error} />
        </motion.div>
      )}

      {activeTab === 'licenses' && <LicenseManagement plans={licensePlans} fetchPlans={fetchPlans} />}

      {activeTab === 'revenue' && (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-5 duration-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
             <div className="group bg-white dark:bg-[#1e293b] p-10 rounded-[48px] shadow-2xl shadow-blue-500/5 border border-gray-100 dark:border-slate-800 relative overflow-hidden transition-all hover:-translate-y-2">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[100px] -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-colors" />
                <div className="relative space-y-4">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded-2xl flex items-center justify-center">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">درآمد امروز</p>
                    <p className="text-4xl font-black text-gray-900 dark:text-white font-mono tracking-tighter tabular-nums">
                      {dayRevenue.toLocaleString('fa-IR')} <span className="text-[10px] text-gray-400 font-black">تومان</span>
                    </p>
                  </div>
                </div>
             </div>

             <div className="group bg-white dark:bg-[#1e293b] p-10 rounded-[48px] shadow-2xl shadow-emerald-500/5 border border-gray-100 dark:border-slate-800 relative overflow-hidden transition-all hover:-translate-y-2">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[100px] -mr-16 -mt-16 group-hover:bg-emerald-500/20 transition-colors" />
                <div className="relative space-y-4">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">پیش‌بینی هفتگی</p>
                    <p className="text-4xl font-black text-gray-900 dark:text-white font-mono tracking-tighter tabular-nums">
                      {weekRevenue.toLocaleString('fa-IR')} <span className="text-[10px] text-gray-400 font-black">تومان</span>
                    </p>
                  </div>
                </div>
             </div>

             <div className="group bg-white dark:bg-[#1e293b] p-10 rounded-[48px] shadow-2xl shadow-violet-500/5 border border-gray-100 dark:border-slate-800 relative overflow-hidden transition-all hover:-translate-y-2">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 blur-[100px] -mr-16 -mt-16 group-hover:bg-violet-500/20 transition-colors" />
                <div className="relative space-y-4">
                  <div className="w-12 h-12 bg-violet-50 dark:bg-violet-500/10 text-violet-600 rounded-2xl flex items-center justify-center">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">بازدهی لایسنس (۳۰ روز)</p>
                    <p className="text-4xl font-black text-gray-900 dark:text-white font-mono tracking-tighter tabular-nums">
                      {monthRevenue.toLocaleString('fa-IR')} <span className="text-[10px] text-gray-400 font-black">تومان</span>
                    </p>
                  </div>
                </div>
             </div>
             <div className="group bg-white dark:bg-[#1e293b] p-10 rounded-[48px] shadow-2xl shadow-amber-500/5 border border-gray-100 dark:border-slate-800 relative overflow-hidden transition-all hover:-translate-y-2">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[100px] -mr-16 -mt-16 group-hover:bg-amber-500/20 transition-colors" />
                <div className="relative space-y-4">
                  <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">درآمد سالانه (تجمعی)</p>
                    <p className="text-4xl font-black text-gray-900 dark:text-white font-mono tracking-tighter tabular-nums">
                      {yearRevenue.toLocaleString('fa-IR')} <span className="text-[10px] text-gray-400 font-black">تومان</span>
                    </p>
                  </div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Detailed Stats */}
            <Card className="lg:col-span-1 p-10 rounded-[48px] bg-gradient-to-br from-[#2563eb] to-[#1e40af] text-white border-none shadow-2xl shadow-blue-500/20 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 blur-[120px] -mr-40 -mt-40 group-hover:scale-110 transition-transform duration-700" />
               <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-indigo-400/20 blur-[100px]" />
               
               <div className="relative space-y-10">
                 <div>
                   <h4 className="text-sm font-black uppercase tracking-[0.4em] opacity-50 mb-3">عملکرد درآمدی پلتفرم</h4>
                   <p className="text-4xl md:text-5xl font-black font-mono tracking-tighter leading-tight italic">
                     {monthRevenue.toLocaleString('fa-IR')}
                     <span className="text-lg opacity-40 mr-2 not-italic">تومان</span>
                   </p>
                   <p className="text-[11px] font-black text-blue-100 mt-4 bg-white/10 w-fit px-4 py-2 rounded-full backdrop-blur-sm shadow-inner">
                     خالص دریافتی پلتفرم در ۳۰ روز اخیر
                   </p>
                 </div>
 
                 <div className="space-y-6 pt-10 border-t border-white/10">
                   <div className="flex justify-between items-center bg-white/5 p-4 rounded-3xl backdrop-blur-md border border-white/5 shadow-inner">
                     <span className="text-[10px] font-black text-blue-100 uppercase tracking-widest">تراکنش‌های معتبر</span>
                     <span className="font-black font-mono text-xl tabular-nums">{transactions.length.toLocaleString('fa-IR')}</span>
                   </div>
                   <div className="flex justify-between items-center px-4">
                     <span className="text-[10px] font-black text-blue-100 uppercase tracking-widest">میانگین لایسنس</span>
                     <span className="font-black font-mono tabular-nums">{(transactions.length > 0 ? Math.floor(monthRevenue / transactions.length) : 0).toLocaleString('fa-IR')}</span>
                   </div>
                   <div className="flex justify-between items-center px-4">
                     <span className="text-[10px] font-black text-blue-100 uppercase tracking-widest">نرخ رشد ماهانه</span>
                     <span className="font-black font-mono text-emerald-400 tabular-nums">۰٪</span>
                   </div>
                 </div>
 
                 <Button className="w-full h-16 bg-blue-900 hover:bg-blue-800 text-white rounded-[28px] font-black shadow-2xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 group border-none" onClick={() => setIsFinancialReportOpen(true)}>
                    <span className="text-white">مشاهده گزارش کامل مالی</span>
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                       <ChevronRight className="w-4 h-4 text-white" />
                    </div>
                 </Button>
               </div>
            </Card>


            {/* Transactions Timeline */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex justify-between items-center px-4">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                  <ArrowRightLeft className="w-6 h-6 text-blue-600" />
                  تاریخچه دقیق تراکنش‌های لایسنس
                </h3>
              </div>
              
              <div className="bg-white dark:bg-[#1e293b] rounded-[48px] border border-gray-100 dark:border-slate-800 shadow-2xl shadow-gray-200/5 overflow-hidden">
                <DataTable 
                  columns={[
                    { header: 'فروشگاه مقصد', cell: (r:any) => (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-50 dark:bg-slate-900 rounded-xl flex items-center justify-center text-blue-600">
                          <Store className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-sm">{r.shopName}</span>
                          <span className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">فروشگاه تایید شده</span>
                        </div>
                      </div>
                    )},
                    { header: 'پکیج لایسنس', cell: (r:any) => (
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-500/20">
                        {r.planName}
                      </div>
                    )},
                    { header: 'زمان (دوره)', cell: (r:any) => <span className="text-xs font-black text-gray-500 dark:text-slate-400">{r.months.toLocaleString('fa-IR')} ماهه</span> },
                    { header: 'مبلغ پرداختی', cell: (r:any) => (
                      <div className="text-left font-mono">
                        <p className="text-base font-black text-emerald-600">{r.amount.toLocaleString('fa-IR')}</p>
                        <p className="text-[8px] text-gray-300 font-black uppercase tracking-widest">تایید دریافت</p>
                      </div>
                    )},
                    { header: 'زمان ثبت', cell: (r:any) => (
                      <div className="flex flex-col items-start min-w-[100px]">
                        <span className="text-[10px] font-black text-gray-700 dark:text-slate-300">
                           {new Date(r.createdAt).toLocaleDateString('fa-IR')}
                        </span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                           {new Date(r.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  ]}
                  data={transactions}
                />
                {transactions.length === 0 && (
                   <div className="p-20 text-center space-y-4">
                      <div className="w-20 h-20 bg-gray-50 dark:bg-slate-900 rounded-[32px] flex items-center justify-center mx-auto shadow-inner">
                        <BarChart3 className="w-10 h-10 text-gray-200" />
                      </div>
                      <p className="text-sm font-black text-gray-400 uppercase tracking-widest">هیچ تراکنشی در سامانه ثبت نشده است</p>
                   </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'shops' && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  transition={{ delay: i * 0.1, duration: 0.5, type: 'spring' }}
                  className="relative group cursor-pointer"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-10 rounded-[32px] transition-opacity duration-500`} />
                  <div className="bg-white dark:bg-[#1e293b] rounded-[32px] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-slate-800 transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-blue-500/10">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-4 rounded-2xl bg-gradient-to-br ${stat.gradient} text-white shadow-lg shadow-blue-500/20`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className={`px-2.5 py-1 rounded-full text-[10px] font-black ${stat.trend.includes('+') ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-gray-50 text-gray-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {stat.trend}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">{stat.title}</p>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter">
                          {typeof stat.value === 'number' ? stat.value.toLocaleString('fa-IR') : stat.value}
                        </span>
                        {stat.unit && <span className="text-xs font-bold text-gray-400">{stat.unit}</span>}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

      <AnimatePresence>
        {generatedUser.username && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="p-6 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl shadow-sm relative overflow-hidden">
              <div className="absolute -right-12 -top-12 text-emerald-100/50 dark:text-emerald-500/10">
                <CheckCircle2 className="w-48 h-48" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-500 text-white rounded-full">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-400">فروشگاه با موفقیت ایجاد شد!</h3>
                </div>
                <p className="text-sm text-emerald-700 dark:text-emerald-500 font-medium mb-4">
                  لطفا اطلاعات دسترسی زیر را در اختیار مدیریت فروشگاه قرار دهید. (این اطلاعات قابلیت بازیابی مجدد ندارند)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl bg-white dark:bg-[#0f172a] p-5 rounded-xl border border-emerald-100 dark:border-emerald-500/20 shadow-inner" dir="ltr">
                  <div>
                    <span className="block text-xs font-bold tracking-widest text-gray-400 dark:text-slate-500 uppercase mb-1">Username</span>
                    <span className="text-gray-900 dark:text-slate-200 font-mono font-medium">{generatedUser.username}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold tracking-widest text-gray-400 dark:text-slate-500 uppercase mb-1">Password</span>
                    <span className="text-gray-900 dark:text-slate-200 font-mono font-medium">{generatedUser.password}</span>
                  </div>
                </div>
                <Button variant="outline" className="mt-4 border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20" onClick={() => setGeneratedUser({username: '', password: ''})}>
                  بستن تاییدیه
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Shop Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto no-scrollbar bg-white dark:bg-[#1e293b] rounded-[48px] shadow-[0_0_100px_rgba(0,0,0,0.4)] border border-gray-100/50 dark:border-slate-800"
            >
              <div className="sticky top-0 z-10 px-10 pt-10 pb-6 bg-white/80 dark:bg-[#1e293b]/80 backdrop-blur-md flex items-center justify-between border-b border-gray-50 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600">
                    <Store className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white">راه‌اندازی ایستگاه جدید</h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">تخصیص زیرساخت و لایسنس هوشمند</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="p-3 rounded-2xl bg-gray-50 dark:bg-slate-800 text-gray-400 hover:text-rose-500 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-10">
                <form onSubmit={handleSaveStore} className="space-y-12">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Column 1: Identity */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
                          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">هویت فروشگاه</h4>
                        </div>
                        
                        <TextField label="نام برند فروشگاه" value={newShop.name || ''} onChange={(e:any)=>setNewShop({...newShop, name: e.target.value})} placeholder="مثال: بازرگانی پارس" required />
                        
                        <div className="space-y-4">
                          <label className="block text-xs font-black text-gray-500 dark:text-slate-400 uppercase ml-1">لوگو و نماد</label>
                          <div className="flex items-center gap-6 p-6 bg-gray-50 dark:bg-slate-900/40 rounded-[32px] border-2 border-dashed border-gray-200 dark:border-slate-800 transition-all hover:border-blue-500/50">
                            <div className="w-24 h-24 rounded-3xl bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center overflow-hidden border-2 border-white dark:border-slate-700 shrink-0">
                              {newShop.logoUrl ? (
                                <img src={newShop.logoUrl} className="w-full h-full object-cover" />
                              ) : (
                                <Upload className="w-8 h-8 text-gray-200" />
                              )}
                            </div>
                            <div className="space-y-2">
                               <label className="inline-flex h-10 px-6 items-center justify-center bg-white dark:bg-slate-800 text-blue-600 rounded-xl text-[10px] font-black cursor-pointer hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-gray-100 dark:border-slate-700">
                                  <span>انتخاب فایل لوگو</span>
                                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, false)} />
                               </label>
                               <p className="text-[10px] text-gray-400 font-medium">فرمت JPEG یا PNG (حداکثر ۱ مگابایت)</p>
                            </div>
                          </div>
                        </div>
                    </div>

                    {/* Column 2: Management & License */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">مدیریت و اعتبار</h4>
                        </div>
                        
                        <TextField label="نام و نام‌خانوادگی مالک" value={newShop.ownerName || ''} onChange={(e:any)=>setNewShop({...newShop, ownerName: e.target.value})} placeholder="مثال: رضا احمدی" required />
                        <TextField label="شماره موبایل مستقیم" value={newShop.phone || ''} onChange={(e:any)=>setNewShop({...newShop, phone: e.target.value})} placeholder="09120000000" required />
                        
                        <div className="space-y-3">
                          <label className="block text-xs font-black text-gray-500 dark:text-slate-400 uppercase ml-1">انتخاب پلن لایسنس</label>
                          <select 
                            value={newShop.licensePlanId || ''} 
                            onChange={(e) => setNewShop({...newShop, licensePlanId: e.target.value})}
                            className="w-full p-4 bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-gray-900 dark:text-white transition-all cursor-pointer"
                          >
                            <option value="">بدون لایسنس فعال (رایگان)</option>
                            {licensePlans.map(plan => (
                              <option key={plan.id} value={plan.id}>
                                {plan.name} — {plan.durationMonths || plan.durationDays} {plan.durationDays ? 'روزه' : 'ماهه'} ({plan.price === 0 ? 'رایگان' : `${plan.price.toLocaleString()} تومان`})
                              </option>
                            ))}
                          </select>
                        </div>

                        {newShop.licensePlanId && (
                          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="block text-xs font-black text-gray-500 dark:text-slate-400 uppercase ml-1">روش پرداخت لایسنس</label>
                            <select 
                              value={licPaymentType} 
                              onChange={(e) => setLicPaymentType(e.target.value as any)}
                              className="w-full p-4 bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-gray-900 dark:text-white transition-all cursor-pointer"
                            >
                              <option value="Online">درگاه پرداخت آنلاین امن</option>
                              <option value="Card">کارت به کارت</option>
                              <option value="Cash">نقدی (صندوق)</option>
                              <option value="Debt">نسیه / حساب دفتری</option>
                            </select>
                          </div>
                        )}
                    </div>

                    {/* Column 3: Contact & Tech */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">ارتباط و زیرساخت</h4>
                        </div>
                        
                        <TextField label="ایمیل رسمی" type="email" value={newShop.email || ''} onChange={(e:any)=>setNewShop({...newShop, email: e.target.value})} placeholder="office@brand.ir" required />
                        <TextField label="نشانی دقیق پستی" value={newShop.address || ''} onChange={(e:any)=>setNewShop({...newShop, address: e.target.value})} placeholder="تهران، خیابان..." required />

                        <div className="pt-8 border-t border-gray-100 dark:border-slate-800">
                           <div className="flex justify-between items-center mb-6">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">کارت‌های بانکی</h4>
                              </div>
                              <Button type="button" variant="ghost" onClick={() => setNewShop({...newShop, bankCards: [...(newShop.bankCards || []), { bankName: '', number: '', ownerName: '' }]})} className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 rounded-xl px-3 py-1">افزودن کارت</Button>
                           </div>
                           <div className="space-y-4">
                              {(newShop.bankCards || []).map((card, idx) => (
                                <div key={idx} className="p-4 bg-gray-100 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-3 group">
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                   <TextField label="شماره کارت" value={card.number} onChange={(e:any) => {
                                     const newCards = [...(newShop.bankCards || [])];
                                     newCards[idx] = { ...newCards[idx], number: e.target.value };
                                     setNewShop({ ...newShop, bankCards: newCards });
                                   }} dir="ltr" />
                                   <TextField label="نام بانک" value={card.bankName} onChange={(e:any) => {
                                     const newCards = [...(newShop.bankCards || [])];
                                     newCards[idx] = { ...newCards[idx], bankName: e.target.value };
                                     setNewShop({ ...newShop, bankCards: newCards });
                                   }} />
                                 </div>
                                 <TextField label="نام دارنده" value={card.ownerName} onChange={(e:any) => {
                                   const newCards = [...(newShop.bankCards || [])];
                                   newCards[idx] = { ...newCards[idx], ownerName: e.target.value };
                                   setNewShop({ ...newShop, bankCards: newCards });
                                 }} />
                                 <div className="flex justify-start">
                                   <button type="button" onClick={() => {
                                     const newCards = [...(newShop.bankCards || [])];
                                     newCards.splice(idx, 1);
                                     setNewShop({ ...newShop, bankCards: newCards });
                                   }} className="flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-rose-600 bg-rose-50 dark:bg-rose-500/10 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all border border-rose-100 dark:border-rose-500/20">
                                     <Trash2 className="w-3.5 h-3.5" />
                                     حذف کارت
                                   </button>
                                 </div>
                               </div>
                              ))}
                              {(newShop.bankCards || []).length === 0 && (
                                <p className="text-xs text-center text-gray-400 py-4 border border-dashed border-gray-200 dark:border-slate-700 rounded-xl">هیچ کارت بانکی ثبت نشده است</p>
                              )}
                           </div>
                        </div>
                    </div>
                  </div>

                  <div className="relative group p-8 bg-gradient-to-br from-indigo-50/50 to-blue-50/50 dark:from-indigo-500/10 dark:to-blue-500/5 rounded-[40px] border border-indigo-100 dark:border-indigo-500/20 shadow-2xl overflow-hidden mt-8">
                          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Cpu className="w-32 h-32 text-indigo-600 dark:text-indigo-400 rotate-12" />
                          </div>
                          
                          <div className="relative space-y-6">
                            <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-xl shrink-0">
                                  <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                                </div>
                                <div className="overflow-hidden">
                                  <h4 className="text-[10px] font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-widest truncate">AI Cluster</h4>
                                  <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-tighter truncate">Neural Keys</p>
                                </div>
                              </div>
                              <button 
                                type="button"
                                 onClick={() => setNewShop({ ...newShop, geminiApiKeys: [...(newShop.geminiApiKeys || []), { key: '', model: 'gemini-1.5-flash', label: `Node #${(newShop.geminiApiKeys?.length || 0) + 1}` }] })}
                                className="h-10 w-full lg:w-auto px-6 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 shrink-0"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                افزودن کلید جدید
                              </button>
                            </div>

                            <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar py-1">
                              {(newShop.geminiApiKeys || []).length === 0 ? (
                                <div className="p-10 border-2 border-dashed border-indigo-100 dark:border-indigo-500/20 rounded-3xl text-center space-y-3">
                                   <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                                      <Key className="w-6 h-6 text-indigo-200" />
                                   </div>
                                   <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest leading-relaxed">No API keys registered yet.<br/>Please deploy at least one key for AI features.</p>
                                </div>
                              ) : (
                                (newShop.geminiApiKeys || []).map((keyConfig, idx) => (
                                  <div key={idx} className="group/key relative p-5 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-indigo-100/50 dark:border-indigo-500/10 hover:shadow-xl hover:border-indigo-300 transition-all">
                                     <div className="flex flex-col sm:flex-row gap-4">
                                        <div className="flex-1 space-y-3">
                                           <div className="flex items-center justify-between">
                                              <input 
                                                className="bg-transparent border-none p-0 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest focus:ring-0 w-full placeholder:text-indigo-200"
                                                value={keyConfig.label || ''}
                                                onChange={(e) => {
                                                  const updated = [...(newShop.geminiApiKeys || [])];
                                                  updated[idx] = { ...updated[idx], label: e.target.value };
                                                  setNewShop({ ...newShop, geminiApiKeys: updated });
                                                }}
                                                placeholder="نام گره (مثلاً PRIMARY-NODE)"
                                              />
                                              <div className="flex items-center gap-2">
                                                 <select 
                                                   value={keyConfig.model}
                                                   onChange={(e) => {
                                                      const updated = [...(newShop.geminiApiKeys || [])];
                                                      updated[idx] = { ...updated[idx], model: e.target.value };
                                                      setNewShop({ ...newShop, geminiApiKeys: updated });
                                                   }}
                                                   className="bg-indigo-50 dark:bg-indigo-500/10 border-none rounded-lg p-1 px-2 text-[9px] font-black text-indigo-500 focus:ring-0 outline-none"
                                                 >
                                                   <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash</option>
                                                   <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                                   <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                                                   <option value="gemini-1.5-flash-8b">Gemini 1.5 Flash-8B</option>
                                                 </select>
                                              </div>
                                           </div>
                                           <TextField 
                                              value={keyConfig.key}
                                              onChange={(e:any) => {
                                                const updated = [...(newShop.geminiApiKeys || [])];
                                                updated[idx] = { ...updated[idx], key: e.target.value };
                                                setNewShop({ ...newShop, geminiApiKeys: updated });
                                              }}
                                              placeholder="AIzaSy..."
                                              type="password"
                                              dir="ltr"
                                              className="m-0"
                                              inputClassName="h-11 bg-white/80 dark:bg-slate-800/80 border-indigo-50 dark:border-indigo-500/10 rounded-xl text-xs font-mono tracking-widest"
                                           />
                                        </div>
                                        <div className="flex sm:flex-col gap-3 pt-3 sm:pt-6">
                                           <button 
                                              type="button"
                                              onClick={() => handleTestKey(keyConfig.key, keyConfig.model, idx, 'create')}
                                              disabled={testingKey !== null}
                                              className={`flex-1 sm:flex-none h-12 sm:h-11 sm:w-11 rounded-xl flex items-center justify-center transition-all ${testingKey?.index === idx && testingKey?.mode === 'create' ? 'bg-indigo-100 text-indigo-400' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10'}`}
                                           >
                                              <Activity className={`w-4 h-4 ${testingKey?.index === idx && testingKey?.mode === 'create' ? 'animate-pulse' : ''}`} />
                                           </button>
                                           <button 
                                              type="button"
                                              onClick={() => {
                                                if (window.confirm('آیا از حذف این کلید API اطمینان دارید؟')) {
                                                  const updated = [...(newShop.geminiApiKeys || [])];
                                                  updated.splice(idx, 1);
                                                  setNewShop({ ...newShop, geminiApiKeys: updated });
                                                }
                                              }}
                                              className="flex-1 sm:flex-none h-12 sm:h-11 sm:w-11 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center transition-all"
                                           >
                                              <Trash2 className="w-4 h-4" />
                                           </button>
                                        </div>
                                     </div>
                                  </div>
                                ))
                              )}
                            </div>

                            <div className="flex items-center gap-2 pt-3 border-t border-indigo-100/30 dark:border-indigo-500/10">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span className="text-[9px] font-bold text-emerald-600/70 dark:text-emerald-400/60 uppercase tracking-tighter font-mono">Infrastructure Cluster: {(newShop.geminiApiKeys || []).length} Nodes Active</span>
                            </div>
                          </div>
                        </div>

                  <div className="pt-10 border-t border-gray-50 dark:border-slate-800 flex flex-col xl:flex-row items-center xl:justify-between gap-8">
                    <div className="flex items-center gap-4 p-5 bg-blue-50/50 dark:bg-blue-500/5 rounded-[32px] w-full xl:max-w-2xl border border-blue-100/50 dark:border-blue-500/10">
                       <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-lg shrink-0">
                          <AlertCircle className="w-6 h-6 text-blue-500" />
                       </div>
                       <p className="text-xs font-bold text-blue-700/80 dark:text-blue-400/80 leading-relaxed">
                        با ثبت فروشگاه، یک حساب کاربری خودکار با سطح دسترسی "مدیر فروشگاه" ایجاد شده و اطلاعات ورود در مرحله بعد نمایش داده خواهد شد.
                       </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto shrink-0">
                       <button 
                        type="button" 
                        onClick={() => setIsAdding(false)} 
                        className="h-16 px-10 rounded-[24px] text-sm font-black text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
                       >
                         انصراف و بازگشت
                       </button>
                       <button 
                        type="submit" 
                        disabled={isSaving} 
                        className="group relative h-16 w-full sm:w-auto px-12 rounded-[24px] font-black text-white overflow-hidden shadow-2xl shadow-blue-500/40 transition-all active:scale-95 disabled:opacity-50"
                       >
                         <div className="absolute inset-0 bg-blue-600 group-hover:bg-blue-700 transition-colors" />
                         <span className="relative flex items-center justify-center gap-3">
                           {isSaving ? (
                             <>
                               <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                               <span>در حال استقرار...</span>
                             </>
                           ) : (
                             <>
                               <span>تایید و استقرار نهایی</span>
                               <CheckCircle2 className="w-5 h-5" />
                             </>
                           )}
                         </span>
                       </button>
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* Main Table Content */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
           <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.8)]" />
              <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">شبکه فروشگاه‌های متصل</h3>
           </div>
           <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">Nodes: {shops.length}</span>
           </div>
        </div>
        
        <Card className="bg-white dark:bg-[#1e293b] rounded-[36px] shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-slate-800 overflow-hidden">
          {shops.length > 0 ? (
            <div className="p-2 overflow-x-auto">
               <DataTable columns={columns} data={shops} onRowClick={setSelectedShop} />
            </div>
          ) : (
            <div className="text-center py-20 bg-gray-50/50 dark:bg-slate-900/10">
              <div className="mx-auto w-24 h-24 bg-white dark:bg-slate-800 rounded-3xl shadow-xl flex items-center justify-center mb-6 group">
                <Store className="w-10 h-10 text-gray-200 group-hover:text-blue-500 transition-colors duration-500" />
              </div>
              <h3 className="text-xl font-black text-gray-400 mb-2">هنوز هیچ فروشگاهی ثبت نشده است</h3>
              <p className="text-xs text-gray-300 font-bold mb-8 px-6">برای شروع مدیریت، اولین فروشگاه خود را به سیستم اضافه کنید</p>
              <div className="flex justify-center px-6">
                <button 
                  onClick={() => setIsAdding(true)} 
                  className="group relative h-16 w-full sm:w-auto px-12 rounded-[24px] font-black text-base transition-all duration-500 overflow-hidden shadow-2xl hover:shadow-blue-500/40 active:scale-95"
                >
                  <div className="absolute inset-0 bg-blue-600 group-hover:bg-blue-700 transition-colors" />
                  <div className="relative flex items-center justify-center gap-3 text-white">
                    <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-500" />
                    <span>ایجاد اولین ایستگاه کاری</span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Shop Profile Side Drawer */}
      <AnimatePresence>
        {selectedShop && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60]"
              onClick={() => { if (!isEditingShop) setSelectedShop(null); }}
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} 
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-xl bg-white dark:bg-[#0f172a] shadow-[0_0_50px_rgba(0,0,0,0.3)] z-[70] flex flex-col border-l border-gray-100 dark:border-slate-800"
              dir="rtl"
            >
              {/* Drawer Header */}
              <div className="sticky top-0 bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-xl border-b border-gray-50 dark:border-slate-800 p-6 flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" onClick={() => { setSelectedShop(null); setIsEditingShop(false); }} className="w-10 h-10 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800">
                    <X className="w-5 h-5 text-gray-500" />
                  </Button>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">نمای کلی فروشگاه</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic leading-none">Enterprise Resource Overview</p>
                  </div>
                </div>
                {!isEditingShop && (
                  <Button 
                    onClick={openEditMode} 
                    className="h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/10 text-xs font-black text-white flex items-center gap-1.5 whitespace-nowrap transition-all duration-200 hover:scale-[1.02] active:scale-95 border-none"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-white" />
                    <span>بروزرسانی اطلاعات</span>
                  </Button>
                )}
              </div>

              {!isEditingShop ? (
                <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                   {/* Brand Identity Section */}
                   <section className="flex flex-col items-center text-center">
                      <div className="relative group">
                         <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                         {selectedShop.logoUrl ? (
                            <img src={selectedShop.logoUrl} className="relative w-32 h-32 rounded-[40px] object-cover shadow-2xl border-4 border-white dark:border-slate-800 z-10" />
                          ) : (
                            <div className="relative w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[40px] flex items-center justify-center shadow-2xl z-10">
                               <Building className="w-12 h-12 text-white" />
                            </div>
                          )}
                      </div>
                      <div className="mt-6 space-y-2">
                         <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{selectedShop.name}</h2>
                         <div className="flex items-center justify-center gap-3">
                            <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedShop.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'}`}>
                               {selectedShop.status === 'active' ? 'واحد فعال' : 'واحد غیرفعال'}
                            </span>
                            <span className="text-[11px] font-bold text-gray-400 tabular-nums uppercase tracking-tighter">شناسه منحصر به فرد (UID): {selectedShop.id}</span>
                         </div>
                      </div>
                   </section>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Contact Info Bento */}
                      <Card className="p-6 bg-gray-50/50 dark:bg-slate-900/50 border-gray-100 dark:border-slate-800/50 rounded-3xl space-y-5">
                         <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Phone className="w-3 h-3" /> ارکان ارتباطی
                         </h4>
                         <div className="space-y-4">
                            <div className="flex flex-col">
                               <span className="text-[10px] text-gray-400 font-bold">بنیان‌گذار / مالک</span>
                               <span className="text-sm font-black text-gray-800 dark:text-slate-200">{selectedShop.ownerName}</span>
                            </div>
                            <div className="flex flex-col">
                               <span className="text-[10px] text-gray-400 font-bold">موبایل مستقیم</span>
                               <span className="text-sm font-black text-gray-800 dark:text-slate-200 tabular-nums" dir="ltr">{selectedShop.phone}</span>
                            </div>
                            <div className="flex flex-col">
                               <span className="text-[10px] text-gray-400 font-bold">نشانی الکترونیک</span>
                               <span className="text-sm font-black text-gray-800 dark:text-slate-200">{selectedShop.email || 'N/A'}</span>
                            </div>

                            {/* Registered Bank Cards Section */}
                            <div className="pt-4 border-t border-gray-100 dark:border-slate-800/80 space-y-3">
                               <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1.5 uppercase tracking-wider">
                                  <CreditCard className="w-3.5 h-3.5 text-blue-500" /> کارت‌های بانکی ثبت شده
                               </span>
                               {selectedShop.bankCards && selectedShop.bankCards.length > 0 ? (
                                  <div className="space-y-2">
                                     {selectedShop.bankCards.map((card: any, idx: number) => (
                                        <div key={idx} className="p-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl flex flex-col gap-1.5 shadow-sm">
                                           <div className="flex justify-between items-center">
                                              <span className="text-xs font-black text-slate-800 dark:text-slate-200">{card.bankName || 'بانک نامشخص'}</span>
                                              <span className="text-[9px] font-bold text-gray-400 bg-gray-50 dark:bg-slate-800 px-2 py-0.5 rounded-lg">{card.ownerName || 'نام صاحب حساب'}</span>
                                           </div>
                                           <div className="text-sm font-bold tracking-wider text-blue-600 dark:text-blue-400 tabular-nums self-start font-mono" dir="ltr">
                                              {card.number ? card.number.replace(/\s/g, '').match(/.{1,4}/g)?.join(' ') : '—'}
                                           </div>
                                        </div>
                                     ))}
                                  </div>
                               ) : (
                                  <p className="text-xs font-semibold text-gray-400 italic">هیچ کارت بانکی ثبت نشده است</p>
                               )}
                            </div>
                         </div>
                      </Card>

                      {/* License Bento */}
                      <Card className="p-6 bg-blue-50/30 dark:bg-blue-500/5 border-blue-100/50 dark:border-blue-500/10 rounded-3xl space-y-5 relative overflow-hidden group">
                         <Zap className="absolute -right-6 -bottom-6 w-24 h-24 text-blue-500/5 group-hover:text-blue-500/10 transition-colors" />
                         <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
                            <ShieldCheck className="w-3 h-3" /> وضعیت اشتراک
                         </h4>
                         <div className="space-y-4 relative z-10">
                            <div className="flex flex-col">
                               <span className="text-[10px] text-blue-400 font-bold">سطح دسترسی</span>
                               <span className="text-sm font-black text-blue-800 dark:text-blue-300">
                                  {licensePlans.find(p => p.id === selectedShop.licensePlanId)?.name || 'پایه / رایگان'}
                               </span>
                            </div>
                            <div className="flex flex-col">
                               <span className="text-[10px] text-blue-400 font-bold">تاریخ انقضاء</span>
                               <span className="text-sm font-black text-blue-800 dark:text-blue-300 tabular-nums">
                                  {selectedShop.licenseExpiresAt ? new Date(selectedShop.licenseExpiresAt).toLocaleDateString('fa-IR') : 'نامحدود'}
                               </span>
                            </div>
                            
                            {selectedShop.queuedLicensePlanId && (
                               <div className="flex flex-col p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-100 dark:border-rose-900/30">
                                  <span className="text-[10px] text-rose-500 font-bold">تغییر رزرو شده</span>
                                  <span className="text-xs font-black text-rose-700 dark:text-rose-400">
                                     به: {licensePlans.find(p => p.id === selectedShop.queuedLicensePlanId)?.name || 'نامشخص'} ({selectedShop.queuedLicenseDays && selectedShop.queuedLicenseDays > 0 ? `${selectedShop.queuedLicenseDays} روز` : `${selectedShop.queuedLicenseMonths} ماه`})
                                  </span>
                               </div>
                            )}

                            <Button size="sm" variant="ghost" onClick={()=>{ setRenewalPlanId(selectedShop.licensePlanId || ''); setLicenseActionType('renew'); setIsRenewing(true); }} className="h-8 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-500/10">
                               تمدید لایسنس
                            </Button>
                         </div>
                      </Card>

                      {/* AI Configuration Bento */}
                      <Card className="md:col-span-2 p-6 bg-indigo-50/30 dark:bg-indigo-500/5 border-indigo-100/50 dark:border-indigo-500/10 rounded-3xl space-y-4">
                         <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                               <Zap className="w-3 h-3" /> پیکربندی موتور هوشمند
                            </h4>
                            <span className="text-[9px] font-black text-indigo-400 bg-indigo-100 dark:bg-indigo-500/20 px-2 py-0.5 rounded-full uppercase italic">Advanced Core</span>
                         </div>
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
                               <Key className="w-5 h-5 text-indigo-500" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                               <span className="text-[10px] text-indigo-400 font-bold block">Gemini API Cluster</span>
                               <span className="text-xs font-mono text-gray-400 truncate block">
                                  {selectedShop.geminiApiKeys && selectedShop.geminiApiKeys.length > 0 
                                    ? `${selectedShop.geminiApiKeys.length} گره فعال مستقر شده` 
                                    : (selectedShop.geminiApiKey ? '••••••••••••••••••••••••••••••••' : 'پیکربندی نشده')}
                               </span>
                            </div>
                         </div>
                      </Card>

                      {/* Credentials Bento */}
                   <Card className="md:col-span-2 p-6 bg-rose-50/30 dark:bg-rose-500/5 border-rose-100/50 dark:border-rose-500/10 rounded-3xl space-y-4">
                         <h4 className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest flex items-center gap-2">
                            <ShieldCheck className="w-3 h-3" /> دسترسی‌های سیستمی (مدیر واحد)
                         </h4>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-rose-100 dark:border-rose-500/10 shadow-inner">
                            <div className="flex flex-col">
                               <span className="text-[9px] text-rose-400 font-black uppercase">Authentication Email</span>
                               <span className="text-sm font-mono text-gray-700 dark:text-slate-300 truncate" dir="ltr">{selectedShop.storeAccountEmail || 'Secret'}</span>
                            </div>
                            <div className="flex flex-col">
                               <span className="text-[9px] text-rose-400 font-black uppercase">Access Token</span>
                               <span className="text-sm font-mono text-gray-700 dark:text-slate-300" dir="ltr">{selectedShop.storeAccountPassword || 'Secret'}</span>
                            </div>
                         </div>
                      </Card>

                      {/* Transaction History Bento */}
                      <Card className="md:col-span-2 p-6 bg-blue-50/20 dark:bg-blue-500/5 border-blue-100/30 dark:border-blue-500/10 rounded-3xl space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
                             <FileText className="w-4 h-4 text-blue-600" /> تاریخچه خرید لایسنس و تراکنش‌ها
                          </h4>
                          <span className="text-[10.5px] font-black text-blue-600 bg-blue-50 dark:bg-blue-500/20 px-2.5 py-1 rounded-full uppercase tabular-nums">
                            {transactions.filter(t => t.shopId === selectedShop.id).length} تراکنش ثبت‌شده
                          </span>
                        </div>

                        <div className="overflow-hidden border border-gray-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/40">
                           <div className="overflow-x-auto max-h-[220px] custom-scrollbar">
                             <table className="w-full text-right text-xs">
                               <thead>
                                 <tr className="bg-gray-50/50 dark:bg-slate-800/20 border-b border-gray-100 dark:border-slate-800 text-gray-400 font-black text-[9.5px] uppercase tracking-wider">
                                   <th className="p-3 text-right">پکیج لایسنس</th>
                                   <th className="p-3 text-center">دوره (مدت)</th>
                                   <th className="p-3 text-left">مبلغ پرداختی</th>
                                   <th className="p-3 text-left">تاریخ ثبت</th>
                                 </tr>
                               </thead>
                               <tbody className="divide-y divide-gray-50 dark:divide-slate-800/10 font-bold">
                                 {transactions.filter(t => t.shopId === selectedShop.id).length > 0 ? (
                                   [...transactions]
                                     .filter(t => t.shopId === selectedShop.id)
                                     .sort((a,b) => b.createdAt.localeCompare(a.createdAt))
                                     .map(t => (
                                       <tr 
                                         key={t.id} 
                                         onClick={() => {
                                           setActiveInvoice({
                                             invoiceId: `L-INV-${new Date(t.createdAt).toISOString().slice(0, 10).replace(/-/g, '')}-${t.id.slice(0, 4).toUpperCase()}`,
                                             date: t.createdAt,
                                             type: 'license',
                                             seller: 'مرکز توسعه لایسنسینگ سیستم مرکزی ابری',
                                             buyer: {
                                               name: selectedShop.ownerName,
                                               brand: selectedShop.name,
                                               phone: selectedShop.phone,
                                               email: selectedShop.email,
                                               address: selectedShop.address
                                             },
                                             items: [
                                               {
                                                 name: `تمدید/تغییر اشتراک ابرسیستم: ${t.planName}`,
                                                 months: t.months,
                                                 days: t.days,
                                                 price: t.amount
                                               }
                                             ],
                                             amount: t.amount,
                                             paymentType: (t as any).paymentType || 'Online'
                                           });
                                         }}
                                         className="hover:bg-blue-50/40 dark:hover:bg-blue-500/5 cursor-pointer transition-colors"
                                       >
                                         <td className="p-3 text-gray-900 dark:text-white font-black">{t.planName}</td>
                                         <td className="p-3 text-center text-gray-500 font-mono">{t.months} ماهه</td>
                                         <td className="p-3 text-left text-emerald-600 font-mono">{t.amount.toLocaleString('fa-IR')} تومان</td>
                                         <td className="p-3 text-left text-gray-400 font-mono text-[10px] tabular-nums">
                                           {new Date(t.createdAt).toLocaleDateString('fa-IR')}
                                         </td>
                                       </tr>
                                     ))
                                 ) : (
                                   <tr>
                                     <td colSpan={4} className="p-6 text-center text-gray-400 text-[11px]">هیچ سابقه پرداخت لایسنسی یافت نشد.</td>
                                   </tr>
                                 )}
                               </tbody>
                             </table>
                           </div>
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                          💡 برای مشاهده و چاپ فاکتور رسمی هر خرید لایسنس، کافیست روی ردیف تراکنش کلیک نمایید.
                        </p>
                      </Card>
                   </div>

                   {/* Footer Actions */}
                   <div className="pt-8 border-t border-gray-100 dark:border-slate-800 flex flex-col gap-3">
                      <Button 
                         onClick={() => handleToggleStatus(selectedShop)}
                         disabled={actionLoading}
                         className={`h-14 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${selectedShop.status === 'active' ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                         variant="ghost"
                      >
                         <Power className="w-5 h-5" />
                         {selectedShop.status === 'active' ? 'تعلیق موقت اتصال' : 'برقراری مجدد اتصال شبکه'}
                      </Button>
                      <Button 
                         onClick={() => setShopToDelete(selectedShop)}
                         variant="ghost" 
                         className="h-12 rounded-2xl text-rose-500 font-black text-xs hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors uppercase tracking-widest"
                      >
                         حذف کامل و دائمی رکورد فروشگاه
                      </Button>
                   </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                   <form onSubmit={handleUpdateShop} className="space-y-10">
                      <div>
                        <div className="flex items-center gap-2 mb-6">
                           <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
                           <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">تغییر پارامترهای هویتی</h4>
                        </div>
                        <div className="space-y-5">
                          <TextField label="نام برند" value={editedShop.name || ''} onChange={(e:any)=>setEditedShop({...editedShop, name: e.target.value})} required />
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-500 uppercase ml-1">لوگوی برند</label>
                             <div className="p-4 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-800 flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-slate-700">
                                   <img src={editedShop.logoUrl || ''} className="w-full h-full object-cover" alt="" />
                                </div>
                                <label className="flex-1 cursor-pointer">
                                   <div className="h-10 flex items-center justify-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-[10px] font-black text-blue-600">انتخاب فایل جدید</div>
                                   <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, true)} />
                                </label>
                             </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-6">
                           <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                           <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">اطلاعات راهبری</h4>
                        </div>
                        <div className="space-y-5">
                          <TextField label="مدیریت کل / مالک" value={editedShop.ownerName || ''} onChange={(e:any)=>setEditedShop({...editedShop, ownerName: e.target.value})} required />
                          <TextField label="شماره تماس" value={editedShop.phone || ''} onChange={(e:any)=>setEditedShop({...editedShop, phone: e.target.value})} required />
                          <TextField label="ایمیل رسمی" value={editedShop.email || ''} onChange={(e:any)=>setEditedShop({...editedShop, email: e.target.value})} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-6">
                           <div className="flex items-center gap-2">
                             <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                             <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">کارت‌های بانکی فروشگاه</h4>
                           </div>
                           <Button type="button" variant="ghost" onClick={() => setEditedShop({...editedShop, bankCards: [...(editedShop.bankCards || []), { bankName: '', number: '', ownerName: '' }]})} className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 rounded-xl px-3 py-1">افزودن کارت</Button>
                        </div>
                        <div className="space-y-4">
                           {(editedShop.bankCards || []).map((card, idx) => (
                             <div key={idx} className="p-4 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-3 group">
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                 <TextField label="شماره کارت" value={card.number} onChange={(e:any) => {
                                   const newCards = [...(editedShop.bankCards || [])];
                                   newCards[idx] = { ...newCards[idx], number: e.target.value };
                                   setEditedShop({ ...editedShop, bankCards: newCards });
                                 }} dir="ltr" inputMode="numeric" />
                                 <TextField label="نام بانک" value={card.bankName} onChange={(e:any) => {
                                   const newCards = [...(editedShop.bankCards || [])];
                                   newCards[idx] = { ...newCards[idx], bankName: e.target.value };
                                   setEditedShop({ ...editedShop, bankCards: newCards });
                                 }} />
                               </div>
                               <TextField label="نام دارنده" value={card.ownerName} onChange={(e:any) => {
                                 const newCards = [...(editedShop.bankCards || [])];
                                 newCards[idx] = { ...newCards[idx], ownerName: e.target.value };
                                 setEditedShop({ ...editedShop, bankCards: newCards });
                               }} />
                               <div className="flex justify-start">
                                 <button type="button" onClick={() => {
                                   const newCards = [...(editedShop.bankCards || [])];
                                   newCards.splice(idx, 1);
                                   setEditedShop({ ...editedShop, bankCards: newCards });
                                 }} className="flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-rose-600 bg-rose-50 dark:bg-rose-500/10 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all border border-rose-100 dark:border-rose-500/20">
                                   <Trash2 className="w-3.5 h-3.5" />
                                   حذف کارت
                                 </button>
                               </div>
                             </div>
                           ))}
                           {(editedShop.bankCards || []).length === 0 && (
                             <p className="text-xs text-center text-gray-400 py-4 border border-dashed border-gray-200 dark:border-slate-700 rounded-xl">هیچ کارت بانکی ثبت نشده است</p>
                           )}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-6">
                           <div className="w-1.5 h-4 bg-rose-500 rounded-full" />
                           <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">مدیریت اعتبارنامه و دسترسی</h4>
                        </div>
                        <div className="space-y-5">
                           <TextField label="ایمیل ورود به پنل" value={editedShop.storeAccountEmail || ''} onChange={(e:any)=>setEditedShop({...editedShop, storeAccountEmail: e.target.value})} />
                           <TextField label="کلمه عبور ورود" value={editedShop.storeAccountPassword || ''} onChange={(e:any)=>setEditedShop({...editedShop, storeAccountPassword: e.target.value})} />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-6">
                           <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                           <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">تنظیمات هوش مصنوعی (AI Configuration)</h4>
                        </div>
                        <div className="relative group p-8 bg-gradient-to-br from-indigo-50/50 to-blue-50/50 dark:from-indigo-500/10 dark:to-blue-500/5 rounded-[40px] border border-indigo-100 dark:border-indigo-500/20 shadow-2xl overflow-hidden mt-6">
                           <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                             <Cpu className="w-32 h-32 text-indigo-600 dark:text-indigo-400 rotate-12" />
                           </div>
                           
                           <div className="relative space-y-6">
                             <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
                               <div className="flex items-center gap-3">
                                 <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-xl shrink-0">
                                   <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                                 </div>
                                 <div className="flex flex-col overflow-hidden">
                                   <h4 className="text-[10px] font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-widest leading-none truncate">AI Capacity</h4>
                                   <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-tighter mt-1 truncate">Intelligent Cluster</p>
                                 </div>
                               </div>
                               <button 
                                 type="button"
                                 onClick={() => setEditedShop({ ...editedShop, geminiApiKeys: [...(editedShop.geminiApiKeys || []), { key: '', model: 'gemini-1.5-flash', label: `Node #${(editedShop.geminiApiKeys?.length || 0) + 1}` }] })}
                                 className="h-10 w-full lg:w-auto px-6 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 shrink-0"
                               >
                                 <Plus className="w-3.5 h-3.5" />
                                 افزودن کلید پشتیبان
                               </button>
                             </div>

                             <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar py-2">
                               {(editedShop.geminiApiKeys || []).length === 0 ? (
                                  <div className="p-10 border-2 border-dashed border-indigo-100 dark:border-indigo-500/20 rounded-3xl text-center space-y-3">
                                     <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                                        <Key className="w-6 h-6 text-indigo-200" />
                                     </div>
                                     <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest leading-relaxed">No intelligent nodes provisioned.<br/>Deploy Gemini keys to enable AI assistance.</p>
                                  </div>
                               ) : (
                                 (editedShop.geminiApiKeys || []).map((keyConfig, idx) => (
                                   <div key={idx} className="group/key relative p-5 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-indigo-100/50 dark:border-indigo-500/10 hover:shadow-xl hover:border-indigo-300 transition-all">
                                      <div className="flex flex-col sm:flex-row gap-4">
                                         <div className="flex-1 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <input 
                                                  className="bg-transparent border-none p-0 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest focus:ring-0 w-full placeholder:text-indigo-200"
                                                  value={keyConfig.label || ''}
                                                  onChange={(e) => {
                                                    const updated = [...(editedShop.geminiApiKeys || [])];
                                                    updated[idx] = { ...updated[idx], label: e.target.value };
                                                    setEditedShop({ ...editedShop, geminiApiKeys: updated });
                                                  }}
                                                  placeholder="نام گره (مثلاً CLUSTER-BACKUP)"
                                                />
                                                <div className="flex items-center gap-2">
                                                   <select 
                                                     value={keyConfig.model}
                                                     onChange={(e) => {
                                                        const updated = [...(editedShop.geminiApiKeys || [])];
                                                        updated[idx] = { ...updated[idx], model: e.target.value };
                                                        setEditedShop({ ...editedShop, geminiApiKeys: updated });
                                                     }}
                                                     className="bg-indigo-50 dark:bg-indigo-500/10 border-none rounded-lg p-1.5 px-3 text-[10px] font-black text-indigo-600 dark:text-indigo-400 focus:ring-0 outline-none cursor-pointer hover:bg-indigo-100 transition-colors"
                                                   >
                                                     <option className="bg-white dark:bg-slate-900" value="gemini-2.0-flash-exp">Gemini 2.0 Flash</option>
                                                     <option className="bg-white dark:bg-slate-900" value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                                     <option className="bg-white dark:bg-slate-900" value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                                                     <option className="bg-white dark:bg-slate-900" value="gemini-1.5-flash-8b">Gemini 1.5 Flash-8B</option>
                                                   </select>
                                                </div>
                                            </div>
                                            <TextField 
                                               value={keyConfig.key}
                                               onChange={(e:any) => {
                                                 const updated = [...(editedShop.geminiApiKeys || [])];
                                                 updated[idx] = { ...updated[idx], key: e.target.value };
                                                 setEditedShop({ ...editedShop, geminiApiKeys: updated });
                                               }}
                                               placeholder="Enter AIzaSy key..."
                                               type="password"
                                               dir="ltr"
                                               className="m-0"
                                               inputClassName="h-11 bg-white/80 dark:bg-slate-800/80 border-indigo-50 dark:border-indigo-500/10 rounded-xl text-xs font-mono tracking-widest"
                                            />
                                         </div>
                                         <div className="flex sm:flex-col gap-3 pt-3 sm:pt-6">
                                            <button 
                                               type="button"
                                               onClick={() => handleTestKey(keyConfig.key, keyConfig.model, idx, 'edit')}
                                               disabled={testingKey !== null}
                                               className={`flex-1 sm:flex-none h-12 sm:h-11 sm:w-11 rounded-xl flex items-center justify-center transition-all ${testingKey?.index === idx && testingKey?.mode === 'edit' ? 'bg-indigo-100 text-indigo-400' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10'}`}
                                            >
                                               <Activity className={`w-4 h-4 ${testingKey?.index === idx && testingKey?.mode === 'edit' ? 'animate-pulse' : ''}`} />
                                            </button>
                                            <button 
                                               type="button"
                                               onClick={() => {
                                                 if (window.confirm('آیا از حذف این گره هوشمند اطمینان دارید؟')) {
                                                   const updated = [...(editedShop.geminiApiKeys || [])];
                                                   updated.splice(idx, 1);
                                                   setEditedShop({ ...editedShop, geminiApiKeys: updated });
                                                 }
                                               }}
                                               className="flex-1 sm:flex-none h-12 sm:h-11 sm:w-11 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center transition-all"
                                            >
                                               <Trash2 className="w-4 h-4" />
                                            </button>
                                         </div>
                                      </div>
                                   </div>
                                 ))
                               )}
                             </div>

                             <div className="flex items-center gap-2 pt-2">
                               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                               <span className="text-[9px] font-bold text-emerald-600/70 dark:text-emerald-400/60 uppercase tracking-tighter">Total Active AI Capacity: {(editedShop.geminiApiKeys || []).length} Layers</span>
                             </div>
                           </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pb-20">
                         <Button type="button" variant="ghost" className="h-14 rounded-2xl font-black text-xs uppercase" onClick={() => setIsEditingShop(false)}>لغو تغییرات</Button>
                         <Button type="submit" disabled={actionLoading} className="h-14 rounded-2xl font-black text-xs uppercase bg-blue-600 shadow-xl shadow-blue-500/20">
                            {actionLoading ? 'در حال ذخیره...' : 'بروزرسانی نهایی'}
                         </Button>
                      </div>
                   </form>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isRenewing && selectedShop && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
               onClick={() => setIsRenewing(false)}
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }} 
               animate={{ opacity: 1, scale: 1, y: 0 }} 
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative bg-white dark:bg-[#1e293b] rounded-[32px] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-slate-800"
               dir="rtl"
             >
                <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-blue-50/50 dark:bg-blue-500/5">
                   <h3 className="text-lg font-black text-blue-700 dark:text-blue-400 flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      مدیریت لایسنس ({selectedShop.name})
                   </h3>
                   <button onClick={() => setIsRenewing(false)} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors">
                      <X className="w-5 h-5 text-gray-400" />
                   </button>
                </div>
                
                <div className="flex px-6 pt-4 gap-2">
                  <button 
                    onClick={() => { setLicenseActionType('renew'); setRenewalPlanId(selectedShop.licensePlanId || ''); }}
                    className={`flex-1 py-2 text-sm font-bold rounded-xl transition-colors ${licenseActionType === 'renew' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    تمدید زمان
                  </button>
                  <button 
                    onClick={() => { setLicenseActionType('change'); }}
                    className={`flex-1 py-2 text-sm font-bold rounded-xl transition-colors ${licenseActionType === 'change' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    تغییر پلن
                  </button>
                </div>

                <form onSubmit={handleRenewLicense} className="p-6 space-y-6">
                   <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest block ml-1">انتخاب پلن لایسنس</label>
                        <select 
                          value={renewalPlanId}
                          onChange={(e) => {
                            const planId = e.target.value;
                            setRenewalPlanId(planId);
                            if (licenseActionType === 'change') {
                              const plan = licensePlans.find(p => p.id === planId);
                              if (plan) {
                                if (plan.durationDays && plan.durationDays > 0) {
                                  setRenewalDurationValue(plan.durationDays);
                                  setRenewalDurationUnit('days');
                                } else {
                                  setRenewalDurationValue(plan.durationMonths);
                                  setRenewalDurationUnit('months');
                                }
                              }
                            }
                          }}
                          disabled={licenseActionType === 'renew'}
                          className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none disabled:opacity-50"
                          required
                        >
                           <option value="">انتخاب کنید...</option>
                           {licensePlans.map(plan => (
                             <option key={plan.id} value={plan.id}>{plan.name} ({plan.price === 0 ? 'رایگان' : `${plan.price.toLocaleString()} تومان`})</option>
                           ))}
                        </select>
                      </div>
                      
                      {licenseActionType === 'renew' && (
                        <div className="space-y-2">
                          <label className="text-xs font-black text-gray-500 uppercase tracking-widest block ml-1">مدت زمان</label>
                          <div className="flex gap-2 mb-2">
                             <button 
                              type="button" 
                              onClick={() => setRenewalDurationUnit('months')} 
                              className={`flex-1 h-9 rounded-xl text-[10px] font-black transition-all ${renewalDurationUnit === 'months' ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-100 text-gray-400 dark:bg-slate-800'}`}
                            >
                              بر حسب ماه
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setRenewalDurationUnit('days')} 
                              className={`flex-1 h-9 rounded-xl text-[10px] font-black transition-all ${renewalDurationUnit === 'days' ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-100 text-gray-400 dark:bg-slate-800'}`}
                            >
                              بر حسب روز
                            </button>
                          </div>
                          <TextField 
                            type="number"
                            value={renewalDurationValue}
                            onChange={(e:any) => setRenewalDurationValue(Number(e.target.value))}
                            placeholder={renewalDurationUnit === 'months' ? "مثلا ۱۲ ماه" : "مثلا ۳۰ روز"}
                            required
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest block ml-1">روش پرداخت لایسنس</label>
                        <select 
                          value={renewalPaymentType} 
                          onChange={(e) => setRenewalPaymentType(e.target.value as any)}
                          className="w-full p-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                        >
                          <option value="Online">درگاه پرداخت آنلاین امن</option>
                          <option value="Card">کارت به کارت</option>
                          <option value="Cash">نقدی (صندوق)</option>
                          <option value="Debt">نسیه / حساب دفتری</option>
                        </select>
                      </div>

                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <label className="flex-1 text-xs font-black text-gray-500 uppercase tracking-widest block ml-1">تخفیف</label>
                          <select 
                            value={discountType}
                            onChange={(e) => setDiscountType(e.target.value as 'toman' | 'percent')}
                            className="text-xs font-bold bg-gray-100 dark:bg-slate-700 rounded-lg px-2"
                          >
                            <option value="toman">تومان</option>
                            <option value="percent">درصد</option>
                          </select>
                        </div>
                        <TextField 
                          type="text"
                          value={discount}
                          onChange={(e:any) => setDiscount(e.target.value)}
                          placeholder={discountType === 'toman' ? "مثلا ۵۰۰۰۰" : "مثلا ۱۰"}
                        />
                      </div>

                      {renewalPlanId && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex justify-between items-center">
                          <span className="text-xs font-bold text-blue-700 dark:text-blue-300">قیمت نهایی قابل پرداخت:</span>
                          <span className="text-lg font-black text-blue-900 dark:text-blue-100">
                             {(() => {
                               const plan = licensePlans.find(p => p.id === renewalPlanId);
                               if (!plan) return '۰';
                               
                               const durationValue = Number(renewalDurationValue);
                               const getBasePrice = () => {
                                 if (plan.durationDays && plan.durationDays > 0) {
                                   if (renewalDurationUnit === 'days') return Math.round((plan.price / plan.durationDays) * durationValue);
                                   return Math.round((plan.price / plan.durationDays) * (durationValue * 30));
                                 } else {
                                   if (renewalDurationUnit === 'months') return Math.round((plan.price / plan.durationMonths) * durationValue);
                                   return Math.round((plan.price / (plan.durationMonths * 30)) * durationValue);
                                 }
                               };

                               const basePrice = getBasePrice();
                               const disc = Number(discount) || 0;
                               const finalPrice = discountType === 'toman' 
                                 ? Math.max(0, basePrice - disc)
                                 : Math.max(0, basePrice - Math.round(basePrice * disc / 100));
                               if (finalPrice === 0) return 'رایگان';
                               return finalPrice.toLocaleString('fa-IR') + ' تومان';
                             })()}
                          </span>
                        </div>
                      )}

                      {licenseActionType === 'change' && (
                        <label className="flex items-start gap-3 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl cursor-pointer">
                          <div className="pt-0.5">
                            <input 
                              type="checkbox" 
                              checked={replaceImmediately} 
                              onChange={e => setReplaceImmediately(e.target.checked)} 
                              className="w-4 h-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500" 
                            />
                          </div>
                          <div className="text-xs text-rose-900 dark:text-rose-300">
                            <strong>حذف مسقیم پلن فعلی و اعمال فوری پلن جدید</strong>
                            <p className="mt-1 opacity-80 leading-relaxed">
                              در صورت عدم تیک زدن، این پلن رزرو شده و پس از اتمام تاریخ انقضای لایسنس فعلی فعال خواهد شد.
                            </p>
                          </div>
                        </label>
                      )}
                      
                      {renewalPlanId && (
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
                           <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-2">ویژگی‌های پلن انتخابی:</p>
                           <div className="flex flex-wrap gap-1">
                              {licensePlans.find(p => p.id === renewalPlanId)?.features?.map(f => (
                                <span key={f} className="text-[9px] px-2 py-0.5 bg-white dark:bg-slate-800 text-emerald-600 rounded-md shadow-sm border border-emerald-100 dark:border-emerald-500/10">
                                  {f === 'ai_assistant' ? 'هوش مصنوعی' : f === 'advanced_reports' ? 'گزارش پیشرفته' : f === 'unlimited_products' ? 'کالای نامحدود' : f === 'sms_gateway' ? 'پیامک' : f}
                                </span>
                              ))}
                           </div>
                        </div>
                      )}
                   </div>
                   
                   <div className="flex gap-3 pt-4">
                      <Button type="button" variant="ghost" className="flex-1 rounded-2xl h-14" onClick={() => setIsRenewing(false)}>انصراف</Button>
                      <Button type="submit" disabled={actionLoading} className="flex-[2] rounded-2xl h-14 font-black text-lg bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30">
                        {actionLoading ? 'در حال ثبت...' : (licenseActionType === 'renew' ? 'تایید و تمدید زمان' : 'ثبت تغییر پلن')}
                      </Button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}
        {shopToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShopToDelete(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm p-6 border border-gray-100 dark:border-slate-800"
              dir="rtl"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-500 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">حذف فروشگاه</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">
                    آیا از حذف برگشت‌ناپذیر فروشگاه «<span className="font-bold text-gray-700 dark:text-slate-300">{shopToDelete.name}</span>» اطمینان دارید؟ تمام داده‌های مرتبط پاک خواهند شد.
                  </p>
                </div>
                <div className="flex items-center gap-3 w-full pt-4 border-t border-gray-100 dark:border-slate-800">
                  <Button variant="outline" className="flex-1 border-gray-200 dark:border-slate-700" onClick={() => setShopToDelete(null)}>
                    انصراف
                  </Button>
                  <Button variant="danger" className="flex-1" onClick={executeDelete} disabled={actionLoading}>
                    {actionLoading ? 'در حال حذف...' : 'بله، حذف شود'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </>
      )}

      {/* Platform Financial Analysis & Report Modal */}
      <AnimatePresence>
        {isFinancialReportOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[80]"
              onClick={() => setIsFinancialReportOpen(false)}
            />
            <motion.div
              id="financial-report-print-area"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-4 md:inset-10 lg:inset-x-20 lg:inset-y-10 bg-gray-50 dark:bg-[#0f172a] shadow-2xl rounded-3xl z-[90] flex flex-col border border-gray-200 dark:border-slate-800 overflow-hidden"
              dir="rtl"
            >
              {/* Report Header */}
              <div className="bg-white dark:bg-[#1e293b] border-b border-gray-100 dark:border-slate-800 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">گزارش جامع و تحلیل مالی پلتفرم</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic leading-none">Platform Comprehensive Financial Analytics</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end print:hidden">
                  <Button 
                    onClick={() => {
                      const headers = ['فروشگاه', 'لایسنس', 'مدت دوره (ماه)', 'مبلغ پرداختی (تومان)', 'تاریخ و زمان تراکنش'];
                      const rows = transactions.map(t => [
                        t.shopName,
                        t.planName,
                        t.months,
                        t.amount,
                        new Date(t.createdAt).toLocaleString('fa-IR')
                      ]);
                      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
                        + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", `financial_report_${new Date().toISOString().substring(0, 10)}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      showToast('گزارش مالی با موفقیت به صورت فایل Excel/CSV صادر شد.', 'success');
                    }}
                    className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 border-none shadow-lg shadow-emerald-500/10"
                  >
                    <Download className="w-4 h-4" />
                    <span>خروجی CSV (اکسل)</span>
                  </Button>

                  <Button 
                    onClick={handleDownloadFinancialReportPDF}
                    disabled={invoiceExportLoading}
                    className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-2 border-none shadow-lg shadow-blue-500/10"
                  >
                    <FileText className="w-4 h-4" />
                    <span>{invoiceExportLoading ? 'در حال ایجاد...' : 'ذخیره PDF'}</span>
                  </Button>

                  <Button 
                    variant="ghost" 
                    onClick={() => setIsFinancialReportOpen(false)} 
                    className="w-10 h-10 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </Button>
                </div>
              </div>

              {/* Report Body */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar print:overflow-visible print:p-0">
                
                {/* Print-Only Header */}
                <div className="hidden print:flex flex-col border-b-2 border-gray-900 pb-6 mb-8">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-black text-gray-900">گزارش جامع و تحلیل مالی پلتفرم</h2>
                      <p className="text-sm font-bold text-gray-500">مشخصات عملکردی و تراز مالی مرکز هوشمند</p>
                    </div>
                    <div className="text-left text-xs font-bold text-gray-400">
                      <p>تاریخ چاپ: {new Date().toLocaleDateString('fa-IR')}</p>
                      <p>ساعت: {new Date().toLocaleTimeString('fa-IR')}</p>
                    </div>
                  </div>
                </div>

                {/* 1. Quick Indicators Bento Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-2 gap-6">
                  {/* Card 1: Total Revenue */}
                  <Card className="p-5 bg-white dark:bg-[#1e293b] border-gray-100 dark:border-slate-800/80 rounded-2xl flex items-center gap-4 relative overflow-hidden group">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">کل درآمد پلتفرم</span>
                      <span className="text-xl font-black text-gray-900 dark:text-white font-mono leading-none">
                        {transactions.reduce((sum, t) => sum + t.amount, 0).toLocaleString('fa-IR')}
                        <span className="text-xs font-normal text-gray-400 mr-1 font-sans">تومان</span>
                      </span>
                    </div>
                  </Card>

                  {/* Card 2: Total Transactions */}
                  <Card className="p-5 bg-white dark:bg-[#1e293b] border-gray-100 dark:border-slate-800/80 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">تعداد کل تراکنش‌ها</span>
                      <span className="text-xl font-black text-gray-900 dark:text-white font-mono leading-none">
                        {transactions.length.toLocaleString('fa-IR')}
                        <span className="text-xs font-normal text-gray-400 mr-1 font-sans">تراکنش</span>
                      </span>
                    </div>
                  </Card>

                  {/* Card 3: ARPU */}
                  <Card className="p-5 bg-white dark:bg-[#1e293b] border-gray-100 dark:border-slate-800/80 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">میانگین ارزش هر تراکنش</span>
                      <span className="text-xl font-black text-gray-900 dark:text-white font-mono leading-none">
                        {Math.floor(transactions.length > 0 ? (transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length) : 0).toLocaleString('fa-IR')}
                        <span className="text-xs font-normal text-gray-400 mr-1 font-sans">تومان</span>
                      </span>
                    </div>
                  </Card>

                  {/* Card 4: Average License Duration */}
                  <Card className="p-5 bg-white dark:bg-[#1e293b] border-gray-100 dark:border-slate-800/80 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">میانگین مدت دوره لایسنس</span>
                      <span className="text-xl font-black text-gray-900 dark:text-white font-mono leading-none">
                        {Math.floor(transactions.length > 0 ? (transactions.reduce((sum, t) => sum + t.months, 0) / transactions.length) : 0).toLocaleString('fa-IR')}
                        <span className="text-xs font-normal text-gray-400 mr-1 font-sans">ماه</span>
                      </span>
                    </div>
                  </Card>
                </div>

                {/* 2. Analysis & Visual Breakdown Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-3 print:grid-cols-1 gap-6">
                  {/* Left Column: Breakdown by License Plan */}
                  <Card className="lg:col-span-1 p-6 bg-white dark:bg-[#1e293b] border-gray-100 dark:border-slate-800/80 rounded-2xl space-y-6">
                    <div className="flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-blue-600" />
                      <h4 className="text-sm font-black text-gray-900 dark:text-white">سهم درآمد به تفکیک پلن‌ها</h4>
                    </div>

                    <div className="space-y-4">
                      {licensePlans.length > 0 ? (
                        licensePlans.map(plan => {
                          const planTx = transactions.filter(t => t.planId === plan.id || t.planName === plan.name);
                          const planSum = planTx.reduce((sum, t) => sum + t.amount, 0);
                          const totalSum = transactions.reduce((sum, t) => sum + t.amount, 0);
                          const percentage = totalSum > 0 ? Math.round((planSum / totalSum) * 100) : 0;
                          
                          return (
                            <div key={plan.id} className="space-y-1">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-extrabold text-gray-700 dark:text-slate-300">{plan.name}</span>
                                <span className="font-mono text-gray-400">{percentage}% ({planSum.toLocaleString('fa-IR')} تومان)</span>
                              </div>
                              <div className="w-full bg-gray-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-6 text-xs text-gray-400">هیچ پلنی یافت نشد.</div>
                      )}
                    </div>
                  </Card>

                  {/* Right Column: Detailed Financial Audit Trail */}
                  <Card className="lg:col-span-2 print:col-span-1 p-6 bg-white dark:bg-[#1e293b] border-gray-100 dark:border-slate-800/80 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <h4 className="text-sm font-black text-gray-900 dark:text-white">ریز تراکنش‌های لایسنسینگ</h4>
                      </div>
                      <span className="text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-full uppercase tracking-widest">{transactions.length} تراکنش کل</span>
                    </div>

                    <div className="overflow-x-auto max-h-[300px] custom-scrollbar print:max-h-none print:overflow-visible">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-400 font-bold">
                            <th className="py-2 text-right">فروشگاه هدف</th>
                            <th className="py-2 text-right">عنوان لایسنس</th>
                            <th className="py-2 text-center">مدت دوره</th>
                            <th className="py-2 text-left">مبلغ (تومان)</th>
                            <th className="py-2 text-left">تاریخ پرداخت</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50">
                          {transactions.length > 0 ? (
                            [...transactions].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(t => (
                              <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                                <td className="py-2 font-black text-gray-800 dark:text-slate-200">{t.shopName}</td>
                                <td className="py-2 text-gray-500 dark:text-slate-400">
                                  <span className="inline-block px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-500/5 text-[10px] text-blue-600 font-black">
                                    {t.planName}
                                  </span>
                                </td>
                                <td className="py-2 text-center text-gray-500 font-mono">{t.months.toLocaleString('fa-IR')} ماهہ</td>
                                <td className="py-2 text-left font-bold font-mono text-emerald-600">{t.amount.toLocaleString('fa-IR')}</td>
                                <td className="py-2 text-left text-gray-400 tabular-nums">{new Date(t.createdAt).toLocaleDateString('fa-IR')}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-gray-400">هیچ سابقه تراکنشی ثبت نشده است.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>

                {/* 3. Performance & Audit Note */}
                <div className="p-4 bg-orange-50/50 dark:bg-orange-500/5 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors border border-orange-100 dark:border-orange-500/10 rounded-2xl flex gap-3 text-xs">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                  <p className="text-orange-950 dark:text-orange-300/80 font-bold leading-relaxed">
                    این گزارش به صورت خودکار از تجمیع حساب‌ها در بستر پلتفرم ابری تولید شده است. تمام مبالغ اشاره شده با کسر کارمزد درگاه‌های پرداخت، مستقیماً وارد سیستم تجمیع‌کننده مالی پلتفرم لایسنسینگ گردیده و مورد تایید است.
                  </p>
                </div>
                
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Dynamic Professional Invoice Modal */}
      <AnimatePresence>
        {activeInvoice && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] print:hidden"
              onClick={() => setActiveInvoice(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="fixed inset-4 md:inset-x-20 md:inset-y-6 lg:inset-x-1/4 lg:inset-y-10 bg-white dark:bg-[#1e293b] rounded-[36px] shadow-2xl z-[101] flex flex-col border border-gray-100 dark:border-slate-800 overflow-hidden print:static print:inset-auto print:border-none print:shadow-none print:bg-white print:dark:bg-white print:text-black print:overflow-visible print:w-full"
              dir="rtl"
            >
              {/* Invoice Actions */}
              <div className="flex items-center justify-between p-6 border-b border-gray-50 dark:border-slate-800/50 print:hidden shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest leading-none">فاکتور رسمی صادر شده</span>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => directPrintElement('invoice-print-area')}
                    className="h-10 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-black text-xs flex items-center gap-2 border border-slate-200 dark:border-slate-700 shadow-sm transition-all"
                  >
                    <Printer className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    <span>چاپ مستقیم</span>
                  </Button>
                  <Button
                    onClick={handleDownloadInvoicePDF}
                    disabled={invoiceExportLoading}
                    className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-2 border-none shadow-lg shadow-blue-500/10"
                  >
                    <FileText className="w-4 h-4" />
                    <span>{invoiceExportLoading ? 'در حال ایجاد PDF...' : 'دانلود فایل PDF'}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setActiveInvoice(null)}
                    className="w-10 h-10 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </Button>
                </div>
              </div>

              {/* Invoice Document Body */}
              <div id="invoice-print-area" className="flex-1 overflow-y-auto p-8 md:p-12 space-y-8 print:p-0 print:overflow-visible print:text-black print:bg-white animate-fade-in">
                
                {/* Visual Official Stamp Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-8 border-b border-dashed border-gray-200 dark:border-slate-800">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2.5 px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg print:bg-transparent print:text-black print:border print:border-black/10">
                      <Zap className="w-4 h-4" />
                      <span className="text-xs font-black uppercase tracking-widest">فاکتور لایسنسینگ</span>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white print:text-black">فاکتور رسمی فروش خدمات ابری</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic print:text-gray-500 leading-none">Cloud Services Licensing Invoice</p>
                  </div>

                  <div className="bg-gray-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-gray-100 dark:border-slate-800/80 space-y-2 text-xs font-bold font-mono text-gray-500 dark:text-slate-400 min-w-[200px] print:bg-transparent print:border-black/10 print:text-black">
                    <div className="flex justify-between">
                      <span className="text-gray-400 print:text-gray-500">شماره فاکتور:</span>
                      <span className="font-extrabold text-gray-900 dark:text-white print:text-black">{activeInvoice.invoiceId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 print:text-gray-500">تاریخ صدور:</span>
                      <span className="tabular-nums">{new Date(activeInvoice.date).toLocaleDateString('fa-IR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 print:text-gray-500">زمان صدور:</span>
                      <span className="tabular-nums">{new Date(activeInvoice.date).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                </div>

                {/* Parties details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs leading-relaxed">
                  {/* Seller Details */}
                  <div className="p-5 bg-blue-50/30 dark:bg-slate-800/30 rounded-2xl border border-blue-50/50 dark:border-slate-800/50 space-y-2 print:border-black/10 print:bg-transparent">
                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest block mb-1">مشخصات ارائه‌دهنده خدمات (فروشنده)</span>
                    <p className="font-black text-gray-800 dark:text-slate-200 print:text-black">{activeInvoice.seller}</p>
                    <p className="text-gray-500 dark:text-slate-400 print:text-gray-600 font-medium">سرویس دهنده مدیریت و توزیع لایسنس زیرساختی کشور</p>
                    <p className="text-gray-400 dark:text-slate-500 font-medium font-mono">پشتیبانی: support@enterprise-cloud.ir</p>
                  </div>

                  {/* Buyer Details */}
                  <div className="p-5 bg-indigo-50/20 dark:bg-slate-800/20 rounded-2xl border border-indigo-50/50 dark:border-slate-800/30 space-y-2 print:border-black/10 print:bg-transparent">
                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-1">مشخصات متقاضی (خریدار لایسنس)</span>
                    <p className="font-black text-gray-800 dark:text-slate-200 print:text-black">جناب آقای / سرکار خانم {activeInvoice.buyer.name}</p>
                    <p className="text-gray-500 dark:text-slate-400 print:text-gray-600 font-medium">پکیج واگذارشده به برند: <strong className="text-gray-800 dark:text-slate-200 print:text-black">{activeInvoice.buyer.brand}</strong></p>
                    <p className="text-gray-400 dark:text-slate-500 font-medium">تلفن تماس: {activeInvoice.buyer.phone}</p>
                    <p className="text-gray-400 dark:text-slate-500 font-medium truncate">نشانی پستی: {activeInvoice.buyer.address}</p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden print:border-black/20">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-gray-50 dark:bg-slate-800/50 text-gray-400 print:bg-transparent print:text-black font-black uppercase text-[10px] tracking-wider border-b border-gray-100 dark:border-slate-800 print:border-black/20">
                      <tr>
                        <th className="p-4 text-center w-12">ردیف</th>
                        <th className="p-4">شرح خدمات دیجیتال</th>
                        <th className="p-4 text-center">مدت زمان (دوره)</th>
                        <th className="p-4 text-left">مبلغ کل دوره (تومان)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-800/30 print:divide-black/10 font-bold">
                      {activeInvoice.items.map((item: any, idx: number) => (
                        <tr key={idx} className="text-gray-700 dark:text-slate-300 print:text-black">
                          <td className="p-4 text-center font-mono text-gray-400 print:text-black">{idx + 1}</td>
                          <td className="p-4 text-gray-900 dark:text-white print:text-black">
                            {item.name}
                          </td>
                          <td className="p-4 text-center font-mono text-gray-500 print:text-black">{item.months} ماهه</td>
                          <td className="p-4 text-left font-mono font-black text-gray-900 dark:text-white print:text-black">
                            {item.price === 0 ? 'رایگان' : item.price.toLocaleString('fa-IR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Calculations & Stamps */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 items-end">
                  
                  {/* Payment Method Details & Stamp Display */}
                  <div className={`relative p-5 rounded-2xl border-2 border-dashed flex flex-col justify-between h-44 overflow-hidden min-h-[160px] print:border-black/20 print:bg-transparent print:text-black ${
                      activeInvoice.paymentType === 'Cash' ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/10 dark:border-emerald-900/30 text-emerald-900 dark:text-emerald-400' :
                      activeInvoice.paymentType === 'Card' || activeInvoice.paymentType === 'Online' ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-950/10 dark:border-blue-900/30 text-blue-900 dark:text-blue-400' :
                      'bg-amber-50/50 border-amber-200 dark:bg-amber-950/10 dark:border-amber-900/30 text-amber-900 dark:text-amber-400'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest block mb-1 opacity-80">وضعیت و روش پرداخت فاکتور</span>
                      <strong className="text-sm font-black flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        {
                          activeInvoice.paymentType === 'Cash' ? 'پرداخت شده — نقدی (صندوق)' :
                          activeInvoice.paymentType === 'Card' ? 'پرداخت شده — کارت به کارت الکترونیکی' :
                          activeInvoice.paymentType === 'Online' ? 'پرداخت شده — درگاه پرداخت امن بانکی' :
                          'نسیه / حساب دفتری تعهدی'
                        }
                      </strong>
                      <p className="text-[10.5px] mt-2 font-medium opacity-80 leading-relaxed max-w-[280px]">
                        {
                          activeInvoice.paymentType === 'Debt' ? 'این خدمات لایسنس به صورت خرید اعتباری/امانی در حساب دفتری خریدار ثبت گردید و موعد تسویه آن طبق قرارداد است.' :
                          'مبلغ این صورتحساب با کسورات قانونی پرداخت شده و رسید پرداخت الکترونیکی در سرور مرکزی امن پایدار ثبت گردید.'
                        }
                      </p>
                    </div>

                    {/* Official Stamp */}
                    <div className={`absolute left-6 bottom-4 select-none opacity-95 rotate-[-12deg] flex flex-col items-center justify-center border-4 rounded-full w-28 h-28 font-black uppercase text-center text-xs tracking-tight leading-none shadow-sm shadow-emerald-500/5 print:border-emerald-600 print:text-emerald-600 ${
                        activeInvoice.paymentType === 'Debt' ? 'border-amber-600/60 text-amber-600 dark:border-amber-500/50 dark:text-amber-500' :
                        'border-emerald-600/60 text-emerald-600 dark:border-emerald-500/5 dark:text-emerald-500'
                      }`}
                    >
                      <span className="text-[10px] tracking-widest">تایید شد</span>
                      <span className="text-[13px] my-1 font-black leading-none">
                        {activeInvoice.paymentType === 'Debt' ? 'نسیه / تعهد' : 'پرداخت شد'}
                      </span>
                      <span className="text-[7px] tracking-tight">{activeInvoice.paymentType === 'Debt' ? 'CREDIT SYSTEM' : 'CLOUD SERVICE'}</span>
                    </div>
                  </div>

                  {/* Pricing Calculations */}
                  <div className="space-y-3 font-semibold text-xs text-gray-500 dark:text-slate-400 print:text-black">
                    <div className="flex justify-between">
                      <span>جمع ناخالص خدمات:</span>
                      <span className="font-mono text-gray-900 dark:text-white print:text-black font-extrabold">{activeInvoice.amount.toLocaleString('fa-IR')} تومان</span>
                    </div>
                    <div className="flex justify-between">
                      <span>تخفیف همکاری:</span>
                      <span className="font-mono text-rose-500">۰ تومان</span>
                    </div>
                    <div className="flex justify-between">
                      <span>مالیات بر ارزش افزوده (۰٪):</span>
                      <span className="font-mono text-gray-950 dark:text-slate-200 print:text-black font-bold">۰ تومان</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-100 dark:border-slate-800 print:border-black/20 pt-3 text-sm">
                      <span className="text-gray-900 dark:text-white print:text-black font-black">مبلغ نهایی قابل پرداخت:</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 print:text-green-700 font-extrabold text-lg">
                        {activeInvoice.amount === 0 ? 'رایگان' : `${activeInvoice.amount.toLocaleString('fa-IR')} تومان`}
                      </span>
                    </div>
                  </div>

                </div>

                {/* Footer official notice */}
                <div className="pt-6 border-t border-dashed border-gray-100 dark:border-slate-800 text-[10px] text-gray-400 dark:text-slate-500 text-center font-bold print:border-black/10 print:text-gray-500">
                  این سند الکترونیکی به عنوان فاکتور رسمی و گواهی فعال‌سازی لاینسینگ معتبر بوده و نیازی به مهر فیزیکی ندارد.
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

