import React from 'react';

const Toasts = ({ toasts }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className='fixed inset-x-0 top-6 z-50 flex justify-center px-4'>
      <div className='w-full max-w-2xl space-y-3'>
        {toasts.map((t) => (
          <div
            key={t.id}
            role='status'
            className={`rounded-3xl border px-5 py-3 shadow-xl backdrop-blur-sm ${
              t.type === 'error'
                ? 'bg-rose-50/95 border-rose-200 text-rose-900'
                : 'bg-emerald-50/95 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className='flex items-center gap-3'>
              <span className='text-xl'>{t.type === 'error' ? '⚠️' : '✅'}</span>
              <p className='text-sm font-medium leading-6'>{t.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Toasts;
