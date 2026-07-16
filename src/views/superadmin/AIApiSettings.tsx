import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Card, Button, TextField } from '../../components';
import { Network, Server, Key, Plus, Trash2, CheckCircle, XCircle, RefreshCw, Activity, Link as LinkIcon } from 'lucide-react';
import { useToast } from '../../ToastContext';

export default function AIApiSettings() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pingStates, setPingStates] = useState<Record<string, {status: 'testing'|'success'|'error', ping?: number, message?: string}>>({});
  const [providerModels, setProviderModels] = useState<Record<string, string[]>>({});
  
  const { showToast } = useToast();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    const loadProviders = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'config', 'ai_providers'));
        if (docSnap.exists()) {
          setProviders(docSnap.data().providers || []);
        } else {
          setProviders([
            { id: 'openrouter', name: 'OpenRouter', url: 'https://openrouter.ai/api/v1', key: '', type: 'openai' },
            { id: 'ollama', name: 'Ollama (Local)', url: 'http://localhost:11434', key: '', type: 'ollama' },
            { id: 'cloudflare', name: 'Cloudflare AI', url: 'https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT_ID/ai/run', key: '', type: 'cloudflare' },
            { id: 'opencode', name: 'OpenCode', url: 'https://api.opencode.com/v1', key: '', type: 'openai' },
            { id: '9router', name: '9Router', url: 'https://api.9router.com/v1', key: '', type: 'openai' }
          ]);
        }
      } catch (err) {
        console.error('Error loading AI providers', err);
      }
    };
    loadProviders();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await setDoc(doc(db, 'config', 'ai_providers'), {
        providers,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      // Also save to backend for fallback usage
      await fetch('/api/config/ai-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providers })
      });
      
      showToast('تنظیمات API ها با موفقیت ذخیره شد', 'success');
    } catch (err) {
      console.error(err);
      showToast('خطا در ذخیره تنظیمات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProvider = () => {
    const newId = 'custom_' + Date.now();
    setProviders([...providers, { id: newId, name: 'سرویس جدید', url: '', key: '', type: 'openai' }]);
  };

  const handleRemoveProvider = (id: string) => {
    setProviders(providers.filter(p => p.id !== id));
  };

  const handleChange = (id: string, field: string, value: string) => {
    setProviders(providers.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handlePing = async (provider: any) => {
    setPingStates(prev => ({ ...prev, [provider.id]: { status: 'testing' } }));
    const startTime = Date.now();

    try {
      const response = await fetch('/api/ai/test-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      });

      const ping = Date.now() - startTime;
      const data = await response.json();

      if (response.ok && data.success) {
        let fetchedModels = data.models || [];

        if (fetchedModels.length > 0) {
          setProviderModels(prev => ({ ...prev, [provider.id]: fetchedModels }));
          setPingStates(prev => ({ ...prev, [provider.id]: { status: 'success', ping, message: `اتصال موفق (${fetchedModels.length} مدل پیدا شد)` } }));
          
          // Automatically set first model if none selected
          if (!provider.model) {
             handleChange(provider.id, 'model', fetchedModels[0]);
          }
        } else {
          setPingStates(prev => ({ ...prev, [provider.id]: { status: 'success', ping, message: 'اتصال موفق (بدون لیست مدل)' } }));
        }
      } else {
        setPingStates(prev => ({ ...prev, [provider.id]: { status: 'error', ping, message: data.error || 'خطا در ارتباط' } }));
      }
    } catch (err: any) {
      const ping = Date.now() - startTime;
      setPingStates(prev => ({ ...prev, [provider.id]: { status: 'error', ping, message: 'عدم برقراری ارتباط با سرور محلی' } }));
    }
  };

  return (
    <Card className="p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 shadow-xl rounded-[32px] overflow-hidden relative">
      <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-purple-500 to-fuchsia-600" />
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">ارتباطات خارجی هوش مصنوعی</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">مدیریت کلیدهای API برای Ollama، OpenRouter و غیره</p>
          </div>
        </div>
        <Button onClick={handleAddProvider} variant="secondary" className="h-auto py-2.5 px-6 rounded-xl text-xs font-black gap-2 w-full sm:w-auto flex flex-wrap justify-center items-center shadow-sm">
          <Plus className="w-4 h-4 shrink-0" /> افزودن سرویس جدید
        </Button>
      </div>

      <div className="space-y-6">
        {providers.map(provider => (
          <div key={provider.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/20 relative group transition-all hover:border-purple-200 hover:dark:border-purple-900/50">
            <button 
              onClick={() => handleRemoveProvider(provider.id)}
              className="absolute top-4 left-4 p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">نام سرویس</label>
                <input
                  type="text"
                  value={provider.name}
                  onChange={(e) => handleChange(provider.id, 'name', e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-purple-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">نوع پروتکل</label>
                <select
                  value={provider.type}
                  onChange={(e) => handleChange(provider.id, 'type', e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-purple-500"
                  dir="ltr"
                >
                  <option value="openai">OpenAI Compatible (OpenRouter, 9Router, etc)</option>
                  <option value="ollama">Ollama (Local/Server)</option>
                  <option value="cloudflare">Cloudflare AI</option>
                </select>
              </div>
              <div className="space-y-1 md:col-span-1 lg:col-span-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">نام مدل (مثال: gpt-4)</label>
                <div className="relative">
                  {providerModels[provider.id] && providerModels[provider.id].length > 0 ? (
                    <select
                      value={provider.model || ''}
                      onChange={(e) => handleChange(provider.id, 'model', e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-purple-500 dir-ltr text-left"
                      dir="ltr"
                    >
                      {providerModels[provider.id].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={provider.model || ''}
                      onChange={(e) => handleChange(provider.id, 'model', e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-purple-500 dir-ltr text-left"
                      placeholder="gpt-3.5-turbo"
                      dir="ltr"
                    />
                  )}
                </div>
              </div>
              <div className="space-y-1 md:col-span-2 lg:col-span-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">آدرس پایه (Base URL)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={provider.url}
                    onChange={(e) => handleChange(provider.id, 'url', e.target.value)}
                    className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-purple-500 dir-ltr text-left"
                    dir="ltr"
                  />
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>
              <div className="space-y-1 md:col-span-2 lg:col-span-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">کلید API (API Key)</label>
                <div className="relative">
                  <input
                    type="password"
                    value={provider.key}
                    onChange={(e) => handleChange(provider.id, 'key', e.target.value)}
                    className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-purple-500 dir-ltr text-left tracking-widest placeholder:tracking-normal"
                    placeholder="sk-..."
                    dir="ltr"
                  />
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between border-t border-slate-200 dark:border-slate-700/50 pt-4 gap-3">
              <Button 
                variant="secondary"
                onClick={() => handlePing(provider)}
                className="h-auto py-2.5 px-6 text-xs font-black rounded-lg flex items-center justify-center flex-wrap gap-2 shadow-sm w-full sm:w-auto"
              >
                <Activity className="w-4 h-4 text-purple-500" />
                تست اتصال (Ping)
              </Button>

              {pingStates[provider.id] && (
                <div className={`flex flex-wrap items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg w-full sm:w-auto justify-center ${
                  pingStates[provider.id].status === 'testing' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
                  pingStates[provider.id].status === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                  'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                }`}>
                  {pingStates[provider.id].status === 'testing' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {pingStates[provider.id].status === 'success' && <CheckCircle className="w-3.5 h-3.5" />}
                  {pingStates[provider.id].status === 'error' && <XCircle className="w-3.5 h-3.5" />}
                  <span>{pingStates[provider.id].message || 'در حال بررسی...'}</span>
                  {pingStates[provider.id].ping && <span className="opacity-75" dir="ltr">({pingStates[provider.id].ping}ms)</span>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/40">
        <Button
          onClick={handleSave}
          disabled={loading}
          className="w-full md:w-auto h-auto py-3.5 px-8 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl shadow-lg shadow-purple-600/20 flex flex-wrap items-center justify-center gap-2"
        >
          <Server className="w-4 h-4 shrink-0" />
          <span className="text-center">{loading ? 'در حال ذخیره...' : 'ذخیره کلیدها و تنظیمات API'}</span>
        </Button>
      </div>
    </Card>
  );
}
