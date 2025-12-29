import * as paymentTypeService from '../services/paymentTypeService.js';

export const create = async (req, res) => {
  const paymentType = await paymentTypeService.create({ ...req.body,accountId: req.params.accountId });
  res.status(201).json({ success: true, message: 'Payment type created successfully', data: paymentType });
};

export const getAll = async (req, res) => {
  const { type } = req.query;
  const paymentTypes = await paymentTypeService.getByAccount(req.params.accountId,type);
  res.json({ success: true, data: paymentTypes });
};

export const getById = async (req, res) => {
  const paymentType = await paymentTypeService.getById(req.params.id,req.params.accountId);
  if (!paymentType) return res.status(404).json({ success: false, message: 'Payment type not found' });
  res.json({ success: true, data: paymentType });
};

export const update = async (req, res) => {
  const paymentType = await paymentTypeService.update(req.params.id, req.params.accountId, req.body);
  if (!paymentType) return res.status(404).json({ success: false, message: 'Payment type not found' });
  res.json({ success: true, message: 'Payment type updated successfully', data: paymentType });
};

export const deletePaymentType = async (req, res) => {
  const paymentType = await paymentTypeService.softDelete(req.params.id,req.params.accountId);
  if (!paymentType) return res.status(404).json({ success: false, message: 'Payment type not found' });
  res.json({ success: true, message: 'Payment type deleted successfully' });
};