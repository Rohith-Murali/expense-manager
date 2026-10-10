import * as creditCardService from '../services/creditCardService.js';

export const getSummary = async (req, res) => {
  const summary = await creditCardService.getCreditCardSummary(
    req.params.accountId,
    req.user.id,
  );
  res.status(200).json({ data: summary });
};

export const getStatements = async (req, res) => {
  const statements = await creditCardService.getCreditCardStatements(
    req.params.accountId,
    req.user.id,
  );
  res.status(200).json({ data: statements });
};

export const getPayments = async (req, res) => {
  const payments = await creditCardService.getCreditCardPayments(
    req.params.accountId,
    req.user.id,
  );
  res.status(200).json({ data: payments });
};
