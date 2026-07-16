import { translateError } from '../../lib/errorTranslator';
import { useState, useEffect, ReactNode, FormEvent, ChangeEvent } from 'react';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, orderBy, limit, writeBatch } from 'firebase/firestore';
import { db, logEvent } from '../../firebase';
import { User, Customer, Sale } from '../../types';
import { Card, DataTable, LoadingWidget, ErrorWidget, Button, TextField } from '../../components';
import { User as UserIcon, Phone, MapPin, History, DollarSign, Plus, Minus, Edit2, X, ChevronRight, Calculator, Trash2, Download, AlertTriangle, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

export default function CustomersView({ user }: { user: User }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isAdding, setIsAdding] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({});
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [customerSales, setCustomerSales] = useState<Sale[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState<Partial<Customer>>({});
  const [debtAction, setDebtAction] = useState<{ type: 'add' | 'subtract' | null, amount: number }>({ type: null, amount: 0 });
  const [actionLoading, setActionLoading] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, [user.shopId]);

  const fetchCustomers = async () => {
    if (!user.shopId) return;
    setLoading(true);
    try {
      const q = query(collection(db, "customers"), where("shopId", "==", user.shopId));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
      setCustomers(data);
      
      if (selectedCustomer) {
        const updated = data.find(c => c.id === selectedCustomer.id);
        if (updated) setSelectedCustomer(updated);
      }
    } catch (err: any) {
      setError(translateError(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerHistory = async (customerId: string) => {
    setIsHistoryLoading(true);
    try {
      const q = query(
        collection(db, "sales"), 
        where("shopId", "==", user.shopId),
        where("customerId", "==", customerId),
        orderBy("createdAt", "desc"),
        limit(10)
      );
      const snap = await getDocs(q);
      setCustomerSales(snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale)));
    } catch (err: any) {
      console.error("History fetch error:", err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleRowClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSales([]);
    fetchCustomerHistory(customer.id);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user.shopId) return;
    setActionLoading(true);
    try {
      const p = {
        ...newCustomer,
        shopId: user.shopId,
        totalDebt: 0,
        createdAt: new Date().toISOString(),
      };
      await addDoc(collection(db, "customers"), p);
      logEvent({
        type: 'shop',
        shopId: user.shopId!,
        userId: user.id,
        userEmail: user.email,
        action: 'تعریف مشتری جدید',
        details: `مشتری: ${p.fullName}`
      });
      setIsAdding(false);
      setNewCustomer({});
      fetchCustomers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "customers", selectedCustomer.id), editingData);
      setIsEditing(false);
      fetchCustomers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDebtChange = async () => {
    if (!selectedCustomer || !debtAction.type || debtAction.amount <= 0) return;
    setActionLoading(true);
    try {
      const currentDebt = selectedCustomer.totalDebt || 0;
      const amount = Number(debtAction.amount);
      const newDebt = debtAction.type === 'add' ? currentDebt + amount : Math.max(0, currentDebt - amount);
      
      // Update customer debt
      await updateDoc(doc(db, "customers", selectedCustomer.id), { totalDebt: newDebt });
      
      // Log as a special transaction for history
      await addDoc(collection(db, "sales"), {
        shopId: user.shopId,
        customerId: selectedCustomer.id,
        totalAmount: amount,
        discount: 0,
        paymentType: debtAction.type === 'add' ? 'DebtAddition' : 'DebtPayment',
        items: [],
        createdAt: new Date().toISOString(),
        isAdjustment: true,
        note: debtAction.type === 'add' ? "افزایش نسیه دستی" : "بازپرداخت نسیه دستی"
      });

      setDebtAction({ type: null, amount: 0 });
      fetchCustomers();
      fetchCustomerHistory(selectedCustomer.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>, isEditingMode: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
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
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
          
          if (isEditingMode) {
            setEditingData({ ...editingData, photoUrl: compressedBase64 });
          } else {
            setNewCustomer({ ...newCustomer, photoUrl: compressedBase64 });
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const exportCustomerHistory = async (customer: Customer) => {
    setIsExporting(true);
    try {
      const q = query(
        collection(db, "sales"), 
        where("shopId", "==", user.shopId),
        where("customerId", "==", customer.id),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const allSales = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));

      const data = allSales.map(s => ({
        'شناسه تراکنش': s.id,
        'تاریخ': new Date(s.createdAt).toLocaleString('fa-IR'),
        'نوع تراکنش': s.isAdjustment ? (s.paymentType === 'DebtAddition' ? 'افزایش بدهی' : 'پرداخت بدهی') : 'فروش کالا',
        'نوع پرداخت': s.paymentType === 'Cash' ? 'نقدی' : s.paymentType === 'Card' ? 'کارت به کارت' : s.paymentType === 'Debt' ? 'نسیه' : s.paymentType,
        'مبلغ کل (تومان)': s.totalAmount,
        'تخفیف (تومان)': s.discount || 0,
        'شرح اقلام': s.items?.map((i:any) => `${i.name} (${i.quantity})`).join(' - ') || s.note || '',
      }));

      // Add customer info sheet
      const customerInfo = [
        { 'فیلد': 'نام و نام‌خانوادگی', 'مقدار': customer.fullName },
        { 'فیلد': 'تلفن', 'مقدار': customer.phone },
        { 'فیلد': 'آدرس', 'مقدار': customer.address || 'ثبت نشده' },
        { 'فیلد': 'مانده بدهی نهایی', 'مقدار': customer.totalDebt || 0 },
        { 'فیلد': 'کل مبلغ خرید', 'مقدار': customer.totalSpent || 0 },
        { 'فیلد': 'تاریخ عضویت', 'مقدار': new Date(customer.createdAt).toLocaleDateString('fa-IR') },
      ];

      const wb = XLSX.utils.book_new();
      const wsHistory = XLSX.utils.json_to_sheet(data);
      const wsInfo = XLSX.utils.json_to_sheet(customerInfo);
      
      XLSX.utils.book_append_sheet(wb, wsInfo, "اطلاعات مشتری");
      XLSX.utils.book_append_sheet(wb, wsHistory, "تاریخچه تراکنش‌ها");
      
      XLSX.writeFile(wb, `${customer.fullName}.xlsx`);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!customerToDelete) return;
    setActionLoading(true);
    try {
      // 1. Export History first
      await exportCustomerHistory(customerToDelete);
      
      // 2. Delete Customer
      await deleteDoc(doc(db, "customers", customerToDelete.id));
      
      // 3. Optional: Cleanup or anonymize sales? Usually we keep sales records but they will have a null customer link or dead ID.
      // The current system uses customerId in Sale record, which will just stay there.
      
      setIsDeleteModalOpen(false);
      setCustomerToDelete(null);
      setSelectedCustomer(null);
      fetchCustomers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    { header: 'نمایه', cell: (r: Customer) => (
      <div className="w-9 h-9 rounded-xl overflow-hidden bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 font-bold text-xs shadow-sm">
        {r.photoUrl ? (
          <img src={r.photoUrl} alt={r.fullName} className="w-full h-full object-cover" />
        ) : (
          r.fullName.charAt(0)
        )}
      </div>
    )},
    { header: 'نام و نام‌خانوادگی', accessor: 'fullName' },
    { header: 'تلفن', accessor: 'phone' },
    { header: 'بدهی فعلی', cell: (r: Customer) => (
      <span className={`font-bold ${r.totalDebt && r.totalDebt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
        {(r.totalDebt || 0).toLocaleString()} تومان
      </span>
    )},
  ];

  if (loading && customers.length === 0) return <LoadingWidget />;

  return (
    <div className="space-y-10 max-w-7xl mx-auto px-4 pb-20" dir="rtl">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-white dark:bg-[#1e293b] p-8 rounded-[40px] shadow-2xl shadow-blue-500/5 border border-gray-100 dark:border-slate-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] -mr-32 -mt-32" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 border border-blue-100 dark:border-blue-500/20">
              <Users className="w-3 h-3" />
              Customer Relationship Management
            </div>
            <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">مدیریت هوشمند مشتریان</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 font-medium max-w-md leading-relaxed">
              بانک اطلاعات خریداران، پیگیری مطالبات مالی و تحلیل رفتار خرید مشتریان وفادار.
            </p>
          </div>
          
          <Button 
            onClick={() => setIsAdding(!isAdding)} 
            className={`h-16 px-10 rounded-[24px] font-black text-lg transition-all flex items-center gap-3 ${
              isAdding 
              ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30' 
              : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
            }`}
          >
            {isAdding ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
            {isAdding ? 'انصراف از ثبت' : 'افزودن مشتری جدید'}
          </Button>
        </div>
      </div>

      {error && <ErrorWidget message={error} />}

      <AnimatePresence>
        {isAdding && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Card className="p-10 rounded-[40px] border-none shadow-2xl bg-white/80 dark:bg-[#1e293b]/90 backdrop-blur-xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/5 blur-3xl -ml-16 -mt-16 group-hover:bg-blue-500/10 transition-colors" />
              
              <form onSubmit={handleSave} className="relative grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="col-span-full flex flex-col sm:flex-row items-center gap-8 mb-4">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-[32px] bg-gray-50 dark:bg-slate-900 border-2 border-dashed border-gray-200 dark:border-slate-700 flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/5">
                      {newCustomer.photoUrl ? (
                        <img src={newCustomer.photoUrl} className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-10 h-10 text-gray-300 group-hover:text-blue-500 transition-colors" />
                      )}
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleFileUpload(e, false)} 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-black text-gray-900 dark:text-white">تصویر پروفایل مشتری</p>
                    <p className="text-xs text-gray-400 font-medium whitespace-nowrap">جهت شناسایی سریع‌تر در پایانه فروش (اختیاری)</p>
                  </div>
                </div>

                <TextField label="نام و نام‌خانوادگی" value={newCustomer.fullName || ''} onChange={(e:any)=>setNewCustomer({...newCustomer, fullName: e.target.value})} placeholder="مثال: رضا احمدی" required className="h-14 rounded-2xl bg-gray-50/50 dark:bg-slate-900/50" />
                <TextField label="شماره تماس (موبایل)" value={newCustomer.phone || ''} onChange={(e:any)=>setNewCustomer({...newCustomer, phone: e.target.value})} placeholder="0912..." required className="h-14 rounded-2xl bg-gray-50/50 dark:bg-slate-900/50" />
                <TextField label="نشانی کامل" value={newCustomer.address || ''} onChange={(e:any)=>setNewCustomer({...newCustomer, address: e.target.value})} className="h-14 rounded-2xl bg-gray-50/50 dark:bg-slate-900/50" />
                <TextField label="یادداشت و ملاحظات (CRM)" value={newCustomer.notes || ''} onChange={(e:any)=>setNewCustomer({...newCustomer, notes: e.target.value})} className="h-14 rounded-2xl bg-gray-50/50 dark:bg-slate-900/50" />
                
                <div className="col-span-full pt-6 flex justify-end">
                  <Button type="submit" disabled={actionLoading} className="h-14 px-12 rounded-2xl font-black shadow-xl shadow-blue-500/20">
                    {actionLoading ? 'در حال ثبت سیستم...' : 'تایید و ثبت در دفتر مشتریان'}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="rounded-[40px] border border-gray-100 dark:border-slate-800 bg-white dark:bg-[#1e293b] shadow-2xl shadow-gray-200/10 dark:shadow-none overflow-hidden group">
        <div className="p-8 border-b border-gray-50 dark:border-slate-800/50 flex justify-between items-center bg-gray-50/30 dark:bg-slate-900/30">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
            <h3 className="text-xl font-black text-gray-900 dark:text-white">فهرست مشتریان ثبت‌شده</h3>
          </div>
          <div className="flex items-center gap-3">
             <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black rounded-lg border border-emerald-100/50">
               Live Database Connected
             </div>
          </div>
        </div>
        <DataTable columns={columns} data={customers} onRowClick={handleRowClick} />
      </Card>

      {/* Customer Profile Sidebar */}
      <AnimatePresence>
        {selectedCustomer && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => {setSelectedCustomer(null); setIsEditing(false);}} className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40" />
            <motion.div 
              initial={{ opacity: 0, x: -100 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -100 }} 
              className="fixed inset-y-0 left-0 w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col border-r border-gray-200 dark:border-slate-800 overflow-y-auto"
              dir="rtl"
            >
              <div className="p-4 border-b dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" onClick={() => setSelectedCustomer(null)} className="p-2 rounded-full">
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                  <h3 className="font-bold">پروفایل مشتری</h3>
                </div>
                <div className="flex gap-2">
                   <Button variant="ghost" className="p-2 text-rose-500 hover:bg-rose-50" onClick={() => {
                     setCustomerToDelete(selectedCustomer);
                     setIsDeleteModalOpen(true);
                   }}>
                      <Trash2 className="w-4 h-4" />
                   </Button>
                   <Button variant="outline" className="text-xs h-8" onClick={() => {
                     setIsEditing(!isEditing);
                     setEditingData(selectedCustomer);
                   }}>
                     {isEditing ? 'انصراف' : 'ویرایش'}
                   </Button>
                </div>
              </div>

              <div className="p-6 space-y-8 flex-1">
                {isEditing ? (
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="flex flex-col items-center gap-3 mb-4">
                      <div className="w-20 h-20 rounded-3xl overflow-hidden bg-blue-50 border-2 border-blue-100">
                        {editingData.photoUrl ? (
                          <img src={editingData.photoUrl} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-blue-300 font-bold text-2xl">
                            {editingData.fullName?.charAt(0)}
                          </div>
                        )}
                      </div>
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, true)} className="text-[10px] w-full" />
                    </div>
                    <TextField label="نام و نام‌خانوادگی" value={editingData.fullName || ''} onChange={(e:any)=>setEditingData({...editingData, fullName: e.target.value})} required/>
                    <TextField label="تلفن" value={editingData.phone || ''} onChange={(e:any)=>setEditingData({...editingData, phone: e.target.value})} required/>
                    <TextField label="آدرس" value={editingData.address || ''} onChange={(e:any)=>setEditingData({...editingData, address: e.target.value})} />
                    <TextField label="یادداشت" value={editingData.notes || ''} onChange={(e:any)=>setEditingData({...editingData, notes: e.target.value})} />
                    <Button type="submit" className="w-full" disabled={actionLoading}>بروزرسانی اطلاعات</Button>
                  </form>
                ) : (
                  <>
                    <div className="flex flex-col items-center">
                      <div className="w-24 h-24 rounded-3xl bg-blue-500 overflow-hidden flex items-center justify-center text-white text-3xl font-black mb-4 shadow-lg shadow-blue-500/20 border-4 border-white dark:border-slate-800">
                        {selectedCustomer.photoUrl ? (
                          <img src={selectedCustomer.photoUrl} className="w-full h-full object-cover" />
                        ) : (
                          selectedCustomer.fullName.charAt(0)
                        )}
                      </div>
                      <h2 className="text-2xl font-black">{selectedCustomer.fullName}</h2>
                      <p className="text-sm text-gray-500 font-mono mt-1">{selectedCustomer.phone}</p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">مانده برای پرداخت (نسیه)</p>
                        <p className={`text-xl font-black ${selectedCustomer.totalDebt && selectedCustomer.totalDebt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {(selectedCustomer.totalDebt || 0).toLocaleString()} تومان
                        </p>
                      </div>
                      <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">کل خرید تا الان</p>
                        <p className="text-xl font-black text-blue-600">
                          {(selectedCustomer.totalSpent || 0).toLocaleString()} تومان
                        </p>
                      </div>
                    </div>

                    {/* Debt Management */}
                    <div className="space-y-4">
                       <h4 className="text-sm font-bold flex items-center gap-2">
                         <Calculator className="w-4 h-4 text-gray-400" />
                         مدیریت نسیه
                       </h4>
                       <div className="flex gap-2">
                          <button 
                            onClick={() => setDebtAction({ type: 'add', amount: 0 })}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-all ${debtAction.type === 'add' ? 'bg-rose-500 text-white border-rose-500' : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10'}`}
                          >
                            <Plus className="w-4 h-4" /> افزایش بدهی
                          </button>
                          <button 
                            onClick={() => setDebtAction({ type: 'subtract', amount: 0 })}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-all ${debtAction.type === 'subtract' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10'}`}
                          >
                            <Minus className="w-4 h-4" /> تسویه/پرداخت
                          </button>
                       </div>
                       
                       {debtAction.type && (
                         <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl border bg-gray-50 dark:bg-slate-800 space-y-3">
                            <TextField 
                              label={debtAction.type === 'add' ? "مبلغ افزایش بدهی" : "مبلغ پرداختی"} 
                              type="number" 
                              value={debtAction.amount || ''} 
                              onChange={(e:any) => setDebtAction({ ...debtAction, amount: e.target.value })} 
                              required 
                            />
                            <div className="flex gap-2">
                               <Button className="flex-1" onClick={handleDebtChange} disabled={actionLoading}>{actionLoading ? 'درحال ثبت...' : 'ثبت تغییرات'}</Button>
                               <Button variant="ghost" onClick={() => setDebtAction({ type: null, amount: 0 })}>انصراف</Button>
                            </div>
                         </motion.div>
                       )}
                    </div>

                    {/* History */}
                    <div className="space-y-4">
                       <h4 className="text-sm font-bold flex items-center gap-2">
                         <History className="w-4 h-4 text-gray-400" />
                         تاریخچه آخرین تراکنش‌ها
                       </h4>
                       <div className="space-y-3">
                         {isHistoryLoading ? <LoadingWidget /> : customerSales.length === 0 ? (
                           <p className="text-xs text-center py-8 text-gray-400">هیچ تراکنشی یافت نشد</p>
                         ) : customerSales.map(sale => (
                           <details key={sale.id} className="group overflow-hidden rounded-xl border border-gray-100 dark:border-slate-800 transition-all hover:bg-gray-50 dark:hover:bg-slate-800/50">
                              <summary className="p-3 flex justify-between items-center cursor-pointer list-none">
                                <div>
                                  <p className="text-xs font-bold text-gray-900 dark:text-white">
                                    {(sale as any).isAdjustment ? (sale as any).note : `فروش شماره ${sale.id.slice(0, 5)}`}
                                  </p>
                                  <p className="text-[10px] text-gray-400">{new Date(sale.createdAt).toLocaleDateString('fa-IR')}</p>
                                </div>
                                <div className="text-left flex items-center gap-3">
                                  <div>
                                    <p className={`text-sm font-black ${sale.paymentType === 'DebtAddition' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                      {sale.paymentType === 'DebtAddition' ? '+' : sale.paymentType === 'DebtPayment' ? '-' : ''}
                                      {sale.totalAmount.toLocaleString()} تومان
                                    </p>
                                    <p className="text-[10px] text-gray-400 uppercase font-bold text-left">
                                      {sale.paymentType === 'Cash' ? 'نقد' : 
                                      sale.paymentType === 'Card' ? 'کارت' : 
                                      sale.paymentType === 'Debt' ? 'نسیه' : 
                                      sale.paymentType === 'DebtAddition' ? 'افزایش نسیه' : 'کاهش نسیه'}
                                    </p>
                                  </div>
                                  {!((sale as any).isAdjustment) && <ChevronRight className="w-4 h-4 text-gray-300 group-open:rotate-90 transition-transform" />}
                                </div>
                              </summary>
                              
                              {!((sale as any).isAdjustment) && sale.items && sale.items.length > 0 && (
                                <div className="px-3 pb-3 border-t border-gray-50 dark:border-slate-800 mt-2 pt-2 space-y-1">
                                  {sale.items.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between text-[10px] text-gray-500 dark:text-slate-400">
                                      <span>{item.name} × {item.quantity}</span>
                                      <span className="font-mono">{(item.price * item.quantity).toLocaleString()} تومان</span>
                                    </div>
                                  ))}
                                  <div className="flex justify-between pt-1 border-t border-gray-100 dark:border-slate-800 font-bold text-gray-900 dark:text-white text-[10px]">
                                    <span>جمع کل</span>
                                    <span>{sale.totalAmount.toLocaleString()} تومان</span>
                                  </div>
                                </div>
                              )}
                           </details>
                         ))}
                       </div>
                    </div>

                    {/* Personal Info */}
                    <div className="space-y-4 pt-6 border-t dark:border-slate-800">
                       <h4 className="text-sm font-bold text-gray-400 uppercase mb-2">اطلاعات تکمیلی</h4>
                       <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-700 dark:text-slate-300">{selectedCustomer.address || 'آدرس ثبت نشده'}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <History className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-700 dark:text-slate-300">تاریخ عضویت: {new Date(selectedCustomer.createdAt).toLocaleDateString('fa-IR')}</span>
                          </div>
                       </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setIsDeleteModalOpen(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-sm p-8 shadow-2xl relative z-10 text-center border border-gray-100 dark:border-slate-800"
            >
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 rounded-3xl flex items-center justify-center text-rose-500 mx-auto mb-6">
                 <AlertTriangle className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black mb-2 text-gray-900 dark:text-white">حذف قطعی مشتری؟</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-8">
                با حذف این مشتری، تمامی تراکنش‌های او به صورت خودکار در قالب یک فایل اکسل برای شما دانلود خواهد شد. این عمل غیرقابل بازگشت است.
              </p>
              
              <div className="flex flex-col gap-3">
                <Button onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700 h-14 rounded-2xl font-black text-lg shadow-lg shadow-rose-600/20" disabled={actionLoading || isExporting}>
                   {isExporting ? 'در حال خروجی اکسل...' : actionLoading ? 'در حال حذف...' : 'تایید و دریافت اکسل'}
                </Button>
                <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)} className="h-12 rounded-xl text-gray-400">انصراف</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

