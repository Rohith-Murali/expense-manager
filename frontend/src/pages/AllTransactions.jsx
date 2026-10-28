import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Search,
  Filter,
  X,
  ArrowLeft,
  FileDown,
  FileSpreadsheet,
  Trash2,
  ArrowRightLeft,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../services/api';
import TransactionCard from '../components/TransactionCard';
import TransactionDeleteModal from '../components/TransactionDeleteModal';
import FilterModal from '../components/FilterModal';
import CsvImportPanel from '../components/CsvImportPanel';
import Layout from '../components/layout/Layout';
import { logger } from '../utils/logger';
import * as transactionService from '../services/transactionService';
import { getUserFriendlyMessage } from '../utils/errorHandler';
import { filterAndSortTransactions } from '../utils/transactionList';
import { downloadTransactionsCsv, getTransactionExportRows } from '../utils/csv';

const AllTransactions = () => {
  const navigate = useNavigate();
  const { accountId } = useParams();
  const [transactions, setTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('date-desc');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    categoryId: '',
    paymentTypeId: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
  });
  const [loading, setLoading] = useState(true);
  const [exportError, setExportError] = useState('');
  const [selectedTransactionIds, setSelectedTransactionIds] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    setSelectedTransactionIds([]);
    setDeleteError('');
    fetchTransactions();
  }, [accountId]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/account/${accountId}/transactions`, {
        params: { limit: 1000 },
      });
      setTransactions(response.data);
    } catch (error) {
      logger.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = useMemo(
    () => filterAndSortTransactions({ transactions, searchTerm, filters, sortOrder }),
    [transactions, searchTerm, filters, sortOrder],
  );

  const clearFilters = () => {
    setFilters({
      type: '',
      categoryId: '',
      paymentTypeId: '',
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
    });
    setSearchTerm('');
  };

  const toggleTransactionSelection = (transactionId) => {
    setSelectedTransactionIds((selectedIds) =>
      selectedIds.includes(transactionId)
        ? selectedIds.filter((id) => id !== transactionId)
        : [...selectedIds, transactionId],
    );
    setDeleteError('');
  };

  const confirmDeleteSelected = async () => {
    setIsDeleting(true);
    setDeleteError('');
    const deletedIds = [];
    const failures = [];

    for (const transactionId of selectedTransactionIds) {
      try {
        await transactionService.deleteTransaction(accountId, transactionId);
        deletedIds.push(transactionId);
      } catch (error) {
        failures.push(error);
      }
    }

    setTransactions((currentTransactions) =>
      currentTransactions.filter((transaction) => !deletedIds.includes(transaction._id)),
    );
    setSelectedTransactionIds((currentIds) => currentIds.filter((id) => !deletedIds.includes(id)));
    setIsDeleting(false);

    if (failures.length > 0) {
      logger.error('Error deleting selected transactions:', failures[0]);
      setDeleteError(
        failures.length === selectedTransactionIds.length
          ? getUserFriendlyMessage(failures[0])
          : `${deletedIds.length} transaction${deletedIds.length === 1 ? '' : 's'} deleted; ${failures.length} could not be deleted.`,
      );
      setShowDeleteModal(false);
      return;
    }

    setShowDeleteModal(false);
  };

  const handleCsvExport = () => {
    try {
      setExportError('');
      downloadTransactionsCsv(
        filteredTransactions,
        `transactions-${accountId}-${new Date().toISOString().slice(0, 10)}.csv`,
      );
    } catch (error) {
      logger.error('Error exporting filtered transactions as CSV:', error);
      setExportError('Could not export transactions as CSV.');
    }
  };

  const handlePdfExport = () => {
    try {
      setExportError('');
      const doc = new jsPDF({ orientation: 'landscape' });
      const rows = getTransactionExportRows(filteredTransactions);
      const filename = `transactions-${accountId}-${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.setFontSize(18);
      doc.text('All Transactions', 14, 16);
      doc.setFontSize(10);
      doc.text(
        `${rows.length} transaction${rows.length === 1 ? '' : 's'} | Exported ${new Date().toLocaleString()}`,
        14,
        23,
      );
      autoTable(doc, {
        startY: 29,
        head: [
          [
            'Date',
            'Type',
            'Amount',
            'Category',
            'Subcategory',
            'Payment method',
            'Description',
            'Notes',
          ],
        ],
        body: rows.map((row) => [
          row.date ? new Date(row.date).toLocaleDateString() : '',
          row.type,
          row.amount.toFixed(2),
          row.category,
          row.subcategory,
          row.paymentType,
          row.description,
          row.notes,
        ]),
        styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [79, 70, 229] },
        columnStyles: {
          0: { cellWidth: 23 },
          1: { cellWidth: 20 },
          2: { cellWidth: 22, halign: 'right' },
          3: { cellWidth: 28 },
          4: { cellWidth: 28 },
          5: { cellWidth: 28 },
          6: { cellWidth: 48 },
          7: { cellWidth: 'auto' },
        },
        didDrawPage: () => {
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(8);
          doc.text(
            `Page ${pageCount}`,
            doc.internal.pageSize.getWidth() - 14,
            doc.internal.pageSize.getHeight() - 7,
            { align: 'right' },
          );
        },
      });
      doc.save(filename);
    } catch (error) {
      logger.error('Error exporting filtered transactions as PDF:', error);
      setExportError('Could not export transactions as PDF.');
    }
  };

  const activeFilterCount = Object.values(filters).filter((v) => v !== '').length;

  return (
    <Layout>
    <div className='min-h-screen p-6 bg-gray-50 text-gray-800'>
      <header className='flex items-center gap-4 mb-4'>
        <button className='p-2 rounded-md hover:bg-gray-100' onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h1 className='text-2xl font-semibold'>All Transactions</h1>
      </header>

      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4'>
        <div className='flex items-center gap-3 bg-white border rounded px-3 py-2 shadow-sm w-full max-w-xl'>
          <Search size={20} />
          <input
            type='text'
            placeholder='Search transactions...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='w-full outline-none'
          />
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <label className='sr-only' htmlFor='transaction-sort'>
            Sort transactions
          </label>
          <select
            id='transaction-sort'
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            className='border rounded px-3 py-2 bg-white'
          >
            <option value='date-desc'>Newest first</option>
            <option value='date-asc'>Oldest first</option>
            <option value='amount-desc'>Amount: high to low</option>
            <option value='amount-asc'>Amount: low to high</option>
          </select>
          <button
            className='inline-flex items-center gap-2 bg-white border px-3 py-2 rounded hover:shadow'
            onClick={() => setShowFilters(true)}
          >
            <Filter size={20} />
            Filters
            {activeFilterCount > 0 && (
              <span className='ml-2 inline-flex items-center justify-center bg-indigo-600 text-white text-xs px-2 py-0.5 rounded'>
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            className='inline-flex items-center gap-2 bg-white border px-3 py-2 rounded hover:shadow disabled:opacity-50'
            onClick={handleCsvExport}
            disabled={loading || filteredTransactions.length === 0}
            title='Export the currently displayed transactions as CSV'
          >
            <FileSpreadsheet size={18} />
            Export CSV
          </button>
          <button
            className='inline-flex items-center gap-2 bg-white border px-3 py-2 rounded hover:shadow disabled:opacity-50'
            onClick={handlePdfExport}
            disabled={loading || filteredTransactions.length === 0}
            title='Export the currently displayed transactions as PDF'
          >
            <FileDown size={18} />
            Export PDF
          </button>
        </div>
      </div>

      {selectedTransactionIds.length > 0 && (
        <div className='mb-4 flex flex-wrap items-center gap-2 rounded border border-indigo-200 bg-indigo-50 p-3'>
          <span className='mr-2 text-sm font-medium text-indigo-900'>
            {selectedTransactionIds.length} selected
          </span>
          <button
            type='button'
            className='inline-flex items-center gap-2 rounded bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700'
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 size={16} />
            Delete
          </button>
          <button
            type='button'
            className='inline-flex items-center gap-2 rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-500'
            disabled
            title='Move transactions will be available later'
          >
            <ArrowRightLeft size={16} />
            Move
          </button>
          <button
            type='button'
            className='ml-auto text-sm text-indigo-700 hover:underline'
            onClick={() => setSelectedTransactionIds([])}
          >
            Clear selection
          </button>
        </div>
      )}

      {deleteError && (
        <p className='mb-3 text-sm text-red-700' role='alert'>
          {deleteError}
        </p>
      )}

      {exportError && (
        <p className='text-sm text-red-700 mb-3' role='alert'>
          {exportError}
        </p>
      )}

      {activeFilterCount > 0 && (
        <div className='flex items-center justify-between mb-3'>
          <span className='text-sm text-gray-600'>Active Filters:</span>
          <button
            className='inline-flex items-center gap-2 text-sm text-gray-600'
            onClick={clearFilters}
          >
            <X size={16} />
            Clear All
          </button>
        </div>
      )}

      <div className='text-sm text-gray-600 mb-3'>
        {filteredTransactions.length} transactions found · exports include the current results
      </div>

      {loading ? (
        <div className='text-center text-gray-500'>Loading...</div>
      ) : filteredTransactions.length === 0 ? (
        <div className='text-center text-gray-500'>No transactions found</div>
      ) : (
        <div className='space-y-3'>
          {filteredTransactions.map((transaction) => (
            <TransactionCard
              key={transaction._id}
              transaction={transaction}
              selected={selectedTransactionIds.includes(transaction._id)}
              onSelect={toggleTransactionSelection}
              onClick={() => navigate(`/accounts/${accountId}/transaction/${transaction._id}`)}
            />
          ))}
        </div>
      )}

      <CsvImportPanel
        key={accountId}
        accountId={accountId}
        onImportComplete={fetchTransactions}
      />

      {showFilters && (
        <FilterModal filters={filters} onApply={setFilters} onClose={() => setShowFilters(false)} />
      )}
      <TransactionDeleteModal
        isOpen={showDeleteModal}
        transactionCount={selectedTransactionIds.length}
        isDeleting={isDeleting}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteSelected}
      />
    </div>
    </Layout>
  );
};

export default AllTransactions;
