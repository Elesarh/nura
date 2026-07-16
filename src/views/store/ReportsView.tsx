import { translateError } from '../../lib/errorTranslator';
import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { User, Sale, Debt, Customer } from '../../types';
import { Card, LoadingWidget, ErrorWidget, Button } from '../../components';
import { TrendingUp, Download, PieChart as PieChartIcon, FileText, BarChart3, Wallet, ShoppingBag, Calendar, Filter, LineChart as LineIcon, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell, PieChart, Pie, Area } from 'recharts';
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type TimeFilter = 'all' | 'month' | 'quarter' | 'custom';

export default function ReportsView({ user }: { user: User }) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [customRange, setCustomRange] = useState<{start: Date | null, end: Date | null}>({ start: null, end: null });
  const [trendChartType, setTrendChartType] = useState<'line' | 'bar'>('line');
  const [paymentChartType, setPaymentChartType] = useState<'line' | 'bar'>('bar');
  const [debtChartType, setDebtChartType] = useState<'line' | 'bar'>('bar');

  useEffect(() => {
    const fetchData = async () => {
      if (!user.shopId) return;
      setLoading(true);
      try {
        let sq = query(collection(db, "sales"), where("shopId", "==", user.shopId), orderBy("createdAt", "desc"));
        
        if (timeFilter !== 'all') {
          let startDate: Date;
          let endDate = new Date();

          if (timeFilter === 'month') {
            startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 1);
          } else if (timeFilter === 'quarter') {
            startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 3);
          } else {
            startDate = customRange.start ? customRange.start : new Date(0);
            endDate = customRange.end ? customRange.end : new Date();
          }

          sq = query(
            collection(db, "sales"), 
            where("shopId", "==", user.shopId),
            where("createdAt", ">=", startDate.toISOString()),
            where("createdAt", "<=", endDate.toISOString()),
            orderBy("createdAt", "desc")
          );
        } else {
           sq = query(sq, limit(2000));
        }

        const sSnap = await getDocs(sq);
        setSales(sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Sale)));

        const dq = query(collection(db, "debts"), where("shopId", "==", user.shopId));
        const dSnap = await getDocs(dq);
        setDebts(dSnap.docs.map(d => ({ id: d.id, ...d.data() } as Debt)));

        const cq = query(collection(db, "customers"), where("shopId", "==", user.shopId));
        const cSnap = await getDocs(cq);
        setCustomers(cSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
      } catch (err: any) {
        console.error("Fetch reports error:", err);
        setError(translateError(err));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user.shopId, timeFilter, customRange]);

  // Aggregate sales by date for the trend chart
  const trendData = useMemo(() => {
    const groups: { [key: string]: number } = {};
    
    // Determine grouping format based on time filter
    const isLongRange = timeFilter === 'all' || timeFilter === 'quarter';
    
    sales.forEach(s => {
      const dateObj = new Date(s.createdAt);
      let dateKey: string;
      
      if (isLongRange) {
        // Group by month for long ranges
        dateKey = dateObj.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long' });
      } else {
        // Group by day for shorter ranges
        dateKey = dateObj.toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' });
      }
      
      groups[dateKey] = (groups[dateKey] || 0) + s.totalAmount;
    });

    return Object.entries(groups)
      .map(([name, amount]) => ({ name, amount }))
      .reverse(); // Show chronological order
  }, [sales, timeFilter]);

  if (loading) return <LoadingWidget />;
  if (error) return <ErrorWidget message={error} />;

  const handleExportPDF = () => {
    // Note: Farsi/Arabic support in jsPDF is limited without a custom font file (.ttf).
    // For a professional experience, we recommend using the browser's Print function (Ctrl+P) 
    // or exporting to Excel for data processing.
    const doc = new jsPDF('p', 'pt');
    
    doc.setFontSize(18);
    doc.text('Sales Report', 40, 40);
    
    const tableData = sales.slice(0, 50).map(s => [
      new Date(s.createdAt).toLocaleDateString('en-US'),
      s.paymentType,
      s.totalAmount.toLocaleString(),
      s.id.slice(-6)
    ]);

    autoTable(doc, {
      startY: 60,
      head: [['Date', 'Type', 'Amount', 'ID']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save('shop-report.pdf');
  };

  const handleExportExcel = () => {
    const data = sales.map(s => ({
      'شناسه': s.id,
      'تاریخ': new Date(s.createdAt).toLocaleString('fa-IR'),
      'نوع پرداخت': s.paymentType === 'Cash' ? 'نقدی' : s.paymentType === 'Card' ? 'کارت به کارت' : 'نسیه',
      'مبلغ کل': s.totalAmount,
      'تخفیف': s.discount,
      'تعداد کالا': s.items?.length || 0
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales");
    XLSX.writeFile(wb, "sales-report.xlsx");
  };

  // Chart Data: Sales by payment type
  const paymentTypeData = [
    { name: 'نقدی', value: sales.filter(s => s.paymentType === 'Cash').reduce((acc, s) => acc + s.totalAmount, 0) },
    { name: 'کارت به کارت', value: sales.filter(s => s.paymentType === 'Card').reduce((acc, s) => acc + s.totalAmount, 0) },
    { name: 'نسیه', value: sales.filter(s => s.paymentType === 'Debt').reduce((acc, s) => acc + s.totalAmount, 0) },
  ].filter(d => d.value > 0);

  const COLORS = ['#3b82f6', '#818cf8', '#f43f5e'];

  // Chart Data: Top Customers by Debt
  const topDebtors = customers
    .filter(c => (c.totalDebt || 0) > 0)
    .sort((a, b) => (b.totalDebt || 0) - (a.totalDebt || 0))
    .slice(0, 8)
    .map(c => ({ name: c.fullName, amount: c.totalDebt }));

  return (
    <div className="space-y-8 max-w-7xl mx-auto" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white">گزارش‌های مالی</h2>
          <p className="text-gray-500 dark:text-slate-400 mt-1">تحلیل جامع فروش، بدهی‌ها و تراکنش‌ها</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Button variant="outline" onClick={handleExportPDF} className="flex-1 md:flex-none h-11 px-4 rounded-xl flex items-center justify-center gap-2 font-black border-gray-200 dark:border-slate-800">
            <FileText className="w-4 h-4 text-rose-500" />
            PDF
          </Button>
          <Button variant="outline" onClick={handleExportExcel} className="flex-1 md:flex-none h-11 px-4 rounded-xl flex items-center justify-center gap-2 font-black border-gray-200 dark:border-slate-800">
            <Download className="w-4 h-4 text-emerald-500" />
            Excel
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {timeFilter === 'custom' && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-blue-100 dark:border-blue-900/30 flex flex-wrap gap-8 items-end"
          >
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">بازه زمانی شمسی (شروع - پایان)</label>
              <DatePicker
                range
                value={customRange.start && customRange.end ? [customRange.start, customRange.end] : []}
                onChange={(dateObjects: any) => {
                  if (Array.isArray(dateObjects) && dateObjects.length === 2) {
                    setCustomRange({
                      start: dateObjects[0].toDate(),
                      end: dateObjects[1].toDate()
                    });
                  }
                }}
                calendar={persian}
                locale={persian_fa}
                calendarPosition="bottom-right"
                inputClass="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                containerClassName="w-full"
              />
            </div>
            <Button variant="ghost" onClick={() => setTimeFilter('all')} className="h-11 px-4 rounded-xl text-gray-400">لغو فیلتر</Button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 relative overflow-hidden group border-none bg-white dark:bg-slate-900 shadow-xl shadow-blue-500/5">
           <div className="absolute -bottom-6 -right-6 p-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
              <TrendingUp className="w-32 h-32 text-blue-600" />
           </div>
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">فروش کل (بازه فعلی)</p>
           <p className="text-3xl font-black text-blue-600 font-mono tracking-tighter">{sales.reduce((acc,s)=>acc+s.totalAmount,0).toLocaleString()} <span className="text-xs font-bold">تومان</span></p>
           <div className="mt-4 pt-4 border-t border-gray-50 dark:border-slate-800/50 flex justify-between items-center text-[10px] font-bold text-gray-500">
             <span>تعداد فاکتورها:</span>
             <span className="text-blue-600">{sales.length}</span>
           </div>
        </Card>

        <Card className="p-6 relative overflow-hidden group border-none bg-white dark:bg-slate-900 shadow-xl shadow-rose-500/5">
           <div className="absolute -bottom-6 -right-6 p-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
              <Wallet className="w-32 h-32 text-rose-600" />
           </div>
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">مجموع مطالبات کل</p>
           <p className="text-3xl font-black text-rose-600 font-mono tracking-tighter">{debts.reduce((acc,d)=>acc+d.remainingAmount,0).toLocaleString()} <span className="text-xs font-bold">تومان</span></p>
           <div className="mt-4 pt-4 border-t border-gray-50 dark:border-slate-800/50 flex justify-between items-center text-[10px] font-bold text-gray-500">
             <span>پرونده‌های فعال:</span>
             <span className="text-rose-600">{debts.filter(d => d.remainingAmount > 0).length}</span>
           </div>
        </Card>

        <Card className="p-6 relative overflow-hidden group border-none bg-white dark:bg-slate-900 shadow-xl shadow-emerald-500/5">
           <div className="absolute -bottom-6 -right-6 p-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
              <ShoppingBag className="w-32 h-32 text-emerald-600" />
           </div>
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">میانگین خرید در بازه</p>
           <p className="text-3xl font-black text-emerald-600 font-mono tracking-tighter">
             {sales.length > 0 ? (sales.reduce((acc,s)=>acc+s.totalAmount,0) / sales.length).toFixed(0).toLocaleString() : 0} <span className="text-xs font-bold">تومان</span>
           </p>
           <div className="mt-4 pt-4 border-t border-gray-50 dark:border-slate-800/50 flex justify-between items-center text-[10px] font-bold text-gray-500">
             <span>فروش به {new Set(sales.map(s => s.customerId)).size} مشتری مجزا</span>
           </div>
        </Card>
      </div>

      {/* Main Trend Chart */}
      <Card className="p-8 border-none bg-white dark:bg-slate-900 shadow-xl rounded-[40px] relative overflow-hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10 relative z-10">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-[20px] flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-500" />
             </div>
             <div>
                <h3 className="text-xl font-black">روند تغییرات فروش</h3>
                <p className="text-xs text-gray-400 font-bold">نمودار زمانی عملکرد فروشگاه در بازه فعلی</p>
             </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            <div className="flex bg-gray-50 dark:bg-slate-800/50 p-1 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
              {(['all', 'month', 'quarter', 'custom'] as TimeFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setTimeFilter(f)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${
                    timeFilter === f 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                      : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {f === 'all' ? 'همه زمان‌ها' : f === 'month' ? 'ماه اخیر' : f === 'quarter' ? 'سه ماه اخیر' : 'بازه دلخواه'}
                </button>
              ))}
            </div>

            <div className="flex bg-gray-50 dark:bg-slate-800/50 p-1 rounded-2xl border border-gray-100 dark:border-slate-800">
               <button 
                  onClick={() => setTrendChartType('line')}
                  className={`p-2 px-4 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 ${trendChartType === 'line' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-gray-400'}`}
               >
                  <LineIcon className="w-3 h-3" />
                  خطی
               </button>
               <button 
                  onClick={() => setTrendChartType('bar')}
                  className={`p-2 px-4 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 ${trendChartType === 'bar' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-gray-400'}`}
               >
                  <LayoutGrid className="w-3 h-3" />
                  میله‌ای
               </button>
            </div>
          </div>
        </div>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {trendChartType === 'line' ? (
              <LineChart data={trendData}>
                <defs>
                  <linearGradient id="colorAmountLine" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.05} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: '800' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: '800' }} 
                  width={80} 
                  tickFormatter={(val) => val.toLocaleString('fa-IR')}
                />
                <Tooltip 
                  cursor={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5 5' }}
                  contentStyle={{ 
                    borderRadius: '24px', 
                    border: 'none', 
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', 
                    padding: '20px',
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)'
                  }}
                  itemStyle={{ fontWeight: '900', color: '#1e293b' }}
                  labelStyle={{ fontWeight: 'black', marginBottom: '8px', color: '#64748b' }}
                  formatter={(value: number) => [value.toLocaleString('fa-IR') + ' تومان', 'مبلغ فروش']}
                />
                <Area type="monotone" dataKey="amount" stroke="#3b82f6" fill="url(#colorAmountLine)" />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#3b82f6" 
                  strokeWidth={5} 
                  dot={{ r: 6, strokeWidth: 3, fill: '#fff', stroke: '#3b82f6' }} 
                  activeDot={{ r: 8, strokeWidth: 0, fill: '#3b82f6' }} 
                  animationDuration={1500}
                />
              </LineChart>
            ) : (
              <BarChart data={trendData}>
                <defs>
                  <linearGradient id="colorAmountBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.05} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: '800' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: '800' }} 
                  width={80}
                  tickFormatter={(val) => val.toLocaleString('fa-IR')}
                />
                <Tooltip 
                  cursor={{fill: 'rgba(59, 130, 246, 0.05)', radius: 15}}
                  contentStyle={{ 
                    borderRadius: '24px', 
                    border: 'none', 
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', 
                    padding: '20px',
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)'
                  }}
                  itemStyle={{ fontWeight: '900', color: '#1e293b' }}
                  labelStyle={{ fontWeight: 'black', marginBottom: '8px', color: '#64748b' }}
                  formatter={(value: number) => [value.toLocaleString('fa-IR') + ' تومان', 'مبلغ فروش']}
                />
                <Bar dataKey="amount" fill="url(#colorAmountBar)" radius={[12, 12, 0, 0]} barSize={40} animationDuration={1500} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-8 flex flex-col h-[500px] border-none shadow-2xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900 rounded-[40px]">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                <PieChartIcon className="w-5 h-5 text-indigo-500" />
              </div>
              روش‌های پرداخت
            </h3>
            <div className="flex bg-gray-50 dark:bg-slate-800/50 p-1 rounded-2xl border border-gray-100 dark:border-slate-800">
               <button 
                  onClick={() => setPaymentChartType('line')}
                  className={`p-1.5 px-3 rounded-xl text-[9px] font-black transition-all flex items-center gap-1.5 ${paymentChartType === 'line' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-gray-400'}`}
               >
                  <LineIcon className="w-2.5 h-2.5" />
                  خطی
               </button>
               <button 
                  onClick={() => setPaymentChartType('bar')}
                  className={`p-1.5 px-3 rounded-xl text-[9px] font-black transition-all flex items-center gap-1.5 ${paymentChartType === 'bar' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-gray-400'}`}
               >
                  <LayoutGrid className="w-2.5 h-2.5" />
                  میله‌ای
               </button>
            </div>
          </div>
          <div className="flex-1 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              {paymentChartType === 'bar' ? (
                <BarChart data={paymentTypeData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.05} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#64748b'}} width={60} tickFormatter={(val) => val.toLocaleString('fa-IR')} />
                  <Tooltip 
                    cursor={{fill: 'rgba(99, 102, 241, 0.05)', radius: 10}}
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.2)', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    formatter={(value: number) => [value.toLocaleString('fa-IR') + ' تومان', 'مبلغ']}
                  />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={50}>
                    {paymentTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <LineChart data={paymentTypeData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.05} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#64748b'}} width={60} tickFormatter={(val) => val.toLocaleString('fa-IR')} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.2)', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    formatter={(value: number) => [value.toLocaleString('fa-IR') + ' تومان', 'مبلغ']}
                  />
                  <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={4} dot={{ r: 6, fill: '#6366f1' }} activeDot={{ r: 8 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-8 flex flex-col h-[500px] border-none shadow-2xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900 rounded-[40px]">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-rose-500" />
              </div>
              بزرگترین بدهکاران
            </h3>
            <div className="flex bg-gray-50 dark:bg-slate-800/50 p-1 rounded-2xl border border-gray-100 dark:border-slate-800">
               <button 
                  onClick={() => setDebtChartType('line')}
                  className={`p-1.5 px-3 rounded-xl text-[9px] font-black transition-all flex items-center gap-1.5 ${debtChartType === 'line' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-sm' : 'text-gray-400'}`}
               >
                  <LineIcon className="w-2.5 h-2.5" />
                  خطی
               </button>
               <button 
                  onClick={() => setDebtChartType('bar')}
                  className={`p-1.5 px-3 rounded-xl text-[9px] font-black transition-all flex items-center gap-1.5 ${debtChartType === 'bar' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-sm' : 'text-gray-400'}`}
               >
                  <LayoutGrid className="w-2.5 h-2.5" />
                  میله‌ای
               </button>
            </div>
          </div>
          <div className="flex-1 w-full">
            {topDebtors.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {debtChartType === 'bar' ? (
                  <BarChart data={topDebtors} layout="vertical" margin={{ left: 10, right: 40, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.05} />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fontWeight: '900', fill: '#64748b'}} 
                      width={110}
                      interval={0}
                      style={{ direction: 'rtl' }}
                    />
                    <Tooltip 
                      cursor={{fill: 'rgba(244, 63, 94, 0.05)', radius: 10}}
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.2)', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
                      formatter={(value: number) => [value.toLocaleString('fa-IR') + ' تومان', 'مبلغ بدهی']}
                    />
                    <Bar dataKey="amount" fill="#f43f5e" radius={[0, 15, 15, 0]} barSize={20}>
                      {topDebtors.map((entry, index) => (
                        <Cell key={`cell-${index}`} fillOpacity={0.9 - index * 0.1} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <LineChart data={topDebtors} margin={{ left: 10, right: 40, top: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.05} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#64748b'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#64748b'}} width={80} tickFormatter={(val) => val.toLocaleString('fa-IR')} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.2)', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
                      formatter={(value: number) => [value.toLocaleString('fa-IR') + ' تومان', 'مبلغ بدهی']}
                    />
                    <Line type="monotone" dataKey="amount" stroke="#f43f5e" strokeWidth={4} dot={{ r: 6, fill: '#f43f5e' }} activeDot={{ r: 8 }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <p className="text-sm font-bold">هیچ بدهی فعالی ثبت نشده است.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
