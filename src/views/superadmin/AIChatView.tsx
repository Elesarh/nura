import React, { useState } from 'react';
import { User } from '../../types';
import { Card, TextField, Button } from '../../components';
import { Bot, Send, User as UserIcon, Settings, X } from 'lucide-react';
import { useToast } from '../../ToastContext';
import AIApiKeyManager, { APIKey } from '../../components/AIApiKeyManager';
import { motion, AnimatePresence } from 'framer-motion';
import { db, logEvent } from '../../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function AIChatView({ user }: { user: User }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: 'سلام مدیر عزیز! من ESH’RA، دستیار هوشمند شما هستم. می‌تونم در بررسی لاگ‌ها، پیگیری هشدارهای مشکوک و مدیریت بهتر سیستم به شما کمک کنم.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [globalProviders, setGlobalProviders] = useState<any[]>([]);
  const { showToast } = useToast();

  React.useEffect(() => {
    const loadGlobalProviders = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'config', 'ai_providers'));
        if (docSnap.exists()) {
          setGlobalProviders(docSnap.data().providers || []);
        }
      } catch (err) {
        console.error('Failed to load global AI providers', err);
      }
    };
    loadGlobalProviders();
  }, []);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMsg, history: messages, keys: apiKeys })
      });
      if (!res.ok) {
        let serverErrorMsg = 'خطا در ارتباط با هوش مصنوعی. در صورت عدم تعریف کلید معتبر، ارتباط لغو می شود.';
        try {
          const errData = await res.json();
          if (errData && errData.error) {
            serverErrorMsg = errData.error;
          }
        } catch (jsonErr) {
          // ignore parsing error
        }
        throw new Error(serverErrorMsg);
      }
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'model', text: data.text }]);
      
      // Save AI Chat Audit Log
      await logEvent({
        type: 'admin',
        userId: user.id,
        userEmail: user.email || 'admin@store.com',
        action: 'AI_ASSISTANT_CHAT',
        details: `درخواست چت هوشمند: "${userMsg.substring(0, 50)}...". مدل پاسخ‌گو: ${data.modelUsed || 'Gemini'}`
      });

      // Update remaining credits in user_api_keys collection
      if (data.usedKeyIndex !== undefined && apiKeys.length > 0) {
        const updatedKeys = apiKeys.map((k, ind) => {
          if (ind === data.usedKeyIndex) {
            return {
              ...k,
              creditsUsed: (k.creditsUsed || 0) + 1,
              isValidated: true
            };
          }
          return k;
        });
        setApiKeys(updatedKeys);
        await setDoc(doc(db, 'user_api_keys', user.id), { keys: updatedKeys });
      }
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'خطا در ارتباط با سرور چت. اطمینان حاصل کنید کلید API معتبر تنظیم شده است.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] min-h-[600px] flex flex-col pt-4 md:pt-8 w-full p-2 md:p-0">
      <div className="flex flex-row items-center justify-between mb-4 md:mb-6 gap-2">
        <div className="flex flex-row items-center gap-3 md:gap-4">
          <div className="p-2 md:p-3 bg-purple-600 rounded-xl md:rounded-2xl shadow-xl shadow-purple-500/20 shrink-0">
            <Bot className="text-white w-6 h-6 md:w-8 md:h-8" />
          </div>
          <div>
            <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">دستیار هوشمند ESH’RA</h2>
            <p className="text-[10px] md:text-sm text-slate-500 dark:text-slate-400 font-bold mt-0.5">مشاوره، آنالیز لاگ‌ها و بررسی موارد مشکوک</p>
          </div>
        </div>
        <Button onClick={() => setShowSettings(!showSettings)} variant="ghost" className="rounded-xl md:rounded-2xl p-2 md:p-3 h-auto shrink-0">
          <Settings className={`w-5 h-5 md:w-6 md:h-6 transition-transform ${showSettings ? 'rotate-90' : 'rotate-0'}`} />
        </Button>
      </div>

      <AnimatePresence>
        {showSettings && (
           <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-4 md:mb-6 overflow-hidden shrink-0">
             <AIApiKeyManager userId={user.id} onKeysChange={setApiKeys} />
           </motion.div>
        )}
      </AnimatePresence>

      <Card className="flex-1 flex flex-col p-4 md:p-6 rounded-[24px] md:rounded-[32px] overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 min-h-0">
        <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar pb-6 flex flex-col">
          {messages.map((msg, i) => (
            <div key={i} className={`flex items-start gap-3 md:gap-4 max-w-[90%] md:max-w-[85%] ${msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
              <div className={`shrink-0 p-2 md:p-3 rounded-xl md:rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'}`}>
                {msg.role === 'user' ? <UserIcon className="w-4 h-4 md:w-5 md:h-5" /> : <Bot className="w-4 h-4 md:w-5 md:h-5" />}
              </div>
              <div className={`p-3 md:p-4 rounded-2xl md:rounded-3xl text-xs md:text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 rounded-tr-sm' 
                  : 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 rounded-tl-sm'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-start gap-3 md:gap-4 max-w-[90%] md:max-w-[85%] self-start">
              <div className="shrink-0 p-2 md:p-3 rounded-xl md:rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                <Bot className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <div className="p-3 md:p-4 rounded-2xl md:rounded-3xl bg-slate-50 dark:bg-slate-800/50 text-slate-500 flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-150"></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-300"></div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-row gap-2 md:gap-4 shrink-0">
          <div className="flex-1">
            <TextField 
              placeholder="درخواست خود را برای هوش مصنوعی بنویسید..." 
              value={input}
              onChange={(e:any) => setInput(e.target.value)}
              disabled={loading}
              autoComplete="off"
            />
          </div>
          <Button type="submit" disabled={loading || !input.trim()} className="h-12 w-12 md:h-14 md:w-auto md:px-8 rounded-2xl md:rounded-[20px] bg-purple-600 hover:bg-purple-700 text-white font-black shadow-lg shadow-purple-500/20 shrink-0 flex items-center justify-center">
            <Send className="w-5 h-5 rtl:-scale-x-100" />
            <span className="hidden md:inline-block md:mr-2">ارسال</span>
          </Button>
        </form>
      </Card>
    </div>
  );
}
