import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import Layout from '../components/layout/Layout';
import accountService from '../services/accountService';
import { getCategories } from '../services/categoryService';
import { getPaymentTypes } from '../services/paymentTypeService';
import { createTransaction } from '../services/transactionService';
import * as repaymentService from '../services/repaymentService';
import { buildCreateReceiptPayload } from '../utils/repaymentPayload';
import { logger } from '../utils/logger';

const unwrap = (result) => result?.data ?? result;
const today = () => new Date().toISOString().slice(0, 10);
const money = (value, currency = 'INR') =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value) || 0);

const Repayments = () => {
  const [accounts, setAccounts] = useState([]);
  const [repayments, setRepayments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingRepaymentId, setEditingRepaymentId] = useState('');
  const [editForm, setEditForm] = useState(null);
  const [form, setForm] = useState({
    accountId: '',
    categoryId: '',
    paymentTypeId: '',
    creditCardAccountId: '',
    amount: '',
    personalShare: '',
    title: '',
    date: today(),
    notes: '',
    participants: [{ name: '', amount: '' }],
  });
  const [receiptForms, setReceiptForms] = useState({});

  const spendingAccounts = useMemo(
    () => accounts.filter((account) => ['CASH', 'BANK'].includes(account.type)),
    [accounts],
  );
  const cards = useMemo(() => accounts.filter((account) => account.type === 'CREDIT_CARD'), [accounts]);

  const loadRepayments = async () => {
    try {
      const result = await repaymentService.getRepayments();
      setRepayments(unwrap(result) || []);
    } catch (loadError) {
      logger.error('Error loading repayments:', loadError);
      setError(loadError?.response?.data?.message || 'Unable to load repayments.');
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([accountService.getAccounts(false), repaymentService.getRepayments()])
      .then(([accountsResult, repaymentResult]) => {
        if (!active) return;
        const accountRows = unwrap(accountsResult) || [];
        setAccounts(accountRows);
        setRepayments(unwrap(repaymentResult) || []);
        const firstAccount = accountRows.find((account) => ['CASH', 'BANK'].includes(account.type));
        if (firstAccount) setForm((current) => ({ ...current, accountId: firstAccount._id }));
      })
      .catch((loadError) => {
        logger.error('Error loading repayment page:', loadError);
        if (active) setError(loadError?.response?.data?.message || 'Unable to load repayments.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!form.accountId) {
      setCategories([]);
      setPaymentTypes([]);
      return;
    }
    let active = true;
    Promise.all([
      getCategories(form.accountId, { type: 'expense' }),
      getPaymentTypes(form.accountId, { type: 'expense' }),
    ])
      .then(([categoryResult, paymentResult]) => {
        if (!active) return;
        const categoryRows = unwrap(categoryResult) || [];
        const paymentRows = unwrap(paymentResult) || [];
        setCategories(categoryRows);
        setPaymentTypes(paymentRows);
        setForm((current) => ({
          ...current,
          categoryId: categoryRows.some((item) => item._id === current.categoryId)
            ? current.categoryId
            : categoryRows[0]?._id || '',
          paymentTypeId: paymentRows.some((item) => item._id === current.paymentTypeId)
            ? current.paymentTypeId
            : paymentRows[0]?._id || '',
        }));
      })
      .catch((loadError) => {
        logger.error('Error loading expense categories and payment types:', loadError);
        if (active) setError(loadError?.response?.data?.message || 'Unable to load expense options.');
      });
    return () => {
      active = false;
    };
  }, [form.accountId]);

  const updateParticipant = (index, key, value) => {
    setForm((current) => ({
      ...current,
      participants: current.participants.map((participant, itemIndex) =>
        itemIndex === index ? { ...participant, [key]: value } : participant,
      ),
    }));
  };

  const submitSharedPayment = async (event) => {
    event.preventDefault();
    const amount = Number(form.amount);
    const personalShare = Number(form.personalShare);
    const participants = form.participants.map((participant) => ({
      name: participant.name.trim(),
      amount: Number(participant.amount),
    }));
    if (
      !form.accountId ||
      !form.categoryId ||
      (!form.creditCardAccountId && !form.paymentTypeId) ||
      amount <= 0 ||
      personalShare < 0 ||
      participants.some((participant) => !participant.name || participant.amount <= 0) ||
      Math.abs(personalShare + participants.reduce((sum, item) => sum + item.amount, 0) - amount) >
        0.005
    ) {
      setError('Enter valid shares whose total equals the full payment amount.');
      return;
    }
    try {
      setSaving(true);
      setError('');
      await createTransaction(form.accountId, {
        type: 'expense',
        amount,
        date: new Date(`${form.date}T12:00:00`).toISOString(),
        description: form.title.trim(),
        notes: form.notes.trim(),
        categoryId: form.categoryId,
        paymentTypeId: form.creditCardAccountId ? undefined : form.paymentTypeId,
        creditCardAccountId: form.creditCardAccountId || undefined,
        sharedPayment: { personalShare, participants },
      });
      setForm((current) => ({
        ...current,
        amount: '',
        personalShare: '',
        title: '',
        notes: '',
        participants: [{ name: '', amount: '' }],
        date: today(),
      }));
      await loadRepayments();
    } catch (saveError) {
      logger.error('Error creating shared payment:', saveError);
      setError(saveError?.response?.data?.message || 'Unable to create the shared payment.');
    } finally {
      setSaving(false);
    }
  };

  const submitReceipt = async (event, repayment) => {
    event.preventDefault();
    const values = receiptForms[repayment._id] || {};
    try {
      setSaving(true);
      setError('');
      await repaymentService.createReceipt(
        repayment._id,
        buildCreateReceiptPayload(repayment, values, spendingAccounts, today()),
      );
      await loadRepayments();
      setReceiptForms((current) => ({
        ...current,
        [repayment._id]: { ...current[repayment._id], amount: '', notes: '' },
      }));
    } catch (saveError) {
      logger.error('Error recording repayment receipt:', saveError);
      setError(saveError?.response?.data?.message || 'Unable to record the repayment.');
    } finally {
      setSaving(false);
    }
  };

  const beginEditRepayment = (repayment) => {
    setEditingRepaymentId(repayment._id);
    setEditForm({
      title: repayment.title || '',
      date: new Date(repayment.date).toISOString().slice(0, 10),
      notes: repayment.notes || '',
      personalShare: String(repayment.personalShare),
      participants: repayment.participants.map((participant) => ({
        id: participant._id,
        name: participant.name,
        amount: String(participant.amount),
      })),
    });
  };

  const saveRepaymentEdit = async (event, repayment) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError('');
      await repaymentService.updateRepayment(repayment._id, {
        title: editForm.title,
        date: new Date(`${editForm.date}T12:00:00`).toISOString(),
        notes: editForm.notes,
        personalShare: Number(editForm.personalShare),
        participants: editForm.participants.map((participant) => ({
          ...(participant.id && { id: participant.id }),
          name: participant.name.trim(),
          amount: Number(participant.amount),
        })),
      });
      setEditingRepaymentId('');
      setEditForm(null);
      await loadRepayments();
    } catch (updateError) {
      setError(updateError?.response?.data?.message || 'Unable to update shares. Check the share totals and existing receipts.');
    } finally {
      setSaving(false);
    }
  };

  const removeRepayment = async (repayment) => {
    if (!window.confirm('Remove this shared-payment tracking record? The expense will remain.')) return;
    try {
      await repaymentService.deleteRepayment(repayment._id);
      await loadRepayments();
    } catch (deleteError) {
      setError(deleteError?.response?.data?.message || 'Repayments with receipts cannot be removed.');
    }
  };

  const reverseReceipt = async (repayment, receipt) => {
    if (!window.confirm('Reverse this repayment receipt?')) return;
    try {
      await repaymentService.reverseReceipt(repayment._id, receipt._id);
      await loadRepayments();
    } catch (reverseError) {
      setError(reverseError?.response?.data?.message || 'Unable to reverse this receipt.');
    }
  };

  const editReceipt = async (repayment, receipt) => {
    const amountInput = window.prompt('Edit repayment amount', String(receipt.amount));
    if (amountInput === null) return;
    const amount = Number(amountInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a positive amount.');
      return;
    }
    try {
      await repaymentService.updateReceipt(repayment._id, receipt._id, { amount });
      await loadRepayments();
    } catch (updateError) {
      setError(updateError?.response?.data?.message || 'Unable to edit this receipt.');
    }
  };

  return (
    <Layout>
      <main className='mx-auto min-h-screen max-w-6xl space-y-6 p-4 text-gray-800 sm:p-6'>
        <header>
          <h1 className='text-2xl font-semibold'>Repayments</h1>
          <p className='mt-1 text-sm text-gray-600'>
            Only your personal share affects budgets. Money others repay is not income.
            Credit-card repayments are reserved for that card's bill.
          </p>
        </header>

        {error && (
          <p role='alert' className='rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
            {error}
          </p>
        )}

        <section className='card p-5'>
          <h2 className='mb-4 text-lg font-semibold'>Record a shared payment</h2>
          {!spendingAccounts.length ? (
            <p className='text-sm text-gray-600'>Add a cash or bank account before recording a shared payment.</p>
          ) : (
            <form onSubmit={submitSharedPayment} className='space-y-4'>
              <div className='grid gap-3 md:grid-cols-2'>
                <select
                  className='input'
                  value={form.accountId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      accountId: event.target.value,
                      creditCardAccountId: '',
                    }))
                  }
                  aria-label='Payment account'
                >
                  {spendingAccounts.map((account) => (
                    <option key={account._id} value={account._id}>{account.name}</option>
                  ))}
                </select>
                <select
                  className='input'
                  value={form.categoryId}
                  onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
                  required
                >
                  <option value=''>Expense category</option>
                  {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
                </select>
                <select
                  className='input'
                  value={form.creditCardAccountId ? `card:${form.creditCardAccountId}` : form.paymentTypeId}
                  onChange={(event) =>
                    setForm((current) =>
                      event.target.value.startsWith('card:')
                        ? { ...current, creditCardAccountId: event.target.value.slice(5) }
                        : { ...current, creditCardAccountId: '', paymentTypeId: event.target.value },
                    )
                  }
                >
                  {paymentTypes.map((type) => <option key={type._id} value={type._id}>{type.name}</option>)}
                  {cards.map((card) => <option key={card._id} value={`card:${card._id}`}>Credit card: {card.name}</option>)}
                </select>
                <input
                  className='input'
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder='What was paid for?'
                  maxLength='200'
                  required
                />
                <input
                  className='input'
                  type='date'
                  value={form.date}
                  onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                  required
                />
                <input
                  className='input'
                  type='number'
                  min='0.01'
                  step='0.01'
                  value={form.amount}
                  onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                  placeholder='Full amount paid'
                  required
                />
                <input
                  className='input'
                  type='number'
                  min='0'
                  step='0.01'
                  value={form.personalShare}
                  onChange={(event) => setForm((current) => ({ ...current, personalShare: event.target.value }))}
                  placeholder='Your personal share'
                  required
                />
                <input
                  className='input md:col-span-2'
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder='Notes (optional)'
                  maxLength='1000'
                />
              </div>
              <div className='space-y-2'>
                <h3 className='text-sm font-semibold'>Other people’s shares</h3>
                {form.participants.map((participant, index) => (
                  <div key={index} className='grid gap-2 sm:grid-cols-[1fr_1fr_auto]'>
                    <input
                      className='input'
                      value={participant.name}
                      onChange={(event) => updateParticipant(index, 'name', event.target.value)}
                      placeholder='Name'
                      required
                    />
                    <input
                      className='input'
                      type='number'
                      min='0.01'
                      step='0.01'
                      value={participant.amount}
                      onChange={(event) => updateParticipant(index, 'amount', event.target.value)}
                      placeholder='Share amount'
                      required
                    />
                    {form.participants.length > 1 && (
                      <button
                        type='button'
                        className='rounded px-3 text-sm text-red-700 hover:bg-red-50'
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            participants: current.participants.filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type='button'
                  className='inline-flex items-center gap-1 text-sm font-medium text-indigo-700'
                  onClick={() => setForm((current) => ({ ...current, participants: [...current.participants, { name: '', amount: '' }] }))}
                >
                  <Plus size={16} /> Add person
                </button>
              </div>
              <button type='submit' className='btn btn-primary' disabled={saving || !categories.length}>
                {saving ? 'Saving…' : 'Save shared payment'}
              </button>
            </form>
          )}
        </section>

        <section className='space-y-4'>
          <h2 className='text-lg font-semibold'>Shared payments</h2>
          {loading ? (
            <p className='text-sm text-gray-500'>Loading repayments…</p>
          ) : !repayments.length ? (
            <div className='card p-6 text-sm text-gray-500'>No shared payments recorded yet.</div>
          ) : (
            repayments.map((repayment) => {
              const values = receiptForms[repayment._id] || {};
              const participantId = values.participantId || repayment.participants.find((item) => item.pending > 0)?._id || '';
              const activeParticipants = repayment.participants.filter((participant) => participant.pending > 0);
              return (
                <article key={repayment._id} className='card space-y-4 p-5'>
                  <div className='flex flex-wrap items-start justify-between gap-3'>
                    <div>
                      <div className='flex items-center gap-2'>
                        <h3 className='font-semibold'>{repayment.title || 'Shared expense'}</h3>
                        <button
                          type='button'
                          onClick={() => beginEditRepayment(repayment)}
                          title='Edit shared payment'
                          className='text-gray-500 hover:text-indigo-700'
                        >
                          <Pencil size={15} />
                        </button>
                        <button type='button' onClick={() => removeRepayment(repayment)} title='Remove tracking record' className='text-gray-500 hover:text-red-700'>
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <p className='text-xs text-gray-500'>{new Date(repayment.date).toLocaleDateString()}</p>
                    </div>
                    <div className='grid grid-cols-2 gap-x-5 gap-y-1 text-right text-sm sm:grid-cols-4'>
                      <span className='text-gray-500'>Original</span><strong>{money(repayment.totalAmount)}</strong>
                      <span className='text-gray-500'>Your share</span><strong>{money(repayment.personalShare)}</strong>
                      <span className='text-gray-500'>Recovered</span><strong className='text-green-700'>{money(repayment.totalRepaid)}</strong>
                      <span className='text-gray-500'>Pending</span><strong>{money(repayment.totalPending)}</strong>
                    </div>
                  </div>

                  {editingRepaymentId === repayment._id && editForm && (
                    <form
                      onSubmit={(event) => saveRepaymentEdit(event, repayment)}
                      className='space-y-3 rounded-lg border border-indigo-100 bg-indigo-50 p-4'
                    >
                      <h4 className='text-sm font-semibold'>Edit shared payment and shares</h4>
                      <div className='grid gap-2 sm:grid-cols-2'>
                        <input
                          className='input'
                          value={editForm.title}
                          onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))}
                          placeholder='Title'
                          maxLength='200'
                          required
                        />
                        <input
                          className='input'
                          type='date'
                          value={editForm.date}
                          onChange={(event) => setEditForm((current) => ({ ...current, date: event.target.value }))}
                          required
                        />
                        <input
                          className='input'
                          type='number'
                          min='0'
                          step='0.01'
                          value={editForm.personalShare}
                          onChange={(event) => setEditForm((current) => ({ ...current, personalShare: event.target.value }))}
                          placeholder='Your personal share'
                          required
                        />
                        <input
                          className='input'
                          value={editForm.notes}
                          onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))}
                          placeholder='Notes (optional)'
                          maxLength='1000'
                        />
                      </div>
                      {editForm.participants.map((participant, index) => (
                        <div key={participant.id || index} className='grid gap-2 sm:grid-cols-[1fr_1fr_auto]'>
                          <input
                            className='input'
                            value={participant.name}
                            onChange={(event) => setEditForm((current) => ({
                              ...current,
                              participants: current.participants.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, name: event.target.value } : item,
                              ),
                            }))}
                            placeholder='Name'
                            required
                          />
                          <input
                            className='input'
                            type='number'
                            min='0.01'
                            step='0.01'
                            value={participant.amount}
                            onChange={(event) => setEditForm((current) => ({
                              ...current,
                              participants: current.participants.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, amount: event.target.value } : item,
                              ),
                            }))}
                            placeholder='Share amount'
                            required
                          />
                          {editForm.participants.length > 1 && (
                            <button
                              type='button'
                              className='px-3 text-sm text-red-700'
                              onClick={() => setEditForm((current) => ({
                                ...current,
                                participants: current.participants.filter((_, itemIndex) => itemIndex !== index),
                              }))}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                      <div className='flex flex-wrap gap-2'>
                        <button
                          type='button'
                          className='text-sm font-medium text-indigo-700'
                          onClick={() => setEditForm((current) => ({
                            ...current,
                            participants: [...current.participants, { name: '', amount: '' }],
                          }))}
                        >
                          Add person
                        </button>
                        <button type='submit' className='btn btn-primary' disabled={saving}>
                          Save changes
                        </button>
                        <button
                          type='button'
                          className='rounded px-3 text-sm text-gray-600'
                          onClick={() => {
                            setEditingRepaymentId('');
                            setEditForm(null);
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  <div className='grid gap-2 sm:grid-cols-2'>
                    {repayment.participants.map((participant) => (
                      <div key={participant._id} className='rounded-lg bg-gray-50 p-3 text-sm'>
                        <div className='flex justify-between gap-2'>
                          <span className='font-medium'>{participant.name}</span>
                          <span>{money(participant.pending)} pending</span>
                        </div>
                        <p className='mt-1 text-xs text-gray-500'>
                          Share {money(participant.amount)} · Received {money(participant.repaid)}
                        </p>
                      </div>
                    ))}
                  </div>

                  {repayment.receipts?.length > 0 && (
                    <div>
                      <h4 className='mb-2 text-sm font-medium'>Receipt history</h4>
                      <div className='space-y-2'>
                        {repayment.receipts.map((receipt) => {
                          const participant = repayment.participants.find(
                            (item) => String(item._id) === String(receipt.participantId),
                          );
                          return (
                            <div key={receipt._id} className='flex items-center justify-between gap-3 rounded border p-2 text-sm'>
                              <span>{participant?.name || 'Participant'} · {new Date(receipt.date).toLocaleDateString()}</span>
                              <span className='ml-auto font-medium'>{money(receipt.amount)}</span>
                              <button type='button' onClick={() => editReceipt(repayment, receipt)} title='Edit receipt' className='text-gray-500 hover:text-indigo-700'>
                                <Pencil size={15} />
                              </button>
                              <button type='button' onClick={() => reverseReceipt(repayment, receipt)} title='Reverse receipt' className='text-gray-500 hover:text-red-700'>
                                <RotateCcw size={15} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activeParticipants.length > 0 && spendingAccounts.length > 0 && (
                    <form onSubmit={(event) => submitReceipt(event, repayment)} className='grid gap-2 rounded-lg bg-indigo-50 p-3 sm:grid-cols-2 lg:grid-cols-5'>
                      <select
                        className='input'
                        value={participantId}
                        onChange={(event) => setReceiptForms((current) => ({
                          ...current,
                          [repayment._id]: { ...current[repayment._id], participantId: event.target.value },
                        }))}
                        required
                      >
                        {activeParticipants.map((participant) => (
                          <option key={participant._id} value={participant._id}>
                            {participant.name} · {money(participant.pending)} due
                          </option>
                        ))}
                      </select>
                      <input
                        className='input'
                        type='number'
                        min='0.01'
                        step='0.01'
                        max={repayment.participants.find((item) => item._id === participantId)?.pending || undefined}
                        value={values.amount || ''}
                        onChange={(event) => setReceiptForms((current) => ({
                          ...current,
                          [repayment._id]: { ...current[repayment._id], amount: event.target.value, participantId },
                        }))}
                        placeholder='Amount received'
                        required
                      />
                      <input
                        className='input'
                        type='date'
                        value={values.date || today()}
                        onChange={(event) => setReceiptForms((current) => ({
                          ...current,
                          [repayment._id]: { ...current[repayment._id], date: event.target.value, participantId },
                        }))}
                        required
                      />
                      <select
                        className='input'
                        value={values.destinationAccountId || spendingAccounts[0]._id}
                        onChange={(event) => setReceiptForms((current) => ({
                          ...current,
                          [repayment._id]: { ...current[repayment._id], destinationAccountId: event.target.value, participantId },
                        }))}
                        required
                      >
                        {spendingAccounts.map((account) => <option key={account._id} value={account._id}>{account.name}</option>)}
                      </select>
                      <button type='submit' className='btn btn-primary' disabled={saving}>
                        Record repayment
                      </button>
                      <input
                        className='input sm:col-span-2 lg:col-span-4'
                        value={values.notes || ''}
                        onChange={(event) => setReceiptForms((current) => ({
                          ...current,
                          [repayment._id]: { ...current[repayment._id], notes: event.target.value, participantId },
                        }))}
                        placeholder='Notes (optional)'
                      />
                    </form>
                  )}
                  {repayment.receivableAmount > 0 && repayment.creditCardAccountId && (
                    <p className='text-xs text-amber-800'>
                      Repayments are earmarked for the original credit card bill and are not spendable.
                    </p>
                  )}
                </article>
              );
            })
          )}
        </section>
      </main>
    </Layout>
  );
};

export default Repayments;
