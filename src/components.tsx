import React from 'react';

// Stub components for NURA - will be properly implemented later
export function Card({ children, className, ...props }: any) {
  return <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className || ''}`} {...props}>{children}</div>;
}

export function DataTable({ columns, data, ...props }: any) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" {...props}>
        {columns && <thead><tr>{columns.map((col: any, i: number) => <th key={i} className="px-4 py-2 text-right">{col.header || col}</th>)}</tr></thead>}
        <tbody>
          {data?.map((row: any, i: number) => (
            <tr key={i} className="border-t border-gray-200 dark:border-gray-700">
              {columns?.map((col: any, j: number) => <td key={j} className="px-4 py-2">{row[col.accessor || col]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LoadingWidget({ message }: any) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400">{message || 'در حال بارگذاری...'}</p>
      </div>
    </div>
  );
}

export function ErrorWidget({ message, onRetry }: any) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center text-red-500">
        <p className="mb-2">⚠️ {message || 'خطایی رخ داده است'}</p>
        {onRetry && <button onClick={onRetry} className="text-sm underline">تلاش مجدد</button>}
      </div>
    </div>
  );
}

export function Button({ children, onClick, variant, className, disabled, ...props }: any) {
  const baseClass = 'px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50';
  const variants: any = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    secondary: 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    outline: 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
  };
  return <button onClick={onClick} disabled={disabled} className={`${baseClass} ${variants[variant || 'primary']} ${className || ''}`} {...props}>{children}</button>;
}

export function TextField({ label, error, ...props }: any) {
  return (
    <div className="mb-4">
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      <input className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white ${error ? 'border-red-500' : 'border-gray-300'}`} {...props} />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}