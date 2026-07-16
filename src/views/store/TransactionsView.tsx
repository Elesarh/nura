import { translateError } from '../../lib/errorTranslator';
import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, getDoc, writeBatch, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { User, Sale } from '../../types';
import { Card, DataTable, LoadingWidget, ErrorWidget, Button, TextField } from '../../components';
import { useToast } from '../../ToastContext';
import { Trash2, Filter, Calendar, History, ArrowLeftRight, CheckCircle2, Printer, X, Zap, FileText, Search, Clock as ClockIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadPDF, downloadInvoicePDF, directPrintElement } from '../../lib/pdfGenerator';
import jsPDF from 'jspdf';
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import TimePicker from "react-multi-date-picker/plugins/time_picker";

export default function TransactionsView({ user }: { user: User }) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [shop, setShop] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [activeSaleInvoice, setActiveSaleInvoice] = useState<Sale | null>(null);
  const { showToast } = useToast();

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<any>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<'both' | 'date' | 'time'>('both');

  useEffect(() => {
    fetchData();
  }, [user.shopId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "sales"), 
        where("shopId", "==", user.shopId),
        orderBy("createdAt", "desc"),
        limit(1000)
      );
      const snap = await getDocs(q);
      setSales(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale)));

      // Fetch shop details
      const shopRef = doc(db, "shops", user.shopId);
      const shopSnap = await getDoc(shopRef);
      if (shopSnap.exists()) {
        setShop({ id: shopSnap.id, ...shopSnap.data() });
      }

      // Fetch customers list for matches in invoice details
      const customersSnap = await getDocs(query(collection(db, "customers"), where("shopId", "==", user.shopId)));
      setCustomers(customersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err: any) {
      console.error(err);
      setError(translateError(err));
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      // Search query filtering
      const searchLower = searchQuery.toLowerCase();
      const customer = customers.find(c => c.id === sale.customerId);
      const matchesSearch = 
        sale.id.toLowerCase().includes(searchLower) || 
        (customer?.fullName || '').toLowerCase().includes(searchLower) ||
        (customer?.phone || '').includes(searchLower);

      // Date range filtering
      let matchesDate = true;
      if (dateRange && Array.isArray(dateRange) && dateRange.length === 2 && dateRange[0] && dateRange[1]) {
        const saleDate = new Date(sale.createdAt);
        const startDate = dateRange[0].toDate();
        const endDate = dateRange[1].toDate();

        if (filterMode === 'date') {
          // Compare only dates (strip time)
          const s = new Date(startDate); s.setHours(0,0,0,0);
          const e = new Date(endDate); e.setHours(23,59,59,999);
          matchesDate = saleDate >= s && saleDate <= e;
        } else if (filterMode === 'time') {
          // Compare only time components? That's unusual. 
          // Usually means "Transactions between specific hours regardless of day"
          // Let's assume it means "Show results from selected hours on the selected days"
          matchesDate = saleDate >= startDate && saleDate <= endDate;
        } else {
          // Both
          matchesDate = saleDate >= startDate && saleDate <= endDate;
        }
      } else if (dateRange && !Array.isArray(dateRange)) {
        const saleDate = new Date(sale.createdAt);
        const selectedDate = dateRange.toDate();
        matchesDate = saleDate.toDateString() === selectedDate.toDateString();
      }

      return matchesSearch && matchesDate;
    });
  }, [sales, searchQuery, dateRange, customers, filterMode]);

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این تراکنش اطمینان دارید؟ این عمل غیرقابل بازگشت است.')) return;
    try {
      await deleteDoc(doc(db, "sales", id));
      setSales(sales.filter(s => s.id !== id));
      showToast('تراکنش با موفقیت حذف شد', 'success');
    } catch (err: any) {
      setError('خطا در حذف تراکنش: ' + err.message);
      showToast('خطا در حذف تراکنش', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`آیا از حذف مجموعه ${selectedIds.length} تراکنش اطمینان دارید؟`)) return;
    
    setIsDeleting(true);
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.delete(doc(db, "sales", id));
      });
      await batch.commit();
      setSales(sales.filter(s => !selectedIds.includes(s.id)));
      setSelectedIds([]);
      showToast(`${selectedIds.length} تراکنش با موفقیت حذف شدند`, 'success');
    } catch (err: any) {
      setError('خطا در حذف گروهی: ' + err.message);
      showToast('خطا در حذف گروهی تراکنش‌ها', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const [exportLoading, setExportLoading] = useState(false);

  const handleDownloadPDF = async () => {
    if (!activeSaleInvoice) {
      showToast('هیچ فاکتوری برای چاپ انتخاب نشده است', 'error');
      return;
    }
    setExportLoading(true);
    try {
      await downloadInvoicePDF('printable-invoice-transactions', `invoice_${activeSaleInvoice.id?.slice(-8).toUpperCase()}.pdf`);
      showToast('فایل PDF فاکتور با موفقیت ذخیره شد');
    } catch (error) {
      console.error("PDF generation failed:", error);
      showToast('خطا در تولید فایل PDF', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const columns = [
    { 
      header: (
        <input 
          type="checkbox" 
          onChange={(e) => setSelectedIds(e.target.checked ? sales.map(s => s.id) : [])}
          checked={selectedIds.length === sales.length && sales.length > 0}
          className="rounded border-gray-300 dark:border-slate-800"
        />
      ),
      cell: (r: Sale) => (
        <input 
          type="checkbox" 
          checked={selectedIds.includes(r.id)}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            toggleSelect(r.id);
          }}
          className="rounded border-gray-300 dark:border-slate-800"
        />
      )
    },
    { 
      header: 'نوع و شناسه', 
      cell: (r: Sale) => (
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${r.isAdjustment ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' : 'bg-blue-50 text-blue-600 dark:bg-blue-500/10'}`}>
            {r.isAdjustment ? <ArrowLeftRight className="w-4 h-4" /> : <History className="w-4 h-4" />}
          </div>
          <div>
            <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tighter">{r.isAdjustment ? 'تراکنش اصلاحی' : 'فروش فاکتور'}</p>
            <p className="text-[10px] font-mono text-gray-400">#{r.id.slice(-6).toUpperCase()}</p>
          </div>
        </div>
      )
    },
    { 
      header: 'تاریخ و زمان', 
      cell: (r: Sale) => (
        <div className="text-xs text-gray-500 dark:text-slate-400">
           {new Date(r.createdAt).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' })}
        </div>
      )
    },
    { 
      header: 'مبلغ', 
      cell: (r: Sale) => (
        <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-sm">${r.totalAmount.toLocaleString()}</span>
      )
    },
    { 
      header: 'روش پرداخت', 
      cell: (r: Sale) => (
        <span className={`px-2 py-1 rounded-lg text-[9px] font-black ${
          r.paymentType === 'Cash' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' :
          r.paymentType === 'Card' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' :
          'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
        }`}>
          {r.paymentType === 'Cash' ? 'نقدی/کارت‌خوان' : r.paymentType === 'Card' ? 'کارت به کارت' : 'نسیه'}
        </span>
      )
    },
    { 
      header: 'جزییات', 
      cell: (r: Sale) => (
        r.items && r.items.length > 0 ? (
          <details className="group cursor-pointer">
            <summary className="text-[10px] text-blue-500 font-bold hover:underline list-none">مشاهده کالاها</summary>
            <div className="mt-2 p-2 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 w-48 space-y-1">
              {r.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-[9px]">
                  <span className="text-gray-600 dark:text-slate-300 truncate w-24">{item.name} <span className="text-[8px] opacity-70">x{item.quantity}</span></span>
                  <span className="font-mono text-gray-500 dark:text-slate-500">${(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </details>
        ) : <span className="text-[10px] text-gray-300">بدون کالا</span>
      )
    },
    { 
      header: 'عملیات', 
      cell: (r: Sale) => (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(r.id);
          }}
          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )
    }
  ];

  if (loading && sales.length === 0) return <LoadingWidget />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">تاریخچه تراکنش‌ها</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">مشاهده، فیلتر و مدیریت تمامی تراکنش‌های ثبت شده</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant={isFilterOpen ? 'primary' : 'outline'} 
            onClick={() => setIsFilterOpen(!isFilterOpen)} 
            className="rounded-2xl px-6 flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            فیلتر و جستجو
          </Button>
          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <Button 
                  variant="danger" 
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="rounded-2xl px-6 flex items-center gap-2 shadow-lg shadow-rose-500/20"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف {selectedIds.length} مورد
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          <Button variant="outline" onClick={fetchData} className="rounded-2xl px-6">به‌روزرسانی</Button>
        </div>
      </div>

      {error && <ErrorWidget message={error} />}

      <AnimatePresence>
        {isFilterOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: 'auto', 
              opacity: 1,
              marginTop: isCalendarOpen ? '20px' : '0px',
              marginBottom: isCalendarOpen ? '320px' : '0px'
            }}
            transition={{ duration: 0.4 }}
            exit={{ height: 0, opacity: 0 }}
            className="relative z-10 overflow-visible"
          >
            <Card className={`p-6 mb-6 border-blue-100 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-900/10 transition-all duration-500 overflow-visible ${isCalendarOpen ? 'shadow-2xl ring-4 ring-blue-500/5 scale-[1.01]' : ''}`}>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start overflow-visible">
                {/* Search Term */}
                <div className="md:col-span-12 lg:col-span-4">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1 mb-2 block">جستجو (شناسه یا نام مشتری)</label>
                   <div className="relative">
                     <TextField 
                       placeholder="مثال: علی محمدی یا شناسه فاکتور..." 
                       value={searchQuery}
                       onChange={(e: any) => setSearchQuery(e.target.value)}
                       className="w-full"
                     />
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                   </div>
                </div>

                {/* Filter Modes */}
                <div className="md:col-span-6 lg:col-span-3">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1 mb-2 block">نوع فیلتر زمانی</label>
                   <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-slate-700 h-[46px] shadow-sm">
                     <button 
                       onClick={() => setFilterMode('date')}
                       className={`flex-1 rounded-lg text-[10px] font-black transition-all ${filterMode === 'date' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                     >
                       فقط تاریخ
                     </button>
                     <button 
                       onClick={() => setFilterMode('both')}
                       className={`flex-1 rounded-lg text-[10px] font-black transition-all ${filterMode === 'both' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                     >
                       تاریخ و زمان
                     </button>
                   </div>
                </div>

                {/* Date Picker */}
                <div className="md:col-span-6 lg:col-span-5 relative z-[1001]">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1 mb-2 block">
                     {filterMode === 'date' ? 'انتخاب بازه تاریخ' : 'انتخاب بازه تاریخ و زمان'}
                   </label>
                   <div className="relative overflow-visible">
                     <DatePicker
                       range
                       value={dateRange}
                       onChange={setDateRange}
                       calendar={persian}
                       locale={persian_fa}
                       onOpen={() => setIsCalendarOpen(true)}
                       onClose={() => setIsCalendarOpen(false)}
                       plugins={filterMode === 'both' ? [
                         <TimePicker position="bottom" key="time-picker" />
                       ] : []}
                       calendarPosition="bottom-center"
                       inputClass="w-full h-[46px] px-10 bg-white dark:bg-slate-800 rounded-lg border border-gray-300 dark:border-slate-600 text-xs font-bold focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                       containerClassName="w-full"
                       placeholder="انتخاب بازه زمانی..."
                       fixMainPosition={true}
                       portal={true}
                       portalTarget={document.body}
                       zIndex={10000}
                     />
                     <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                   </div>
                </div>

                {/* Clear Button */}
                <div className="md:col-span-12 flex justify-end pt-2 border-t border-blue-100/50 dark:border-blue-900/20">
                   <Button 
                    variant="secondary" 
                    onClick={() => {
                      setSearchQuery('');
                      setDateRange(null);
                      setFilterMode('both');
                    }}
                    className="h-10 rounded-xl px-8 text-xs font-black shadow-sm"
                   >
                     پاکسازی تنظیمات فیلتر
                   </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="overflow-hidden border-gray-100 dark:border-slate-800 shadow-sm">
        <DataTable columns={columns} data={filteredSales} onRowClick={(r: Sale) => setActiveSaleInvoice(r)} />
        {filteredSales.length === 0 && (
          <div className="py-20 text-center">
            <History className="w-12 h-12 text-gray-200 dark:text-slate-800 mx-auto mb-4" />
            <p className="text-gray-400 italic">هیچ تراکنشی یافت نشد</p>
          </div>
        )}
      </Card>

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
              className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[32px] w-full max-w-2xl shadow-2xl relative z-10 p-8 custom-scrollbar max-h-[90vh] overflow-y-auto"
            >
              {/* Print Style Injector */}
              <style>{`
                @media print {
                  body * { visibility: hidden; }
                  #printable-invoice-transactions, #printable-invoice-transactions * { visibility: visible !important; }
                  #printable-invoice-transactions {
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
              
              <div id="printable-invoice-transactions" className="space-y-6 text-right" dir="rtl">
                {/* Header layout */}
                <div className="flex justify-between items-start border-b border-gray-100 dark:border-slate-800 pb-5">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black px-2.5 py-0.5 rounded-full font-sans">
                      <Zap className="w-3 h-3 text-blue-500 animate-pulse" /> فاکتور رسمی فروش دیجیتال
                    </span>
                    <h3 className="text-xl font-black text-gray-950 dark:text-white font-sans">فروشگاه {shop?.name || 'صندوق مرکزی'}</h3>
                    <p className="text-xs text-gray-400 font-bold font-sans">خریدار متعهد به پرداخت وجه فاکتور به شرح زیر است.</p>
                  </div>
                  <div className="text-left font-mono tabular-nums text-xs text-gray-500 space-y-1" dir="ltr">
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
                              <p className="text-gray-400 font-medium leading-relaxed font-sans font-sans">آدرس خریدار: {customer?.address || 'مراجعه حضوری'}</p>
                            </>
                          );
                        })()
                      ) : (
                        <>
                          <p className="font-black text-gray-900 dark:text-white">مشتری عام (متفرقه)</p>
                          <p className="text-gray-400 font-medium leading-relaxed font-sans font-sans font-sans">نوع مراجعه: خرید نقدی حضوری صنف عمومی آزاد</p>
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
                        <th className="p-3 text-center font-sans">تعداد</th>
                        <th className="p-3 text-left font-sans">قیمت واحد (تومان)</th>
                        <th className="p-3 text-left font-sans">جمع کل (تومان)</th>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  {/* Term stamp - Distinct design depending on paymentType */}
                  <div>
                    {activeSaleInvoice.paymentType === 'Cash' && (
                      <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20 flex items-center gap-3 animate-fade-in font-sans">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-xl">💵</div>
                        <div>
                          <p className="text-xs font-black text-blue-800 dark:text-blue-400 uppercase">پرداخت نقدی تسویه شد</p>
                          <p className="text-[10px] text-blue-500 font-bold mt-0.5">دریافت صندوق شعبه - مجاز به تحویل بار</p>
                        </div>
                      </div>
                    )}

                    {activeSaleInvoice.paymentType === 'Card' && (
                      <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 flex items-center gap-3 animate-fade-in font-sans">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-xl">💳</div>
                        <div>
                          <p className="text-xs font-black text-indigo-800 dark:text-indigo-400 uppercase font-sans">تراکنش الکترونیکی کارت‌خوان</p>
                          <p className="text-[10px] text-indigo-500 font-bold mt-0.5 font-sans">تاییدیه: تراکنش الکترونیکی متصل به پایانه POS</p>
                        </div>
                      </div>
                    )}

                    {activeSaleInvoice.paymentType === 'Debt' && (
                      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 space-y-2 animate-fade-in font-sans font-sans">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-xl font-sans">📝</div>
                          <div>
                            <p className="text-xs font-black text-amber-800 dark:text-amber-600 uppercase">فاکتور نسیه (تعهد بدهکاری مشتری)</p>
                            <p className="text-[9px] text-amber-500 font-bold mt-0.5">ثبت رسمی در دفتر اعتباری بدهکاران</p>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-amber-200/50 dark:border-amber-500/10 space-y-1.5 font-sans">
                          <p className="text-[9px] text-gray-500 font-medium leading-relaxed font-sans">
                            ⚠️ این فاکتور سند قطعی بدهکاری مشتری است. بدهی در سیستم ثبت و خریدار متعهد به وصول مانده به حساب مذکور است.
                          </p>
                          <div className="mt-2 flex justify-between items-end border-b border-dashed border-gray-300 pb-2 font-sans font-sans">
                            <span className="text-[8px] text-gray-400 font-bold uppercase font-mono">Customer Seal</span>
                            <span className="text-[10px] font-black text-gray-800 dark:text-slate-300">امضاء و تعهد خریدار: .............................</span>
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
                    <div className="h-px bg-gray-200 dark:bg-slate-700 my-1 font-sans" />
                    <div className="flex justify-between items-center text-sm font-black text-gray-900 dark:text-white">
                      <span>مبلغ قابل پرداخت:</span>
                      <span className="font-mono text-xl text-blue-600 dark:text-blue-400 tabular-nums font-sans">{activeSaleInvoice.totalAmount.toLocaleString('fa-IR')} تومان</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action controls */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3 print-hidden font-sans">
                <Button 
                  onClick={() => {
                    directPrintElement('printable-invoice-transactions');
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
