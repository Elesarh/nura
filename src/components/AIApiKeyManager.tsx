// AI API Key Manager component stub
import React from 'react';

export interface APIKey {
  key: string;
  model: string;
  name?: string;
}

export function AIApiKeyManager({ keys, onKeysChange }: any) {
  return (
    <div className="space-y-4">
      <h3 className="font-medium">مدیریت کلیدهای API</h3>
      <p className="text-sm text-gray-500">کلیدهای API خود را برای سرویس‌های هوش مصنوعی اضافه کنید</p>
      {(!keys || keys.length === 0) && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-lg text-sm">
          هیچ کلید API تنظیم نشده است. برای استفاده از دستیار هوشمند، لطفاً یک کلید اضافه کنید.
        </div>
      )}
    </div>
  );
}

export default AIApiKeyManager;
