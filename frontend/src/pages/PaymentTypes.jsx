import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Edit2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Modal from '../components/Modal';
import PaymentTypeModal from '../components/PaymentTypeModal';
import accountService from '../services/accountService';
import {
  deletePaymentType,
  getPaymentTypes,
  seedDefaultPaymentTypes,
} from '../services/paymentTypeService';
import { logger } from '../utils/logger';

const PaymentTypes = () => {
  const navigate = useNavigate();
  const { accountId: routeAccountId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [accounts, setAccounts] = useState([]);
  const [paymentTypesByAccount, setPaymentTypesByAccount] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('expense');
  const [editingPaymentType, setEditingPaymentType] = useState(null);
  const [paymentTypeAccountId, setPaymentTypeAccountId] = useState(null);
  const [notice, setNotice] = useState('');
  const [busyAccountId, setBusyAccountId] = useState(null);
  const [deleteRequest, setDeleteRequest] = useState(null);
  const selectedAccountId = routeAccountId || searchParams.get('accountId') || '';

  const accountsSorted = useMemo(
    () => [...accounts].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''))),
    [accounts],
  );
  const displayedAccounts = useMemo(
    () =>
      selectedAccountId
        ? accountsSorted.filter((account) => String(account._id) === selectedAccountId)
        : accountsSorted,
    [accountsSorted, selectedAccountId],
  );
  const selectedAccountName = accountsSorted.find(
    (account) => String(account._id) === selectedAccountId,
  )?.name;

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const accountsResponse = await accountService.getAccounts(Boolean(selectedAccountId));
      const accountList = Array.isArray(accountsResponse)
        ? accountsResponse
        : accountsResponse?.data || [];
      setAccounts(accountList);

      const results = await Promise.all(
        accountList
          .filter((account) => !selectedAccountId || String(account._id) === selectedAccountId)
          .map(async (account) => {
            try {
              const response = await getPaymentTypes(account._id);
              return [account._id, response?.data || response || []];
            } catch (error) {
              logger.error('Error fetching payment types for account:', account._id, error);
              return [account._id, null];
            }
          }),
      );

      const map = {};
      results.forEach(([id, list]) => {
        if (list) map[id] = list;
      });
      setPaymentTypesByAccount(map);
    } catch (error) {
      logger.error('Error fetching accounts and payment types:', error);
      setAccounts([]);
      setPaymentTypesByAccount({});
      setNotice('Could not load payment types. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleAccountChange = (event) => {
    const accountId = event.target.value;
    setSearchParams(accountId ? { accountId } : {});
  };

  const handleAddDefaults = async (accountId) => {
    try {
      setBusyAccountId(accountId);
      const response = await seedDefaultPaymentTypes(accountId);
      const data = response?.data || response || {};
      const messages = [];
      if (data.created) messages.push(`Added ${data.created} default payment types.`);
      if (data.reactivated) messages.push(`Restored ${data.reactivated} deleted default payment types.`);
      setNotice(messages.join(' ') || 'Default payment types already exist for this account.');
      await fetchAll();
    } catch (error) {
      logger.error('Error adding default payment types:', error);
      setNotice(error?.response?.data?.message || 'Could not add default payment types. Please try again.');
    } finally {
      setBusyAccountId(null);
    }
  };

  const handleDeletePaymentType = async (accountId, paymentType) => {
    try {
      await deletePaymentType(accountId, paymentType._id);
      setNotice(`Deleted ${paymentType.name}.`);
      await fetchAll();
    } catch (error) {
      logger.error('Error deleting payment type:', error);
      setNotice(error?.response?.data?.message || 'Could not delete this payment type. Please try again.');
    }
  };

  const requestDeletePaymentType = (accountId, paymentType) => {
    setDeleteRequest({ accountId, paymentType });
  };

  const paymentTypeForAccount = (accountId) =>
    (paymentTypesByAccount[accountId] || [])
      .filter((paymentType) => paymentType.type === activeType)
      .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));

  const closeModal = () => {
    setEditingPaymentType(null);
    setPaymentTypeAccountId(null);
  };

  return (
    <Layout>
      <div className='max-w-6xl mx-auto'>
        <div className='card mb-6'>
          <div className='flex items-start justify-between gap-4'>
            <div>
              <h1 className='text-2xl font-semibold text-gray-900'>
                {selectedAccountName ? `${selectedAccountName} Payment Types` : 'Payment Types'}
              </h1>
              <p className='text-sm text-gray-500 mt-1'>
                Manage payment types separately for each account.
              </p>
            </div>
            <div className='flex flex-wrap gap-2'>
              {!routeAccountId && (
                <select
                  className='input min-w-48'
                  value={selectedAccountId}
                  onChange={handleAccountChange}
                  aria-label='Filter payment types by account'
                >
                  <option value=''>All accounts</option>
                  {accountsSorted.map((account) => (
                    <option key={account._id} value={account._id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              )}
              <button className='btn btn-outline' onClick={fetchAll} disabled={loading}>
                <RefreshCw size={16} className='mr-2 inline' /> Refresh
              </button>
            </div>
          </div>

          <div className='flex gap-2 mt-4 bg-white rounded p-2 shadow-sm w-fit'>
            {['expense', 'income'].map((type) => (
              <button
                key={type}
                className={`px-3 py-1 rounded ${
                  activeType === type ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600'
                }`}
                onClick={() => setActiveType(type)}
                disabled={loading}
              >
                {type === 'expense' ? 'Expense' : 'Income'}
              </button>
            ))}
          </div>
        </div>

        {routeAccountId && (
          <button
            className='btn btn-outline mb-4'
            onClick={() => navigate(`/accounts/${routeAccountId}/settings`)}
          >
            Back to account settings
          </button>
        )}

        {notice && (
          <div className='card mb-4 flex items-center justify-between gap-3' role='status'>
            <p className='text-sm text-gray-700'>{notice}</p>
            <button className='text-sm text-indigo-700' onClick={() => setNotice('')}>
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div className='text-center text-gray-500 py-12'>Loading...</div>
        ) : displayedAccounts.length === 0 ? (
          <div className='card text-center py-12'>
            <p className='text-gray-500 font-medium'>
              {selectedAccountId ? 'Account not found' : 'No accounts yet'}
            </p>
            <p className='text-sm text-gray-400 mt-1'>
              {selectedAccountId
                ? 'Choose another account or view all accounts.'
                : 'Create an account to manage payment types.'}
            </p>
          </div>
        ) : (
          <div className='space-y-4'>
            {displayedAccounts.map((account) => {
              const list = paymentTypeForAccount(account._id);
              return (
                <div key={account._id} className='card'>
                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <div>
                      <h2 className='text-lg font-semibold text-gray-900'>{account.name}</h2>
                      <p className='text-sm text-gray-500'>
                        {list.length} {activeType} payment {list.length === 1 ? 'type' : 'types'}
                      </p>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      <button
                        className='btn btn-outline'
                        onClick={() => handleAddDefaults(account._id)}
                        disabled={busyAccountId === account._id}
                      >
                        {busyAccountId === account._id ? 'Adding defaults...' : 'Add defaults'}
                      </button>
                      <button
                        className='btn btn-primary'
                        onClick={() => {
                          setPaymentTypeAccountId(account._id);
                          setEditingPaymentType(null);
                        }}
                      >
                        <Plus size={16} className='mr-1 inline' /> Add payment type
                      </button>
                    </div>
                  </div>

                  {paymentTypesByAccount[account._id] === undefined ? (
                    <p className='text-sm text-red-600 mt-4'>
                      Could not load this account’s payment types.
                    </p>
                  ) : list.length === 0 ? (
                    <div className='text-gray-500 mt-4'>No {activeType} payment types.</div>
                  ) : (
                    <div className='space-y-3 mt-4'>
                      {list.map((paymentType) => (
                        <div
                          key={paymentType._id}
                          className='flex items-center justify-between bg-white p-3 rounded border border-gray-100'
                        >
                          <div className='flex items-center gap-3'>
                            <span className='text-xl'>{paymentType.icon}</span>
                            <span className='font-medium'>{paymentType.name}</span>
                          </div>
                          <div className='flex items-center gap-2'>
                            <button
                              className='p-2 rounded-md hover:bg-gray-100'
                              title='Edit payment type'
                              onClick={() => {
                                setPaymentTypeAccountId(account._id);
                                setEditingPaymentType(paymentType);
                              }}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              className='p-2 rounded-md hover:bg-red-100 text-red-600'
                              title='Delete payment type'
                              onClick={() => requestDeletePaymentType(account._id, paymentType)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {paymentTypeAccountId && (
          <PaymentTypeModal
            accountId={paymentTypeAccountId}
            paymentType={editingPaymentType}
            type={activeType}
            onClose={closeModal}
            onSave={async () => {
              closeModal();
              await fetchAll();
            }}
          />
        )}
        <Modal
          isOpen={Boolean(deleteRequest)}
          title={`Delete "${deleteRequest?.paymentType?.name}"?`}
          confirmLabel='Delete'
          onCancel={() => setDeleteRequest(null)}
          onConfirm={async () => {
            const request = deleteRequest;
            setDeleteRequest(null);
            if (request) await handleDeletePaymentType(request.accountId, request.paymentType);
          }}
        >
          <p className='text-sm text-gray-600 dark:text-gray-300'>
            This payment type will be removed from the account.
          </p>
        </Modal>
      </div>
    </Layout>
  );
};

export default PaymentTypes;
