import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import accountService from '../../services/accountService';
import { getErrorMessage } from '../../utils/helpers';
import AccountCard from './AccountCard';
import AccountModal from './AccountModal';

const AccountsList = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const data = await accountService.getAccounts(false);
      const accountsData = Array.isArray(data) ? data : data?.data || [];
      setAccounts(accountsData);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = () => {
    setSelectedAccount(null);
    setModalOpen(true);
  };

  const handleEditAccount = (account) => {
    setSelectedAccount(account);
    setModalOpen(true);
  };

  const handleModalSubmit = async (data) => {
    try {
      setModalLoading(true);
      if (selectedAccount) {
        await accountService.updateAccount(selectedAccount._id, data);
      } else {
        await accountService.createAccount(data);
      }
      await fetchAccounts();
      setModalOpen(false);
      setSelectedAccount(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteAccount = (account) => {
    setDeleteConfirm(account);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await accountService.deleteAccount(deleteConfirm._id);
      await fetchAccounts();
      setDeleteConfirm(null);
    } catch (err) {
      setError(getErrorMessage(err));
      setDeleteConfirm(null);
    }
  };

  const handleAccountClick = (account) => {
    navigate(`/accounts/${account._id}`);
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='spinner'></div>
      </div>
    );
  }

  return (
    <div>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h2 className='text-lg font-semibold text-gray-900'>My Accounts</h2>
          <p className='text-sm text-gray-500 mt-1'>
            {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
          </p>
        </div>
        <button onClick={handleAddAccount} className='btn btn-primary flex items-center gap-2'>
          <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
          </svg>
          Add Account
        </button>
      </div>

      {error && (
        <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg'>
          <p className='text-danger text-sm'>{error}</p>
        </div>
      )}

      {accounts.length === 0 ? (
        <div className='card text-center py-12'>
          <div className='inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4'>
            <svg
              className='w-8 h-8 text-gray-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'
              />
            </svg>
          </div>
          <p className='text-gray-500 font-medium'>No accounts yet</p>
          <p className='text-sm text-gray-400 mt-1'>
            Create your first account to start tracking expenses
          </p>
          <button onClick={handleAddAccount} className='btn btn-primary mt-6'>
            <svg
              className='w-5 h-5 inline mr-2'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 4v16m8-8H4'
              />
            </svg>
            Add Your First Account
          </button>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {accounts.map((account) => (
            <AccountCard
              key={account._id}
              account={account}
              onEdit={handleEditAccount}
              onDelete={handleDeleteAccount}
              onClick={() => handleAccountClick(account)}
            />
          ))}
        </div>
      )}

      <AccountModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedAccount(null);
        }}
        onSubmit={handleModalSubmit}
        account={selectedAccount}
        loading={modalLoading}
      />

      {deleteConfirm && (
        <div className='fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4'>
          <div className='bg-white rounded-xl shadow-xl max-w-md w-full p-6'>
            <div className='flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4'>
              <svg
                className='w-6 h-6 text-red-600'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                />
              </svg>
            </div>
            <h3 className='text-lg font-semibold text-gray-900 text-center mb-2'>
              Delete Account?
            </h3>
            <p className='text-sm text-gray-600 text-center mb-6'>
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action
              cannot be undone.
            </p>
            <div className='flex gap-3'>
              <button onClick={() => setDeleteConfirm(null)} className='btn btn-outline flex-1'>
                Cancel
              </button>
              <button onClick={confirmDelete} className='btn btn-danger flex-1'>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsList;
