import React, { useEffect, useState } from 'react';
import { importCsvTransactions, previewCsvImport } from '../services/dataTransferService';
import { parseCsv, suggestCsvMapping } from '../utils/csv';

function createMappedImportPayload(rows, mapping) {
  const fields = Object.entries(mapping).filter(([, column]) => column);
  return {
    mapping: Object.fromEntries(fields.map(([field]) => [field, field])),
    rows: rows.map((row) =>
      Object.fromEntries(fields.map(([field, column]) => [field, row[column] || ''])),
    ),
  };
}

const CsvImportPanel = ({ accountId: fixedAccountId, accounts = [], onImportComplete }) => {
  const [selectedAccountId, setSelectedAccountId] = useState(
    fixedAccountId || accounts[0]?._id || '',
  );
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [csvMapping, setCsvMapping] = useState({});
  const [importPreview, setImportPreview] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [dataError, setDataError] = useState('');
  const [dataAction, setDataAction] = useState('');
  const [fileInputKey, setFileInputKey] = useState(0);
  const inputPrefix = fixedAccountId ? `account-import-${fixedAccountId}` : 'settings-import';
  const destinationAccountId = fixedAccountId || selectedAccountId;

  useEffect(() => {
    if (!fixedAccountId && !selectedAccountId && accounts.length) {
      setSelectedAccountId(accounts[0]._id);
    }
  }, [accounts, fixedAccountId, selectedAccountId]);

  const resetLoadedCsv = () => {
    setCsvHeaders([]);
    setCsvRows([]);
    setCsvMapping({});
    setImportPreview(null);
    setImportResult(null);
    setDataError('');
    setFileInputKey((key) => key + 1);
  };

  const handleCsvFile = async (event) => {
    const file = event.target.files?.[0];
    setCsvHeaders([]);
    setCsvRows([]);
    setCsvMapping({});
    setImportPreview(null);
    setImportResult(null);
    setDataError('');
    if (!file) return;
    if (file.size > 400 * 1024) {
      setDataError('CSV files must be 400 KB or smaller.');
      event.target.value = '';
      return;
    }

    try {
      const parsed = parseCsv(await file.text());
      setCsvHeaders(parsed.headers);
      setCsvRows(parsed.rows);
      setCsvMapping(suggestCsvMapping(parsed.headers));
    } catch (error) {
      setDataError(error.message);
      event.target.value = '';
    }
  };

  const handlePreviewImport = async () => {
    setDataError('');
    setImportResult(null);
    setDataAction('preview');
    try {
      const requiredFields = ['date', 'type', 'amount', 'category', 'paymentType'];
      if (requiredFields.some((field) => !csvMapping[field])) {
        throw new Error('Map date, type, amount, category, and payment type before previewing.');
      }
      const mappedColumns = Object.values(csvMapping).filter(Boolean);
      if (new Set(mappedColumns).size !== mappedColumns.length) {
        throw new Error('Each mapped field must use a different CSV column.');
      }
      const payload = createMappedImportPayload(csvRows, csvMapping);
      const result = await previewCsvImport(destinationAccountId, payload.rows, payload.mapping);
      setImportPreview(result);
    } catch (error) {
      setImportPreview(null);
      setDataError(error.response?.data?.message || error.message);
    } finally {
      setDataAction('');
    }
  };

  const handleImport = async () => {
    setDataError('');
    setDataAction('import');
    try {
      const payload = createMappedImportPayload(csvRows, csvMapping);
      const result = await importCsvTransactions(destinationAccountId, payload.rows, payload.mapping);
      setImportResult(result);
      setImportPreview(null);
      onImportComplete?.(result);
    } catch (error) {
      setDataError(error.response?.data?.message || error.message);
    } finally {
      setDataAction('');
    }
  };

  return (
    <section className='mt-6 p-4 rounded-lg border border-gray-200 bg-white'>
      <h2 className='font-medium text-gray-900'>Import transactions from CSV</h2>
      <p className='text-sm text-gray-500 mt-1'>
        Import income and expense rows into one account. Transfers are not supported; duplicate rows are skipped.
      </p>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mt-4'>
        {!fixedAccountId && (
          <div>
            <label
              className='block text-sm font-medium text-gray-700 mb-1'
              htmlFor={`${inputPrefix}-account`}
            >
              Destination account
            </label>
            <select
              id={`${inputPrefix}-account`}
              className='input'
              value={selectedAccountId}
              onChange={(event) => {
                setSelectedAccountId(event.target.value);
                setImportPreview(null);
                setImportResult(null);
              }}
              disabled={!accounts.length || Boolean(dataAction)}
            >
              {accounts.map((account) => (
                <option key={account._id} value={account._id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label
            className='block text-sm font-medium text-gray-700 mb-1'
            htmlFor={`${inputPrefix}-csv`}
          >
            CSV file
          </label>
          <input
            key={fileInputKey}
            id={`${inputPrefix}-csv`}
            className='input'
            type='file'
            accept='.csv,text/csv'
            onChange={handleCsvFile}
            disabled={!destinationAccountId || Boolean(dataAction)}
          />
        </div>
      </div>

      {csvHeaders.length > 0 && (
        <>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4'>
            {[
              ['date', 'Date', true],
              ['type', 'Type', true],
              ['amount', 'Amount', true],
              ['category', 'Category', true],
              ['paymentType', 'Payment type', true],
              ['subcategory', 'Subcategory', false],
              ['description', 'Description', false],
              ['notes', 'Notes', false],
              ['tags', 'Tags', false],
            ].map(([field, label, required]) => (
              <div key={field}>
                <label
                  className='block text-sm font-medium text-gray-700 mb-1'
                  htmlFor={`${inputPrefix}-map-${field}`}
                >
                  {label}
                  {required ? ' *' : ''}
                </label>
                <select
                  id={`${inputPrefix}-map-${field}`}
                  className='input'
                  value={csvMapping[field] || ''}
                  onChange={(event) => {
                    setCsvMapping((current) => ({ ...current, [field]: event.target.value }));
                    setImportPreview(null);
                    setImportResult(null);
                  }}
                >
                  <option value=''>Not mapped</option>
                  {csvHeaders.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className='flex flex-wrap items-center gap-3 mt-4'>
            <button
              className='btn btn-primary'
              onClick={handlePreviewImport}
              disabled={!destinationAccountId || !csvRows.length || Boolean(dataAction)}
            >
              {dataAction === 'preview' ? 'Checking...' : 'Preview import'}
            </button>
            <button
              className='btn btn-outline'
              onClick={resetLoadedCsv}
              disabled={Boolean(dataAction)}
            >
              Choose another file
            </button>
            <span className='text-sm text-gray-500'>
              {csvRows.length} data row{csvRows.length === 1 ? '' : 's'} loaded
            </span>
          </div>
        </>
      )}

      {importPreview && (
        <div className='mt-4'>
          <p className='text-sm font-medium text-gray-800' role='status'>
            Ready: {importPreview.summary.ready} · Duplicates: {importPreview.summary.duplicates} · Invalid:{' '}
            {importPreview.summary.invalid}
          </p>
          <div className='overflow-x-auto mt-3 max-h-72 border border-gray-200 rounded-lg'>
            <table className='min-w-full text-sm'>
              <thead className='bg-gray-50 sticky top-0'>
                <tr>
                  <th className='px-3 py-2 text-left'>Row</th>
                  <th className='px-3 py-2 text-left'>Date</th>
                  <th className='px-3 py-2 text-left'>Type</th>
                  <th className='px-3 py-2 text-left'>Amount</th>
                  <th className='px-3 py-2 text-left'>Category</th>
                  <th className='px-3 py-2 text-left'>Payment type</th>
                  <th className='px-3 py-2 text-left'>Status</th>
                  <th className='px-3 py-2 text-left'>Details</th>
                </tr>
              </thead>
              <tbody>
                {importPreview.rows.map((row) => (
                  <tr key={row.rowNumber} className='border-t border-gray-100'>
                    <td className='px-3 py-2'>{row.rowNumber}</td>
                    <td className='px-3 py-2 whitespace-nowrap'>{row.values?.date}</td>
                    <td className='px-3 py-2 capitalize'>{row.values?.type}</td>
                    <td className='px-3 py-2'>{row.values?.amount}</td>
                    <td className='px-3 py-2'>
                      {row.values?.category}
                      {row.values?.subcategory ? ` / ${row.values.subcategory}` : ''}
                    </td>
                    <td className='px-3 py-2'>{row.values?.paymentType}</td>
                    <td className='px-3 py-2 capitalize'>{row.status}</td>
                    <td className='px-3 py-2 text-gray-600'>
                      {row.issues.join('; ') ||
                        (row.duplicate ? 'Matching transaction already exists' : 'Will be imported')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className='btn btn-primary mt-3'
            onClick={handleImport}
            disabled={!importPreview.summary.ready || Boolean(dataAction)}
          >
            {dataAction === 'import'
              ? 'Importing...'
              : `Import ${importPreview.summary.ready} transactions`}
          </button>
        </div>
      )}

      {importResult && (
        <p className='text-sm text-gray-700 mt-4' role='status'>
          Imported: {importResult.imported} · Skipped duplicates: {importResult.skippedDuplicates} · Failed:{' '}
          {importResult.failed}
          {importResult.errors.length > 0 && (
            <span className='block mt-2 text-red-700'>
              {importResult.errors
                .map(({ rowNumber, message }) => `Row ${rowNumber}: ${message}`)
                .join(' · ')}
            </span>
          )}
        </p>
      )}
      {dataError && (
        <p className='text-sm text-red-700 mt-3' role='alert'>
          {dataError}
        </p>
      )}
    </section>
  );
};

export default CsvImportPanel;
