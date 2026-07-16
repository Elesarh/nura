import { translateError } from './lib/errorTranslator';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router';
import { useEffect, useState, ReactNode } from 'react';
import React from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, serverTimestamp, query, where, getDocs, orderBy, limit, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { User, Shop, Notification, Product } from './types';
import { LoadingWidget, Button, TextField, Card, ErrorWidget } from './components';
import { Menu, X, Sun, Moon, LogOut, Store as StoreIcon, Shield, User as UserIcon, Phone, Mail, Bell, AlertTriangle, History, Trash2, Plus, Activity, Package, Users, ShoppingCart, Banknote, TrendingUp, Zap, Lock, Bot, Sparkles, Settings, PackageSearch } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { logEvent } from './firebase';

// Import Views
import SuperAdminDashboard from './views/superadmin/Dashboard';
import LogsView from './views/superadmin/LogsView';
import AIChatView from './views/superadmin/AIChatView';
import SettingsView from './views/superadmin/SettingsView';
import StoreDashboard from './views/store/Dashboard';
import ProductsView from './views/store/ProductsView';
import CustomersView from './views/store/CustomersView';
import SalesView from './views/store/SalesView';
import DebtsView from './views/store/DebtsView';
import ReportsView from './views/store/ReportsView';
import TransactionsView from './views/store/TransactionsView';
import ChatView from './views/store/ChatView';
import OrdersView from './views/store/OrdersView';
import ShopProfileModal from './ShopProfileModal';
import AdminCredentialsSecurator from './components/AdminCredentialsSecurator';
import { ToastProvider, useToast } from './ToastContext';

