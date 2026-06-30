import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import accountService from '../services/accountService';
import { logoutUser } from '../store/slices/authSlice';
import { logger } from '../utils/logger';

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

  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const [prefs, setPrefs] = useState(() => loadPrefs());

  const currency = prefs.currency || 'INR';
  const dateFormat = prefs.dateFormat || 'en-US';

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
        const data = await accountService.getAccounts(false);
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
    if (!window.confirm('Reset app preferences?')) return;
    setPrefs({});
    try {
      localStorage.removeItem(LS_KEY);
    } catch {}
  };

  return (
    <Layout>
      <div className='max-w-5xl mx-auto'>
        <div className='card mb-6'>
          <h1 className='text-2xl font-semibold text-gray-900'>Settings</h1>
          <p className='text-sm text-gray-500 mt-1'>Manage profile, preferences, and shortcuts.</p>
        </div>

        <div className='card mb-6'>
          <h2 className='text-lg font-semibold text-gray-900 mb-4'>Profile</h2>
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
          </div>

          <div className='flex flex-wrap gap-3 mt-4'>
            <button className='btn btn-outline' onClick={exportSettings}>
              Export Settings
            </button>
            <button className='btn btn-outline' onClick={resetSettings}>
              Reset Preferences
            </button>
          </div>
        </div>

        <div className='card mb-6'>
          <h2 className='text-lg font-semibold text-gray-900 mb-4'>Account Settings</h2>
          {loadingAccounts ? (
            <div className='text-gray-500'>Loading accounts...</div>
          ) : accounts.length === 0 ? (
            <div className='text-gray-500'>No accounts found.</div>
          ) : (
            <div className='space-y-2'>
              {accounts.map((acc) => (
                <button
                  key={acc._id}
                  className='w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50'
                  onClick={() => navigate(`/accounts/${acc._id}/settings`)}
                >
                  <div className='text-left'>
                    <div className='font-medium text-gray-900'>{acc.name}</div>
                    <div className='text-xs text-gray-500'>Manage categories & payment types</div>
                  </div>
                  <span className='text-sm text-indigo-600'>Open</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className='card mb-6'>
          <h2 className='text-lg font-semibold text-gray-900 mb-4'>Data & Security</h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='p-4 rounded-lg border border-gray-200 bg-white'>
              <p className='font-medium text-gray-900'>Export transactions</p>
              <p className='text-sm text-gray-500 mt-1'>
                CSV/JSON export across accounts (coming soon).
              </p>
              <button className='btn btn-outline mt-3' disabled>
                Export
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
        </div>

        <div className='card'>
          <h2 className='text-lg font-semibold text-gray-900 mb-4'>Danger Zone</h2>
          <div className='flex flex-wrap gap-3'>
            <button className='btn btn-danger' onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
