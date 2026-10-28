import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CreditCard, Layers, Pencil, Wallet } from 'lucide-react';
import AccountModal from '../components/accounts/AccountModal';
import accountService from '../services/accountService';
import { logger } from '../utils/logger';
import Layout from '../components/layout/Layout';
import Modal from '../components/Modal';

const AccountSettings = () => {
  const navigate = useNavigate();
  const { accountId } = useParams();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountActionLoading, setAccountActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const fetchAccount = useCallback(async () => {
    try {
      setLoading(true);
      const response = await accountService.getAccountById(accountId);
      setAccount(response?.data || response);
    } catch (error) {
      logger.error('Error fetching account settings:', error);
      setNotice(error?.response?.data?.message || 'Could not load this account. Please try again.');
      setAccount(null);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  const handleUpdateAccount = async (data) => {
    try {
      setSavingAccount(true);
      await accountService.updateAccount(accountId, data);
      await fetchAccount();
      setShowAccountModal(false);
      setNotice('Account settings updated.');
    } catch (error) {
      logger.error('Error updating account settings:', error);
      throw error;
    } finally {
      setSavingAccount(false);
    }
  };

  const handleToggleArchive = async () => {
    try {
      setAccountActionLoading(true);
      const wasArchived = account.isArchived;
      await accountService.toggleArchive(accountId);
      await fetchAccount();
      setNotice(wasArchived ? 'Account restored from archive.' : 'Account archived.');
    } catch (error) {
      logger.error('Error changing account archive status:', error);
      setNotice('Could not update the account archive status. Please try again.');
    } finally {
      setAccountActionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setAccountActionLoading(true);
      await accountService.deleteAccount(accountId);
      navigate('/settings');
    } catch (error) {
      logger.error('Error deleting account:', error);
      setNotice(
        error?.response?.data?.message === 'ACCOUNT_HAS_TRANSACTIONS'
          ? 'This account has transactions and cannot be deleted. Archive it instead to keep its history.'
          : error?.response?.data?.message || 'Could not delete this account. Please try again.',
      );
    } finally {
      setAccountActionLoading(false);
    }
  };

  const requestArchiveToggle = () => {
    const isArchived = account.isArchived;
    setConfirmAction({
      title: isArchived ? 'Restore account?' : 'Archive account?',
      message: isArchived
        ? `Restore "${account.name}" to your active accounts?`
        : `Archive "${account.name}"? Its transaction history will be kept.`,
      confirmLabel: isArchived ? 'Restore account' : 'Archive account',
      onConfirm: handleToggleArchive,
    });
  };

  const requestDelete = () => {
    setConfirmAction({
      title: `Delete "${account.name}"?`,
      message:
        'Accounts with transactions cannot be deleted. Archive it instead to keep its history.',
      confirmLabel: 'Delete account',
      onConfirm: handleDeleteAccount,
    });
  };

  return (
    <Layout>
      <div className='min-h-screen bg-gray-50 p-6 text-gray-800'>
        <div className='mx-auto max-w-5xl'>
          <header className='mb-6 flex items-center gap-4'>
            <button
              className='rounded-md p-2 hover:bg-gray-100'
              onClick={() => navigate('/settings')}
              aria-label='Back to settings'
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className='text-2xl font-semibold'>
              {account?.name ? `${account.name} Settings` : 'Account Settings'}
            </h1>
          </header>

          {notice && (
            <div className='mb-4 flex items-center justify-between gap-3 rounded border border-gray-200 bg-white px-4 py-3 text-sm'>
              <span role='status'>{notice}</span>
              <button type='button' className='text-indigo-700' onClick={() => setNotice('')}>
                Dismiss
              </button>
            </div>
          )}

          {loading ? (
            <div className='py-12 text-center text-gray-500'>Loading account settings...</div>
          ) : !account ? (
            <div className='card'>
              <p className='text-gray-600'>This account could not be found.</p>
            </div>
          ) : (
            <>
              <section className='card mb-6'>
                <div className='mb-4 flex items-center justify-between gap-3'>
                  <div>
                    <h2 className='text-lg font-semibold'>Account Information</h2>
                    <p className='text-sm text-gray-500'>Details and account-specific limits.</p>
                  </div>
                  <button
                    className='btn btn-outline inline-flex items-center gap-2'
                    onClick={() => setShowAccountModal(true)}
                  >
                    <Pencil size={16} />
                    Edit details
                  </button>
                </div>

                <dl className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  <div className='rounded-lg border border-gray-200 p-3'>
                    <dt className='text-sm text-gray-500'>Account name</dt>
                    <dd className='font-medium'>{account.name}</dd>
                  </div>
                  <div className='rounded-lg border border-gray-200 p-3'>
                    <dt className='text-sm text-gray-500'>Account type</dt>
                    <dd className='font-medium'>{account.type?.replace(/_/g, ' ')}</dd>
                  </div>
                  <div className='rounded-lg border border-gray-200 p-3'>
                    <dt className='text-sm text-gray-500'>Currency</dt>
                    <dd className='font-medium'>{account.currency || 'INR'}</dd>
                  </div>
                  <div className='rounded-lg border border-gray-200 p-3'>
                    <dt className='text-sm text-gray-500'>Current balance</dt>
                    <dd className='font-medium'>
                      {account.currency || 'INR'}{' '}
                      {Number(account.currentBalance || 0).toLocaleString()}
                    </dd>
                  </div>
                  <div className='rounded-lg border border-gray-200 p-3'>
                    <dt className='text-sm text-gray-500'>Monthly budget</dt>
                    <dd className='font-medium'>
                      {account.currency || 'INR'}{' '}
                      {Number(account.monthlyBudget || 0).toLocaleString()}
                    </dd>
                  </div>
                  {account.type === 'CREDIT_CARD' && (
                    <>
                      <div className='rounded-lg border border-gray-200 p-3'>
                        <dt className='text-sm text-gray-500'>Credit limit</dt>
                        <dd className='font-medium'>
                          {account.currency || 'INR'}{' '}
                          {Number(account.creditLimit || 0).toLocaleString()}
                        </dd>
                      </div>
                      <div className='rounded-lg border border-gray-200 p-3'>
                        <dt className='text-sm text-gray-500'>Statement closing day</dt>
                        <dd className='font-medium'>{account.statementClosingDay}</dd>
                      </div>
                      <div className='rounded-lg border border-gray-200 p-3'>
                        <dt className='text-sm text-gray-500'>Payment due after</dt>
                        <dd className='font-medium'>{account.paymentDueDays} days</dd>
                      </div>
                    </>
                  )}
                </dl>
                {account.description && (
                  <p className='mt-3 text-sm text-gray-600'>{account.description}</p>
                )}
              </section>

              <section className='card mb-6'>
                <h2 className='mb-1 text-lg font-semibold'>Manage Account Data</h2>
                <p className='mb-4 text-sm text-gray-500'>
                  Categories and payment types are managed separately for this account.
                </p>
                <div className='flex flex-wrap gap-3'>
                  <button
                    className='btn btn-primary inline-flex items-center gap-2'
                    onClick={() => navigate(`/accounts/${accountId}/categories`)}
                  >
                    <Layers size={16} />
                    Manage categories
                  </button>
                  <button
                    className='btn btn-outline inline-flex items-center gap-2'
                    onClick={() => navigate(`/accounts/${accountId}/payment-types`)}
                  >
                    <CreditCard size={16} />
                    Manage payment types
                  </button>
                  <button
                    className='btn btn-outline inline-flex items-center gap-2'
                    onClick={() => navigate(`/accounts/${accountId}`)}
                  >
                    <Wallet size={16} />
                    Open account
                  </button>
                </div>
              </section>

              <section className='card'>
                <h2 className='mb-2 text-lg font-semibold'>Danger Zone</h2>
                <p className='mb-4 text-sm text-gray-600'>
                  Archive an account to hide it from active accounts while keeping its transaction
                  history. Accounts with transactions cannot be deleted.
                </p>
                <div className='flex flex-wrap gap-3'>
                  <button
                    className='btn btn-outline'
                    onClick={requestArchiveToggle}
                    disabled={accountActionLoading}
                  >
                    {accountActionLoading
                      ? 'Updating...'
                      : account.isArchived
                        ? 'Restore Account'
                        : 'Archive Account'}
                  </button>
                  <button
                    className='btn btn-danger'
                    onClick={requestDelete}
                    disabled={accountActionLoading}
                  >
                    Delete Account
                  </button>
                </div>
              </section>
            </>
          )}
        </div>

        {account && (
          <AccountModal
            isOpen={showAccountModal}
            onClose={() => setShowAccountModal(false)}
            onSubmit={handleUpdateAccount}
            account={account}
            loading={savingAccount}
          />
        )}
        <Modal
          isOpen={Boolean(confirmAction)}
          title={confirmAction?.title}
          confirmLabel={confirmAction?.confirmLabel}
          confirmDisabled={accountActionLoading}
          onCancel={() => setConfirmAction(null)}
          onConfirm={async () => {
            const action = confirmAction?.onConfirm;
            setConfirmAction(null);
            await action?.();
          }}
        >
          <p className='text-sm text-gray-600 dark:text-gray-300'>{confirmAction?.message}</p>
        </Modal>
      </div>
    </Layout>
  );
};

export default AccountSettings;
