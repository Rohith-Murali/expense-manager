import React from 'react';

const Modal = ({ isOpen, title, children, onConfirm, onCancel, confirmLabel = 'Confirm' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium">{title}</h3>
          <button className="text-gray-500" onClick={onCancel}>✕</button>
        </div>
        <div className="mb-4">{children}</div>
        <div className="flex justify-end gap-2">
          <button className="px-3 py-2 rounded bg-gray-100" onClick={onCancel}>Cancel</button>
          <button className="px-3 py-2 rounded bg-red-600 text-white" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
