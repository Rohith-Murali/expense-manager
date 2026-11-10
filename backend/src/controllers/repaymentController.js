import * as repaymentService from '../services/repaymentService.js';

export async function list(req, res) {
  const repayments = await repaymentService.listRepayments(req.user._id);
  res.json({ success: true, data: repayments });
}

export async function get(req, res) {
  const repayment = await repaymentService.getRepayment(req.params.id, req.user._id);
  res.json({ success: true, data: repayment });
}

export async function update(req, res) {
  const repayment = await repaymentService.updateRepayment(
    req.params.id,
    req.user._id,
    req.body,
  );
  res.json({ success: true, data: repayment });
}

export async function remove(req, res) {
  await repaymentService.deleteRepayment(req.params.id, req.user._id);
  res.json({ success: true, message: 'Repayment removed successfully' });
}

export async function createReceipt(req, res) {
  const repayment = await repaymentService.createReceipt(
    req.params.id,
    req.user._id,
    req.body,
  );
  res.status(201).json({ success: true, data: repayment });
}

export async function updateReceipt(req, res) {
  const repayment = await repaymentService.updateReceipt(
    req.params.receiptId,
    req.user._id,
    req.body,
  );
  res.json({ success: true, data: repayment });
}

export async function reverseReceipt(req, res) {
  const repayment = await repaymentService.reverseReceipt(
    req.params.receiptId,
    req.user._id,
  );
  res.json({ success: true, data: repayment });
}
