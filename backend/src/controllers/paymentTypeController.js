import * as paymentTypeService from '../services/paymentTypeService.js';

export const create = async (req, res) => {
  const paymentType = await paymentTypeService.create(req.user._id, req.params.accountId, req.body);
  res
    .status(201)
    .json({ success: true, message: 'Payment type created successfully', data: paymentType });
};

export const getAll = async (req, res) => {
  const { type } = req.query;
  const paymentTypes = await paymentTypeService.getByAccount(
    req.user._id,
    req.params.accountId,
    type,
  );
  res.json({ success: true, data: paymentTypes });
};

export const getById = async (req, res) => {
  const paymentType = await paymentTypeService.getById(
    req.user._id,
    req.params.id,
    req.params.accountId,
  );
  res.json({ success: true, data: paymentType });
};

export const update = async (req, res) => {
  const paymentType = await paymentTypeService.update(
    req.user._id,
    req.params.id,
    req.params.accountId,
    req.body,
  );
  res.json({ success: true, message: 'Payment type updated successfully', data: paymentType });
};

export const deletePaymentType = async (req, res) => {
  const paymentType = await paymentTypeService.softDelete(
    req.user._id,
    req.params.id,
    req.params.accountId,
  );
  res.json({ success: true, message: 'Payment type deleted successfully' });
};

export const seedDefaults = async (req, res) => {
  const paymentTypes = await paymentTypeService.ensureDefaultPaymentTypes(
    req.user._id,
    req.params.accountId,
  );

  res.status(201).json({
    success: true,
    message: 'Default payment types ensured successfully',
    data: {
      created: paymentTypes.length,
    },
  });
};
