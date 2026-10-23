export function parseCsv(text) {
  const records = [];
  let record = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ',') {
      record.push(field);
      field = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      record.push(field);
      if (record.some((value) => value.trim() !== '')) records.push(record);
      record = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error('CSV contains an unclosed quoted field.');
  record.push(field);
  if (record.some((value) => value.trim() !== '')) records.push(record);
  if (records.length < 2) throw new Error('CSV must include a header and at least one data row.');

  const headers = records[0].map((header, index) =>
    (index === 0 ? header.replace(/^\uFEFF/, '') : header).trim(),
  );
  if (headers.some((header) => !header)) throw new Error('CSV column names cannot be empty.');
  if (new Set(headers).size !== headers.length) throw new Error('CSV column names must be unique.');
  if (headers.length > 100) throw new Error('CSV files can contain at most 100 columns.');

  const rows = records.slice(1).map((values, index) => {
    if (values.length !== headers.length) {
      throw new Error(`CSV row ${index + 2} has ${values.length} values; expected ${headers.length}.`);
    }
    return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
  });

  if (rows.length > 500) throw new Error('CSV imports are limited to 500 data rows.');
  return { headers, rows };
}

export function suggestCsvMapping(headers) {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: header.toLowerCase().replace(/[^a-z]/g, ''),
  }));
  const aliases = {
    date: ['date', 'transactiondate'],
    type: ['type', 'transactiontype'],
    amount: ['amount'],
    category: ['category'],
    subcategory: ['subcategory'],
    paymentType: ['paymenttype', 'paymentmethod'],
    description: ['description', 'merchant', 'payee'],
    notes: ['notes', 'note'],
    tags: ['tags', 'tag'],
  };

  return Object.fromEntries(
    Object.entries(aliases).map(([field, names]) => [
      field,
      normalizedHeaders.find(({ normalized }) => names.includes(normalized))?.original || '',
    ]),
  );
}

function referenceName(value) {
  return typeof value === 'string' ? '' : value?.name || '';
}

function referenceId(value) {
  return typeof value === 'string' ? value : value?._id || '';
}

function dateValue(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export function getTransactionExportRows(transactions) {
  return transactions.map((transaction) => ({
    date: dateValue(transaction.date),
    type: transaction.type || '',
    amount: Math.abs(Number(transaction.amount) || 0),
    category: referenceName(transaction.categoryId),
    subcategory: referenceName(transaction.subcategoryId),
    paymentType: referenceName(transaction.paymentTypeId),
    description: transaction.description || '',
    notes: transaction.notes || '',
    tags: JSON.stringify(Array.isArray(transaction.tags) ? transaction.tags : []),
    attachments: JSON.stringify(
      Array.isArray(transaction.attachments) ? transaction.attachments : [],
    ),
    isRecurring: Boolean(transaction.isRecurring),
    transferId: transaction.transferId || '',
    transactionId: referenceId(transaction._id) || '',
  }));
}

function escapeCsvCell(value) {
  let text = String(value ?? '');
  if (typeof value === 'string' && /^[\s\uFEFF\u200B]*[=+\-@]/.test(value)) {
    text = `'${text}`;
  }
  return `"${text.replaceAll('"', '""')}"`;
}

export function transactionsToCsv(transactions) {
  const rows = getTransactionExportRows(transactions);
  const headers = [
    'date',
    'type',
    'amount',
    'category',
    'subcategory',
    'paymentType',
    'description',
    'notes',
    'tags',
    'attachments',
    'isRecurring',
    'transferId',
    'transactionId',
  ];
  return `\uFEFF${[
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(',')),
  ].join('\r\n')}`;
}

export function downloadTransactionsCsv(transactions, filename) {
  const blob = new Blob([transactionsToCsv(transactions)], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