// Layout with Sidebar
function Layout({ user, children, isDarkMode, setIsDarkMode }: { user: User, children: ReactNode, isDarkMode: boolean, setIsDarkMode: (val: boolean) => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [shopInfo, setShopInfo] = useState<Shop | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    if (!user.shopId) return;

    // Real-time subscription to Shop Info
    const unsubscribe = onSnapshot(doc(db, 'shops', user.shopId), async (snap) => {
      if (snap.exists()) {
        let data = { id: snap.id, ...snap.data() } as Shop;
        
        // Dynamic fallback: if features are empty but licensePlanId is set, fetch features from the plan
        if ((!data.features || data.features.length === 0) && data.licensePlanId) {
          try {
            const planSnap = await getDoc(doc(db, 'license_plans', data.licensePlanId));
            if (planSnap.exists()) {
              const planData = planSnap.data();
              data.features = planData.features || [];
            }
          } catch (e) {
            console.error("Error fetching fallback plan features:", e);
          }
        }
        
        // Check queued license transition
        if (data.queuedLicensePlanId && data.licenseExpiresAt) {
          const isExpired = new Date(data.licenseExpiresAt).getTime() < new Date().getTime();
          if (isExpired) {
            try {
              const planSnap = await getDoc(doc(db, 'license_plans', data.queuedLicensePlanId));
              if (planSnap.exists()) {
                const planData = planSnap.data();
                const newExpiry = new Date();
                newExpiry.setMonth(newExpiry.getMonth() + (data.queuedLicenseMonths || 1));
                
                const updates = {
                  licensePlanId: data.queuedLicensePlanId,
                  licenseExpiresAt: newExpiry.toISOString(),
                  features: planData.features || [],
                  status: 'active' as const,
                  queuedLicensePlanId: null as any,
                  queuedLicenseMonths: null as any
                };
                
                await updateDoc(doc(db, 'shops', user.shopId), updates);
                data = { ...data, ...updates };
              }
            } catch (e) {
              console.error("Error transitioning license", e);
            }
          }
        }
        
        setShopInfo(data);
      }
    });

    return () => unsubscribe();
  }, [user.shopId]);

  useEffect(() => {
    if (!user.shopId) return;

    // Fetch Notifications & Low stock alerts
    const fetchNotifs = async () => {
      try {
        const q = query(collection(db, 'notifications'), where('shopId', '==', user.shopId), orderBy('createdAt', 'desc'), limit(10));
        const snap = await getDocs(q);
        setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
        
        // System check for low stock
        const prodQ = query(collection(db, 'products'), where('shopId', '==', user.shopId));
        const prodSnap = await getDocs(prodQ);
        const lowStockProds = prodSnap.docs.filter(d => d.data().quantity <= d.data().minimumStock);
        
        if (lowStockProds.length > 0) {
          const lowStockNotif: Notification = {
            id: 'low-stock-alert',
            shopId: user.shopId!,
            title: 'هشدار موجودی کالا',
            message: `${lowStockProds.length} محصول رو به اتمام هستند.`,
            type: 'warning',
            read: false,
            createdAt: new Date().toISOString()
          };
          setNotifications(prev => [lowStockNotif, ...prev.filter(n => n.id !== 'low-stock-alert')]);
        }

        // License alert
        if (shopInfo?.licenseExpiresAt) {
          const daysLeft = Math.ceil((new Date(shopInfo.licenseExpiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          if (daysLeft < 7) {
            const licenseNotif: Notification = {
              id: 'license-alert',
              shopId: user.shopId!,
              title: 'هشدار انقضای اشتراک',
              message: `تنها ${daysLeft} روز از اشتراک شما باقی مانده است.`,
              type: 'error',
              read: false,
              createdAt: new Date().toISOString()
            };
            setNotifications(prev => [licenseNotif, ...prev.filter(n => n.id !== 'license-alert')]);
          }
        }
      } catch (e) {
        console.error("Error fetching notifications or alerts", e);
      }
    };
    fetchNotifs();
  }, [user.shopId, shopInfo?.licenseExpiresAt]);

  const handleLogout = async () => {
    if (user.role === 'superadmin') {
      try {
        await updateDoc(doc(db, 'config', 'system'), {
          activeAdminSession: null
        });
        logEvent({
          type: 'admin',
          userId: user.id,
          userEmail: user.email,
          action: 'LOGOUT',
          details: 'Admin logged out manually'
        });
      } catch (e) {
        console.error('Failed to clear session on logout', e);
      }
    }
    await signOut(auth);
  };

  const navItems = user.role === 'superadmin' ? [
    { label: 'داشبورد مدیریت کل', path: '/admin/dashboard', icon: Shield },
    { label: 'تنظیمات', path: '/admin/settings', icon: Settings },
    { label: 'گزارشات و لاگ‌ها', path: '/admin/logs', icon: Activity },
    { label: 'دستیار هوشمند ESH’RA', path: '/admin/chat', icon: Bot },
  ] : [
    { label: 'داشبورد فروشگاه', path: '/store/dashboard', icon: Activity },
    { 
      label: 'مدیریت محصولات', 
      path: '/store/products', 
      icon: Package,
      hidden: !shopInfo?.features?.includes('products')
    },
    { 
      label: 'مدیریت مشتریان', 
      path: '/store/customers', 
      icon: Users,
      hidden: !shopInfo?.features?.includes('customers')
    },
    { 
      label: 'پایانه فروش هوشمند', 
      path: '/store/sales', 
      icon: ShoppingCart,
      hidden: !shopInfo?.features?.includes('sales')
    },
    { 
      label: 'تاریخچه تراکنش‌ها', 
      path: '/store/transactions', 
      icon: History,
      hidden: !shopInfo?.features?.includes('transactions')
    },
    { 
      label: 'سفارشات عمده', 
      path: '/store/orders', 
      icon: PackageSearch,
      hidden: !shopInfo?.features?.includes('orders')
    },
    { 
      label: 'سامانه مدیریت نسیه', 
      path: '/store/debts', 
      icon: Banknote,
      hidden: !shopInfo?.features?.includes('debts')
    },
    { 
      label: 'تحلیل داده و گزارش', 
      path: '/store/reports', 
      icon: TrendingUp,
      hidden: !shopInfo?.features?.includes('reports')
    },
    { 
      label: 'دستیار هوشمند ESH’RA', 
      path: '/store/chat', 
      icon: Zap,
      hidden: !shopInfo?.features?.includes('ai_assistant') 
    },
  ];

  const handleUpdateShop = async (e: any) => {
    e.preventDefault();
    if (!user.shopId || !shopInfo) return;
    try {
      await setDoc(doc(db, 'shops', user.shopId), shopInfo);
      showToast('اطلاعات فروشگاه با موفقیت بروزرسانی شد');
      setIsProfileModalOpen(false);
    } catch (e) {
      console.error('Update shop error:', e);
    }
  };

  const addBankCard = () => {
    if (!shopInfo) return;
    const cards = shopInfo.bankCards || [];
    setShopInfo({ ...shopInfo, bankCards: [...cards, { number: '', bankName: '', ownerName: '' }] });
  };

  const removeBankCard = (idx: number) => {
    if (!shopInfo) return;
    const cards = [...(shopInfo.bankCards || [])];
    cards.splice(idx, 1);
    setShopInfo({ ...shopInfo, bankCards: cards });
  };

  const updateBankCard = (idx: number, field: string, value: string) => {
    if (!shopInfo) return;
    const cards = [...(shopInfo.bankCards || [])];
    cards[idx] = { ...cards[idx], [field]: value };
    setShopInfo({ ...shopInfo, bankCards: cards });
  };

  return (
    <div className={`flex h-screen overflow-hidden font-sans ${isDarkMode ? 'dark bg-slate-950 text-slate-50' : 'bg-gray-50 text-slate-900'}`} dir="rtl">
      
      {/* Sidebar Overlay (Backdrop) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] z-[100]"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside 
        className={`fixed top-0 right-0 flex flex-col z-[110] h-full w-[280px] shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden
          ${isDarkMode ? 'bg-slate-900 border-l border-slate-800 shadow-slate-950/50' : 'bg-white border-l border-gray-200 shadow-slate-200/50'}
          ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className={`p-6 flex items-center justify-between border-b shrink-0 ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              {user.role === 'superadmin' ? <Shield className="text-white w-6 h-6" /> : <StoreIcon className="text-white w-6 h-6" />}
            </div>
            <div className="truncate">
              <h1 className={`text-sm font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{user.role === 'superadmin' ? 'سیستم مدیریت کل' : shopInfo?.name || 'فروشگاه'}</h1>
              <p className={`text-[10px] font-semibold mt-0.5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{user.role === 'superadmin' ? 'پنل مدیریت کل' : 'پنل مدیریت فروشنده'}</p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 p-4 space-y-1.5 overflow-y-auto no-scrollbar">
          {navItems.filter(item => !(item as any).hidden).map(item => {
            const [itemPathname, itemQuery] = item.path.split('?');
            let isActive = false;
            
            if (itemQuery) {
              isActive = location.pathname === itemPathname && location.search.includes(itemQuery.split('=')[1]);
            } else if (item.path === '/admin/dashboard') {
              isActive = location.pathname === item.path && (!location.search || location.search === '?tab=revenue');
            } else {
              isActive = location.pathname.startsWith(itemPathname);
            }

            const Icon = (item as any).icon;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                  isActive 
                    ? (isDarkMode ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/10')
                    : (isDarkMode ? 'text-slate-400 border-transparent hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 border-transparent hover:bg-gray-100/50 hover:text-slate-900')
                }`}
              >
                {Icon && <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : (isDarkMode ? 'text-slate-500' : 'text-gray-400')}`} />}
                <span className="truncate flex-1 text-right">{item.label}</span>
              </button>
            )
          })}
        </div>
        
        {isSidebarOpen && (
           <div className="m-4 p-4 rounded-2xl border bg-slate-800/10 dark:bg-slate-800/50 border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-3">
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-blue-100 border-blue-200'}`}>
                    <span className="text-xs font-bold text-blue-600">{user.email?.charAt(0).toUpperCase()}</span>
                 </div>
                 <div className="truncate">
                    <p className={`text-[10px] font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{user.email}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase">{user.role}</p>
                 </div>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full py-2 bg-rose-500/10 text-rose-500 rounded-lg text-xs font-bold hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                خروج از حساب
              </button>
           </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col relative overflow-hidden transition-all duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-gray-50'}`}>
        {/* Top Header Bar ( Desktop & Mobile ) */}
        <header className={`h-16 flex items-center justify-between px-3 sm:px-6 border-b shrink-0 z-30 transition-colors ${
          isDarkMode ? 'bg-slate-950/80 border-slate-800 backdrop-blur-md' : 'bg-white/80 border-gray-200 backdrop-blur-md'
        }`}>
          {/* Right Slot: Sidebar Toggle (RTL) */}
          <div className="flex items-center shrink-0">
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsSidebarOpen(!isSidebarOpen);
              }}
              className={`p-2 sm:p-2.5 rounded-xl transition-all shadow-sm border shrink-0 relative z-[40] ${
                isDarkMode 
                  ? 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800' 
                  : 'bg-white border-gray-200 text-slate-600 hover:bg-gray-50'
              } ${isSidebarOpen ? 'ring-2 ring-blue-500/20 shadow-blue-500/20' : ''}`}
            >
              <Menu className="w-5 h-5"/>
            </button>
          </div>

          {/* Center Slot: Shop Profile Info (Replaces Page Title as requested) */}
          <div className="flex-1 flex justify-center px-4 overflow-hidden">
            {user.role !== 'superadmin' ? (
              <button 
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center gap-2.5 max-w-full group transition-transform active:scale-95"
              >
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden border-2 shadow-sm transition-all group-hover:shadow-md ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-white bg-blue-50'} flex items-center justify-center shrink-0`}>
                  {shopInfo?.logoUrl ? (
                    <img src={shopInfo.logoUrl} alt={shopInfo.name} className="w-full h-full object-cover" />
                  ) : (
                    <StoreIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${isDarkMode ? 'text-slate-400' : 'text-blue-600'}`} />
                  )}
                </div>
                <div className="flex flex-col items-start leading-none overflow-hidden">
                  <span className={`text-[11px] sm:text-sm font-black truncate w-full ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {shopInfo?.name || 'فروشگاه'}
                  </span>
                  <p className="text-[9px] sm:text-[10px] font-bold text-blue-500 opacity-90 mt-0.5 truncate w-full">
                    {shopInfo?.ownerName || 'مدیریت'}
                  </p>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-lg shadow-slate-950/20">
                  <Shield className="text-white w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h2 className={`text-xs sm:text-base font-black tracking-tight truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                  پنل مدیریت کل
                </h2>
              </div>
            )}
          </div>

          {/* Actions Slot - Left Side (RTL) */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">

            <div className="h-6 w-px bg-gray-300 dark:bg-slate-700 mx-0.5 sm:mx-1"></div>

            <div className="relative">
              {user.role !== 'superadmin' && (
                <button 
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className={`p-2 rounded-xl border transition-colors relative ${
                    isDarkMode ? 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-blue-400' : 'border-gray-200 text-slate-500 hover:bg-white hover:text-blue-500'
                  }`}
                  title="اعلان‌ها"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.some(n=>!n.read) && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 border-2 border-white dark:border-slate-950 rounded-full" />
                  )}
                </button>
              )}

              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div 
                    key="notif-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60]" 
                    onClick={() => setIsNotificationsOpen(false)} 
                  />
                )}
                {isNotificationsOpen && (
                  <motion.div 
                    key="notif-panel"
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className={`absolute top-full left-0 mt-2 w-80 max-h-[400px] overflow-hidden rounded-2xl shadow-2xl border z-[70] ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}
                  >
                      <div className={`p-4 border-b ${isDarkMode ? 'border-slate-800 bg-slate-800/50' : 'border-gray-50 bg-gray-50/50'}`}>
                        <h3 className="font-bold text-sm">اعلان‌های فروشگاه</h3>
                      </div>
                      <div className="overflow-y-auto max-h-[340px] p-2 space-y-1 no-scrollbar">
                        {notifications.length === 0 && (
                          <div className="py-10 text-center">
                            <Bell className="w-8 h-8 text-gray-200 dark:text-slate-800 mx-auto mb-2" />
                            <p className="text-xs text-gray-400">هیچ پیامی ندارید</p>
                          </div>
                        )}
                        {notifications.map(n => (
                          <div key={n.id} className={`p-3 rounded-xl border transition-colors ${
                            n.type === 'error' ? 'bg-rose-50 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20' :
                            n.type === 'warning' ? 'bg-amber-50 border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20' :
                            isDarkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-gray-50 shadow-sm'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              {n.type === 'warning' || n.type === 'error' ? <AlertTriangle className="w-3.5 h-3.5 text-current" /> : null}
                              <h4 className="text-xs font-black">{n.title}</h4>
                            </div>
                            <p className="text-[11px] leading-relaxed text-gray-500 dark:text-slate-400">{n.message}</p>
                            <p className="text-[9px] text-gray-400 mt-2">{new Date(n.createdAt).toLocaleDateString('fa-IR')}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              className={`p-2 rounded-xl border transition-colors ${
                isDarkMode ? 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-amber-400' : 'border-gray-200 text-slate-500 hover:bg-white hover:text-amber-500'
              }`}
              title="تغییر تم"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            <div className={`text-sm font-medium hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full ${isDarkMode ? 'bg-slate-900 text-slate-300 border border-slate-700' : 'bg-white text-slate-600 border border-gray-200'}`}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              {(user.role !== 'superadmin' && shopInfo?.licenseExpiresAt) ? (
                 <span className="text-[10px] font-bold">
                   اعتبار تا: {new Date(shopInfo.licenseExpiresAt).toLocaleDateString('fa-IR')}
                 </span>
              ) : 'متصل'}
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
            {children}
          </div>
        </div>

        <ShopProfileModal 
          isOpen={isProfileModalOpen} 
          onClose={() => setIsProfileModalOpen(false)} 
          shopInfo={shopInfo} 
          isDarkMode={isDarkMode} 
          onUpdate={handleUpdateShop}
          setShopInfo={(s: Shop) => setShopInfo(s)}
          readOnly={true}
        />
      </div>
    </div>
  );
}

function Login({ isDarkMode, setIsDarkMode }: { isDarkMode: boolean, setIsDarkMode: (v: boolean) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      if (email === 'admin1@admin.com' && (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password')) {
        // Automatically bootstrap admin if it doesn't exist
        try {
          await createUserWithEmailAndPassword(auth, 'admin1@admin.com', 'admin1234');
        } catch (createErr: any) {
          setError('خطا در راه‌اندازی حساب پیش‌فرض: ' + createErr.message);
        }
      } else {
        setError('ایمیل یا رمز عبور اشتباه است');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('خطا در ورود با گوگل: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-4 transition-colors relative">
      <Card className="w-full max-w-md p-10 rounded-[48px] shadow-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-[#1e293b] relative overflow-hidden">
        
        <div className="absolute top-4 left-4 z-50">
          <button 
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)} 
            className={`p-2 rounded-xl border transition-colors ${
              isDarkMode ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-gray-200 text-slate-500 hover:bg-white'
            }`}
            title="تغییر تم"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex justify-center mb-8 relative z-10 pt-4">
          <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-2xl shadow-blue-500/40 animate-pulse" style={{ animationDuration: '4s' }}>
             <Shield className="text-white w-10 h-10" />
          </div>
        </div>
        
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2 text-center relative z-10">سیستم مدیریت متمرکز</h1>
        <p className="text-gray-500 dark:text-slate-400 mb-10 text-sm font-medium text-center relative z-10">برای دسترسی به پنل مدیریت وارد شوید</p>

        {error && <div className="mb-6 relative z-10"><ErrorWidget message={error} /></div>}
        <form onSubmit={handleLogin} className="space-y-6 relative z-10">
          <TextField label="ایمیل مدیریت" type="email" value={email} onChange={(e:any)=>setEmail(e.target.value)} required />
          <TextField label="رمز عبور مدیریت" type="password" value={password} onChange={(e:any)=>setPassword(e.target.value)} required />
          
          <div className="pt-4 flex flex-col gap-3">
            <Button type="submit" className="w-full h-16 rounded-[24px] font-black shadow-xl shadow-blue-500/20 active:scale-95" disabled={loading}>
              {loading ? 'در حال ورود...' : 'ورود امن به سامانه'}
            </Button>
            
            <button
               type="button"
               onClick={handleGoogleLogin}
               disabled={loading}
               className="w-full h-14 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-[20px] font-black text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
            >
               <svg className="w-5 h-5" viewBox="0 0 24 24">
                 <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                 <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                 <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                 <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
               </svg>
               ورود با جیمیل پشتیبان (بازیابی)
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

import { useAdminSession } from './useAdminSession';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { sessionState, pendingDevice, approvePending, rejectPending } = useAdminSession(user);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        try {
          const docRef = doc(db, 'users', authUser.uid);
          const docSnap = await getDoc(docRef);
          let userData: any;
          if (docSnap.exists()) {
            userData = docSnap.data();
          } else {
            let role = 'storeadmin';
            let hasChangedCredentials = false;
            const registeringAdminEmail = sessionStorage.getItem('creating_superadmin_email');
            
            if (authUser.email === 'admin1@admin.com') {
              role = 'superadmin';
            } else if (authUser.email === registeringAdminEmail) {
              role = 'superadmin';
              hasChangedCredentials = true;
            } else if (authUser.email?.startsWith('store_')) {
              role = 'storeadmin';
            }
            let shopId = null;
            userData = { 
              email: authUser.email!, 
              role, 
              shopId, 
              hasChangedCredentials, 
              createdAt: new Date().toISOString() 
            };
            await setDoc(docRef, userData);
          }

          if (userData.role === 'superadmin') {
              logEvent('admin', {
                userId: authUser.uid,
                userEmail: authUser.email!,
                action: 'LOGIN',
                details: 'SuperAdmin entered the system frontend'
              });
          } else if (userData.role === 'storeadmin') {
              logEvent('shop', {
                shopId: userData.shopId,
                userId: authUser.uid,
                userEmail: authUser.email!,
                action: 'SHOP_LOGIN',
                details: `Store admin logged into shop ${userData.shopId}`
              });
          }

          setUser({ id: authUser.uid, ...userData } as User);
        } catch (e) {
          console.error('Error in auth flow:', e);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading || (user && user.role === 'superadmin' && sessionState === 'loading')) {
    return <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-slate-950' : 'bg-gray-50'}`}><LoadingWidget /></div>;
  }

  if (user && user.role === 'superadmin' && sessionState === 'waiting_approval') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-gray-50 text-slate-900'}`}>
        <Card className="w-full max-w-lg p-12 rounded-[48px] text-center space-y-6 shadow-2xl border-none bg-white dark:bg-slate-900 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-amber-500 animate-pulse" />
          <div className="w-24 h-24 bg-amber-500/10 text-amber-500 rounded-[32px] flex items-center justify-center mx-auto mb-4">
             <Lock className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-black tracking-tight">در انتظار تایید</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium leading-loose">
            سیستم در حال استفاده توسط دستگاه دیگری است. جهت ورود امن، لطفاً در دستگاه قبلی خود، درخواست ورود جدید را تایید کنید.
          </p>
          <div className="pt-6">
            <Button onClick={() => signOut(auth)} variant="ghost" className="text-amber-500 font-black hover:bg-amber-50">توقف و خروج</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (user && user.role === 'deactivated') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-gray-50 text-slate-900'}`}>
        <Card className="w-full max-w-lg p-12 rounded-[48px] text-center space-y-6 shadow-2xl border-none bg-white dark:bg-slate-900 relative overflow-hidden border border-red-100 dark:border-red-950/30">
          <div className="absolute top-0 left-0 w-full h-2 bg-red-600" />
          <div className="w-24 h-24 bg-red-500/10 text-red-600 rounded-[32px] flex items-center justify-center mx-auto mb-4 animate-bounce" style={{ animationDuration: '4s' }}>
             <AlertTriangle className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-red-600 dark:text-red-400">حساب کاربری غیرفعال شده است</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium leading-loose text-sm max-w-sm mx-auto">
            این حساب کاربری پیش‌فرض به دلایل ارتقای امنیتی سامانه، غیرفعال گردیده است. لطفاً با استفاده از ایمیل اختصاصی جدید و اختصاصی مدیریت وارد شوید.
          </p>
          <div className="pt-6">
            <Button onClick={() => signOut(auth)} className="w-full h-14 bg-red-600 hover:bg-red-500 text-white dark:text-white font-black rounded-2xl shadow-lg shadow-red-600/20 active:scale-95 text-xs">
              <LogOut className="w-4 h-4 ml-2 inline" />
              <span>خروج از حساب غیرفعال شده</span>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!user) {
    return <Login isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />;
  }

  // Mandatory security credentials check for SuperAdmins using defaults
  if (user.role === 'superadmin' && (user.email === 'admin1@admin.com' || !user.hasChangedCredentials)) {
    return (
      <ToastProvider>
        <div className={`min-h-screen flex items-center justify-center p-6 transition-colors ${isDarkMode ? 'bg-slate-950' : 'bg-gray-50'}`}>
          <AdminCredentialsSecurator 
            user={user} 
            onDone={(newEmail) => {
              setUser(prev => prev ? { ...prev, email: newEmail, hasChangedCredentials: true } : null);
            }} 
            isDarkMode={isDarkMode} 
            setIsDarkMode={setIsDarkMode}
          />
        </div>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      {pendingDevice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md p-4 animate-in slide-in-from-top-10">
           <Card className="p-6 bg-white dark:bg-slate-900 border-2 border-amber-500 shadow-2xl shadow-amber-500/20 text-center rounded-[32px]">
             <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
             <h3 className="text-xl font-black mb-2 dark:text-white">تلاش برای ورود جدید</h3>
             <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">یک دستگاه جدید قصد ورود به پنل مدیریت کل را دارد. آیا تایید می‌کنید؟ در صورت تایید، شما از سیستم خارج خواهید شد.</p>
             <div className="flex gap-4">
               <Button onClick={approvePending} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-[16px]">تایید و خروج</Button>
               <Button onClick={rejectPending} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-[16px]">رد درخواست</Button>
             </div>
           </Card>
        </div>
      )}
      <Router>
        <Layout user={user} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode}>
          <Routes>
            {user.role === 'superadmin' ? (
              <>
                <Route path="/admin/dashboard" element={<SuperAdminDashboard user={user} />} />
                <Route path="/admin/logs" element={<LogsView user={user} />} />
                <Route path="/admin/chat" element={<AIChatView user={user} />} />
                <Route path="/admin/settings" element={<SettingsView user={user} />} />
                <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
              </>
            ) : (
              <>
                <Route path="/store/dashboard" element={<StoreDashboard user={user} />} />
                <Route path="/store/products" element={<ProductsView user={user} />} />
                <Route path="/store/customers" element={<CustomersView user={user} />} />
                <Route path="/store/sales" element={<SalesView user={user} />} />
                <Route path="/store/transactions" element={<TransactionsView user={user} />} />
                <Route path="/store/debts" element={<DebtsView user={user} />} />
                <Route path="/store/reports" element={<ReportsView user={user} />} />
                <Route path="/store/orders" element={<OrdersView user={user} />} />
                <Route path="/store/chat" element={<ChatView user={user} />} />
                <Route path="*" element={<Navigate to="/store/dashboard" replace />} />
              </>
            )}
          </Routes>
        </Layout>
      </Router>
    </ToastProvider>
  );
}

