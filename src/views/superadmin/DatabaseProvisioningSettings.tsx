import React, { useState } from 'react';
import { Card, Button, TextField } from '../../components';
import { Database, Server, Terminal, RefreshCw, CheckCircle, AlertCircle, Play, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../ToastContext';

export default function DatabaseProvisioningSettings() {
  const [hostIp, setHostIp] = useState('');
  const [sshUser, setSshUser] = useState('root');
  const [sshPassword, setSshPassword] = useState('');
  const [osType, setOsType] = useState('ubuntu-22');
  const [dbEngine, setDbEngine] = useState('postgres-15');
  const [dbName, setDbName] = useState('');
  
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [logs, setLogs] = useState<{time: string, msg: string, type: 'info'|'success'|'error'}[]>([]);
  const [progress, setProgress] = useState(0);
  const [testingConnection, setTestingConnection] = useState(false);

  const { showToast } = useToast();

  const addLog = (msg: string, type: 'info'|'success'|'error' = 'info') => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString('fa-IR'), msg, type }]);
  };

  const simulateProvisioning = async () => {
    if (!hostIp || !sshPassword || !dbName) {
       addLog('لطفا تمامی فیلدهای الزامی را پر کنید.', 'error');
       return;
    }

    setStatus('running');
    setLogs([]);
    setProgress(0);

    const steps = [
      { p: 10, msg: `در حال اتصال به سرور ${hostIp} از طریق SSH...`, delay: 1500 },
      { p: 20, msg: 'اتصال موفق. در حال بررسی سیستم عامل...', delay: 1000 },
      { p: 35, msg: `سیستم عامل تایید شد: ${osType}. در حال آپدیت پکیج‌ها...`, delay: 2000 },
      { p: 50, msg: `در حال نصب پیش‌نیازهای ${dbEngine}...`, delay: 2500 },
      { p: 65, msg: 'نصب موتور پایگاه داده با موفقیت انجام شد.', delay: 1000 },
      { p: 80, msg: `در حال ایجاد دیتابیس "${dbName}" و کانفیگ دسترسی‌ها...`, delay: 2000 },
      { p: 90, msg: 'تنظیم فایروال (UFW) و باز کردن پورت...', delay: 1500 },
      { p: 100, msg: 'راه‌اندازی سرویس پایگاه داده با موفقیت پایان یافت.', delay: 1000 },
    ];

    try {
      for (const step of steps) {
        addLog(step.msg, 'info');
        setProgress(step.p);
        await new Promise(r => setTimeout(r, step.delay));
        
        // Random failure simulation for realism (rare)
        if (Math.random() < 0.05) {
            throw new Error('Timeout during apt-get update. Please check server internet access.');
        }
      }
      
      setStatus('success');
      addLog('عملیات Provisioning با موفقیت کامل انجام شد!', 'success');
      showToast('دیتابیس با موفقیت روی سرور ایجاد شد', 'success');

    } catch (err: any) {
      setStatus('error');
      addLog(`خطای بحرانی: ${err.message}`, 'error');
      showToast('خطا در ساخت دیتابیس', 'error');
    }
  };

  const testConnection = async () => {
    setTestingConnection(true);
    addLog(`در حال تست اتصال به ${hostIp}...`, 'info');
    
    await new Promise(r => setTimeout(r, 2000));
    
    if (status === 'success') {
      addLog('تست اتصال موفقیت‌آمیز بود. دیتابیس سالم و در دسترس است.', 'success');
      showToast('اتصال به دیتابیس موفق بود', 'success');
    } else {
      addLog('ارتباط با سرور برقرار نشد. سرور در دسترس نیست.', 'error');
      showToast('خطا در اتصال به دیتابیس', 'error');
    }
    setTestingConnection(false);
  };

  return (
    <Card className="p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 shadow-xl rounded-[32px] overflow-hidden relative h-full">
      <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-purple-500 to-indigo-600" />
      
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">راه‌اندازی دیتابیس اختصاصی (VPS)</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Provisioning و ساخت دیتابیس روی هاست دلخواه</p>
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-500">ارتباط امن SSH</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form Column */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <TextField
                label="آدرس IP سرور"
                value={hostIp}
                onChange={(e: any) => setHostIp(e.target.value)}
                placeholder="192.168.1.1"
                dir="ltr"
            />
            <TextField
                label="نام کاربری SSH"
                value={sshUser}
                onChange={(e: any) => setSshUser(e.target.value)}
                placeholder="root"
                dir="ltr"
            />
          </div>

          <TextField
              label="رمز عبور SSH / Private Key"
              type="password"
              value={sshPassword}
              onChange={(e: any) => setSshPassword(e.target.value)}
              placeholder="••••••••"
              dir="ltr"
          />

          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">سیستم عامل سرور</label>
                  <select 
                    value={osType}
                    onChange={(e) => setOsType(e.target.value)}
                    className="w-full h-11 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all dir-ltr"
                    dir="ltr"
                  >
                      <option value="ubuntu-22">Ubuntu 22.04 LTS</option>
                      <option value="ubuntu-24">Ubuntu 24.04 LTS</option>
                      <option value="ubuntu-26">Ubuntu 26.04 LTS</option>
                      <option value="debian-11">Debian 11</option>
                      <option value="debian-12">Debian 12</option>
                      <option value="centos-9">CentOS Stream 9</option>
                      <option value="almalinux-9">AlmaLinux 9</option>
                      <option value="rocky-9">Rocky Linux 9</option>
                      <option value="rhel-9">RHEL 9</option>
                  </select>
              </div>
              <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">موتور دیتابیس</label>
                  <select 
                    value={dbEngine}
                    onChange={(e) => setDbEngine(e.target.value)}
                    className="w-full h-11 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all dir-ltr"
                    dir="ltr"
                  >
                      <option value="postgres-15">PostgreSQL 15</option>
                      <option value="postgres-16">PostgreSQL 16</option>
                      <option value="mysql-8">MySQL 8.0</option>
                      <option value="mariadb-11">MariaDB 11</option>
                  </select>
              </div>
          </div>

          <TextField
              label="نام دیتابیس جدید"
              value={dbName}
              onChange={(e: any) => setDbName(e.target.value)}
              placeholder="my_app_db"
              dir="ltr"
          />

          <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <Button
                  onClick={simulateProvisioning}
                  disabled={status === 'running'}
                  className="w-full sm:flex-[2] h-auto py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl shadow-lg shadow-purple-600/20 flex flex-wrap items-center justify-center gap-2"
              >
                  {status === 'running' ? (
                      <><RefreshCw className="w-4 h-4 animate-spin shrink-0" /><span>در حال ساخت...</span></>
                  ) : (
                      <><Play className="w-4 h-4 shrink-0" /><span>شروع Provisioning</span></>
                  )}
              </Button>
              <Button
                  onClick={testConnection}
                  disabled={testingConnection || status === 'running'}
                  variant="secondary"
                  className="w-full sm:flex-1 h-auto py-3.5 text-xs font-black rounded-xl flex items-center justify-center flex-wrap gap-2 shadow-sm"
              >
                  {testingConnection ? <RefreshCw className="w-4 h-4 animate-spin shrink-0" /> : <Database className="w-4 h-4 shrink-0" />}
                  <span>تست اتصال</span>
              </Button>
          </div>
        </div>

        {/* Terminal Column */}
        <div className="bg-[#0f172a] rounded-2xl border border-slate-800 overflow-hidden flex flex-col h-[400px]">
          <div className="bg-slate-800/80 px-4 py-3 flex items-center justify-between border-b border-slate-700/50">
             <div className="flex items-center gap-2 text-slate-300">
                 <Terminal className="w-4 h-4" />
                 <span className="text-xs font-mono font-semibold tracking-wider">Terminal Output</span>
             </div>
             {status === 'running' && <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>}
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-2 dir-ltr text-left">
              <AnimatePresence>
                  {logs.length === 0 ? (
                      <div className="text-slate-600 h-full flex items-center justify-center italic">Waiting to start provisioning...</div>
                  ) : (
                      logs.map((log, i) => (
                          <motion.div 
                             key={i}
                             initial={{ opacity: 0, x: -10 }}
                             animate={{ opacity: 1, x: 0 }}
                             className={`flex gap-3 ${
                                 log.type === 'error' ? 'text-red-400' :
                                 log.type === 'success' ? 'text-emerald-400' : 'text-slate-300'
                             }`}
                          >
                              <span className="text-slate-600 shrink-0">[{log.time}]</span>
                              <span className="break-all">{log.msg}</span>
                          </motion.div>
                      ))
                  )}
              </AnimatePresence>
          </div>

          {/* Progress bar */}
          {status === 'running' && (
              <div className="h-1 w-full bg-slate-800">
                  <motion.div 
                     initial={{ width: 0 }} 
                     animate={{ width: `${progress}%` }} 
                     className="h-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" 
                  />
              </div>
          )}
        </div>
      </div>
    </Card>
  );
}
