import React, { useState, useEffect } from 'react';
import { translateError } from "../../lib/errorTranslator";
import { PackageSearch, Plus, Search, CheckCircle2, ChevronRight, X, User as UserIcon, Calendar, Clock, Edit2, Trash2, Printer, FileText, Image as ImageIcon, Upload } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { PurchaseOrder, User } from '../../types';
import { Button, TextField } from '../../components';
import { useToast } from '../../ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { downloadInvoicePDF, directPrintElement } from '../../lib/pdfGenerator';

export default function OrdersView({ user }: { user: User }) {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [activeOrderInvoice, setActiveOrderInvoice] = useState<PurchaseOrder | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [qtyInputs, setQtyInputs] = useState<Record<number, string>>({});
  const [priceInputs, setPriceInputs] = useState<Record<number, string>>({});

  // Form states
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [status, setStatus] = useState<'ordered' | 'delivered'>('ordered');
  const [items, setItems] = useState<{name: string, quantity: number, purchasePrice: number}[]>([{ name: '', quantity: 1, purchasePrice: 0 }]);
  const [notes, setNotes] = useState('');
  const [manualInvoiceUrl, setManualInvoiceUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchOrders = async () => {
    if (!user.shopId) return;
    try {
      setLoading(true);
      const q = query(collection(db, 'purchase_orders'), where('shopId', '==', user.shopId));
      const snap = await getDocs(q);
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseOrder))
        .sort((a,b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
      setOrders(fetched);
    } catch (err: any) {
      setError(translateError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user.shopId]);

  const handleAddItem = () => setItems([...items, { name: '', quantity: 1, purchasePrice: 0 }]);
  
  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof typeof items[0], value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateTotal = () => items.reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.shopId) return;
    if (!visitorName) {
      setError('نام ویزیتور الزامی است');
      showToast('نام ویزیتور الزامی است', 'error');
      return;
    }
    
    const validItems = items.filter(i => i.name && i.quantity > 0 && i.purchasePrice >= 0);
    if (validItems.length === 0) {
      setError('حداقل یک قلم کالا معتبر باید وارد شود');
      showToast('حداقل یک قلم کالا معتبر باید وارد شود', 'error');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      
      const orderData = {
        shopId: user.shopId,
        visitorName,
        visitorPhone,
        companyName,
        invoiceNumber,
        status,
        items: validItems,
        totalAmount: calculateTotal(),
        notes,
        manualInvoiceUrl,
        orderDate: editingOrderId ? orders.find(o => o.id === editingOrderId)?.orderDate || new Date().toISOString() : new Date().toISOString(),
        deliveryDate: status === 'delivered' ? new Date().toISOString() : null
      };

      if (editingOrderId) {
        await updateDoc(doc(db, 'purchase_orders', editingOrderId), orderData);
        showToast('سفارش با موفقیت ویرایش شد', 'success');
      } else {
        await addDoc(collection(db, 'purchase_orders'), orderData);
        showToast('سفارش جدید با موفقیت ثبت شد', 'success');
      }
      
      handleCloseForm();
      fetchOrders();
    } catch (err: any) {
      setError(translateError(err));
      showToast('خطا در ثبت سفارش', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseForm = () => {
    setVisitorName('');
    setVisitorPhone('');
    setCompanyName('');
    setInvoiceNumber('');
    setStatus('ordered');
    setItems([{ name: '', quantity: 1, purchasePrice: 0 }]);
    setNotes('');
    setManualInvoiceUrl('');
    setIsAdding(false);
    setEditingOrderId(null);
  };

  const handleEdit = (order: PurchaseOrder) => {
    setEditingOrderId(order.id);
    setVisitorName(order.visitorName);
    setVisitorPhone(order.visitorPhone || '');
    setCompanyName(order.companyName || '');
    setInvoiceNumber(order.invoiceNumber || '');
    setStatus(order.status);
    setItems(order.items.length > 0 ? order.items : [{ name: '', quantity: 1, purchasePrice: 0 }]);
    setNotes(order.notes || '');
    setManualInvoiceUrl(order.manualInvoiceUrl || '');
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateStatus = async (orderId: string, currentStatus: string) => {
    try {
      setActionLoading(true);
      const newStatus = currentStatus === 'ordered' ? 'delivered' : 'ordered';
      const updateData: any = { status: newStatus };
      if (newStatus === 'delivered') updateData.deliveryDate = new Date().toISOString();
      
      await updateDoc(doc(db, 'purchase_orders', orderId), updateData);
      
      setOrders(orders.map(o => o.id === orderId ? { ...o, ...updateData } : o));
      showToast('وضعیت سفارش بروزرسانی شد', 'success');
    } catch (err: any) {
      setError(translateError(err));
      showToast('خطا در بروزرسانی وضعیت', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!activeOrderInvoice) return;
    setExportLoading(true);
    try {
      await downloadInvoicePDF('printable-order-invoice', `order_${activeOrderInvoice.id?.slice(-8).toUpperCase()}.pdf`);
      showToast('فایل PDF با موفقیت ذخیره شد');
    } catch (error) {
      console.error("PDF generation failed:", error);
      showToast('خطا در تولید فایل PDF', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!orderToDelete) return;
    try {
      setActionLoading(true);
      await deleteDoc(doc(db, 'purchase_orders', orderToDelete));
      setOrders(orders.filter(o => o.id !== orderToDelete));
      showToast('سفارش با موفقیت حذف شد', 'success');
      setOrderToDelete(null);
    } catch (err: any) {
      setError(translateError(err));
      showToast('خطا در حذف سفارش', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => 
    o.visitorName.includes(searchQuery) || 
    (o.companyName && o.companyName.includes(searchQuery)) ||
    (o.invoiceNumber && o.invoiceNumber.includes(searchQuery))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <PackageSearch className="w-8 h-8 text-blue-600" />
            سفارشات عمده
          </h2>
          <p className="text-gray-500 dark:text-slate-400 mt-1">ثبت و مدیریت سفارشات و اجناس تحویل گرفته</p>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} className="h-12 px-6 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
            <Plus className="w-5 h-5" />
            ثبت سفارش جدید
          </Button>
        )}
      </div>

      {error && (
         <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center gap-3">
           <X className="w-5 h-5" />
           <p className="font-medium text-sm">{error}</p>
         </div>
      )}

      {isAdding ? (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
            <h3 className="text-lg font-black text-gray-900 dark:text-white">جزئیات سفارش / فاکتور</h3>
            <button type="button" onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600 p-2"><X className="w-5 h-5" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <TextField label="نام ویزیتور / شخص تحویل‌دهنده" value={visitorName} onChange={(e:any) => setVisitorName(e.target.value)} required />
            <TextField label="شماره تماس ویزیتور (اختیاری)" value={visitorPhone} onChange={(e:any) => setVisitorPhone(e.target.value)} dir="ltr" />
            <TextField label="نام شرکت / پخش (اختیاری)" value={companyName} onChange={(e:any) => setCompanyName(e.target.value)} />
            <TextField label="شماره فاکتور (اختیاری)" value={invoiceNumber} onChange={(e:any) => setInvoiceNumber(e.target.value)} dir="ltr" />
          </div>

          <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl">
            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-3">وضعیت سفارش</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={status === 'ordered'} onChange={() => setStatus('ordered')} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm font-medium dark:text-slate-300">سفارش داده شده (پیش‌فاکتور)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={status === 'delivered'} onChange={() => setStatus('delivered')} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm font-medium dark:text-slate-300">تحویل گرفته شده (فاکتور قطعی)</span>
              </label>
            </div>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20">
            <label className="block text-sm font-black text-blue-700 dark:text-blue-400 mb-3">تصویر فاکتور دستی (نوشته شده توسط ویزیتور)</label>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative group">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploading(true);
                    try {
                      // Simulating upload for now as we don't have separate storage bucket logic here but we can store as base64 for simplicity in this app or real URL if storage is setup.
                      // For a real production app, we'd use Firebase Storage.
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setManualInvoiceUrl(reader.result as string);
                        setUploading(false);
                      };
                      reader.readAsDataURL(file);
                    } catch (err) {
                      showToast('خطا در بارگذاری تصویر', 'error');
                      setUploading(false);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <div className="h-14 px-6 rounded-xl bg-white dark:bg-slate-800 border-2 border-dashed border-blue-200 dark:border-blue-800 flex items-center gap-3 text-blue-600 font-bold group-hover:bg-blue-50 transition-all">
                  {uploading ? <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent animate-spin rounded-full" /> : <Upload className="w-5 h-5" />}
                  {manualInvoiceUrl ? 'تغییر تصویر فاکتور' : 'بارگذاری تصویر فاکتور'}
                </div>
              </div>
              {manualInvoiceUrl && (
                <div className="flex items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded-xl border border-blue-100 dark:border-blue-800">
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-100">
                    <img src={manualInvoiceUrl} alt="Manual Invoice" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs font-bold text-gray-500">فاکتور بارگذاری شد</span>
                  <button type="button" onClick={() => setManualInvoiceUrl('')} className="p-1.5 bg-rose-50 text-rose-600 rounded-lg"><X className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">اجناس فاکتور</h4>
            {items.map((item, idx) => (
              <div key={idx} className="flex flex-col md:flex-row gap-3 relative p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl items-end">
                <div className="flex-1 min-w-[200px] w-full">
                  <TextField label="نام کالا" value={item.name} onChange={(e:any) => handleItemChange(idx, 'name', e.target.value)} />
                </div>
                <div className="w-full md:w-32">
                  <TextField 
                    label="تعداد / مقدار" 
                    type="text" 
                    inputMode="decimal"
                    value={qtyInputs[idx] ?? item.quantity.toString()} 
                    onChange={(e:any) => {
                      const val = e.target.value;
                      setQtyInputs(prev => ({ ...prev, [idx]: val }));
                      if (val === '' || val === '.') {
                        handleItemChange(idx, 'quantity', 0);
                        return;
                      }
                      const num = parseFloat(val);
                      if (!isNaN(num)) {
                        handleItemChange(idx, 'quantity', num);
                      }
                    }} 
                    onBlur={() => {
                      setQtyInputs(prev => {
                        const next = { ...prev };
                        delete next[idx];
                        return next;
                      });
                    }}
                    dir="ltr" 
                  />
                </div>
                <div className="w-full md:w-48">
                  <TextField 
                    label="قیمت خرید کل (تومان)" 
                    type="text" 
                    inputMode="decimal"
                    value={priceInputs[idx] ?? item.purchasePrice.toString()} 
                    onChange={(e:any) => {
                      const val = e.target.value;
                      setPriceInputs(prev => ({ ...prev, [idx]: val }));
                      if (val === '' || val === '.') {
                        handleItemChange(idx, 'purchasePrice', 0);
                        return;
                      }
                      const num = parseFloat(val);
                      if (!isNaN(num)) {
                        handleItemChange(idx, 'purchasePrice', num);
                      }
                    }} 
                    onBlur={() => {
                      setPriceInputs(prev => {
                        const next = { ...prev };
                        delete next[idx];
                        return next;
                      });
                    }}
                    dir="ltr" 
                  />
                </div>
                <button type="button" onClick={() => handleRemoveItem(idx)} className="h-12 px-4 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mb-1 hover:bg-rose-200 w-full md:w-auto">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
            <Button type="button" onClick={handleAddItem} variant="ghost" className="text-blue-600 font-bold flex items-center gap-2">
              <Plus className="w-4 h-4" /> افزودن کالا
            </Button>
          </div>

          <div className="flex justify-between items-center py-4 border-t border-gray-100 dark:border-slate-800">
             <span className="text-gray-500 font-medium">جمع کل فاکتور:</span>
             <span className="text-2xl font-black font-mono text-blue-600 tabular-nums">{calculateTotal().toLocaleString('fa-IR')} <span className="text-sm">تومان</span></span>
          </div>

          <div className="flex gap-4">
            <Button type="submit" loading={actionLoading} className="flex-1 h-14 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white">
              ثبت نهایی سفارش
            </Button>
            <Button type="button" onClick={() => setIsAdding(false)} variant="ghost" className="px-8 h-14 rounded-xl font-bold">انصراف</Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="جستجو به نام ویزیتور، شرکت یا شماره فاکتور..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pr-12 pl-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 outline-none text-sm font-medium transition-all"
            />
          </div>

          {loading ? (
             <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" /></div>
          ) : filteredOrders.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredOrders.map(order => (
                <div key={order.id} className="bg-white dark:bg-slate-900 rounded-[24px] p-6 border border-gray-100 dark:border-slate-800 shadow-sm relative group overflow-hidden">
                   <div className={`absolute top-0 right-0 w-2 h-full ${order.status === 'delivered' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                   
                   <div className="flex justify-between items-start mb-4 pr-4">
                     <div>
                       <h3 className="font-black text-gray-900 dark:text-white text-lg">{order.visitorName}</h3>
                       <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{order.companyName || 'شرکت ثبت نشده'}</p>
                     </div>
                     <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${order.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                       {order.status === 'delivered' ? 'تحویل گرفته شده' : 'پیش‌فاکتور (در مسیر)'}
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4 pr-4 mb-4">
                     <div>
                       <span className="block text-xs font-bold text-gray-400 mb-1">شماره فاکتور</span>
                       <span className="font-mono text-sm dark:text-slate-300">{order.invoiceNumber || '-'}</span>
                     </div>
                     <div>
                       <span className="block text-xs font-bold text-gray-400 mb-1">تاریخ سفارش</span>
                       <span className="font-mono text-sm dark:text-slate-300">{new Date(order.orderDate).toLocaleDateString('fa-IR')}</span>
                     </div>
                   </div>

                   <div className="pr-4 mb-4">
                      <span className="block text-xs font-bold text-gray-400 mb-2">اجناس فاکتور</span>
                      <div className="space-y-1">
                        {order.items.slice(0, 3).map((item, idx) => (
                           <div key={idx} className="flex justify-between items-center text-sm p-2 bg-gray-50 dark:bg-slate-800/30 rounded-xl">
                              <span className="dark:text-slate-300">{item.name}</span>
                              <div className="flex gap-4">
                                <span className="font-mono text-gray-500">{item.quantity} عدد</span>
                                <span className="font-mono font-bold dark:text-slate-200">{item.purchasePrice.toLocaleString('fa-IR')}</span>
                              </div>
                           </div>
                        ))}
                        {order.items.length > 3 && (
                           <div className="text-center text-xs text-gray-400 pt-1">و {order.items.length - 3} قلم دیگر...</div>
                        )}
                      </div>
                   </div>

                   <div className="flex justify-between items-center pt-4 pr-4 border-t border-gray-100 dark:border-slate-800">
                     <div>
                       <span className="block text-xs font-bold text-gray-400">جمع فاکتور</span>
                       <span className="font-mono font-black text-blue-600 text-lg">{order.totalAmount.toLocaleString('fa-IR')} <span className="text-xs">تومان</span></span>
                     </div>
                     <div className="flex gap-2">
                       {order.manualInvoiceUrl && (
                          <button onClick={() => window.open(order.manualInvoiceUrl, '_blank')} className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-colors" title="نمایش فاکتور دستی">
                            <ImageIcon className="w-5 h-5" />
                          </button>
                        )}
                        <button onClick={() => setActiveOrderInvoice(order)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors" title="چاپ فاکتور">
                         <Printer className="w-5 h-5" />
                       </button>
                       <button onClick={() => handleEdit(order)} className="p-2 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-slate-800 dark:text-slate-300 rounded-xl transition-colors" title="ویرایش">
                         <Edit2 className="w-5 h-5" />
                       </button>
                       <button onClick={() => handleUpdateStatus(order.id, order.status)} className={`p-2 rounded-xl transition-colors ${order.status === 'delivered' ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`} title={order.status === 'delivered' ? 'تغییر به پیش فاکتور' : 'تایید تحویل کالا'}>
                         {order.status === 'delivered' ? <Clock className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                       </button>
                       <button onClick={() => setOrderToDelete(order.id)} className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition-colors" title="حذف">
                         <Trash2 className="w-5 h-5" />
                       </button>
                     </div>
                   </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[32px] border border-gray-100 dark:border-slate-800">
              <PackageSearch className="w-16 h-16 text-gray-200 dark:text-slate-700 mx-auto mb-4" />
              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">سفارشی یافت نشد</h3>
              <p className="text-gray-500 dark:text-slate-400 text-sm max-w-sm mx-auto">هیچ فاکتور خریدی ثبت نکرده‌اید. با کلیک روی دکمه ثبت سفارش جدید، فاکتورهای عمده خود را اضافه کنید.</p>
            </div>
          )}
        </div>
      )}

      {/* Printable Order Invoice Modal */}
      <AnimatePresence>
        {activeOrderInvoice && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setActiveOrderInvoice(null)} 
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-xl" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 15 }} 
              className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[32px] w-full max-w-2xl shadow-2xl relative z-10 p-8 custom-scrollbar max-h-[90vh] overflow-y-auto"
            >
              <div id="printable-order-invoice" className="space-y-6 text-right" dir="rtl">
                <div className="flex justify-between items-start border-b border-gray-100 dark:border-slate-800 pb-5">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                      سفارش عمده / فاکتور خرید
                    </span>
                    <h3 className="text-xl font-black text-gray-950 dark:text-white">فاکتور خرید کالا</h3>
                    <p className="text-xs text-gray-400 font-bold">ویزیتور: {activeOrderInvoice.visitorName}</p>
                  </div>
                  <div className="text-left font-mono tabular-nums text-xs text-gray-500 space-y-1" dir="ltr">
                    <div><strong className="text-gray-400">Order ID:</strong> #{activeOrderInvoice.id?.slice(-8).toUpperCase()}</div>
                    <div><strong className="text-gray-400">Date:</strong> {new Date(activeOrderInvoice.orderDate).toLocaleDateString('fa-IR')}</div>
                    <div><strong className="text-gray-400">Status:</strong> {activeOrderInvoice.status === 'delivered' ? 'Delivered' : 'Ordered'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-gray-100 dark:border-slate-800/60 text-xs">
                  <div className="space-y-2">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">تأمین‌کننده / پخش</p>
                    <div className="space-y-1 font-bold text-gray-800 dark:text-slate-300">
                      <p className="font-black text-gray-900 dark:text-white">{activeOrderInvoice.companyName || '-'}</p>
                      <p>ویزیتور: {activeOrderInvoice.visitorName}</p>
                      <p>تلفن: {activeOrderInvoice.visitorPhone || '-'}</p>
                    </div>
                  </div>
                  <div className="space-y-2 border-r border-gray-100 dark:border-slate-800 pr-4">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">گیرنده (فروشگاه)</p>
                    <div className="space-y-1 font-bold text-gray-800 dark:text-slate-300">
                      <p className="font-black text-gray-900 dark:text-white">فروشگاه صندوق‌دار</p>
                      <p>شماره فاکتور: {activeOrderInvoice.invoiceNumber || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden border border-gray-100 dark:border-slate-800 rounded-2xl">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-gray-50/50 dark:bg-slate-800/20 border-b border-gray-100 dark:border-slate-800 text-gray-500 font-black">
                        <th className="p-3 text-right">نام کالا</th>
                        <th className="p-3 text-center">تعداد</th>
                        <th className="p-3 text-left">قیمت خرید (تومان)</th>
                        <th className="p-3 text-left">جمع کل (تومان)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-800/10">
                      {activeOrderInvoice.items.map((item, idx) => (
                        <tr key={idx} className="text-gray-700 dark:text-slate-300">
                          <td className="p-3 font-bold">{item.name}</td>
                          <td className="p-3 text-center font-mono tabular-nums">{item.quantity.toLocaleString('fa-IR')}</td>
                          <td className="p-3 text-left font-mono tabular-nums">{item.purchasePrice.toLocaleString('fa-IR')}</td>
                          <td className="p-3 text-left font-mono text-blue-600 dark:text-blue-400 tabular-nums">{(item.purchasePrice * item.quantity).toLocaleString('fa-IR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-500/5 p-6 rounded-[24px] border border-blue-100 dark:border-blue-500/10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center">
                       <FileText className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">مبلغ نهایی فاکتور</p>
                      <p className="text-3xl font-black text-blue-600 dark:text-blue-400 font-mono tracking-tighter">{activeOrderInvoice.totalAmount.toLocaleString('fa-IR')} <span className="text-xs">تومان</span></p>
                    </div>
                  </div>
                  <div className="text-left font-black text-[10px] text-gray-400 uppercase tracking-widest">
                    {activeOrderInvoice.status === 'delivered' ? 'PAID & RECEIVED' : 'ORDERED'}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button 
                   onClick={() => directPrintElement('printable-order-invoice')}
                   className="flex-1 h-14 rounded-2xl font-black text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-500/10 flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" /> چاپ فاکتور
                </Button>
                <Button 
                   onClick={handleDownloadPDF} 
                   disabled={exportLoading}
                   className="flex-1 h-14 rounded-2xl font-black text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/10 flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" /> {exportLoading ? 'در حال تهیه PDF...' : 'ذخیره PDF'}
                </Button>
                <Button variant="ghost" onClick={() => setActiveOrderInvoice(null)} className="h-14 rounded-2xl px-6 font-black text-xs uppercase text-gray-500">لغو</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {orderToDelete && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setOrderToDelete(null)} 
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 10 }} 
              className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[32px] w-full max-w-sm shadow-2xl relative z-10 p-8 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">تایید حذف سفارش</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 font-medium mb-8 leading-loose">
                آیا از حذف این فاکتور خرید اطمینان دارید؟ این عملیات غیرقابل بازگشت است.
              </p>
              <div className="flex gap-4">
                <Button 
                  onClick={handleDelete}
                  loading={actionLoading}
                  className="flex-1 h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  حذف شود
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setOrderToDelete(null)} 
                  className="flex-1 h-12 rounded-xl border border-gray-100 dark:border-slate-800 font-bold"
                >
                  انصراف
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
