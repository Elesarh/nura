import { translateError } from '../../lib/errorTranslator';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, doc, getDoc, runTransaction } from 'firebase/firestore';
import { db, logEvent } from '../../firebase';
import { downloadPDF, downloadInvoicePDF, directPrintElement } from '../../lib/pdfGenerator';
import { User, Product, Sale, Shop, Customer } from '../../types';
import { Card, DataTable, LoadingWidget, ErrorWidget, Button, TextField } from '../../components';
import { useToast } from '../../ToastContext';
import { User as UserIcon, Search, CheckCircle2, ChevronDown, ShoppingCart, Package, Trash2, History, Store as StoreIcon, Shield, Printer, X, FileText, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function SalesView({ user }: { user: User }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [cart, setCart] = useState<{product: Product, quantity: number}[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentType, setPaymentType] = useState<'Cash' | 'Card' | 'Debt'>('Cash');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const { showToast } = useToast();

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingPaymentType, setPendingPaymentType] = useState<'Cash' | 'Card' | 'Debt' | null>(null);
  const [activeSaleInvoice, setActiveSaleInvoice] = useState<Sale | null>(null);
  const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, [user.shopId]);

  const fetchData = async () => {
    if (!user.shopId) return;
    setLoading(true);
    try {
      const shopDoc = await getDoc(doc(db, "shops", user.shopId));
      if (shopDoc.exists()) {
        setShop({ id: shopDoc.id, ...shopDoc.data() } as Shop);
      }

      const q = query(collection(db, "products"), where("shopId", "==", user.shopId));
      const snap = await getDocs(q);
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));

      const sq = query(collection(db, "sales"), where("shopId", "==", user.shopId));
      const sSnap = await getDocs(sq);
      setSales(sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Sale)));

      const cq = query(collection(db, "customers"), where("shopId", "==", user.shopId));
      const cSnap = await getDocs(cq);
      setCustomers(cSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
    } catch (err: any) {
      setError(translateError(err));
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    if (product.quantity <= 0) {
      setError(`محصول ${product.name} در انبار موجود نیست.`);
      return;
    }
    const existing = cart.find(i => i.product.id === product.id);
    if (existing) {
      if (existing.quantity >= product.quantity) {
        setError(`تعداد انتخاب شده برای ${product.name} نمی‌تواند بیشتر از موجودی انبار (${product.quantity}) باشد.`);
        return;
      }
      setCart(cart.map(i => i.product.id === product.id ? { ...i, quantity: Number((i.quantity + 1).toFixed(2)) } : i));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
    setError('');
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(i => i.product.id !== productId));
    setError('');
  };

  const updateQuantity = (productId: string, quantity: number) => {
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;

    if (quantity > item.product.quantity) {
      setError(`تعداد انتخاب شده برای ${item.product.name} نمی‌تواند بیشتر از موجودی انبار (${item.product.quantity}) باشد.`);
      return;
    }

    setCart(cart.map(i => i.product.id === productId ? { ...i, quantity: Number(quantity.toFixed(3)) } : i));
    setError('');
  };

  const handleStepDecrease = (item: any) => {
    const isDecimalUnit = ['کیلوگرم', 'لیتر', 'گرم', 'میلی‌لیتر'].includes(item.product.unit);
    const step = isDecimalUnit ? 0.1 : 1;
    const newQty = item.quantity - step;
    if (newQty <= 0) {
      removeFromCart(item.product.id);
    } else {
      updateQuantity(item.product.id, newQty);
    }
  };

  const handleStepIncrease = (item: any) => {
    const isDecimalUnit = ['کیلوگرم', 'لیتر', 'گرم', 'میلی‌لیتر'].includes(item.product.unit);
    const step = isDecimalUnit ? 0.1 : 1;
    updateQuantity(item.product.id, item.quantity + step);
  };

  const totalAmount = cart.reduce((acc, item) => acc + (item.product.salePrice * item.quantity), 0) - discount;

  const handleCompleteSale = async () => {
    if (!user.shopId || cart.length === 0) return;
    if (paymentType === 'Debt' && !selectedCustomerId) {
      setError('برای فروش نسیه، انتخاب مشتری الزامی است.');
      return;
    }
    setPendingPaymentType(paymentType);
    setIsConfirmModalOpen(true);
  };

  const confirmAndProcessSale = async () => {
    if (!user.shopId || !pendingPaymentType) return;
    setIsConfirmModalOpen(false);
    setLoading(true);
    let createdRecord: any = null;
    try {
      await runTransaction(db, async (transaction) => {
        // 1. ALL READS FIRST
        
        // Product reads
        const productDataRequests = cart.map(async (item) => {
          const ref = doc(db, "products", item.product.id);
          const snap = await transaction.get(ref);
          return { item, ref, snap };
        });
        const productSnaps = await Promise.all(productDataRequests);

        // Customer read
        let customerSnap = null;
        let customerRef = null;
        if (selectedCustomerId) {
          customerRef = doc(db, "customers", selectedCustomerId);
          customerSnap = await transaction.get(customerRef);
          if (!customerSnap.exists()) throw new Error('مشتری یافت نشد.');
        }

        // 2. ALL VALIDATIONS & PREPARATIONS
        for (const ps of productSnaps) {
          if (!ps.snap.exists()) throw new Error(`محصول ${ps.item.product.name} یافت نشد.`);
          const currentQty = ps.snap.data().quantity;
          if (currentQty < ps.item.quantity) {
            throw new Error(`موجودی محصول ${ps.item.product.name} کافی نیست.`);
          }
        }

        // 3. ALL WRITES LAST
        
        // Update product quantities
        for (const ps of productSnaps) {
          transaction.update(ps.ref, {
            quantity: ps.snap.data().quantity - ps.item.quantity
          });
        }

        // Update customer debt and spent
        if (customerRef && customerSnap) {
          const currentData = customerSnap.data();
          const updates: any = {
            totalSpent: (currentData.totalSpent || 0) + totalAmount
          };
          if (pendingPaymentType === 'Debt') {
            updates.totalDebt = (currentData.totalDebt || 0) + totalAmount;
          }
          transaction.update(customerRef, updates);
        }

        // Create Sale record
        const saleDoc = {
          shopId: user.shopId,
          customerId: selectedCustomerId || null,
          totalAmount,
          discount,
          paymentType: pendingPaymentType,
          items: cart.map(i => ({ 
            productId: i.product.id, 
            name: i.product.name, 
            quantity: i.quantity, 
            price: i.product.salePrice 
          })),
          createdAt: new Date().toISOString()
        };
        const salesRef = collection(db, "sales");
        const newSaleRef = doc(salesRef);
        transaction.set(newSaleRef, saleDoc);
        createdRecord = { id: newSaleRef.id, ...saleDoc };

        // Record Debt if applicable
        if (pendingPaymentType === 'Debt' && selectedCustomerId) {
          const debtsRef = collection(db, "debts");
          transaction.set(doc(debtsRef), {
            shopId: user.shopId,
            customerId: selectedCustomerId,
            saleId: newSaleRef.id,
            debtAmount: totalAmount,
            paidAmount: 0,
            remainingAmount: totalAmount,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'unpaid'
          });
        }
      });

      setCart([]);
      setDiscount(0);
      setSelectedCustomerId('');
      setCurrentStep(1);
      showToast('فاکتور فروش با موفقیت ثبت شد');
      logEvent({
        type: 'shop',
        shopId: user.shopId,
        userId: user.id,
        userEmail: user.email,
        action: 'فروش جدید',
        details: `فروش به مبلغ ${totalAmount.toLocaleString()} تومان - روش: ${pendingPaymentType}`
      });
      fetchData();
      setError('');
      if (createdRecord) {
        setActiveSaleInvoice(createdRecord);
      }
    } catch (err: any) {
      console.error("Sale transaction error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      setPendingPaymentType(null);
    }
  };

  const [exportLoading, setExportLoading] = useState(false);

  const handleDownloadPDF = async () => {
    if (!activeSaleInvoice) {
      showToast('هیچ فاکتوری برای چاپ انتخاب نشده است', 'error');
      return;
    }
    setExportLoading(true);
    try {
      await downloadInvoicePDF('printable-invoice-sales', `invoice_${activeSaleInvoice.id?.slice(-8).toUpperCase()}.pdf`);
      showToast('فایل PDF فاکتور با موفقیت ذخیره شد');
    } catch (error) {
      console.error("PDF generation failed:", error);
      showToast('خطا در تولید فایل PDF', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) return <LoadingWidget />;

  return (
    <div className="space-y-10 max-w-7xl mx-auto px-4 pb-20" dir="rtl">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-white dark:bg-[#1e293b] p-8 rounded-[40px] shadow-2xl shadow-blue-500/5 border border-gray-100 dark:border-slate-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] -mr-32 -mt-32" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 border border-blue-100 dark:border-blue-500/20">
              <ShoppingCart className="w-3 h-3" />
              Terminal POS v4.0
            </div>
            <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">پیشخوان هوشمند فروش</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 font-medium max-w-md leading-relaxed">
              سیستم ثبت فاکتور آنی، کنترل موجودی یکپارچه و مدیریت تراکنش‌های پایانه فروش.
            </p>
          </div>
          
          <div className="relative w-full md:max-w-md group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
            <input 
              type="text" 
              placeholder="جستجوی سریع کالا (نام، بارکد، دسته‌بندی)..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-14 pr-12 pl-6 bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 rounded-2xl text-sm font-black focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all shadow-inner" 
            />
          </div>
        </div>
      </div>

      {error && <ErrorWidget message={error} />}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Products List - Dynamic Grid */}
        <AnimatePresence mode="popLayout">
          {currentStep === 1 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="lg:col-span-8 space-y-6"
            >
              <div className="flex items-center gap-3 mb-2 px-2">
                 <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                 <h3 className="text-lg font-black text-gray-900 dark:text-white">کاتالوگ محصولات</h3>
                 <span className="text-[10px] font-bold text-gray-400 tabular-nums">{products.length} کالا بارگذاری شد</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.filter(p => (p.name + p.barcode + (p.category || '')).toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                  <motion.div 
                    key={p.id} 
                    layout
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => p.quantity > 0 && addToCart(p)} 
                    className={`group relative p-6 bg-white dark:bg-[#1e293b] border rounded-[32px] cursor-pointer transition-all duration-500 flex flex-col justify-between shadow-xl shadow-gray-200/20 dark:shadow-none min-h-[200px] ${
                      p.quantity === 0 
                      ? 'opacity-60 grayscale border-gray-100 dark:border-slate-800 cursor-not-allowed' 
                      : 'border-gray-50 dark:border-slate-800 hover:border-blue-500/30 dark:hover:border-blue-600/30'
                    }`}
                  >
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-600/0 via-blue-600/40 to-blue-600/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="px-3 py-1 bg-gray-50 dark:bg-slate-900 text-[10px] font-black text-gray-400 dark:text-slate-500 rounded-full group-hover:text-blue-600 transition-colors border border-gray-50 dark:border-slate-800">
                          {p.category || 'بدون دسته‌بندی'}
                        </div>
                        {p.quantity <= p.minimumStock && p.quantity > 0 && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 text-[9px] font-black rounded-full">
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
                            موجودی بحرانی
                          </div>
                        )}
                      </div>
                      <p className="font-black text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-relaxed min-h-[48px]">{p.name}</p>
                    </div>
                    
                    <div className="mt-6 flex flex-col gap-3">
                      <div className="flex justify-between items-center text-[11px] font-bold">
                        <span className="text-gray-400">انبار:</span>
                        <span className={`tabular-nums ${p.quantity <= p.minimumStock ? 'text-rose-500' : 'text-gray-600 dark:text-slate-400'}`}>
                          {p.quantity === 0 ? 'ناموجود' : `${p.quantity} ${p.unit || 'عدد'}`}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between pt-3 border-t border-gray-50 dark:border-slate-800/50">
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">IRR</span>
                        <span className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tighter tabular-nums">
                          {p.salePrice.toLocaleString('fa-IR')}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Checkout Flow Container */}
        <div className={currentStep === 1 ? "lg:col-span-4" : "col-span-full max-w-2xl mx-auto w-full"}>
          <div className="relative group">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-blue-600/5 blur-[80px] -z-10 group-hover:bg-blue-600/10 transition-colors" />
            
            <Card className="p-0 bg-white/80 dark:bg-[#1e293b]/90 backdrop-blur-2xl border-gray-100 dark:border-slate-800 flex flex-col h-full shadow-2xl sticky top-10 overflow-hidden rounded-[48px]">
              {/* Stepper Header */}
              <div className="bg-gray-50/50 dark:bg-slate-900/50 p-8 flex justify-between items-center border-b border-gray-100 dark:border-slate-800">
                 {[1, 2, 3].map((s) => (
                   <div key={s} className="flex flex-col items-center gap-3 relative flex-1">
                      <div className={`w-12 h-12 rounded-[20px] flex items-center justify-center font-black transition-all duration-500 z-10 ${
                        currentStep === s 
                        ? 'bg-blue-600 text-white shadow-2xl shadow-blue-500/40 scale-110' 
                        : currentStep > s 
                          ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/10' 
                          : 'bg-white dark:bg-slate-800 text-gray-400 dark:text-slate-600 border border-gray-100 dark:border-slate-700 shadow-sm'
                      }`}>
                        {currentStep > s ? <CheckCircle2 className="w-6 h-6" /> : s}
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${currentStep === s ? 'text-blue-600' : 'text-gray-400'}`}>
                        {s === 1 ? 'سبد خرید' : s === 2 ? 'مشتری' : 'تسویه'}
                      </span>
                      {s < 3 && <div className={`absolute top-6 -right-1/2 w-full h-[3px] bg-gray-100 dark:bg-slate-800`} />}
                   </div>
                 ))}
              </div>

              <div className="flex-1 p-8 flex flex-col min-h-[500px]">
                <AnimatePresence mode="wait">
                  {currentStep === 1 && (
                    <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col h-full">
                      <div className="flex justify-between items-center mb-8">
                        <div className="space-y-1">
                          <h3 className="text-xl font-black text-gray-900 dark:text-white">اقلام انتخابی</h3>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Order Summary List</p>
                        </div>
                        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-black rounded-2xl tabular-nums">
                          {cart.length} محصول
                        </div>
                      </div>

                      <div className="flex-1 space-y-4 overflow-y-auto max-h-[450px] no-scrollbar pr-1 mb-8">
                        {cart.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-20 opacity-30 grayscale saturate-0 space-y-4">
                             <div className="w-24 h-24 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                               <ShoppingCart className="w-12 h-12" />
                             </div>
                             <p className="font-black text-sm uppercase tracking-widest">Your cart is empty</p>
                          </div>
                        ) : cart.map((item) => (
                          <div key={item.product.id} className="p-5 bg-white dark:bg-slate-900 border border-gray-50 dark:border-slate-800 rounded-[28px] group transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/20 dark:hover:shadow-none hover:-translate-y-1">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1">
                                <p className="font-black text-gray-800 dark:text-slate-200 leading-tight mb-2">{item.product.name}</p>
                                <div className="flex items-center gap-3">
                                   <div className="px-2 py-1 bg-gray-50 dark:bg-slate-800 rounded-lg text-[10px] font-mono text-gray-400 tabular-nums">
                                      {item.product.salePrice.toLocaleString('fa-IR')}
                                   </div>
                                   <div className="w-1.5 h-1.5 bg-blue-600/30 rounded-full" />
                                   <div className="text-[11px] font-black text-blue-600 uppercase tabular-nums">
                                      {(item.product.salePrice * item.quantity).toLocaleString('fa-IR')} <span className="text-[8px] opacity-60">تومان</span>
                                   </div>
                                </div>
                              </div>
                              <button onClick={() => removeFromCart(item.product.id)} className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all">
                                 <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <div className="flex items-center justify-center gap-4 mt-6 bg-gray-50 dark:bg-slate-800/80 p-1.5 rounded-2xl">
                               <button onClick={() => handleStepDecrease(item)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-700 text-gray-400 hover:text-rose-500 shadow-sm transition-colors text-xl">-</button>
                               <input 
                                 type="text" 
                                 inputMode="decimal"
                                 value={quantityInputs[item.product.id] ?? item.quantity.toString()} 
                                 onChange={(e) => {
                                   const val = e.target.value;
                                   setQuantityInputs(prev => ({ ...prev, [item.product.id]: val }));
                                   if (val === '' || val === '.') {
                                     updateQuantity(item.product.id, 0);
                                     return;
                                   }
                                   const num = parseFloat(val);
                                   if (!isNaN(num)) {
                                     updateQuantity(item.product.id, num);
                                   }
                                 }}
                                 onBlur={() => {
                                   setQuantityInputs(prev => {
                                     const next = { ...prev };
                                     delete next[item.product.id];
                                     return next;
                                   });
                                 }}
                                 className="flex-1 font-mono font-black text-sm text-center bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white tabular-nums"
                               />
                               <button onClick={() => handleStepIncrease(item)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-700 text-blue-600 shadow-sm transition-colors text-xl">+</button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-auto space-y-6 pt-6 border-t border-gray-50 dark:border-slate-800">
                         <div className="flex justify-between items-end">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Total Estimated Pay</p>
                            <p className="text-3xl font-black text-blue-600 tabular-nums tracking-tighter leading-none">
                              {totalAmount.toLocaleString('fa-IR')} <span className="text-[10px] opacity-70">تومان</span>
                            </p>
                         </div>
                         <Button 
                           disabled={cart.length === 0} 
                           onClick={() => setCurrentStep(2)} 
                           className="w-full h-16 rounded-[24px] font-black text-lg bg-blue-600 hover:bg-blue-700 shadow-2xl shadow-blue-600/30 transition-all flex items-center justify-center gap-3"
                         >
                           تایید و مرحله بعد
                           <CheckCircle2 className="w-6 h-6" />
                         </Button>
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 2 && (
                    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col h-full">
                      <div className="mb-10">
                         <h3 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                          <UserIcon className="w-6 h-6 text-blue-600" />
                          اطلاعات مشتری
                        </h3>
                        <p className="text-xs text-gray-400 font-medium mt-1 leading-relaxed">مشخصات خریدار را جهت ثبت در سوابق مالی و سیستم CRM انتخاب نمایید.</p>
                      </div>

                      <div className="space-y-8 flex-1">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest ml-2">جستجو و انتخاب مشتری ثبت‌شده</label>
                          <div className="relative group">
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 p-2.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded-xl">
                              <UserIcon className="w-5 h-5" />
                            </div>
                            <select 
                              value={selectedCustomerId} 
                              onChange={(e) => setSelectedCustomerId(e.target.value)}
                              className="w-full pr-16 pl-6 h-16 bg-gray-50 dark:bg-slate-900/80 border border-transparent rounded-[24px] text-sm font-black focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:outline-none appearance-none transition-all shadow-inner text-gray-800 dark:text-slate-200"
                            >
                              <option value="">مشتری گذری / متفرقه</option>
                              {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.fullName} • {c.phone}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest ml-2">اعمال تخفیف نقدی (مبلغ قطوع)</label>
                          <TextField 
                            type="number" 
                            value={discount === 0 ? '' : discount} 
                            onChange={(e:any) => setDiscount(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} 
                            placeholder="Discount Amount"
                            className="bg-gray-50 dark:bg-slate-900/80 border-transparent rounded-[24px] h-16 px-10 text-rose-600 font-mono font-black"
                          />
                        </div>

                        <div className="mt-auto p-8 bg-blue-600 rounded-[32px] text-white shadow-2xl shadow-blue-600/30 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                           
                           <div className="relative space-y-4">
                             <div className="flex justify-between items-center text-blue-100 text-[11px] font-bold">
                               <span className="uppercase tracking-widest">Subtotal Order</span>
                               <span className="tabular-nums">{(totalAmount + discount).toLocaleString('fa-IR')} تومان</span>
                             </div>
                             <div className="flex justify-between items-center text-blue-200 text-[11px] font-bold">
                               <span className="uppercase tracking-widest">Applied Discount</span>
                               <span className="tabular-nums">-{discount.toLocaleString('fa-IR')} تومان</span>
                             </div>
                             <div className="h-px bg-white/10" />
                             <div className="flex justify-between items-end">
                               <span className="text-sm font-black uppercase tracking-tighter opacity-80">Total Payable</span>
                               <span className="text-3xl font-black tabular-nums tracking-tighter">{totalAmount.toLocaleString('fa-IR')} <span className="text-xs opacity-60">تومان</span></span>
                             </div>
                           </div>
                        </div>
                      </div>

                      <div className="pt-8 flex gap-4">
                         <Button variant="ghost" onClick={() => setCurrentStep(1)} className="rounded-2xl h-14 px-8 text-gray-400 font-black text-xs">بازگشت</Button>
                         <Button onClick={() => setCurrentStep(3)} className="flex-1 h-14 rounded-2xl font-black text-sm bg-gray-900 dark:bg-slate-200 dark:text-slate-900 shadow-xl">تایید و مرحله پرداخت</Button>
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 3 && (
                    <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col h-full">
                      <div className="mb-8">
                         <h3 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                          <CheckCircle2 className="w-6 h-6 text-blue-600" />
                          روش پرداخت
                        </h3>
                        <p className="text-xs text-gray-400 font-medium mt-1 leading-relaxed">نحوه تسویه فاکتور توسط مشتری را مشخص نمایید.</p>
                      </div>

                      <div className="space-y-4 flex-1">
                        {[
                          { id: 'Cash', label: 'نقدی / پایانه کارت‌خوان', desc: 'تسویه آنی و دریافت وجه مستقیم', icon: '💸', color: 'blue' },
                          { id: 'Card', label: 'انتقال کارت به کارت', desc: 'واریز غیرحضوری به حساب فروشگاه', icon: '💳', color: 'indigo' },
                          { id: 'Debt', label: 'ثبت به عنوان نسیه', desc: 'افزودن به مانده بدهی مشتری', icon: '📝', color: 'rose' }
                        ].map(pt => (
                          <button 
                            key={pt.id} 
                            onClick={() => setPaymentType(pt.id as any)}
                            className={`p-5 rounded-[32px] text-right transition-all duration-500 flex items-center gap-5 border-2 group relative overflow-hidden ${
                              paymentType === pt.id 
                              ? `bg-blue-600 border-blue-500 text-white shadow-2xl shadow-blue-500/20 scale-[1.02]` 
                              : 'bg-white dark:bg-slate-900 border-gray-50 dark:border-slate-800 text-gray-500 hover:border-blue-100 dark:hover:border-blue-900/30'
                            }`}
                          >
                            {paymentType === pt.id && (
                              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[100px] -mr-16 -mt-16" />
                            )}
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-transform duration-500 group-hover:rotate-12 ${paymentType === pt.id ? 'bg-white/20' : 'bg-gray-50 dark:bg-slate-800'}`}>
                              {pt.icon}
                            </div>
                            <div className="flex-1">
                              <p className={`font-black text-sm mb-1 ${paymentType === pt.id ? 'text-white' : 'text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors'}`}>{pt.label}</p>
                              <p className={`text-[10px] font-bold ${paymentType === pt.id ? 'text-blue-100' : 'text-gray-400'}`}>{pt.desc}</p>
                            </div>
                            {paymentType === pt.id ? (
                               <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                  <CheckCircle2 className="w-5 h-5 text-white" />
                               </div>
                            ) : (
                               <ChevronDown className="-rotate-90 w-5 h-5 text-gray-200 group-hover:text-blue-500 transition-all group-hover:translate-x-[-4px]" />
                            )}
                          </button>
                        ))}

                        <AnimatePresence>
                          {paymentType === 'Card' && shop?.bankCards && shop.bankCards.length > 0 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="pt-4">
                              <div className="p-6 rounded-[32px] bg-slate-950 text-white border border-white/5 relative overflow-hidden group shadow-2xl">
                                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/30 transition-all duration-700" />
                                  <div className="relative mb-6 flex justify-between items-start">
                                     <div className="flex items-center gap-2">
                                        <div className="w-10 h-6 bg-white/10 backdrop-blur-md rounded-md flex items-center justify-center border border-white/10">
                                           <div className="flex -space-x-1">
                                              <div className="w-3 h-3 bg-orange-500 rounded-full" />
                                              <div className="w-3 h-3 bg-yellow-400 rounded-full" />
                                           </div>
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-200/50">Show to Customer</span>
                                     </div>
                                     <StoreIcon className="w-6 h-6 text-white/10" />
                                  </div>
                                  
                                  <p className="text-xl font-mono text-center mb-8 tracking-[0.2em] font-black" dir="ltr">
                                     {shop.bankCards[0].number.replace(/\s/g, '').match(/.{1,4}/g)?.join(' ')}
                                  </p>

                                  <div className="flex justify-between items-end">
                                     <div>
                                        <p className="text-[8px] font-bold text-white/30 uppercase tracking-[0.2em] mb-1">Card Holder</p>
                                        <p className="text-sm font-black tracking-tight text-blue-50">{shop.bankCards[0].ownerName || shop.ownerName}</p>
                                     </div>
                                     <div className="text-right">
                                        <p className="text-[8px] font-bold text-white/30 uppercase tracking-[0.2em] mb-1">Bank</p>
                                        <p className="text-sm font-black text-blue-200">{shop.bankCards[0].bankName}</p>
                                     </div>
                                  </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="pt-10 flex gap-4">
                         <div className="flex-1 flex gap-3">
                           <Button variant="ghost" onClick={() => setCurrentStep(2)} className="h-16 px-8 rounded-2xl text-gray-400 font-black text-xs">بازگشت</Button>
                           <Button onClick={handleCompleteSale} className="flex-1 h-16 rounded-[24px] font-black text-lg bg-emerald-600 hover:bg-emerald-700 shadow-2xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3">
                             تایید و چاپ نهایی
                             <CheckCircle2 className="w-6 h-6" />
                           </Button>
                         </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Card className="rounded-[40px] border border-gray-100 dark:border-slate-800 bg-white dark:bg-[#1e293b] shadow-2xl shadow-gray-200/20 dark:shadow-none overflow-hidden">
         <div className="p-8 border-b border-gray-50 dark:border-slate-800/50 flex justify-between items-center">
            <div className="flex items-center gap-3">
               <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
               <h3 className="text-xl font-black text-gray-900 dark:text-white">گزارش آخرین تراکنش‌ها</h3>
            </div>
            <History className="w-6 h-6 text-gray-200 dark:text-slate-700" />
         </div>
         <DataTable 
           columns={[
             { header: 'زمان ثبت سیستم', cell: (r:Sale) => <span className="text-[11px] font-black text-gray-500 tabular-nums">{new Date(r.createdAt).toLocaleString('fa-IR')}</span> },
             { header: 'طرف حساب/مشتری', cell: (r:Sale) => <span className="text-xs font-black text-gray-800 dark:text-slate-300">{customers.find(c => c.id === r.customerId)?.fullName || 'مشتری آزاد (متفرقه)'}</span> },
             { header: 'کانال پرداخت', cell: (r:Sale) => (
               <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black ${
                 r.paymentType === 'Cash' ? 'bg-blue-50 text-blue-600' :
                 r.paymentType === 'Card' ? 'bg-indigo-50 text-indigo-600' :
                 'bg-rose-50 text-rose-600'
               }`}>
                 <span className="w-1.5 h-1.5 bg-current rounded-full" />
                 {r.paymentType === 'Cash' ? 'نقدی / پوز' : r.paymentType === 'Card' ? 'کارت به کارت' : 'فروش نسیه'}
               </div>
             )},
             { header: 'تخفیف', cell: (r:Sale) => <span className="font-mono text-[10px] text-rose-400 tabular-nums">{r.discount?.toLocaleString('fa-IR') || 0} -</span> },
             { header: 'خالص دریافتی', cell: (r:Sale) => (
               <div className="flex flex-col items-center">
                 <span className="font-mono font-black text-blue-600 text-sm tabular-nums">{r.totalAmount.toLocaleString('fa-IR')}</span>
                 <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">Tomans</span>
               </div>
             )},
           ]} 
           data={sales.slice(0, 50)} 
           onRowClick={(r: Sale) => setActiveSaleInvoice(r)}
         />
      </Card>

      {/* Confirmation Modal - Redesigned */}
      <AnimatePresence>
        {isConfirmModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setIsConfirmModalOpen(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="bg-white dark:bg-[#1e293b] rounded-[48px] w-full max-w-md shadow-2xl overflow-hidden relative z-10 border border-white/5 p-8"
            >
              <div className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className={`w-28 h-28 rounded-[36px] flex items-center justify-center text-5xl mb-8 shadow-2xl relative group ${
                    pendingPaymentType === 'Cash' ? 'bg-blue-600 shadow-blue-500/30' :
                    pendingPaymentType === 'Card' ? 'bg-indigo-600 shadow-indigo-500/30' :
                    'bg-rose-600 shadow-rose-500/30'
                  }`}>
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {pendingPaymentType === 'Cash' ? '💸' : pendingPaymentType === 'Card' ? '💳' : '📝'}
                  </div>
                  <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">صدور قطعی فاکتور</h3>
                  <p className="text-sm text-gray-400 mt-2 font-medium">آیا صحت تمامی اقلام و مبالغ فوق مورد تایید است؟</p>
                </div>

                <div className="mt-10 p-8 rounded-[40px] bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 space-y-5">
                   <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                     <span className="uppercase tracking-widest">Gross Total</span>
                     <span className="font-mono tabular-nums">{(totalAmount + discount).toLocaleString('fa-IR')}</span>
                   </div>
                   <div className="flex justify-between items-center text-xs font-bold text-rose-500/60 font-mono">
                     <span className="uppercase tracking-widest">Discount</span>
                     <span className="tabular-nums">-{discount.toLocaleString('fa-IR')}</span>
                   </div>
                   <div className="h-px bg-gray-200 dark:bg-slate-700/50" />
                   <div className="flex justify-between items-center">
                     <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tighter">Amount to Collect</span>
                     <span className="text-4xl font-black text-blue-600 font-mono tracking-tighter tabular-nums">{totalAmount.toLocaleString('fa-IR')} <span className="text-xs opacity-60">تومان</span></span>
                   </div>
                </div>

                <div className="mt-10 flex gap-4">
                  <Button onClick={confirmAndProcessSale} className="flex-1 h-16 rounded-[24px] font-black text-lg bg-blue-600 hover:bg-blue-700 shadow-2xl shadow-blue-500/30 transition-all">تایید و چاپ فاکتور</Button>
                  <Button variant="ghost" onClick={() => setIsConfirmModalOpen(false)} className="h-16 rounded-2xl px-10 text-gray-400 font-black text-xs uppercase tracking-widest">لغو</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Customer Sale Invoice Popup - Customized beautifully per payment type */}
      <AnimatePresence>
        {activeSaleInvoice && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setActiveSaleInvoice(null)} 
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-xl" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 15 }} 
              className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden relative z-10 p-8 custom-scrollbar max-h-[90vh]"
            >
              {/* Print Style Injector */}
              <style>{`
                @media print {
                  body * { visibility: hidden; }
                  #printable-invoice-sales, #printable-invoice-sales * { visibility: visible !important; }
                  #printable-invoice-sales {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    direction: rtl !important;
                    color: black !important;
                    background: white !important;
                  }
                  .print-hidden { display: none !important; }
                }
              `}</style>
              
              <div id="printable-invoice-sales" className="space-y-6 text-right" dir="rtl">
                {/* Header layout */}
                <div className="flex justify-between items-start border-b border-gray-100 dark:border-slate-800 pb-5">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black px-2.5 py-0.5 rounded-full font-sans">
                      <Zap className="w-3 h-3 text-blue-500 animate-pulse" /> فاکتور رسمی فروش دیجیتال
                    </span>
                    <h3 className="text-xl font-black text-gray-950 dark:text-white font-sans">فروشگاه {shop?.name || 'صندوق مرکزی'}</h3>
                    <p className="text-xs text-gray-400 font-bold font-sans">خریدار متعهد به پرداخت وجه فاکتور به شرح زیر است.</p>
                  </div>
                  <div className="text-left font-mono tabular-nums text-xs text-gray-550 space-y-1" dir="ltr">
                    <div><strong className="text-gray-400 font-sans">Invoice ID:</strong> #{activeSaleInvoice.id?.slice(-8).toUpperCase()}</div>
                    <div><strong className="text-gray-400 font-sans">Date:</strong> {new Date(activeSaleInvoice.createdAt).toLocaleDateString('fa-IR')}</div>
                    <div><strong className="text-gray-400 font-sans">Time:</strong> {new Date(activeSaleInvoice.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>

                {/* Trading Parties Block */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-gray-100 dark:border-slate-800/60 text-xs text-right">
                  <div className="space-y-2">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider font-sans">مشخصات فروشنده (کسب‌وکار)</p>
                    <div className="space-y-1 font-bold text-gray-750 dark:text-slate-300 font-sans">
                      <p className="font-black text-gray-900 dark:text-white">{shop?.name || '- '}</p>
                      <p>مدیریت: {shop?.ownerName || 'متصدی صندوق'}</p>
                      <p>تلفن شعبه: {shop?.phone || '-'}</p>
                      <p className="text-gray-400 font-medium font-sans">آدرس: {shop?.address || '-'}</p>
                    </div>
                  </div>
                  <div className="space-y-2 border-r border-gray-100 dark:border-slate-800 pr-4">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider font-sans">مشخصات طرف حساب خریدار</p>
                    <div className="space-y-1 font-bold text-gray-755 dark:text-slate-300 font-sans">
                      {activeSaleInvoice.customerId ? (
                        (() => {
                          const customer = customers.find(c => c.id === activeSaleInvoice.customerId);
                          return (
                            <>
                              <p className="font-black text-gray-900 dark:text-white">{customer?.fullName || 'ثبت نشده'}</p>
                              <p>موبایل خریدار: {customer?.phone || '-'}</p>
                              <p className="text-gray-400 font-medium leading-relaxed font-sans">آدرس خریدار: {customer?.address || 'مراجعه حضوری'}</p>
                            </>
                          );
                        })()
                      ) : (
                        <>
                          <p className="font-black text-gray-900 dark:text-white">مشتری عام (متفرقه)</p>
                          <p className="text-gray-400 font-medium leading-relaxed font-sans">نوع مراجعه: خرید نقدی حضوری صنف عمومی آزاد</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-hidden border border-gray-100 dark:border-slate-800 rounded-2xl">
                  <table className="w-full text-right text-xs font-sans">
                    <thead>
                      <tr className="bg-gray-50/50 dark:bg-slate-800/20 border-b border-gray-100 dark:border-slate-800 text-gray-405 font-black">
                        <th className="p-3 text-right">شرح کالا / خدمات</th>
                        <th className="p-3 text-center">تعداد</th>
                        <th className="p-3 text-left">قیمت واحد (تومان)</th>
                        <th className="p-3 text-left">جمع کل (تومان)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-800/10 font-bold">
                      {activeSaleInvoice.items && activeSaleInvoice.items.length > 0 ? (
                        activeSaleInvoice.items.map((item, idx) => (
                          <tr key={idx} className="text-gray-700 dark:text-slate-300 font-bold">
                            <td className="p-3 text-gray-900 dark:text-white font-black">{item.name}</td>
                            <td className="p-3 text-center font-mono tabular-nums">{item.quantity.toLocaleString('fa-IR')}</td>
                            <td className="p-3 text-left font-mono tabular-nums">{item.price.toLocaleString('fa-IR')}</td>
                            <td className="p-3 text-left font-mono text-blue-600 dark:text-blue-400 tabular-nums">{(item.price * item.quantity).toLocaleString('fa-IR')}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-gray-400">اقلام فاکتور یافت نشد.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Financial Overview & Specific Payment Term Callout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center font-sans">
                  {/* Term stamp - Distinct design depending on paymentType */}
                  <div>
                    {activeSaleInvoice.paymentType === 'Cash' && (
                      <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-xl">💵</div>
                        <div>
                          <p className="text-xs font-black text-blue-800 dark:text-blue-400 uppercase">پرداخت نقدی تسویه شد</p>
                          <p className="text-[10px] text-blue-500 font-bold mt-0.5">دریافت صندوق شعبه - مجاز به تحویل بار</p>
                        </div>
                      </div>
                    )}

                    {activeSaleInvoice.paymentType === 'Card' && (
                      <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-xl">💳</div>
                        <div>
                          <p className="text-xs font-black text-indigo-800 dark:text-indigo-400 uppercase">تراکنش الکترونیکی کارت‌خوان</p>
                           <p className="text-[10px] text-indigo-500 font-bold mt-0.5">تاییدیه: تراکنش الکترونیکی متصل به پایانه POS</p>
                        </div>
                      </div>
                    )}

                    {activeSaleInvoice.paymentType === 'Debt' && (
                      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-xl">📝</div>
                          <div>
                            <p className="text-xs font-black text-amber-800 dark:text-amber-600 uppercase">فاکتور نسیه (تعهد بدهکاری مشتری)</p>
                            <p className="text-[9px] text-amber-500 font-bold mt-0.5 font-sans">ثبت رسمی در دفتر اعتباری بدهکاران</p>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-amber-200/50 dark:border-amber-500/10 space-y-1.5">
                          <p className="text-[9px] text-gray-500 font-medium font-sans leading-relaxed">
                            ⚠️ این فاکتور سند قطعی بدهکاری مشتری است. بدهی در سیستم ثبت و خریدار متعهد به وصول مانده به حساب مذکور است.
                          </p>
                          <div className="mt-2 flex justify-between items-end border-b border-dashed border-gray-300 pb-2">
                            <span className="text-[8px] text-gray-400 font-bold uppercase font-mono">Customer Seal</span>
                            <span className="text-[10px] font-black text-gray-800 dark:text-slate-300 font-sans">امضاء و تعهد خریدار: .............................</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pricing summaries block */}
                  <div className="bg-gray-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-2 text-xs font-bold text-gray-500 font-sans">
                    <div className="flex justify-between items-center">
                      <span>جمع ناخالص فاکتور:</span>
                      <span className="font-mono tabular-nums text-gray-800 dark:text-slate-300">{(activeSaleInvoice.totalAmount + activeSaleInvoice.discount).toLocaleString('fa-IR')} تومان</span>
                    </div>
                    <div className="flex justify-between items-center text-rose-500/80 font-mono">
                      <span>مجموع تخفیف فروش کالا:</span>
                      <span className="tabular-nums font-black font-sans">-{activeSaleInvoice.discount.toLocaleString('fa-IR')} تومان</span>
                    </div>
                    <div className="h-px bg-gray-200 dark:bg-slate-700 my-1" />
                    <div className="flex justify-between items-center text-sm font-black text-gray-900 dark:text-white">
                      <span>مبلغ قابل پرداخت:</span>
                      <span className="font-mono text-xl text-blue-600 dark:text-blue-400 tabular-nums">{activeSaleInvoice.totalAmount.toLocaleString('fa-IR')} تومان</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action controls */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3 print-hidden font-sans">
                <Button 
                  onClick={() => {
                    directPrintElement('printable-invoice-sales');
                  }} 
                  className="flex-1 h-14 rounded-2xl font-black text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-500/10 flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" /> چاپ مستقیم فاکتور (پرینتر)
                </Button>
                <Button 
                  onClick={handleDownloadPDF} 
                  disabled={exportLoading}
                  className="flex-1 h-14 rounded-2xl font-black text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/10 flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" /> {exportLoading ? 'در حال ایجاد PDF...' : 'ذخیره نسخه رایانه‌ای PDF'}
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => setActiveSaleInvoice(null)} 
                  className="h-14 rounded-2xl px-6 font-black text-xs uppercase text-gray-500 dark:text-slate-400 flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" /> لغو
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
