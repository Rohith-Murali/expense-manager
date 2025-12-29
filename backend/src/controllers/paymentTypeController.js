import * as paymentTypeService from '../services/paymentTypeService.js';

export const create = async (req, res) => {
  const paymentType = await paymentTypeService.create({ ...req.body });
  res.status(201).json({ success: true, message: 'Payment type created successfully', data: paymentType });
};

export const getAll = async (req, res) => {
  const { type } = req.query;
  const paymentTypes = await paymentTypeService.getByAccount(type);
  res.json({ success: true, data: paymentTypes });
};

export const getById = async (req, res) => {
  const paymentType = await paymentTypeService.getById(req.params.id);
  if (!paymentType) return res.status(404).json({ success: false, message: 'Payment type not found' });
  res.json({ success: true, data: paymentType });
};

export const update = async (req, res) => {
  const paymentType = await paymentTypeService.update(req.params.id, null, req.body);
  if (!paymentType) return res.status(404).json({ success: false, message: 'Payment type not found' });
  res.json({ success: true, message: 'Payment type updated successfully', data: paymentType });
};

export const deletePaymentType = async (req, res) => {
  const paymentType = await paymentTypeService.softDelete(req.params.id);
  if (!paymentType) return res.status(404).json({ success: false, message: 'Payment type not found' });
  res.json({ success: true, message: 'Payment type deleted successfully' });
};