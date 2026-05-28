import React from 'react';

const SavingModal = ({ message = 'Saving transaction...' }) => {
  return (
    <div className='fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50'>
      <div className='bg-white p-6 rounded shadow flex items-center gap-4'>
        <div className='w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin' />
        <div>
          <p className='font-medium'>{message}</p>
          <p className='text-sm text-gray-500'>Please wait...</p>
        </div>
      </div>
    </div>
  );
};

export default SavingModal;
