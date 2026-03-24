import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/layout/Layout';
import accountService from '../services/accountService';
import { getCategories } from '../services/categoryService';
import logger from '../utils/logger';

const Categories = () => {
  const [accounts, setAccounts] = useState([]);
  const [categoriesByAccount, setCategoriesByAccount] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('expense');

  const accountsSorted = useMemo(() => {
    return [...accounts].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
  }, [accounts]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const accountsRes = await accountService.getAccounts(false);
      const accs = Array.isArray(accountsRes) ? accountsRes : accountsRes?.data || [];
      setAccounts(accs);

      const results = await Promise.all(
        (accs || []).map(async (acc) => {
          try {
            const cats = await getCategories(acc._id);
            const arr = Array.isArray(cats) ? cats : cats?.data || [];
            return [acc._id, arr];
          } catch (error) {
            logger.error('Error fetching categories for account:', acc?._id, error);
            return [acc._id, []];
          }
        })
      );

      const map = {};
      results.forEach(([id, list]) => {
        map[id] = list;
      });
      setCategoriesByAccount(map);
    } catch (error) {
      logger.error('Error fetching accounts/categories:', error);
      setAccounts([]);
      setCategoriesByAccount({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="card mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Categories</h1>
              <p className="text-sm text-gray-500 mt-1">
                Expense and income categories across all accounts, grouped by account.
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-4 bg-white rounded p-2 shadow-sm w-fit">
            <button
              className={`px-3 py-1 rounded ${activeType === 'expense' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600'}`}
              onClick={() => setActiveType('expense')}
              disabled={loading}
            >
              Expense
            </button>
            <button
              className={`px-3 py-1 rounded ${activeType === 'income' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600'}`}
              onClick={() => setActiveType('income')}
              disabled={loading}
            >
              Income
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-12">Loading...</div>
        ) : accountsSorted.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500 font-medium">No accounts yet</p>
            <p className="text-sm text-gray-400 mt-1">Create an account to manage categories.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {accountsSorted.map((acc) => {
              const list = categoriesByAccount[acc._id] || [];
              const filtered = list.filter((c) => c.type === activeType);
              return (
                <div key={acc._id} className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{acc.name}</h2>
                      <p className="text-sm text-gray-500">
                        {filtered.length} {activeType} {filtered.length === 1 ? 'category' : 'categories'}
                      </p>
                    </div>
                    <button className="btn btn-outline" onClick={() => window.open(`/accounts/${acc._id}/settings`, '_self')}>
                      Manage in account
                    </button>
                  </div>

                  {filtered.length === 0 ? (
                    <div className="text-gray-500 mt-4">No {activeType} categories in this account.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                      {filtered
                        .slice()
                        .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')))
                        .map((cat) => (
                          <div
                            key={cat._id}
                            className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3"
                          >
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                              style={{ backgroundColor: `${cat.color || '#4A90E2'}22` }}
                            >
                              <span style={{ color: cat.color || '#4A90E2' }}>{cat.icon || '📁'}</span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{cat.name}</div>
                              <div className="text-xs text-gray-500">{activeType}</div>
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
      </div>
    </Layout>
  );
};

export default Categories;
