import React, { useState, useEffect, useRef } from 'react';
import { User, Shop, Sale, Customer, Product } from '../../types';
import { collection, query, where, getDocs, limit, orderBy, doc, getDoc, setDoc } from 'firebase/firestore';
import { db, logEvent, auth } from '../../firebase';
import { Card, Button, TextField, LoadingWidget } from '../../components';
import { Send, Bot, User as UserIcon, Sparkles, MessageSquare, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Markdown from 'react-markdown';

// Define OperationType and FirestoreErrorInfo locally as per skill instructions if not available globally
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error('خطا در برقراری ارتباط با سرور. دسترسی غیرمجاز است.');
}

export default function ChatView({ user }: { user: User }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [shop, setShop] = useState<Shop | null>(null);
  const [apiKeys, setApiKeys] = useState<any[]>([]); // Assuming keys are needed for AI logic
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user.shopId) {
      const fetchShop = async () => {
        try {
          const docSnap = await getDoc(doc(db, 'shops', user.shopId!));
          if (docSnap.exists()) {
            setShop({ id: docSnap.id, ...docSnap.data() } as Shop);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, 'shops/' + user.shopId);
        }
      };
      fetchShop();
    }
  }, [user.shopId]);

  useEffect(() => {
    // Read the configured geminiApiKey from the shop settings (configured by Admin)
    if (shop?.geminiApiKey) {
      setApiKeys([{ key: shop.geminiApiKey, model: 'gemini-3.5-flash', provider: 'Google Gemini' }]);
    } else {
      setApiKeys([]);
    }
  }, [shop]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading || apiKeys.length === 0) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // Gather some context for the AI
      const salesSnap = await getDocs(query(collection(db, 'sales'), where('shopId', '==', user.shopId), orderBy('createdAt', 'desc'), limit(10)));
      const productsSnap = await getDocs(query(collection(db, 'products'), where('shopId', '==', user.shopId), limit(50)));
      
      const context = {
        shopName: shop?.name,
        recentSales: salesSnap.docs.map(d => ({ amount: d.data().totalAmount, date: d.data().createdAt })),
        productsCount: productsSnap.size,
        inventory: productsSnap.docs.map(d => ({ name: d.data().name, qty: d.data().quantity }))
      };

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          keys: apiKeys,
          context
        })
      });

      let data: any = {};
      try {
        data = await response.json();
      } catch (jsonErr) {
        throw new Error('پاسخ سرور قالب معتبری ندارد.');
      }

      if (!response.ok) {
        throw new Error(data.error || 'خطای سرور رخ داد.');
      }

      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        
        // Log AI action to Firestore Logs database
        await logEvent({
          type: 'shop',
          shopId: user.shopId,
          userId: user.id,
          userEmail: user.email || 'store@domain.com',
          action: 'AI_STORE_CHAT',
          details: `چت دستیار ESH’RA: "${userMessage.substring(0, 50)}...". فروشگاه: ${shop?.name || 'مشتری'}`
        });

        // Decrement quota and update state - No longer allowed in Shop Panel
        // if (data.usedKeyIndex !== undefined && apiKeys.length > 0) {
        //   const updatedKeys = apiKeys.map((k, ind) => {
        //     if (ind === data.usedKeyIndex) {
        //       return {
        //         ...k,
        //         creditsUsed: (k.creditsUsed || 0) + 1,
        //         isValidated: true
        //       };
        //     }
        //     return k;
        //   });
        //   setApiKeys(updatedKeys);
        //   // Do not update Firestore here for shop users!
        // }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.error || 'خطایی رخ داد.' }]);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: error.message || 'خطا در ارتباط با سرور. لطفا تنظیمات کلید API را بررسی کنید.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] lg:h-[calc(100vh-200px)] max-w-4xl mx-auto rounded-[40px] overflow-hidden" dir="rtl">
      
      {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">ESH’RA؛ دستیار هوشمند شما</h2>
              <p className="text-xs text-blue-100 font-medium">آماده برای تحلیل و کمک به مدیریت فروشگاه</p>
            </div>
          </div>
        </div>

        {apiKeys.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
            <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 rounded-full flex items-center justify-center mb-6">
              <Sparkles className="w-10 h-10 text-rose-500" />
            </div>
            <h2 className="text-xl font-black mb-2 dark:text-white">دستیار فعال نیست</h2>
            <p className="text-gray-500 dark:text-slate-400 max-w-md mb-6 font-medium leading-loose text-sm">
              در حال حاضر کلید API هوش مصنوعی برای فروشگاه شما تنظیم نشده است. لطفا با مدیر پلتفرم تماس بگیرید.
            </p>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 space-y-4">
                  <MessageSquare className="w-12 h-12 opacity-20" />
                  <p className="text-sm font-medium">چطور می‌توانم امروز به شما کمک کنم؟</p>
                  <div className="grid grid-cols-2 gap-2 max-w-sm">
                    {['وضعیت فروش امروز چطوره؟', 'چه محصولاتی رو به اتمامه؟', 'تحلیلی از بدهکاران بده', 'پیشنهاد برای افزایش فروش'].map(q => (
                      <button 
                        key={q} 
                        onClick={() => setInput(q)}
                        className="px-3 py-2 text-[10px] bg-gray-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-600 dark:text-slate-300 rounded-lg border border-gray-100 dark:border-slate-700 transition-all font-bold"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'flex-row' : 'flex-row-reverse'}`}>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20'}`}>
                        {m.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>
                      <div className={`p-4 rounded-[24px] text-sm leading-relaxed shadow-sm ${
                        m.role === 'user' 
                          ? 'bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white rounded-tr-none border border-slate-100 dark:border-slate-700' 
                          : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tl-none font-medium'
                      }`}>
                        <Markdown>{m.content}</Markdown>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
              {loading && (
                <div className="flex justify-end">
                  <div className="flex gap-3 max-w-[85%] flex-row-reverse">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center animate-pulse">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-[24px] rounded-tl-none shadow-sm flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-6 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex gap-3 relative"
              >
                <TextField 
                  value={input}
                  onChange={(e: any) => setInput(e.target.value)}
                  placeholder="سوال خود را اینجا بنویسید..."
                  className="flex-1 w-full"
                  autoComplete="off"
                />
                <Button 
                  disabled={loading || !input.trim()}
                  className="h-[46px] w-[46px] mt-6 rounded-xl flex items-center justify-center p-0 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 shrink-0"
                >
                  <Send className="w-5 h-5 rotate-180" />
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
  );
}
