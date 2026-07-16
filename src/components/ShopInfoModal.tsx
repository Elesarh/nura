// Shop Info Modal component stub
import React from 'react';

export function ShopInfoModal({ shop, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">اطلاعات فروشگاه</h2>
        <div className="space-y-3 text-sm">
          <div><span className="font-medium">نام:</span> {shop?.name || '—'}</div>
          <div><span className="font-medium">تلفن:</span> {shop?.phone || '—'}</div>
          <div><span className="font-medium">آدرس:</span> {shop?.address || '—'}</div>
        </div>
        <button onClick={onClose} className="mt-4 w-full py-2 bg-indigo-600 text-white rounded-lg">بستن</button>
      </div>
    </div>
  );
}
