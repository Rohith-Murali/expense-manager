import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Edit2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import Layout from '../components/layout/Layout';
import accountService from '../services/accountService';
import { deleteCategory, getCategories, seedDefaultCategories } from '../services/categoryService';
import CategoryModal from '../components/CategoryModal';
import SubcategoryModal from '../components/SubcategoryModal';
import {
  deleteSubcategory,
  ensureDefaultSubcategories,
  getSubcategories,
} from '../services/subcategoryService';
import { logger } from '../utils/logger';

const Categories = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [accounts, setAccounts] = useState([]);
  const [categoriesByAccount, setCategoriesByAccount] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('expense');
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryAccountId, setCategoryAccountId] = useState(null);
  const [subcategoryTarget, setSubcategoryTarget] = useState(null);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [notice, setNotice] = useState('');
  const [busyAccountId, setBusyAccountId] = useState(null);
  const selectedAccountId = searchParams.get('accountId') || '';

  const accountsSorted = useMemo(() => {
    return [...accounts].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
  }, [accounts]);

  const displayedAccounts = useMemo(
    () =>
      selectedAccountId
        ? accountsSorted.filter((account) => String(account._id) === selectedAccountId)
        : accountsSorted,
    [accountsSorted, selectedAccountId],
  );

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const accountsRes = await accountService.getAccounts(false);
      const accs = Array.isArray(accountsRes) ? accountsRes : accountsRes?.data || [];
      setAccounts(accs);

      const results = await Promise.all(
        (accs || [])
          .filter((account) => !selectedAccountId || String(account._id) === selectedAccountId)
          .map(async (acc) => {
            try {
              const cats = await getCategories(acc._id);
              const arr = Array.isArray(cats) ? cats : cats?.data || [];
              const withSubcategories = await Promise.all(
                arr.map(async (category) => {
                  try {
                    const response = await getSubcategories(acc._id, category._id);
                    return { ...category, subcategories: response?.data || response || [] };
                  } catch (error) {
                    logger.error('Error fetching subcategories:', category._id, error);
                    return { ...category, subcategories: [] };
                  }
                }),
              );
              return [acc._id, withSubcategories];
            } catch (error) {
              logger.error('Error fetching categories for account:', acc?._id, error);
              return [acc._id, []];
            }
          }),
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
  }, [selectedAccountId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleAccountChange = (event) => {
    const accountId = event.target.value;
    setSearchParams(accountId ? { accountId } : {});
  };

  const handleDeleteCategory = async (accountId, category) => {
    if (
      !window.confirm(
        `Delete “${category.name}” and its subcategories? Existing transaction history will be kept.`,
      )
    ) {
      return;
    }
    try {
      await deleteCategory(accountId, category._id);
      setNotice(`Deleted ${category.name} and its subcategories.`);
      await fetchAll();
    } catch (error) {
      logger.error('Error deleting category:', error);
      setNotice(
        error?.response?.data?.message || 'Could not delete this category. Please try again.',
      );
    }
  };

  const handleDeleteSubcategory = async (accountId, category, subcategory) => {
    if (!window.confirm(`Delete subcategory “${subcategory.name}”?`)) return;
    try {
      await deleteSubcategory(accountId, category._id, subcategory._id);
      setNotice(`Deleted ${subcategory.name}.`);
      await fetchAll();
    } catch (error) {
      logger.error('Error deleting subcategory:', error);
      setNotice(
        error?.response?.data?.message || 'Could not delete this subcategory. Please try again.',
      );
    }
  };

  const handleAddDefaults = async (accountId, addSubcategories = false) => {
    try {
      setBusyAccountId(accountId);
      if (addSubcategories) {
        await ensureDefaultSubcategories(accountId);
        setNotice('Default subcategories added where missing.');
      } else {
        const result = await seedDefaultCategories(accountId);
        const created = result?.data?.created || 0;
        setNotice(
          created ? `Added ${created} default categories.` : 'Default categories already exist.',
        );
      }
      await fetchAll();
    } catch (error) {
      logger.error('Error adding defaults:', error);
      setNotice(error?.response?.data?.message || 'Could not add defaults. Please try again.');
    } finally {
      setBusyAccountId(null);
    }
  };

  const closeCategoryModal = () => {
    setEditingCategory(null);
    setCategoryAccountId(null);
  };

  const closeSubcategoryModal = () => {
    setSubcategoryTarget(null);
    setEditingSubcategory(null);
  };

  return (
    <Layout>
      <div className='max-w-6xl mx-auto'>
        <div className='card mb-6'>
          <div className='flex items-start justify-between gap-4'>
            <div>
              <h1 className='text-2xl font-semibold text-gray-900'>Categories</h1>
              <p className='text-sm text-gray-500 mt-1'>
                Manage categories and subcategories by account.
              </p>
            </div>
            <div className='flex flex-wrap gap-2'>
              <select
                className='input min-w-48'
                value={selectedAccountId}
                onChange={handleAccountChange}
                aria-label='Filter categories by account'
              >
                <option value=''>All accounts</option>
                {accountsSorted.map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.name}
                  </option>
                ))}
              </select>
              <button className='btn btn-outline' onClick={() => fetchAll()} disabled={loading}>
                <RefreshCw size={16} className='mr-2 inline' /> Refresh
              </button>
            </div>
          </div>

          <div className='flex gap-2 mt-4 bg-white rounded p-2 shadow-sm w-fit'>
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
                : 'Create an account to manage categories.'}
            </p>
          </div>
        ) : (
          <div className='space-y-4'>
            {displayedAccounts.map((acc) => {
              const list = categoriesByAccount[acc._id] || [];
              const filtered = list.filter((c) => c.type === activeType);
              return (
                <div key={acc._id} className='card'>
                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <div>
                      <h2 className='text-lg font-semibold text-gray-900'>{acc.name}</h2>
                      <p className='text-sm text-gray-500'>
                        {filtered.length} {activeType}{' '}
                        {filtered.length === 1 ? 'category' : 'categories'}
                      </p>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      <button
                        className='btn btn-outline'
                        onClick={() => handleAddDefaults(acc._id, true)}
                        disabled={busyAccountId === acc._id}
                      >
                        Add default subcategories
                      </button>
                      <button
                        className='btn btn-outline'
                        onClick={() => handleAddDefaults(acc._id)}
                        disabled={busyAccountId === acc._id}
                      >
                        Add default categories
                      </button>
                      <button
                        className='btn btn-primary'
                        onClick={() => {
                          setCategoryAccountId(acc._id);
                          setEditingCategory(null);
                        }}
                      >
                        <Plus size={16} className='mr-1 inline' /> Add category
                      </button>
                    </div>
                  </div>

                  {filtered.length === 0 ? (
                    <div className='text-gray-500 mt-4'>
                      No {activeType} categories in this account.
                    </div>
                  ) : (
                    <div className='space-y-3 mt-4'>
                      {filtered
                        .slice()
                        .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')))
                        .map((cat) => (
                          <div
                            key={cat._id}
                            className='bg-white border border-gray-200 rounded-lg p-3'
                          >
                            <div className='flex items-center justify-between gap-3'>
                              <div className='flex min-w-0 items-center gap-3'>
                                <div
                                  className='w-10 h-10 shrink-0 rounded-lg flex items-center justify-center text-xl'
                                  style={{ backgroundColor: `${cat.color || '#4A90E2'}22` }}
                                >
                                  <span style={{ color: cat.color || '#4A90E2' }}>
                                    {cat.icon || '📁'}
                                  </span>
                                </div>
                                <div>
                                  <div className='font-medium text-gray-900'>{cat.name}</div>
                                  <div className='text-xs text-gray-500'>
                                    {activeType} · {(cat.subcategories || []).length} subcategories
                                  </div>
                                </div>
                              </div>
                              <div className='flex shrink-0 items-center gap-1'>
                                <button
                                  className='p-2 rounded-md hover:bg-gray-100'
                                  onClick={() => {
                                    setEditingSubcategory(null);
                                    setSubcategoryTarget({ accountId: acc._id, category: cat });
                                  }}
                                  title={`Add subcategory to ${cat.name}`}
                                  aria-label={`Add subcategory to ${cat.name}`}
                                >
                                  <Plus size={16} />
                                </button>
                                <button
                                  className='p-2 rounded-md hover:bg-gray-100'
                                  onClick={() => {
                                    setCategoryAccountId(acc._id);
                                    setEditingCategory(cat);
                                  }}
                                  title={`Rename ${cat.name}`}
                                  aria-label={`Edit ${cat.name}`}
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  className='p-2 rounded-md hover:bg-red-100 text-red-600'
                                  onClick={() => handleDeleteCategory(acc._id, cat)}
                                  title={`Delete ${cat.name}`}
                                  aria-label={`Delete ${cat.name}`}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            <div className='ml-12 mt-3 space-y-2'>
                              {(cat.subcategories || []).length === 0 ? (
                                <p className='text-sm text-gray-400'>No subcategories yet.</p>
                              ) : (
                                cat.subcategories.map((subcategory) => (
                                  <div
                                    key={subcategory._id}
                                    className='flex items-center justify-between gap-3 border-l-2 border-gray-200 pl-3 py-1'
                                  >
                                    <span className='text-sm text-gray-700'>
                                      {subcategory.icon ? `${subcategory.icon} ` : ''}
                                      {subcategory.name}
                                    </span>
                                    <div className='flex shrink-0 items-center gap-1'>
                                      <button
                                        className='p-1 rounded hover:bg-gray-100'
                                        onClick={() => {
                                          setSubcategoryTarget({
                                            accountId: acc._id,
                                            category: cat,
                                          });
                                          setEditingSubcategory(subcategory);
                                        }}
                                        title={`Rename ${subcategory.name}`}
                                        aria-label={`Edit ${subcategory.name}`}
                                      >
                                        <Edit2 size={14} />
                                      </button>
                                      <button
                                        className='p-1 rounded hover:bg-red-100 text-red-600'
                                        onClick={() =>
                                          handleDeleteSubcategory(acc._id, cat, subcategory)
                                        }
                                        title={`Delete ${subcategory.name}`}
                                        aria-label={`Delete ${subcategory.name}`}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
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
      {categoryAccountId && (
        <CategoryModal
          accountId={categoryAccountId}
          category={editingCategory}
          type={activeType}
          onClose={closeCategoryModal}
          onSave={async () => {
            closeCategoryModal();
            await fetchAll();
          }}
        />
      )}
      {subcategoryTarget && (
        <SubcategoryModal
          accountId={subcategoryTarget.accountId}
          category={subcategoryTarget.category}
          subcategory={editingSubcategory}
          onClose={closeSubcategoryModal}
          onSave={async () => {
            closeSubcategoryModal();
            await fetchAll();
          }}
        />
      )}
    </Layout>
  );
};

export default Categories;
