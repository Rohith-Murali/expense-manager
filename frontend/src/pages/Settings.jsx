import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Modal from '../components/Modal';
import CsvImportPanel from '../components/CsvImportPanel';
import accountService from '../services/accountService';
import { exportFinancialBackup, exportTransactions } from '../services/dataTransferService';
import { logoutUser, setUser } from '../store/slices/authSlice';
import { toggleTheme } from '../store/slices/uiSlice';
import { logger } from '../utils/logger';
import { ChevronDown, Moon, Pencil, Sun } from 'lucide-react';
import authService from '../services/authService';

const LS_KEY = 'expenseManager.settings';

function loadPrefs() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(prefs));
  } catch {}
}

const Settings = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const theme = useSelector((state) => state.ui.theme);

  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [dataAction, setDataAction] = useState('');
  const [dataError, setDataError] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [showArchivedAccounts, setShowArchivedAccounts] = useState(false);

  const [prefs, setPrefs] = useState(() => loadPrefs());

  const currency = prefs.currency || 'INR';
  const dateFormat = prefs.dateFormat || 'en-US';
  const activeAccounts = accounts.filter((account) => !account.isArchived);
  const archivedAccounts = accounts.filter((account) => account.isArchived);

  const currencySymbol = useMemo(() => {
    try {
      return (
        (0)
          .toLocaleString(dateFormat, { style: 'currency', currency })
          .replace(/\d|[.,\s]/g, '')
          .trim() || '₹'
      );
    } catch {
      return '₹';
    }
  }, [currency, dateFormat]);

  useEffect(() => {
    savePrefs(prefs);
  }, [prefs]);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoadingAccounts(true);
        const data = await accountService.getAccounts(true);
        const list = Array.isArray(data) ? data : data?.data || [];
        setAccounts(list);
      } catch (e) {
        logger.error('Error fetching accounts for settings:', e);
        setAccounts([]);
      } finally {
        setLoadingAccounts(false);
      }
    };

    fetchAccounts();
  }, []);

  const handleDataExport = async (action) => {
    setDataAction(action);
    setDataError('');
    try {
      if (action === 'transactions') await exportTransactions();
      else await exportFinancialBackup();
    } catch (error) {
      logger.error('Error exporting data:', error);
      setDataError('Could not export data. Please try again.');
    } finally {
      setDataAction('');
    }
  };

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login', { replace: true });
  };

  const exportSettings = () => {
    const blob = new Blob([JSON.stringify({ prefs }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expense-manager-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetSettings = () => {
    setPrefs({});
    try {
      localStorage.removeItem(LS_KEY);
    } catch {}
    setShowResetConfirm(false);
  };

  const openProfileModal = () => {
    setProfileForm({ name: user?.name || '', email: user?.email || '' });
    setProfileError('');
    setShowProfileModal(true);
  };

  const saveProfile = async () => {
    if (!profileForm.name.trim() || !profileForm.email.trim()) {
      setProfileError('Name and email are required.');
      return;
    }

    try {
      setSavingProfile(true);
      setProfileError('');
      const response = await authService.updateProfile({
        name: profileForm.name.trim(),
        email: profileForm.email.trim(),
      });
      const updatedUser = response?.data?.user || response?.user;
      if (updatedUser) dispatch(setUser(updatedUser));
      setShowProfileModal(false);
    } catch (error) {
      logger.error('Error updating profile:', error);
      setProfileError(
        error?.response?.data?.message || 'Could not update your profile. Please try again.',
      );
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <Layout>
      <div className='max-w-5xl mx-auto'>
        <div className='card mb-6'>
          <h1 className='text-2xl font-semibold text-gray-900'>Settings</h1>
          <p className='text-sm text-gray-500 mt-1'>Manage profile, preferences, and shortcuts.</p>
        </div>

        <div className='card mb-6'>
          <div className='flex items-center justify-between gap-3 mb-4'>
            <h2 className='text-lg font-semibold text-gray-900'>Profile</h2>
            <button type='button' className='btn btn-outline inline-flex items-center gap-2' onClick={openProfileModal}>
              <Pencil size={16} />
              Edit profile
            </button>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='p-4 rounded-lg border border-gray-200 bg-white'>
              <p className='text-xs text-gray-500'>Name</p>
              <p className='font-medium text-gray-900'>{user?.name || '—'}</p>
            </div>
            <div className='p-4 rounded-lg border border-gray-200 bg-white'>
              <p className='text-xs text-gray-500'>Email</p>
              <p className='font-medium text-gray-900'>{user?.email || '—'}</p>
            </div>
          </div>
        </div>

        <div className='card mb-6'>
          <h2 className='text-lg font-semibold text-gray-900 mb-4'>App Preferences</h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Currency</label>
              <select
                className='input'
                value={currency}
                onChange={(e) => setPrefs((p) => ({ ...p, currency: e.target.value }))}
              >
                <option value='INR'>INR ({currencySymbol})</option>
                <option value='USD'>USD ($)</option>
                <option value='EUR'>EUR (€)</option>
                <option value='GBP'>GBP (£)</option>
              </select>
              <p className='text-xs text-gray-500 mt-1'>Used for display only (for now).</p>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Date Format</label>
              <select
                className='input'
                value={dateFormat}
                onChange={(e) => setPrefs((p) => ({ ...p, dateFormat: e.target.value }))}
              >
                <option value='en-US'>MM/DD/YYYY (en-US)</option>
                <option value='en-GB'>DD/MM/YYYY (en-GB)</option>
                <option value='en-IN'>DD/MM/YYYY (en-IN)</option>
              </select>
            </div>

            <div className='flex items-center justify-between gap-4 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 md:col-span-2'>
              <div>
                <p className='font-medium text-gray-900 dark:text-gray-100'>Appearance</p>
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                  Use dark mode across every page.
                </p>
              </div>
              <button
                type='button'
                onClick={() => dispatch(toggleTheme())}
                className={`relative flex h-9 w-16 shrink-0 items-center rounded-full p-1 transition-colors ${theme === 'dark' ? 'justify-start bg-gray-700' : 'justify-end bg-gray-300'}`}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                <span className='flex h-7 w-7 items-center justify-center rounded-full bg-white text-gray-700 shadow transition-transform'>
                  {theme === 'dark' ? <Sun size={16} aria-hidden='true' /> : <Moon size={16} aria-hidden='true' />}
                </span>
              </button>
            </div>
          </div>

          <div className='flex flex-wrap gap-3 mt-4'>
            <button className='btn btn-outline' onClick={exportSettings}>
              Export Settings
            </button>
            <button className='btn btn-outline' onClick={() => setShowResetConfirm(true)}>
              Reset Preferences
            </button>
          </div>
        </div>

        <div className='card mb-6'>
          <h2 className='text-lg font-semibold text-gray-900 mb-4'>Manage Accounts</h2>
          {loadingAccounts ? (
            <div className='text-gray-500'>Loading accounts...</div>
          ) : activeAccounts.length === 0 && archivedAccounts.length === 0 ? (
            <div className='text-gray-500'>No accounts found.</div>
          ) : (
            <div className='space-y-2'>
              {activeAccounts.length > 0 && <div className='flex flex-wrap gap-2'>
                {activeAccounts.map((acc) => (
                  <button
                    key={acc._id}
                    className={`btn ${acc.isArchived ? 'btn-danger' : 'btn-outline'}`}
                    onClick={() => navigate(`/accounts/${acc._id}/settings`)}
                  >
                    {acc.name}
                  </button>
                ))}
              </div>}
              {activeAccounts.length === 0 && <p className='text-sm text-gray-500'>No active accounts.</p>}
              {archivedAccounts.length > 0 && (
                <div className='mt-4 pt-3'>
                  <button
                    type='button'
                    className='flex w-full items-center justify-between text-left font-medium text-gray-800'
                    onClick={() => setShowArchivedAccounts((open) => !open)}
                    aria-expanded={showArchivedAccounts}
                  >
                    <span>Archived accounts ({archivedAccounts.length})</span>
                    <ChevronDown size={18} className={`transition-transform ${showArchivedAccounts ? 'rotate-180' : ''}`} />
                  </button>
                  {showArchivedAccounts && (
                    <div className='mt-3 flex flex-wrap gap-2'>
                      {archivedAccounts.map((acc) => (
                        <button
                          key={acc._id}
                          className='btn btn-danger'
                          onClick={() => navigate(`/accounts/${acc._id}/settings`)}
                        >
                          {acc.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className='card mb-6'>
          <h2 className='text-lg font-semibold text-gray-900 mb-4'>Data & Security</h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='p-4 rounded-lg border border-gray-200 bg-white'>
              <p className='font-medium text-gray-900'>Export transactions</p>
              <p className='text-sm text-gray-500 mt-1'>
                Download all account transactions as a spreadsheet-ready CSV.
              </p>
              <button
                className='btn btn-outline mt-3'
                disabled={Boolean(dataAction)}
                onClick={() => handleDataExport('transactions')}
              >
                {dataAction === 'transactions' ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>
            <div className='p-4 rounded-lg border border-gray-200 bg-white'>
              <p className='font-medium text-gray-900'>Financial backup</p>
              <p className='text-sm text-gray-500 mt-1'>
                Download accounts, transactions, budgets, categories, credit-card statements, and
                savings data as JSON.
              </p>
              <button
                className='btn btn-outline mt-3'
                disabled={Boolean(dataAction)}
                onClick={() => handleDataExport('backup')}
              >
                {dataAction === 'backup' ? 'Preparing...' : 'Download backup'}
              </button>
            </div>
            <div className='p-4 rounded-lg border border-gray-200 bg-white'>
              <p className='font-medium text-gray-900'>Change password</p>
              <p className='text-sm text-gray-500 mt-1'>
                Add password change & sessions management (coming soon).
              </p>
              <button className='btn btn-outline mt-3' disabled>
                Manage
              </button>
            </div>
          </div>
          {dataError && (
            <p className='text-sm text-red-700 mt-3' role='alert'>
              {dataError}
            </p>
          )}

          <CsvImportPanel accounts={accounts} />
        </div>

        <div className='card'>
          <h2 className='text-lg font-semibold text-gray-900 mb-4'>Danger Zone</h2>
          <div className='flex flex-wrap gap-3'>
            <button className='btn btn-danger' onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
        <Modal
          isOpen={showResetConfirm}
          title='Reset app preferences?'
          confirmLabel='Reset preferences'
          onCancel={() => setShowResetConfirm(false)}
          onConfirm={resetSettings}
        >
          <p className='text-sm text-gray-600 dark:text-gray-300'>
            Currency, date format, and other saved preferences will be restored to their defaults.
          </p>
        </Modal>
        <Modal
          isOpen={showProfileModal}
          title='Edit profile'
          confirmLabel={savingProfile ? 'Saving...' : 'Save changes'}
          confirmDisabled={savingProfile}
          confirmClassName='btn btn-primary disabled:cursor-not-allowed disabled:opacity-50'
          onCancel={() => setShowProfileModal(false)}
          onConfirm={saveProfile}
        >
          <div className='space-y-4'>
            <div>
              <label htmlFor='profile-name' className='mb-1 block text-sm font-medium'>Name</label>
              <input
                id='profile-name'
                className='input'
                value={profileForm.name}
                onChange={(event) => setProfileForm((form) => ({ ...form, name: event.target.value }))}
                disabled={savingProfile}
              />
            </div>
            <div>
              <label htmlFor='profile-email' className='mb-1 block text-sm font-medium'>Email</label>
              <input
                id='profile-email'
                type='email'
                className='input'
                value={profileForm.email}
                onChange={(event) => setProfileForm((form) => ({ ...form, email: event.target.value }))}
                disabled={savingProfile}
              />
            </div>
            {profileError && <p className='text-sm text-red-700' role='alert'>{profileError}</p>}
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default Settings;
