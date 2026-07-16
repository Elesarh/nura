import { translateError } from '../../lib/errorTranslator';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, runTransaction, orderBy } from 'firebase/firestore';
import { db, logEvent } from '../../firebase';
import { User, Debt, Customer, Sale } from '../../types';
import { Card, DataTable, LoadingWidget, ErrorWidget, Button, TextField } from '../../components';
import { Wallet, CheckCircle2, X, ChevronRight, User as UserIcon, Phone, History, ArrowRightLeft, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DebtsView({ user }: { user: User }) {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [paymentAmount, setPaymentAmount] = useState(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, [user.shopId]);

  const fetchData = async () => {
    if (!user.shopId) return;
    setLoading(true);
    try {
      const cq = query(collection(db, "customers"), where("shopId", "==", user.shopId));
      const cSnap = await getDocs(cq);
      const allCustomers = cSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
      setCustomers(allCustomers);

      const dq = query(collection(db, "debts"), where("shopId", "==", user.shopId), orderBy("createdAt", "desc"));
      const dSnap = await getDocs(dq);
      setDebts(dSnap.docs.map(d => ({ id: d.id, ...d.data() } as Debt)));
    } catch (err: any) {
      console.error("Fetch debts error:", err);
      setError(translateError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPayment = async () => {
    if (!selectedCustomerId || paymentAmount <= 0) return;
    setActionLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const customerRef = doc(db, "customers", selectedCustomerId);
        const customerSnap = await transaction.get(customerRef);
        if (!customerSnap.exists()) throw new Error("مشتری یافت نشد.");
        const customerData = customerSnap.data() as Customer;

        const unpaidDebts = debts
          .filter(d => d.customerId === selectedCustomerId && d.status === 'unpaid')
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        let remainingPayment = paymentAmount;

        // Apply payment to individual debt records in FIFO order
        for (const debt of unpaidDebts) {
          if (remainingPayment <= 0) break;
          const debtRef = doc(db, "debts", debt.id);
          const applyToThis = Math.min(debt.remainingAmount, remainingPayment);
          
          transaction.update(debtRef, {
            paidAmount: debt.paidAmount + applyToThis,
            remainingAmount: debt.remainingAmount - applyToThis,
            updatedAt: new Date().toISOString(),
            status: (debt.remainingAmount - applyToThis) <= 0 ? 'paid' : 'unpaid'
          });
          remainingPayment -= applyToThis;
        }

        // Update customer total debt
        transaction.update(customerRef, {
          totalDebt: Math.max(0, (customerData.totalDebt || 0) - paymentAmount)
        });

        // Record a sale transaction for this payment
        const salesRef = collection(db, "sales");
        transaction.set(doc(salesRef), {
          shopId: user.shopId,
          customerId: selectedCustomerId,
          totalAmount: paymentAmount,
          discount: 0,
          paymentType: 'DebtPayment',
          items: [],
          createdAt: new Date().toISOString(),
          isAdjustment: true,
          note: `دریافت مبلغ ${paymentAmount.toLocaleString()} تومان بابت تسویه بخشی از نسیه`
        });
      });

      setSelectedCustomerId(null);
      setPaymentAmount(0);
      logEvent({
        type: 'shop',
        shopId: user.shopId!,
        userId: user.id,
        userEmail: user.email,
        action: 'دریافت بازپرداخت نسیه',
        details: `مبلغ: ${paymentAmount.toLocaleString()} تومان`
      });
      fetchData();
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const debtors = customers
    .filter(c => (c.totalDebt || 0) > 0)
    .filter(c => c.fullName.includes(searchTerm) || c.phone.includes(searchTerm));

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const customerDebts = debts.filter(d => d.customerId === selectedCustomerId);

  if (loading && customers.length === 0) return <LoadingWidget />;

  return (
    <div className="space-y-10 max-w-7xl mx-auto px-4 pb-20" dir="rtl">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-white dark:bg-[#1e293b] p-10 rounded-[48px] shadow-2xl shadow-blue-500/5 border border-gray-100 dark:border-slate-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/5 blur-[120px] -mr-40 -mt-40" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-2 text-center md:text-right">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 border border-rose-100 dark:border-rose-500/20 mx-auto md:mx-0">
              <Wallet className="w-3 h-3" />
              Debt & Credit Ledger System
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">سامانه مدیریت مطالبات</h2>
            <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 font-medium max-w-sm md:max-w-md leading-relaxed mx-auto md:mx-0">
              پیگیری دقیق لیست بدهکاران، تسویه حساب‌های مرحله‌ای و مدیریت چک‌های برگشتی و اعتبارات.
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-rose-600 to-rose-700 p-6 md:p-8 rounded-[36px] text-center shadow-2xl shadow-rose-500/30 group relative overflow-hidden shrink-0">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
             <p className="text-[10px] md:text-[11px] font-black text-rose-100 uppercase mb-1 md:mb-2 tracking-[0.2em] relative">مجموع کل مطالبات معوقه</p>
             <p className="text-2xl md:text-4xl font-black text-white font-mono tracking-tighter relative tabular-nums">
               {customers.filter(c => (c.totalDebt || 0) > 0).reduce((sum, c) => sum + (c.totalDebt || 0), 0).toLocaleString('fa-IR')} <span className="text-[10px] md:text-xs opacity-60">تومان</span>
             </p>
          </div>
        </div>
      </div>

      {error && <ErrorWidget message={error} />}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Debtors Sidebar List */}
        <div className="lg:col-span-4 space-y-8">
           <div className="flex flex-col gap-6 px-2">
              <div className="flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                 <h3 className="text-lg font-black text-gray-900 dark:text-white">لیست بدهکاران فعال</h3>
                 <span className="text-[10px] font-bold text-gray-400 tabular-nums">{debtors.length} پرونده یافت شد</span>
              </div>
              <div className="relative group">
                <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                <input 
                  type="text" 
                  placeholder="جستجوی نام، تلفن یا مبلغ..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-16 pr-14 pl-6 bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-slate-800 rounded-[24px] text-sm font-black focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all shadow-xl shadow-gray-200/10 dark:shadow-none" 
                />
              </div>
           </div>

           <div className="space-y-4 h-[650px] overflow-y-auto no-scrollbar pb-20 px-1">
             {debtors.length === 0 ? (
               <div className="p-12 text-center bg-gray-50/50 dark:bg-slate-900/50 rounded-[40px] border-2 border-dashed border-gray-100 dark:border-slate-800">
                  <Wallet className="w-12 h-12 text-gray-200 dark:text-slate-700 mx-auto mb-4" />
                  <p className="text-gray-400 font-bold text-sm uppercase tracking-widest leading-loose">No active debtors recorded</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 gap-4">
                 {debtors.map(c => (
                   <motion.div 
                     layout
                     key={c.id} 
                     onClick={() => {
                       setSelectedCustomerId(c.id);
                       setPaymentAmount(c.totalDebt || 0);
                     }}
                     className={`group p-6 rounded-[32px] cursor-pointer transition-all duration-500 border-2 relative overflow-hidden ${
                       selectedCustomerId === c.id 
                       ? 'bg-white dark:bg-[#2d3748] border-blue-600 shadow-2xl shadow-blue-500/10' 
                       : 'bg-white dark:bg-[#1e293b] border-transparent text-gray-900 dark:text-white hover:border-blue-100 dark:hover:border-blue-900/30'
                     }`}
                   >
                     {selectedCustomerId === c.id && (
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-3xl -mr-12 -mt-12" />
                     )}
                     <div className="relative flex justify-between items-center">
                        <div className="flex items-center gap-5">
                           <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl transition-all duration-500 ${
                             selectedCustomerId === c.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30 rotate-3' : 'bg-gray-50 dark:bg-slate-900 text-gray-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/5 group-hover:text-blue-500 group-hover:-rotate-3'
                           }`}>
                             {c.fullName.charAt(0)}
                           </div>
                           <div className="space-y-1">
                             <p className={`font-black text-base transition-colors ${selectedCustomerId === c.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-slate-200 group-hover:text-blue-600'}`}>{c.fullName}</p>
                             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{c.phone}</p>
                           </div>
                        </div>
                        <div className="text-left">
                           <p className={`font-mono font-black text-lg tabular-nums tracking-tighter ${selectedCustomerId === c.id ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600'}`}>
                             {(c.totalDebt || 0).toLocaleString('fa-IR')}
                           </p>
                           <p className="text-[8px] font-bold text-gray-300 uppercase tracking-[0.2em]">Receivable</p>
                        </div>
                     </div>
                   </motion.div>
                 ))}
               </div>
             )}
           </div>
        </div>

        {/* Selected Customer Management Area */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {selectedCustomerId ? (
              <motion.div 
                key={selectedCustomerId}
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                 <Card className="p-10 rounded-[48px] bg-white dark:bg-[#1e293b] border-gray-100 dark:border-slate-800 shadow-2xl shadow-gray-200/10 dark:shadow-none relative overflow-hidden group">
                   <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/5 blur-[100px] -ml-32 -mt-32" />
                   
                   <div className="relative flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-12">
                     <div className="space-y-4">
                       <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-100 dark:border-rose-500/20">
                         Financial Ledger File
                       </div>
                       <h3 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">{selectedCustomer?.fullName}</h3>
                       <div className="flex flex-wrap items-center gap-6">
                          <div className="flex items-center gap-2.5 text-xs font-bold text-gray-500">
                             <div className="p-2 bg-gray-50 dark:bg-slate-900 rounded-xl"><Phone className="w-4 h-4" /></div>
                             {selectedCustomer?.phone}
                          </div>
                          <div className="w-px h-6 bg-gray-100 dark:bg-slate-800" />
                          <div className="flex items-center gap-2.5 text-xs font-bold text-gray-500">
                             <div className="p-2 bg-gray-50 dark:bg-slate-900 rounded-xl"><History className="w-4 h-4" /></div>
                             تاریخ آخرین فاکتور نسیه: {customerDebts.length > 0 ? new Date(customerDebts[0].createdAt).toLocaleDateString('fa-IR') : 'ندارد'}
                          </div>
                       </div>
                     </div>
                     <div className="text-left bg-gray-50 dark:bg-slate-900/50 p-8 rounded-[40px] border border-gray-100 dark:border-slate-800 shadow-inner group-hover:bg-white dark:group-hover:bg-slate-900 transition-colors duration-500">
                       <p className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-[0.2em]">مانده بدهی تجمعی</p>
                       <p className="text-4xl font-black text-rose-600 font-mono tracking-tighter tabular-nums">
                         {(selectedCustomer?.totalDebt || 0).toLocaleString('fa-IR')} <span className="text-xs opacity-60">تومان</span>
                       </p>
                     </div>
                   </div>

                   <div className="relative p-6 md:p-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[32px] md:rounded-[44px] shadow-2xl shadow-blue-600/20 group/action">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16 group-hover/action:scale-150 transition-transform duration-700" />
                      
                      <div className="relative flex flex-col md:flex-row gap-6 md:gap-8 items-stretch md:items-end">
                         <div className="flex-1 w-full space-y-3">
                            <label className="text-sm font-black text-white uppercase tracking-widest mr-4 block opacity-90 text-center md:text-right">مبلغ پرداختی (تومان)</label>
                            <div className="relative">
                               <input 
                                 type="text" 
                                 value={paymentAmount === 0 ? '' : paymentAmount.toLocaleString('fa-IR')} 
                                 onChange={(e:any) => {
                                   const val = e.target.value.replace(/\D/g, '');
                                   setPaymentAmount(val === '' ? 0 : Math.min(selectedCustomer?.totalDebt || 0, Number(val)));
                                 }}
                                 className="w-full h-16 md:h-20 pl-20 pr-6 md:pr-8 bg-white border-2 border-white/40 shadow-inner rounded-[24px] md:rounded-[28px] text-2xl md:text-3xl font-black text-blue-900 font-mono focus:border-white focus:ring-4 focus:ring-blue-300 focus:outline-none transition-all tabular-nums text-left placeholder:text-gray-300"
                                 placeholder="0"
                                 dir="ltr"
                               />
                               <span className="absolute left-6 md:left-8 top-1/2 -translate-y-1/2 text-blue-500/50 font-black text-sm md:text-base min-w-max uppercase tracking-widest pointer-events-none">تومان</span>
                            </div>
                         </div>
                         <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full md:w-auto">
                           <button 
                             onClick={handleQuickPayment} 
                             disabled={actionLoading || paymentAmount <= 0} 
                             className="flex-1 md:w-64 h-16 md:h-20 rounded-[24px] md:rounded-[28px] font-black text-sm md:text-lg bg-white text-blue-700 hover:bg-blue-50 shadow-2xl transition-all flex items-center justify-center gap-2 md:gap-3 active:scale-95 whitespace-nowrap focus:ring-4 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed"
                           >
                             {actionLoading ? (
                                <div className="w-5 h-5 md:w-6 md:h-6 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                             ) : (
                                <>
                                  <CheckCircle2 className="w-5 h-5 md:w-7 md:h-7 text-blue-700" />
                                  <span className="text-blue-700">ثبت وصول مبلغ</span>
                                </>
                             )}
                           </button>
                           <button onClick={() => setSelectedCustomerId(null)} className="h-14 sm:h-16 md:h-20 px-6 md:px-8 rounded-[24px] text-white/90 hover:text-white hover:bg-white/20 font-black text-sm uppercase tracking-widest w-full sm:w-auto transition-all">انصراف</button>
                         </div>
                      </div>
                   </div>
                 </Card>

                 <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                       <h4 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                         <History className="w-6 h-6 text-blue-600" />
                         سوابق بدهی‌های فاکتور شده
                       </h4>
                       <div className="h-px flex-1 bg-gray-100 dark:bg-slate-800 mx-6 hidden sm:block" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {customerDebts.map(d => (
                        <div key={d.id} className="p-8 bg-white dark:bg-[#1e293b] rounded-[40px] border border-gray-100 dark:border-slate-800 shadow-xl shadow-gray-200/20 dark:shadow-none hover:-translate-y-2 transition-all duration-500 group">
                           <div className="flex justify-between items-start mb-8">
                             <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${d.status === 'paid' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 group-hover:rotate-12'}`}>
                                  {d.status === 'paid' ? <CheckCircle2 className="w-7 h-7" /> : <Wallet className="w-7 h-7" />}
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs font-black text-gray-900 dark:text-white">کد فاکتور</p>
                                  <p className="text-sm font-mono text-gray-400 group-hover:text-blue-600 transition-colors">#{d.saleId?.slice(-6).toUpperCase() || 'سیستمی'}</p>
                                </div>
                             </div>
                             <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors ${
                               d.status === 'paid' ? 'bg-emerald-50 border-emerald-100 text-emerald-600 font-black' : 'bg-rose-50 border-rose-100 text-rose-600 font-black'
                             }`}>
                               {d.status === 'paid' ? 'تسویه شده' : 'بدهکار'}
                             </div>
                           </div>
                           
                           <div className="space-y-5 pt-6 border-t border-gray-50 dark:border-slate-800/50">
                              <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                                 <span>مبلغ پایه</span>
                                 <span className="font-mono tabular-nums">{d.debtAmount.toLocaleString('fa-IR')}</span>
                              </div>
                              <div className="flex justify-between items-end">
                                 <div className="space-y-1">
                                    <p className="text-[10px] font-black text-rose-600/50">مبلغ مانده</p>
                                    <p className="text-2xl font-black text-rose-600 font-mono tracking-tighter tabular-nums">{d.remainingAmount.toLocaleString('fa-IR')}</p>
                                 </div>
                                 <div className="text-left text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                                    {new Date(d.createdAt).toLocaleDateString('fa-IR')}
                                 </div>
                              </div>
                           </div>
                        </div>
                      ))}
                    </div>
                 </div>
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="h-[600px] flex flex-col items-center justify-center bg-white dark:bg-[#1e293b]/30 rounded-[64px] border-4 border-dashed border-gray-100 dark:border-slate-800 relative group overflow-hidden"
              >
                <div className="absolute inset-0 bg-blue-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex flex-col items-center">
                  <div className="w-32 h-32 bg-white dark:bg-slate-900 rounded-[40px] flex items-center justify-center shadow-2xl mb-8 group-hover:scale-110 transition-transform duration-500">
                    <ArrowRightLeft className="w-12 h-12 text-blue-500 animate-pulse" />
                  </div>
                  <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-3">انتخاب پرونده مالی</h3>
                  <p className="text-sm text-gray-400 text-center max-w-sm leading-loose">جهت مدیریت اقساط، مشاهده فاکتورهای نفع شده و ثبت دریافتی، یکی از اسامی لیست بدهکاران را لمس کنید.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
