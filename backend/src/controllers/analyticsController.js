import * as analyticsService from '../services/analyticsService.js';

export const getOverview = async (req, res) => {
  const overview = await analyticsService.getOverview(req.user._id, {
    ...req.query,
    accountId: req.params.accountId,
  });
  res.json({ success: true, data: overview });
};
