export function buildCreateReceiptPayload(repayment, values = {}, accounts = [], fallbackDate) {
  const participantId =
    values.participantId ||
    repayment.participants.find((participant) => Number(participant.pending) > 0)?._id;
  const destinationAccountId =
    values.destinationAccountId ||
    accounts.find((account) => ['CASH', 'BANK'].includes(account.type))?._id;

  if (!participantId) {
    throw new Error('Choose a participant with an outstanding balance.');
  }
  if (!destinationAccountId) {
    throw new Error('Choose a cash or bank account for the repayment.');
  }

  return {
    participantId,
    amount: Number(values.amount),
    date: values.date || fallbackDate || new Date().toISOString().slice(0, 10),
    destinationAccountId,
    notes: values.notes || '',
  };
}
