import * as dataTransferService from '../services/dataTransferService.js';

export const exportTransactions = async (req, res) => {
  const csv = await dataTransferService.getTransactionCsv(req.user._id);
  res
    .status(200)
    .type('text/csv')
    .attachment('expense-manager-transactions.csv')
    .send(csv);
};

export const exportFinancialBackup = async (req, res) => {
  const backup = await dataTransferService.getFinancialBackup(req.user._id);
  res
    .status(200)
    .type('application/json')
    .attachment('expense-manager-financial-backup.json')
    .send(JSON.stringify(backup, null, 2));
};

export const previewCsvImport = async (req, res) => {
  const { rows, mapping } = req.body;
  const preview = await dataTransferService.previewCsvImport(
    req.user._id,
    req.params.accountId,
    rows,
    mapping,
  );
  res.json({ success: true, data: preview });
};

export const importCsvTransactions = async (req, res) => {
  const { rows, mapping } = req.body;
  const result = await dataTransferService.importCsvTransactions(
    req.user._id,
    req.params.accountId,
    rows,
    mapping,
  );
  res.json({ success: true, data: result });
};
