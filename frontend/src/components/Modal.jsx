import React from 'react';

const Modal = ({
  isOpen,
  title,
  children,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  confirmDisabled = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
      <div className='w-full max-w-md rounded-xl bg-white dark:bg-slate-800 p-5 shadow-xl text-gray-900 dark:text-gray-100'>
        <div className='flex items-center justify-between mb-3'>
          <h3 className='text-lg font-medium'>{title}</h3>
          <button className='rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700' onClick={onCancel}>
            ✕
          </button>
        </div>
        <div className='mb-4'>{children}</div>
        <div className='flex justify-end gap-2'>
          <button className='btn btn-outline' onClick={onCancel}>
            Cancel
          </button>
          <button
            className='btn btn-danger disabled:cursor-not-allowed disabled:opacity-50'
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
