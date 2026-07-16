import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import asyncHandler from "express-async-handler";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Global AI Providers config storage
  const providersFilePath = path.join(process.cwd(), 'ai_providers.json');
  
  app.post("/api/config/ai-providers", asyncHandler(async (req, res) => {
    const { providers } = req.body;
    try {
      fs.writeFileSync(providersFilePath, JSON.stringify(providers, null, 2));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "خطا در ذخیره تنظیمات" });
    }
  }));

  const getGlobalProviders = () => {
    try {
      if (fs.existsSync(providersFilePath)) {
        return JSON.parse(fs.readFileSync(providersFilePath, 'utf8'));
      }
    } catch (e) {
      console.error('Error reading global AI providers file', e);
    }
    return [];
  };

  // Safe model mapping to prevent legacy or prohibited models from throwing exceptions
  const mapModelName = (modelName: string): string => {
    if (!modelName) return "gemini-3.5-flash";
    const lower = modelName.toLowerCase();
    if (lower.includes("pro")) {
      return "gemini-3.1-pro-preview";
    }
    return "gemini-3.5-flash";
  };

  // Validate API Key endpoint
  app.post("/api/ai/test", asyncHandler(async (req, res) => {
    const { apiKey, model } = req.body;
    const startTime = Date.now();
    try {
      const finalKey = apiKey || process.env.GEMINI_API_KEY;
      if (!finalKey || finalKey === "MY_GEMINI_API_KEY") {
        res.status(400).json({ error: "کلید API جمی‌آی نمونه (MY_GEMINI_API_KEY) معتبر نیست. لطفاً یک کلید واقعی ثبت کنید." });
        return;
      }

      const targetModel = mapModelName(model);
      const ai = new GoogleGenAI({ 
        apiKey: finalKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      const response = await ai.models.generateContent({
        model: targetModel,
        contents: "Ping",
      });
      const latency = Date.now() - startTime;
      if (response.text) {
        res.json({ success: true, message: "ارتباط با موفقیت برقرار شد", latency });
      } else {
        res.status(400).json({ error: "پاسخ دریافتی نامعتبر است" });
      }
    } catch (error: any) {
      const errMsg = error.message || "خطا در بررسی کلید API. نامعتبر است یا منقضی شده است.";
      res.status(400).json({ error: errMsg });
    }
  }));

  // Proxy endpoint to test custom providers (OpenRouter, 9Router, Ollama) and fetch models
  app.post("/api/ai/test-provider", asyncHandler(async (req, res) => {
    const { provider } = req.body;
    if (!provider || !provider.url) {
      res.status(400).json({ error: "اطلاعات سرویس ناقص است." });
      return;
    }

    try {
      let endpoint = provider.url;
      let headers: any = {
        'Content-Type': 'application/json'
      };

      if (provider.type === 'openai' || provider.type === 'openrouter') {
        endpoint = endpoint.replace(/\/$/, '') + '/models';
        if (provider.key) {
           headers['Authorization'] = `Bearer ${provider.key}`;
        }
        if (provider.type === 'openrouter') {
          headers['HTTP-Referer'] = 'https://eshra.ai';
          headers['X-Title'] = 'ESHRA AI';
        }
      } else if (provider.type === 'ollama') {
        endpoint = endpoint.replace(/\/$/, '') + '/api/tags';
      } else if (provider.type === 'cloudflare') {
        if (provider.key) headers['Authorization'] = `Bearer ${provider.key}`;
        endpoint = endpoint.replace(/\/$/, '') + '/@cf/meta/llama-2-7b-chat-int8';
      }

      const response = await fetch(endpoint, {
        method: 'GET',
        headers
      });

      if (response.ok) {
        const data = await response.json();
        let fetchedModels: string[] = [];
        
        if (provider.type === 'openai' || provider.type === 'openrouter') {
          fetchedModels = data.data ? data.data.map((m: any) => m.id) : [];
        } else if (provider.type === 'ollama') {
          fetchedModels = data.models ? data.models.map((m: any) => m.name) : [];
        }

        res.json({ success: true, models: fetchedModels });
      } else {
        let errMessage = `HTTP ${response.status}`;
        try {
           const errData = await response.json();
           if (errData.error) errMessage = typeof errData.error === 'string' ? errData.error : errData.error.message || JSON.stringify(errData.error);
        } catch(e) {}
        res.status(response.status).json({ error: `خطا در ارتباط با سرور: ${errMessage}` });
      }
    } catch (error: any) {
      res.status(500).json({ error: `خطای شبکه: ${error.message}` });
    }
  }));

  const tryGenerateWithKeys = async ({ keys, systemInstruction, finalPrompt, baseModel }: any) => {
    let lastError = null;

    // 1. Try User configured Gemini Keys
    const geminiKeys = (keys && keys.length > 0) ? keys.map((k:any) => ({ ...k, type: 'gemini' })) : [];
    if (geminiKeys.length === 0 && process.env.GEMINI_API_KEY) {
      geminiKeys.push({ key: process.env.GEMINI_API_KEY, type: 'gemini', model: baseModel });
    }

    // 2. Load Global AI Providers as fallback
    const globalProviders = getGlobalProviders();

    // 3. Combine them in order (User Gemini first, then Global Providers)
    const allProviders = [...geminiKeys, ...globalProviders];

    if (allProviders.length === 0) {
      throw new Error("هیچ کلید API یا ارائه‌دهنده سرویسی تعریف نشده است.");
    }

    for (let i = 0; i < allProviders.length; i++) {
        const provider = allProviders[i];
        
        if (provider.key === "MY_GEMINI_API_KEY") {
          lastError = new Error("کلید جمی‌آی نمونه فعال است. لطفاً کلید معتبر خود را اضافه کنید.");
          continue;
        }

        try {
            if (provider.type === 'gemini' || !provider.type) {
              const ai = new GoogleGenAI({ 
                apiKey: provider.key,
                httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
              });
              
              const rawModel = provider.model || baseModel;
              const targetModel = mapModelName(rawModel);
        
              const response = await ai.models.generateContent({
                model: targetModel,
                config: systemInstruction ? { systemInstruction } : undefined,
                contents: finalPrompt,
              });
              
              if (response.text) {
                return { text: response.text, usedKeyIndex: i < geminiKeys.length ? i : undefined };
              }
            } 
            else if (provider.type === 'openai' || provider.type === 'openrouter') {
              // OpenAI compatible API Call
              const endpoint = provider.url.replace(/\/$/, '') + '/chat/completions';
              
              const messages = [];
              if (systemInstruction) {
                messages.push({ role: 'system', content: systemInstruction });
              }
              messages.push({ role: 'user', content: finalPrompt });

              const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${provider.key}`
                },
                body: JSON.stringify({
                  model: provider.model || 'gpt-3.5-turbo', // Many OpenAI endpoints expect a model name, though openrouter handles it
                  messages: messages,
                  temperature: 0.7
                })
              });

              if (!response.ok) throw new Error(`OpenAI Provider Error: ${response.status}`);
              const data = await response.json();
              if (data.choices && data.choices.length > 0 && data.choices[0].message?.content) {
                return { text: data.choices[0].message.content, usedKeyIndex: undefined };
              }
            }
            else if (provider.type === 'ollama') {
              // Ollama format
              const endpoint = provider.url.replace(/\/$/, '') + '/api/chat';
              
              const messages = [];
              if (systemInstruction) {
                messages.push({ role: 'system', content: systemInstruction });
              }
              messages.push({ role: 'user', content: finalPrompt });

              const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  model: provider.model || 'llama3', 
                  messages: messages,
                  stream: false
                })
              });

              if (!response.ok) throw new Error(`Ollama Error: ${response.status}`);
              const data = await response.json();
              if (data.message && data.message.content) {
                return { text: data.message.content, usedKeyIndex: undefined };
              }
            }
            else {
              throw new Error(`Unsupported provider type: ${provider.type}`);
            }
        } catch (error: any) {
            console.error(`Error with provider at index ${i} (${provider.name || 'gemini'}):`, error.message);
            lastError = error;
            // continue to the next provider
        }
    }
    
    throw new Error(lastError?.message || "تمامی سرویس‌های هوش مصنوعی (اصلی و جایگزین) ناموفق بودند.");
  };

  app.post("/api/gemini/chat", asyncHandler(async (req, res) => {
    const { prompt, history, keys } = req.body;

    try {
      const formattedHistory = history ? history.map((m: any) => `${m.role === 'user' ? 'کاربر' : 'هوش مصنوعی'}: ${m.text}`).join('\n') : '';
      const finalPrompt = `تاریخچه گفتگو:\n${formattedHistory}\n\nپیام جدید: ${prompt}`;

      const sysInst = "شما دستیار هوشمند مدیر کل سامانه هستید که با نام «ESH’RA» (اِشرا) شناخته می‌شوید. به مدیر در مدیریت لاگ‌ها، پیگیری مشکلات مشکوک و ارائه راهکارهای امنیتی و مدیریتی کمک کنید.";
      
      const result = await tryGenerateWithKeys({
        keys,
        systemInstruction: sysInst,
        finalPrompt,
        baseModel: "gemini-3.5-flash"
      });

      res.json({ text: result.text || "متاسفانه پاسخی دریافت نشد.", usedKeyIndex: result.usedKeyIndex });
    } catch (error: any) {
      console.error("Gemini AI Error:", error);
      res.status(500).json({ error: error.message || "خطا در برقراری ارتباط با هوش مصنوعی. لطفاً تنظیمات کلید را بررسی کنید." });
    }
  }));


  // Store Admin AI Chat
  app.post("/api/ai/chat", asyncHandler(async (req, res) => {
    const { message, context, keys } = req.body;
    try {
      const finalPrompt = `پیام کاربر: ${message}\nاطلاعات: ${JSON.stringify(context || {})}`;
      const sysInst = "شما یک دستیار هوشمند فروشگاه هستید. نام شما «ESH’RA» (اِشرا) است. شما به صاحب فروشگاه در مدیریت، تحلیل داده‌ها و بهبود فروش کمک می‌کنید.";
      
      const result = await tryGenerateWithKeys({
        keys,
        systemInstruction: sysInst,
        finalPrompt,
        baseModel: "gemini-3.5-flash"
      });

      res.json({ reply: result.text || "متاسفانه پاسخی دریافت نشد.", usedKeyIndex: result.usedKeyIndex });
    } catch (error: any) {
      console.error("Gemini AI Error:", error);
      res.status(500).json({ error: error.message || "خطا در برقراری ارتباط با هوش مصنوعی. لطفاً تنظیمات کلید را بررسی کنید." });
    }
  }));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
