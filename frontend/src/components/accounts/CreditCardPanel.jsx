import React, { useEffect, useState } from 'react';
import { CreditCard, RefreshCw } from 'lucide-react';
import accountService from '../../services/accountService';
import { logger } from '../../utils/logger';

const formatMoney = (value, currency = 'INR') =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value || 0);

const formatDate = (value) =>
  new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

const unwrapData = (result) => result?.data ?? result;

const CreditCardPanel = ({ account, onPaymentRecorded }) => {
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [sourceAccounts, setSourceAccounts] = useState([]);
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAllPayments, setShowAllPayments] = useState(false);

  useEffect(() => {
    loadCardData();
    loadSourceAccounts();
  }, [account._id]);

  const loadCardData = async () => {
    try {
      setLoading(true);
      setError('');
      const [summaryResult, paymentsResult] = await Promise.all([
        accountService.getCreditCardSummary(account._id),
        accountService.getCreditCardPayments(account._id),
      ]);
      setSummary(unwrapData(summaryResult));
      setPayments(unwrapData(paymentsResult) || []);
    } catch (loadError) {
      logger.error('Error fetching credit card data:', loadError);
      setError(loadError?.response?.data?.message || 'Unable to load credit card history.');
    } finally {
      setLoading(false);
    }
  };

  const loadSourceAccounts = async () => {
    try {
      const result = await accountService.getAccounts(false);
      const accounts = unwrapData(result);
      const eligible = (Array.isArray(accounts) ? accounts : []).filter((item) =>
        ['CASH', 'BANK'].includes(item.type),
      );
      setSourceAccounts(eligible);
      setSourceAccountId((current) => current || eligible[0]?._id || '');
    } catch (loadError) {
      logger.error('Error fetching payment source accounts:', loadError);
      setError(loadError?.response?.data?.message || 'Unable to load payment accounts.');
    }
  };

  const handlePayment = async (event) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!sourceAccountId || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Choose a bank or cash account and enter a valid payment amount.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      await accountService.createCreditCardPayment(
        account._id,
        sourceAccountId,
        parsedAmount,
        description.trim() || `Payment to ${account.name}`,
      );
      setAmount('');
      setDescription('');
      setSuccess('Payment recorded.');
      await loadCardData();
      await onPaymentRecorded();
    } catch (paymentError) {
      logger.error('Error recording credit card payment:', paymentError);
      setError(paymentError?.response?.data?.message || 'Unable to record card payment.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !summary) {
    return <div className='card mb-6 p-6 text-gray-500'>Loading credit card details...</div>;
  }

  const cardSummary = summary || {};
  const currency = cardSummary.account?.currency || account.currency || 'INR';

  return (
    <section className='card mb-6 p-4 sm:p-6'>
      <div className='mb-5 flex items-center justify-between gap-3'>
        <div>
          <h2 className='flex items-center gap-2 text-lg font-semibold text-gray-900'>
            <CreditCard size={20} />
            Credit card
          </h2>
          <p className='mt-1 text-sm text-gray-500'>
            Closes on day {cardSummary.account?.statementClosingDay}; payment due{' '}
            {cardSummary.account?.paymentDueDays} days later
          </p>
        </div>
        <button
          type='button'
          onClick={loadCardData}
          className='rounded-lg p-2 text-gray-500 hover:bg-gray-100'
          aria-label='Refresh credit card details'
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {error && <p className='mb-4 rounded bg-red-50 p-3 text-sm text-red-700'>{error}</p>}
      {success && <p className='mb-4 rounded bg-green-50 p-3 text-sm text-green-700'>{success}</p>}

      <div className='mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3'>
        <div className='rounded-lg bg-red-50 p-4'>
          <p className='text-xs uppercase tracking-wide text-red-700'>Outstanding</p>
          <p className='mt-1 text-xl font-bold text-red-800'>
            {formatMoney(cardSummary.outstandingBalance, currency)}
          </p>
        </div>
        <div className='rounded-lg bg-green-50 p-4'>
          <p className='text-xs uppercase tracking-wide text-green-700'>Available credit</p>
          <p className='mt-1 text-xl font-bold text-green-800'>
            {formatMoney(cardSummary.availableCredit, currency)}
          </p>
        </div>
        <div className='rounded-lg bg-gray-50 p-4'>
          <p className='text-xs uppercase tracking-wide text-gray-600'>Credit limit</p>
          <p className='mt-1 text-xl font-bold text-gray-800'>
            {formatMoney(cardSummary.account?.creditLimit, currency)}
          </p>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        <div>
          <h3 className='mb-3 font-semibold text-gray-900'>Statement history</h3>
          {!cardSummary.statements?.length ? (
            <p className='text-sm text-gray-500'>No closed statements yet.</p>
          ) : (
            <div className='space-y-2'>
              {cardSummary.statements.map((statement) => (
                <div
                  key={statement._id}
                  className='flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3'
                >
                  <div>
                    <p className='text-sm font-medium text-gray-800'>
                      {formatDate(statement.periodStart)} – {formatDate(statement.periodEnd)}
                    </p>
                    <p className='text-xs text-gray-500'>Due {formatDate(statement.dueDate)}</p>
                  </div>
                  <div className='text-right'>
                    <p className='font-semibold text-gray-900'>
                      {formatMoney(statement.statementBalance, currency)}
                    </p>
                    <p className='text-xs text-gray-500'>
                      Purchases {formatMoney(statement.purchases, currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className='mb-3 font-semibold text-gray-900'>Recent payments</h3>
          {!payments.length ? (
            <p className='text-sm text-gray-500'>No card payments recorded yet.</p>
          ) : (
            <div className='space-y-2'>
              {(showAllPayments ? payments : payments.slice(0, 6)).map((payment) => (
                <div
                  key={payment._id}
                  className='flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3'
                >
                  <div>
                    <p className='text-sm font-medium text-gray-800'>
                      {payment.description || 'Card payment'}
                    </p>
                    <p className='text-xs text-gray-500'>
                      {formatDate(payment.date)}
                      {payment.sourceAccountName ? ` · ${payment.sourceAccountName}` : ''}
                    </p>
                  </div>
                  <p className='font-semibold text-green-700'>
                    {formatMoney(payment.amount, currency)}
                  </p>
                </div>
              ))}
            </div>
          )}
          {payments.length > 6 && (
            <button
              type='button'
              onClick={() => setShowAllPayments((visible) => !visible)}
              className='mt-2 text-sm font-medium text-indigo-700 hover:underline'
            >
              {showAllPayments ? 'Show recent payments' : 'View all payment history'}
            </button>
          )}

          <form onSubmit={handlePayment} className='mt-4 space-y-3 rounded-lg bg-gray-50 p-4'>
            <h4 className='text-sm font-semibold text-gray-800'>Record a payment</h4>
            {sourceAccounts.length === 0 ? (
              <p className='text-sm text-gray-500'>
                Add a cash or bank account to record a card payment.
              </p>
            ) : (
              <>
                <select
                  value={sourceAccountId}
                  onChange={(event) => setSourceAccountId(event.target.value)}
                  className='input'
                  aria-label='Payment source account'
                  disabled={saving}
                >
                  {sourceAccounts.map((source) => (
                    <option key={source._id} value={source._id}>
                      {source.name}
                    </option>
                  ))}
                </select>
                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  <input
                    type='number'
                    min='0.01'
                    step='0.01'
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder='Payment amount'
                    className='input'
                    required
                    disabled={saving}
                  />
                  <input
                    type='text'
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder='Description (optional)'
                    className='input'
                    maxLength='200'
                    disabled={saving}
                  />
                </div>
                <button type='submit' className='btn btn-primary w-full' disabled={saving}>
                  {saving ? 'Recording payment...' : 'Record payment'}
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    </section>
  );
};

export default CreditCardPanel;
