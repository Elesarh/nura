import React, { useState, useEffect } from 'react';
import { db, logEvent } from '../../firebase';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, limit } from 'firebase/firestore';
import { Log, User } from '../../types';
import { Card, Button, ErrorWidget, TextField } from '../../components';
import { Activity, Shield, Store, Download, Trash2, Calendar, Search, Filter, AlertCircle, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../ToastContext';
import DatePicker from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';

export default function LogsView({ user }: { user: User }) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'admin' | 'shop'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDate, setSearchDate] = useState<any>(null);
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetchLogs();
  }, [filterType]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let q;
      if (filterType === 'all') {
        q = query(collection(db, 'logs'), orderBy('createdAt', 'desc'), limit(100));
      } else {
        q = query(collection(db, 'logs'), where('type', '==', filterType), orderBy('createdAt', 'desc'), limit(100));
      }

      const snap = await getDocs(q);
      setLogs(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Log)));
    } catch (err: any) {
      setError('خطا در دریافت لاگ‌ها');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!window.confirm('آیا از حذف این لاگ مطمئن هستید؟')) return;
    try {
      await deleteDoc(doc(db, 'logs', id));
      setLogs(logs.filter(l => l.id !== id));
      setSelectedLogs(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      showToast('لاگ با موفقیت حذف شد');
      
      logEvent({
        type: 'admin',
        userId: user.id,
        userEmail: user.email,
        action: 'DELETE_LOG',
        details: `Deleted log ${id}`
      });
    } catch (e) {
      showToast('حذف لاگ با خطا مواجه شد', 'error');
    }
  };

  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const handleBulkDelete = async () => {
    if (selectedLogs.size === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const executeBulkDelete = async () => {
    setShowBulkDeleteConfirm(false);
    setLoading(true);
    try {
      const ids = Array.from(selectedLogs);
      for (const id of ids) {
        await deleteDoc(doc(db, 'logs', id));
      }
      setLogs(logs.filter(l => !selectedLogs.has(l.id)));
      setSelectedLogs(new Set());
      showToast(`تعداد ${ids.length} لاگ با موفقیت حذف شد`);

      logEvent({
        type: 'admin',
        userId: user.id,
        userEmail: user.email,
        action: 'BULK_DELETE_LOGS',
        details: `Deleted ${ids.length} logs`
      });
    } catch (e) {
      showToast('خطا در حذف گروهی لاگ‌ها', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedLogs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDownloadMonthly = async (type: 'all' | 'admin' | 'shop') => {
    try {
      // Get current month
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      
      let q = collection(db, 'logs');
      let baseConstraints: any[] = [where('createdAt', '>=', firstDay), orderBy('createdAt', 'desc')];
      
      if (type !== 'all') {
         baseConstraints.push(where('type', '==', type));
      }

      const snap = await getDocs(query(q, ...baseConstraints));
      const monthlyLogs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Log));
      
      if (monthlyLogs.length === 0) {
        showToast('هیچ لاگی در این ماه یافت نشد', 'info');
        return;
      }

      // Convert to CSV
      const headers = ['تاریخ', 'نوع', 'کاربر', 'عملیات', 'جزئیات'];
      const rows = monthlyLogs.map(l => [
        new Date(l.createdAt).toLocaleString('fa-IR'),
        l.type === 'admin' ? 'مدیریت' : 'فروشگاه',
        l.userEmail || l.userId,
        l.action,
        l.details.replace(/,/g, ' ')
      ]);
      
      const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `logs-${now.getFullYear()}-${now.getMonth() + 1}.csv`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast(`گزارش ماهانه با موفقیت آماده دانلود شد (${monthlyLogs.length} مورد)`);
    } catch (e) {
      console.error(e);
      showToast('خطا در دانلود گزارش', 'error');
    }
  };

  const filteredLogs = logs.filter(l => {
    const textMatch = l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      l.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      l.userEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    let dateMatch = true;
    if (searchDate) {
      const logDate = new Date(l.createdAt);
      const selDate = new Date(searchDate.toDate());
      // compare YYYY-MM-DD
      if (logDate.getFullYear() !== selDate.getFullYear() ||
          logDate.getMonth() !== selDate.getMonth() ||
          logDate.getDate() !== selDate.getDate()) {
            dateMatch = false;
      }
    }
    return textMatch && dateMatch;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-5xl mx-auto">
      <div className="flex flex-col items-center justify-center text-center space-y-6 pt-8 pb-4">
        <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-4">
          مدیریت لاگ‌های سیستم
          <div className="p-3 bg-blue-600 hover:bg-blue-500 transition-colors rounded-2xl shadow-xl shadow-blue-500/20">
            <Terminal className="text-white w-8 h-8" />
          </div>
        </h2>
        <p className="text-slate-500 dark:text-slate-400 font-bold text-lg">رصد دقیق تمامی فعالیت‌های مدیریت و فروشگاه‌ها</p>
        
        <div className="w-full max-w-2xl mt-4 relative">
          <Button 
            onClick={() => setShowDownloadOptions(!showDownloadOptions)}
            className="w-full bg-[#059669] hover:bg-emerald-700 h-16 rounded-[16px] text-lg font-black shadow-lg shadow-emerald-500/20 flex flex-row-reverse items-center justify-center gap-3"
          >
            <Download className="w-6 h-6" />
            <span dir="rtl">دانلود گزارش ماهانه (CSV)</span>
          </Button>

          {showDownloadOptions && (
            <div className="absolute top-full mt-2 w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-2 z-10 animate-in fade-in slide-in-from-top-4">
              <button onClick={() => { handleDownloadMonthly('all'); setShowDownloadOptions(false); }} className="w-full text-right px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-sm font-bold transition-colors">دانلود همه لاگ‌ها</button>
              <button onClick={() => { handleDownloadMonthly('admin'); setShowDownloadOptions(false); }} className="w-full text-right px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-sm font-bold transition-colors text-indigo-600 dark:text-indigo-400">فقط لاگ‌های مدیریت</button>
              <button onClick={() => { handleDownloadMonthly('shop'); setShowDownloadOptions(false); }} className="w-full text-right px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-sm font-bold transition-colors text-emerald-600 dark:text-emerald-400">فقط لاگ‌های فروشگاه‌ها</button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 rounded-[32px] border-none shadow-2xl bg-white dark:bg-slate-900 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-colors" />
            
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <Filter className="w-4 h-4" /> فیلترها
            </h3>
            
            <div className="space-y-2">
              {[
                { id: 'all', label: 'تمامی لاگ‌ها', icon: Activity, color: 'blue' },
                { id: 'admin', label: 'فعالیت‌های مدیریت', icon: Shield, color: 'indigo' },
                { id: 'shop', label: 'فعالیت‌های فروشگاه', icon: Store, color: 'emerald' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setFilterType(t.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                    filterType === t.id 
                      ? `bg-${t.color}-600 text-white shadow-lg shadow-${t.color}-500/30` 
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 space-y-4">
               <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">فیلتر بر اساس تاریخ</label>
                  <DatePicker
                    calendar={persian}
                    locale={persian_fa}
                    value={searchDate}
                    onChange={setSearchDate}
                    calendarPosition="bottom-right"
                    containerClassName="w-full"
                    inputClass="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium px-4 focus:ring-2 focus:ring-blue-500 dark:text-white"
                    placeholder="انتخاب تاریخ"
                  />
                  {searchDate && (
                    <button onClick={() => setSearchDate(null)} className="text-[10px] text-rose-500 mt-2 font-bold w-full text-left">
                      پاک کردن تاریخ
                    </button>
                  )}
               </div>

               <TextField 
                 label="جستجو در متن لاگ" 
                 placeholder="کلمه کلیدی..." 
                 value={searchTerm}
                 onChange={(e:any) => setSearchTerm(e.target.value)}
                 icon={<Search className="w-4 h-4" />}
               />
            </div>
          </Card>

          <Card className="p-6 rounded-[32px] bg-amber-500/5 border border-amber-500/10 text-amber-600 dark:text-amber-400">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-black">نکته امنیتی</p>
                <p className="text-[10px] leading-relaxed font-bold opacity-80">لاگ‌ها شواهد فعالیت‌های سیستم هستند. حذف آن‌ها باید با احتیاط کامل و توسط مدیریت ارشد انجام شود.</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Logs List */}
        <div className="lg:col-span-3 space-y-4">
          
          {selectedLogs.size > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 gap-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900/30 rounded-2xl animate-in slide-in-from-top-4">
              <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{selectedLogs.size} مورد انتخاب شده</span>
              <Button 
                onClick={handleBulkDelete}
                className="w-full sm:w-auto bg-rose-500 hover:bg-rose-600 h-12 sm:h-10 px-4 rounded-xl text-xs font-black shadow-lg shadow-rose-500/20"
              >
                <Trash2 className="w-4 h-4 ml-2" />
                حذف موارد انتخاب شده
              </Button>
            </div>
          )}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-bold text-slate-400">در حال بازخوانی تاریخچه سیستم...</p>
            </div>
          ) : error ? (
            <ErrorWidget message={error} />
          ) : filteredLogs.length === 0 ? (
            <div className="py-24 text-center bg-slate-50 dark:bg-slate-900/50 rounded-[48px] border-2 border-dashed border-slate-200 dark:border-slate-800">
               <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
               <p className="text-slate-400 font-bold">هیچ فعالیت ثبت شده‌ای یافت نشد</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredLogs.map(log => (
                  <motion.div
                    key={log.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <Card className={`p-6 rounded-[32px] border transition-all group ${selectedLogs.has(log.id) ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500/20'}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <label className="flex items-center justify-center pt-2 cursor-pointer relative z-10 shrink-0">
                            <input 
                              type="checkbox" 
                              checked={selectedLogs.has(log.id)}
                              onChange={() => toggleSelection(log.id)}
                              className="w-5 h-5 rounded-lg border-2 border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 transition-colors cursor-pointer"
                            />
                          </label>

                          <div className={`mt-1 p-2.5 rounded-xl ${
                            log.type === 'admin' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10'
                          }`}>
                            {log.type === 'admin' ? <Shield className="w-4 h-4" /> : <Store className="w-4 h-4" />}
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                log.type === 'admin' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                              }`}>
                                {log.type === 'admin' ? 'مدیریت' : 'فروشگاه'}
                              </span>
                              <span className="text-xs font-black text-slate-900 dark:text-white">
                                {log.action}
                              </span>
                            </div>
                            
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">{log.details}</p>
                            
                            <div className="flex flex-wrap items-center gap-4 mt-3">
                               <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
                                 <Calendar className="w-3 h-3" />
                                 {new Date(log.createdAt).toLocaleString('fa-IR')}
                               </div>
                               <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
                                 <Activity className="w-3 h-3" />
                                 {log.userEmail || log.userId}
                               </div>
                            </div>
                          </div>
                        </div>

                        <button 
                          onClick={() => handleDeleteLog(log.id)}
                          className="self-end sm:self-center p-3 text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-2xl transition-all"
                          title="حذف لاگ"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showBulkDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowBulkDeleteConfirm(false)}
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
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">حذف دسته‌جمعی لاگ‌ها</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">
                    آیا از حذف برگشت‌ناپذیر <span className="font-bold text-gray-700 dark:text-slate-300">{selectedLogs.size}</span> لاگ انتخاب شده اطمینان دارید؟
                  </p>
                </div>
                <div className="flex items-center gap-3 w-full pt-4 border-t border-gray-100 dark:border-slate-800">
                  <Button variant="outline" className="flex-1 border-gray-200 dark:border-slate-700 h-12" onClick={() => setShowBulkDeleteConfirm(false)}>
                    انصراف
                  </Button>
                  <Button variant="danger" className="flex-1 h-12 font-black" onClick={executeBulkDelete} disabled={loading}>
                    {loading ? 'در حال حذف...' : 'بله، حذف شود'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
