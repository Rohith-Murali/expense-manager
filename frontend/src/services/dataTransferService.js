import api from './api';

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportTransactions() {
  const response = await api.get('/data/transactions.csv', { responseType: 'blob' });
  downloadBlob(response.data, 'expense-manager-transactions.csv');
}

export async function exportFinancialBackup() {
  const response = await api.get('/data/backup.json', { responseType: 'blob' });
  downloadBlob(response.data, 'expense-manager-financial-backup.json');
}

export async function previewCsvImport(accountId, rows, mapping) {
  const response = await api.post(`/account/${accountId}/transactions/import/preview`, {
    rows,
    mapping,
  });
  return response.data;
}

export async function importCsvTransactions(accountId, rows, mapping) {
  const response = await api.post(`/account/${accountId}/transactions/import`, {
    rows,
    mapping,
  });
  return response.data;
}
