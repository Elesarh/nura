import { translateError } from '../../lib/errorTranslator';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { User, Sale, Customer } from '../../types';
import { Card, LoadingWidget, ErrorWidget, Button } from '../../components';
import { ShoppingCart, TrendingUp, Users, Package, Wallet, Banknote, History, ChevronDown, Activity, Calendar as CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, LineChart, Line } from 'recharts';
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

import { useNavigate } from 'react-router';
import { useToast } from '../../ToastContext';

export default function StoreDashboard({ user }: { user: User }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly' | 'six_months' | 'yearly' | 'custom'>('weekly');
  const [customRange, setCustomRange] = useState<any>(null);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  useEffect(() => {
    if (!user.shopId) {
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      try {
        const salesQ = query(
          collection(db, "sales"), 
          where("shopId", "==", user.shopId),
          orderBy("createdAt", "desc"),
          limit(2000)
        );
        const salesSnap = await getDocs(salesQ);
        const salesData = salesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
        setSales(salesData);

        const customersQ = query(collection(db, "customers"), where("shopId", "==", user.shopId));
        const customersSnap = await getDocs(customersQ);
        const customersData = customersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
        setCustomers(customersData);
      } catch (err: any) {
        console.error("Dashboard data fetch error:", err);
        setError(translateError(err));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user.shopId]);

  if (loading) return <LoadingWidget />;
  if (error) return <ErrorWidget message={error} />;

  // Calculations
  const grossSales = sales.filter(s => !s.isAdjustment).reduce((sum, s) => sum + s.totalAmount, 0);
  const totalDebt = customers.reduce((sum, c) => sum + (c.totalDebt || 0), 0);
  const cashReceived = grossSales - totalDebt; 
  
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysSales = sales.filter(s => !s.isAdjustment && s.createdAt.startsWith(todayStr)).reduce((sum, s) => sum + s.totalAmount, 0);

  // Dynamic Chart Data
  const getChartData = () => {
    let length = 7;
    let labelFormat: Intl.DateTimeFormatOptions = { weekday: 'short' };
    let unit: 'day' | 'month' | 'hour' = 'day';

    switch (timeRange) {
      case 'daily': length = 24; unit = 'hour'; break;
      case 'weekly': length = 7; unit = 'day'; break;
      case 'monthly': length = 30; unit = 'day'; break;
      case 'six_months': length = 6; unit = 'month'; break;
      case 'yearly': length = 12; unit = 'month'; break;
      case 'custom': {
        if (!customRange || !Array.isArray(customRange) || customRange.length !== 2) {
          length = 30; unit = 'day'; break; 
        }
        const start = customRange[0].toDate();
        const end = customRange[1].toDate();
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        if (diffDays <= 2) {
           length = diffDays * 24; unit = 'hour';
        } else if (diffDays <= 60) {
           length = diffDays; unit = 'day';
        } else {
           length = Math.ceil(diffDays / 30); unit = 'month';
        }
        
        return Array.from({ length }).map((_, i) => {
          const d = new Date(start);
          if (unit === 'day') d.setDate(d.getDate() + i);
          else if (unit === 'month') d.setMonth(d.getMonth() + i);
          else if (unit === 'hour') d.setHours(d.getHours() + i);

          const isoStr = d.toISOString();
          const matchStr = unit === 'month' ? isoStr.slice(0, 7) : unit === 'day' ? isoStr.slice(0, 10) : isoStr.slice(0, 13);
          
          const amount = sales
            .filter(s => !s.isAdjustment && s.createdAt.startsWith(matchStr))
            .reduce((sum, s) => sum + s.totalAmount, 0);

          let name = '';
          if (unit === 'day') name = d.toLocaleDateString('fa-IR', { day: 'numeric', month: 'short' });
          else if (unit === 'month') name = d.toLocaleDateString('fa-IR', { month: 'long' });
          else if (unit === 'hour') name = `${d.getHours()}:00`;

          return { name, amount };
        });
      }
    }

    return Array.from({ length }).map((_, i) => {
      const d = new Date();
      if (unit === 'day') d.setDate(d.getDate() - (length - 1 - i));
      else if (unit === 'month') d.setMonth(d.getMonth() - (length - 1 - i));
      else if (unit === 'hour') d.setHours(d.getHours() - (length - 1 - i));

      const isoStr = d.toISOString();
      const matchStr = unit === 'month' ? isoStr.slice(0, 7) : unit === 'day' ? isoStr.slice(0, 10) : isoStr.slice(0, 13);
      
      const amount = sales
        .filter(s => !s.isAdjustment && s.createdAt.startsWith(matchStr))
        .reduce((sum, s) => sum + s.totalAmount, 0);

      let name = '';
      if (unit === 'day') name = d.toLocaleDateString('fa-IR', { day: 'numeric', month: 'short' });
      else if (unit === 'month') name = d.toLocaleDateString('fa-IR', { month: 'long' });
      else if (unit === 'hour') name = `${d.getHours()}:00`;

      return { name, amount };
    });
  };

  const chartData = getChartData();

  const statCards = [
    { title: "ارزش کل فروش", value: grossSales, icon: TrendingUp, gradient: 'from-blue-600 to-indigo-700', trend: '۰٪', unit: 'تومان' },
    { title: 'مطالبات معوق (نسیه)', value: totalDebt, icon: Users, gradient: 'from-rose-500 to-orange-600', trend: '۰٪', unit: 'تومان' },
    { title: 'نقدینگی دریافتی', value: cashReceived, icon: Banknote, gradient: 'from-emerald-500 to-teal-600', trend: '۰٪', unit: 'تومان' },
    { title: 'عملکرد امروز', value: todaysSales, icon: ShoppingCart, gradient: 'from-violet-600 to-purple-700', trend: 'ثابت', unit: 'تومان' },
  ];

  return (
    <div className="space-y-10 max-w-7xl mx-auto px-4 pb-20" dir="rtl">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-white dark:bg-[#1e293b] p-8 rounded-[40px] shadow-2xl shadow-blue-500/5 border border-gray-100 dark:border-slate-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] -mr-32 -mt-32" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 border border-blue-100 dark:border-blue-500/20">
              <Activity className="w-3 h-3" />
              Real-time Analytics
            </div>
            <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">پیشخوان هوشمند فروش</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 font-medium max-w-md leading-relaxed">
              تحلیل جامع عملکرد مالی، مدیریت تراکنش‌ها و نظارت بر چرخه نقدینگی فروشگاه.
            </p>
          </div>
        </div>
      </div>

      {!user.shopId && <ErrorWidget message="هیچ فروشگاهی به این کاربر اختصاص داده نشده است." />}
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div 
              key={i} 
              className="relative group cursor-pointer"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-10 rounded-[32px] transition-opacity duration-500`} />
              <div className="bg-white dark:bg-[#1e293b] rounded-[32px] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-slate-800 transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-blue-500/10">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-4 rounded-2xl bg-gradient-to-br ${stat.gradient} text-white shadow-lg shadow-blue-500/20`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-black ${stat.trend.includes('+') ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : stat.trend.includes('-') ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-gray-50 text-gray-500'}`}>
                    {stat.trend}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">{stat.title}</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter">
                      {stat.value.toLocaleString('fa-IR')}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">{stat.unit}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-8 p-8 rounded-[40px] border border-gray-100 dark:border-slate-800 shadow-xl shadow-gray-200/20 dark:shadow-none bg-white dark:bg-[#1e293b] flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/5 blur-3xl -ml-16 -mt-16" />
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10 relative">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">آنالیز زمانی تراکنش‌ها</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Revenue Stream Performance</p>
              </div>
            </div>

            <div className="flex bg-gray-50 dark:bg-slate-800/40 p-1 rounded-2xl border border-gray-100 dark:border-slate-800 backdrop-blur-sm mr-2">
               <button 
                  onClick={() => setChartType('line')}
                  className={`p-1.5 px-3 rounded-lg text-[9px] font-black transition-all flex items-center gap-1 ${chartType === 'line' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-gray-400'}`}
               >
                  خطی
               </button>
               <button 
                  onClick={() => setChartType('bar')}
                  className={`p-1.5 px-3 rounded-lg text-[9px] font-black transition-all flex items-center gap-1 ${chartType === 'bar' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-gray-400'}`}
               >
                  میله‌ای
               </button>
            </div>
            <div className="flex bg-gray-50 dark:bg-slate-800/40 p-1 rounded-2xl border border-gray-100 dark:border-slate-800 backdrop-blur-sm">
              <button onClick={() => setTimeRange('daily')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${timeRange === 'daily' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-gray-400'}`}>روزانه</button>
              <button onClick={() => setTimeRange('weekly')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${timeRange === 'weekly' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-gray-400'}`}>هفتگی</button>
              <button onClick={() => setTimeRange('monthly')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${timeRange === 'monthly' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-gray-400'}`}>ماهانه</button>
              <button onClick={() => setTimeRange('six_months')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${timeRange === 'six_months' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-gray-400'}`}>۶ ماه</button>
              <button onClick={() => setTimeRange('custom')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${timeRange === 'custom' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-gray-400'}`}>بازه دلخواه</button>
            </div>
          </div>

          <AnimatePresence>
            {timeRange === 'custom' && (
              <motion.div 
                key="custom-date-range-picker"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mb-6 relative z-[100] overflow-visible"
              >
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-blue-50/50 dark:bg-blue-500/5 rounded-2xl border border-blue-100/50 dark:border-blue-500/10">
                   <div className="flex-1 relative w-full overflow-visible">
                      <DatePicker
                        range
                        value={customRange}
                        onChange={setCustomRange}
                        calendar={persian}
                        locale={persian_fa}
                        calendarPosition="bottom-right"
                        inputClass="w-full h-11 px-10 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                        containerClassName="w-full relative"
                        placeholder="انتخاب بازه زمانی دلخواه..."
                        portal={true}
                      />
                      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                   </div>
                   <Button 
                    variant="ghost" 
                    onClick={() => {
                      setTimeRange('weekly');
                      setCustomRange(null);
                    }}
                    className="h-11 px-6 text-xs font-bold text-gray-500"
                   >
                     لغو
                   </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="h-[400px] w-full mt-auto relative">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 900 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 900 }} 
                    width={80}
                    tickFormatter={(val) => val.toLocaleString('fa-IR')}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 backdrop-blur-md">
                            <p className="text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">{label}</p>
                            <div className="flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full bg-blue-600" />
                               <p className="text-lg font-black text-blue-600 tabular-nums">
                                  {payload[0].value?.toLocaleString('fa-IR')} <span className="text-[10px] text-gray-400">تومان</span>
                               </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#2563eb" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorAmount)"
                    animationDuration={2000}
                  />
                </AreaChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 900 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 900 }} 
                    width={80}
                    tickFormatter={(val) => val.toLocaleString('fa-IR')}
                  />
                  <Tooltip 
                    cursor={{fill: 'rgba(59, 130, 246, 0.05)', radius: 10}}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 backdrop-blur-md">
                            <p className="text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">{label}</p>
                            <div className="flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full bg-blue-600" />
                               <p className="text-lg font-black text-blue-600 tabular-nums">
                                  {payload[0].value?.toLocaleString('fa-IR')} <span className="text-[10px] text-gray-400">تومان</span>
                               </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[10, 10, 0, 0]} barSize={40} animationDuration={2000} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-4 p-8 rounded-[40px] border border-gray-100 dark:border-slate-800 shadow-xl shadow-gray-200/20 dark:shadow-none bg-white dark:bg-[#1e293b] flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white">تراکنش‌های اخیر</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Live Flow Stream</p>
            </div>
          </div>

          <div className="space-y-4 flex-1">
            {sales.slice(0, 7).map((sale, idx) => (
              <div 
                key={sale.id} 
                className="group flex justify-between items-center p-4 rounded-[24px] border border-gray-50 dark:border-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-blue-500/5 transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center gap-4">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${sale.isAdjustment ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                      {sale.isAdjustment ? <Banknote className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                   </div>
                   <div>
                    <p className="text-sm font-black text-gray-800 dark:text-slate-200">
                      {sale.isAdjustment ? (sale.note || 'تعدیل حساب') : `فاکتور شماره ${idx + 1}`}
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tabular-nums mt-0.5">
                       {new Date(sale.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })} • {new Date(sale.createdAt).toLocaleDateString('fa-IR')}
                    </p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-blue-600 tabular-nums">
                    {sale.totalAmount.toLocaleString('fa-IR')}
                  </p>
                  <p className="text-[9px] font-black text-gray-300 uppercase tracking-tighter">IRR</p>
                </div>
              </div>
            ))}
            {sales.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 opacity-50 grayscale">
                 <History className="w-12 h-12 text-gray-200 mb-4" />
                 <p className="text-sm font-bold text-gray-300">هنوز تراکنشی ثبت نشده است</p>
              </div>
            )}
          </div>
          
          <Button 
            variant="ghost" 
            onClick={() => navigate('/store/transactions')}
            className="mt-6 w-full h-12 rounded-2xl text-[10px] font-black text-gray-400 uppercase tracking-widest border border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all active:scale-95"
          >
             مشاهده تاریخچه کامل
          </Button>
        </Card>
      </div>
    </div>
  );
}

