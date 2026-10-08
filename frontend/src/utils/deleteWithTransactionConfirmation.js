export async function requestDeleteWithTransactionConfirmation(deleteRequest) {
  try {
    await deleteRequest(false);
    return { deleted: true, movedCount: 0 };
  } catch (error) {
    const details = error?.response?.data?.errors;
    if (!details?.requiresTransactionMove) throw error;

    return {
      deleted: false,
      requiresConfirmation: true,
      transactionCount: Number(details.transactionCount || 0),
      destination: details.destination || 'Others - None',
    };
  }
}