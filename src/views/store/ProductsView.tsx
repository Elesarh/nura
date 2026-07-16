import { translateError } from '../../lib/errorTranslator';
import { useState, useEffect, ReactNode, FormEvent } from 'react';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, logEvent } from '../../firebase';
import { User, Product, Category } from '../../types';
import { Card, DataTable, LoadingWidget, ErrorWidget, Button, TextField } from '../../components';
import { useToast } from '../../ToastContext';
import { Tag, Plus, X, List, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductsView({ user }: { user: User }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isAdding, setIsAdding] = useState(false);
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ category: '' });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryLoading, setCategoryLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetchData();
  }, [user.shopId]);

  const fetchData = async () => {
    if (!user.shopId) return;
    setLoading(true);
    try {
      const prodQ = query(collection(db, "products"), where("shopId", "==", user.shopId));
      const catQ = query(collection(db, "categories"), where("shopId", "==", user.shopId));
      
      const [prodSnap, catSnap] = await Promise.all([getDocs(prodQ), getDocs(catQ)]);
      
      setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      setCategories(catSnap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
    } catch (err: any) {
      setError(translateError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault();
    if (!user.shopId) return;
    try {
      if (editingProduct) {
        const prodRef = doc(db, "products", editingProduct.id);
        await updateDoc(prodRef, {
          barcode: newProduct.barcode || '',
          name: newProduct.name || '',
          category: newProduct.category || '',
          unit: newProduct.unit || 'عدد',
          salePrice: Number(newProduct.salePrice),
          purchasePrice: Number(newProduct.purchasePrice || 0),
          quantity: Number(newProduct.quantity),
          minimumStock: Number(newProduct.minimumStock || 0),
        });
        setEditingProduct(null);
      } else {
        const p = {
          ...newProduct,
          shopId: user.shopId,
          unit: newProduct.unit || 'عدد',
          createdAt: new Date().toISOString(),
          purchasePrice: newProduct.purchasePrice || 0,
          minimumStock: newProduct.minimumStock || 0,
        };
        await addDoc(collection(db, "products"), p);
      }
      showToast(editingProduct ? 'محصول با موفقیت بروزرسانی شد' : 'محصول جدید با موفقیت ثبت شد');
      logEvent({
        type: 'shop',
        shopId: user.shopId!,
        userId: user.id,
        userEmail: user.email,
        action: editingProduct ? 'ویرایش محصول' : 'تعریف محصول جدید',
        details: `محصول: ${newProduct.name}`
      });
      setIsAdding(false);
      setNewProduct({ category: '' });
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!user.shopId || !newCategoryName.trim()) return;
    setCategoryLoading(true);
    try {
      await addDoc(collection(db, "categories"), {
        shopId: user.shopId,
        name: newCategoryName.trim(),
        createdAt: new Date().toISOString()
      });
      showToast('دسته‌بندی جدید اضافه شد');
      setNewCategoryName('');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteDoc(doc(db, "categories", id));
      showToast('دسته‌بندی حذف شد', 'info');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('آیا از حذف این محصول اطمینان دارید؟')) return;
    try {
      await deleteDoc(doc(db, "products", id));
      showToast('محصول از انبار حذف شد', 'info');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const columns = [
    { header: 'بارکد', accessor: 'barcode' },
    { header: 'نام',accessor: 'name' },
    { header: 'دسته‌بندی', cell: (r:Product) => (
      <span className="px-2 py-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-md text-xs font-bold">
        {r.category || 'بدون دسته'}
      </span>
    )},
    { header: 'قیمت فروش', cell: (r:Product) => (
      <div className="flex flex-col items-center">
        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{r.salePrice.toLocaleString()} تومان</span>
        {r.purchasePrice > 0 && <span className="text-[9px] text-gray-400">خرید: {r.purchasePrice.toLocaleString()}</span>}
      </div>
    )},
    { header: 'موجودی', cell: (r:Product) => (
      <div className="flex flex-col items-center">
        <span className={`font-bold ${r.quantity <= r.minimumStock ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-gray-100'}`}>
          {r.quantity}
        </span>
        <span className="text-[9px] text-gray-400">{r.unit || 'عدد'}</span>
      </div>
    )},
    { header: 'عملیات', cell: (r:Product) => (
      <div className="flex gap-1 justify-center">
        <Button variant="outline" className="p-2 rounded-lg" onClick={() => handleEdit(r)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
        </Button>
        <Button variant="danger" className="p-2 rounded-lg" onClick={(e) => { e.stopPropagation(); handleDeleteProduct(r.id); }}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    ) }
  ];

  const handleEdit = (p: Product) => {
    setNewProduct({ ...p });
    setEditingProduct(p);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading && products.length === 0) return <LoadingWidget />;

  return (
    <div className="space-y-10 max-w-7xl mx-auto px-4 pb-20" dir="rtl">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-white dark:bg-[#1e293b] p-8 rounded-[40px] shadow-2xl shadow-blue-500/5 border border-gray-100 dark:border-slate-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] -mr-32 -mt-32" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 border border-emerald-100 dark:border-emerald-500/20">
              <Package className="w-3 h-3" />
              Inventory Control
            </div>
            <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">مدیریت هوشمند انبار</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 font-medium max-w-md leading-relaxed">
              سامانه کنترل موجودی، دسته‌بندی کالاها و مدیریت زنجیره تامین در سطح واحد.
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsManagingCategories(!isManagingCategories)} className="h-12 px-6 rounded-2xl border-2 border-gray-100 dark:border-slate-800 font-black text-xs flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">
              <List className="w-4 h-4" />
              {isManagingCategories ? 'بستن دسته‌ها' : 'مدیریت دسته‌ها'}
            </Button>
            <Button onClick={() => { setIsAdding(!isAdding); if (isAdding) { setEditingProduct(null); setNewProduct({ category: '' }); } }} className="h-12 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 font-black text-xs flex items-center gap-2 transition-all">
              <Plus className="w-4 h-4" />
              {isAdding ? 'انصراف' : 'افزودن کالا'}
            </Button>
          </div>
        </div>
      </div>

      {error && <ErrorWidget message={error} />}

      <AnimatePresence>
        {isManagingCategories && (
          <motion.div key="category-manager" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Card className="p-8 rounded-[32px] border border-blue-100/50 dark:border-blue-900/20 bg-blue-50/20 dark:bg-blue-500/5 backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-8">
                 <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                 <h3 className="text-xl font-black text-gray-900 dark:text-white">کلاس‌بندی و گروه‌های کالا</h3>
              </div>
              
              <form onSubmit={handleAddCategory} className="flex gap-4 mb-10 max-w-2xl">
                <div className="flex-1">
                  <TextField 
                    placeholder="عنوان گروه جدید (مثلا: لبنیات و پروتئین)" 
                    value={newCategoryName} 
                    onChange={(e:any) => setNewCategoryName(e.target.value)} 
                    className="h-12"
                  />
                </div>
                <Button type="submit" disabled={categoryLoading || !newCategoryName.trim()} className="h-12 px-8 rounded-xl bg-blue-600 shadow-lg shadow-blue-500/20">
                  {categoryLoading ? '...' : 'تایید'}
                </Button>
              </form>

              <div className="flex flex-wrap gap-3">
                {categories.map(cat => (
                  <div key={cat.id} className="group relative flex items-center gap-3 px-5 py-2.5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl text-xs font-black text-gray-700 dark:text-slate-300 shadow-sm hover:shadow-md transition-all">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    {cat.name}
                    <button onClick={() => handleDeleteCategory(cat.id)} className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 transition-all ml-1 bg-rose-50 dark:bg-rose-500/10 p-1 rounded-md">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {categories.length === 0 && (
                  <div className="w-full py-10 text-center border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-3xl">
                     <p className="text-xs text-gray-400 font-bold uppercase tracking-widest italic leading-none">No active categories defined</p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {isAdding && (
          <motion.div key="product-form" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
            <Card className="p-8 rounded-[40px] shadow-2xl border border-emerald-100 dark:border-emerald-900/20 bg-white dark:bg-[#1e293b] relative overflow-hidden">
               <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/5 blur-3xl -ml-16 -mt-16" />
               
               <div className="flex items-center gap-3 mb-10">
                 <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                 <h3 className="text-xl font-black text-gray-900 dark:text-white">
                  {editingProduct ? 'بروزرسانی پارامترهای کالا' : 'پیکربندی اولیه محصول جدید'}
                </h3>
              </div>

              <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-12 gap-8">
                <div className="md:col-span-4">
                  <TextField label="کد اختصاصی / بارکد" value={newProduct.barcode || ''} onChange={(e:any)=>setNewProduct({...newProduct, barcode: e.target.value})} placeholder="Identifier Code" />
                </div>
                <div className="md:col-span-8">
                  <TextField label="عنوان عمومی کالا" value={newProduct.name || ''} onChange={(e:any)=>setNewProduct({...newProduct, name: e.target.value})} placeholder="Product Label Name" required/>
                </div>
                
                <div className="md:col-span-4">
                  <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">کلاس محصول (دسته)</label>
                  <select 
                    value={newProduct.category || ''} 
                    onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                    className="w-full h-14 px-5 bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 rounded-2xl text-xs font-black focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-800 dark:text-slate-200 transition-all cursor-pointer"
                  >
                    <option value="">انتخاب از لیست...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-4">
                  <TextField label="ارزش فروش نهایی (تومان)" type="number" value={newProduct.salePrice || ''} onChange={(e:any)=>setNewProduct({...newProduct, salePrice: Number(e.target.value)})} required/>
                </div>
                <div className="md:col-span-4">
                  <TextField label="بهای تمام‌شده خرید" type="number" value={newProduct.purchasePrice || ''} onChange={(e:any)=>setNewProduct({...newProduct, purchasePrice: Number(e.target.value)})} />
                </div>
                
                <div className="md:col-span-4">
                  <TextField label="میزان موجودی فعلی" type="number" step="0.01" value={newProduct.quantity || ''} onChange={(e:any)=>setNewProduct({...newProduct, quantity: Number(e.target.value)})} required/>
                </div>
                <div className="md:col-span-4">
                  <TextField label="کف موجودی (نقطه سفارش)" type="number" step="0.01" value={newProduct.minimumStock || ''} onChange={(e:any)=>setNewProduct({...newProduct, minimumStock: Number(e.target.value)})} />
                </div>
                
                <div className="md:col-span-4">
                  <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">واحد اندازه‌گیری</label>
                  <select 
                    value={newProduct.unit || 'عدد'} 
                    onChange={(e) => setNewProduct({...newProduct, unit: e.target.value})}
                    className="w-full h-14 px-5 bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 rounded-2xl text-xs font-black focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-800 dark:text-slate-200 transition-all cursor-pointer"
                  >
                    <option value="عدد">عدد</option>
                    <option value="کیلوگرم">کیلوگرم (KG)</option>
                    <option value="گرم">گرم (G)</option>
                    <option value="لیتر">لیتر (L)</option>
                    <option value="بسته">بسته (Box)</option>
                    <option value="کارتن">کارتن (Case)</option>
                    <option value="شات">شات (Shot)</option>
                  </select>
                </div>
                
                <div className="col-span-full pt-10 border-t border-gray-50 dark:border-slate-800/50 flex justify-end gap-4">
                  <Button variant="ghost" type="button" className="h-14 px-10 rounded-2xl text-xs font-black uppercase tracking-widest" onClick={() => { setEditingProduct(null); setIsAdding(false); setNewProduct({ category: '' }); }}>لغو و خروج</Button>
                  <Button type="submit" className="h-14 px-14 rounded-2xl bg-emerald-600 shadow-xl shadow-emerald-500/20 text-sm font-black">
                     {editingProduct ? 'بروزرسانی نهایی' : 'ثبت قطعی در دیتابیس'}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="rounded-[40px] border border-gray-100 dark:border-slate-800 bg-white dark:bg-[#1e293b] shadow-2xl shadow-gray-200/20 dark:shadow-none overflow-hidden">
        <DataTable columns={columns} data={products} />
      </Card>
    </div>
  );
}

const Trash2 = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
);
