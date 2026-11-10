export function buildCreatePayload(formData) {
  const payload = {};

  if (formData.type) {
    payload.type =
      formData.type === 'transfer-out' || formData.type === 'transfer-in'
        ? 'transfer'
        : formData.type;
  }

  if (formData.amount !== undefined && formData.amount !== '') {
    payload.amount = Number(formData.amount);
  }

  if (formData.date) payload.date = serializeTransactionDate(formData.date);
  if (formData.description) payload.description = formData.description;
  if (formData.notes) payload.notes = formData.notes;

  if (payload.type === 'transfer') {
    if (formData.toAccountId) {
      payload.toAccountId = formData.toAccountId?._id || formData.toAccountId;
    }
  } else if (payload.type === 'expense' || payload.type === 'income') {
    if (formData.categoryId) {
      payload.categoryId = formData.categoryId?._id || formData.categoryId;
    }
    if (formData.subcategoryId) {
      payload.subcategoryId = formData.subcategoryId?._id || formData.subcategoryId;
    }
    if (formData.paymentTypeId) {
      payload.paymentTypeId = formData.paymentTypeId?._id || formData.paymentTypeId;
    }
    if (formData.creditCardAccountId) {
      payload.creditCardAccountId =
        formData.creditCardAccountId?._id || formData.creditCardAccountId;
    }
  }

  if (formData.isRecurring !== undefined) {
    payload.isRecurring = Boolean(formData.isRecurring);
  }
  if (formData.sharedPayment) payload.sharedPayment = formData.sharedPayment;
  if (formData.repaymentAllocations) {
    payload.repaymentAllocations = formData.repaymentAllocations;
  }

  if (formData.recurringPatternId) {
    payload.recurringPatternId = formData.recurringPatternId?._id || formData.recurringPatternId;
  }

  return payload;
}

export function buildUpdatePayload(formData) {
  const payload = {};
  if (formData.type) {
    payload.type =
      formData.type === 'transfer-out' || formData.type === 'transfer-in'
        ? 'transfer'
        : formData.type;
  }

  if (formData.amount !== undefined && formData.amount !== '')
    payload.amount = Number(formData.amount);
  if (formData.date) payload.date = serializeTransactionDate(formData.date);
  if (formData.description !== undefined) payload.description = formData.description;
  if (formData.notes !== undefined) payload.notes = formData.notes;
  if (formData.accountId !== undefined && formData.accountId !== '') {
    payload.accountId = formData.accountId;
  }

  if (
    payload.type === 'transfer' ||
    formData.type === 'transfer-out' ||
    formData.type === 'transfer-in'
  ) {
    if (formData.toAccountId) {
      payload.toAccountId = formData.toAccountId?._id || formData.toAccountId;
    }
  } else if (payload.type === 'expense' || payload.type === 'income') {
    if (formData.categoryId !== undefined) {
      payload.categoryId = formData.categoryId?._id || formData.categoryId;
    }
    if (formData.subcategoryId !== undefined) {
      payload.subcategoryId = formData.subcategoryId?._id || formData.subcategoryId;
    }
    if (formData.paymentTypeId !== undefined) {
      payload.paymentTypeId = formData.paymentTypeId
        ? formData.paymentTypeId?._id || formData.paymentTypeId
        : null;
    }
    if (formData.creditCardAccountId !== undefined) {
      payload.creditCardAccountId = formData.creditCardAccountId
        ? formData.creditCardAccountId?._id || formData.creditCardAccountId
        : null;
    }
  }

  if (formData.isRecurring !== undefined) {
    payload.isRecurring = Boolean(formData.isRecurring);
  }

  if (formData.recurringPatternId !== undefined) {
    payload.recurringPatternId = formData.recurringPatternId?._id || formData.recurringPatternId;
  }

  return payload;
}

function serializeTransactionDate(value) {
  // datetime-local values have no timezone. Convert them to an absolute
  // timestamp before sending them to the API while preserving the user's
  // local date and time.
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}
