import * as savingsService from '../services/savingsService.js';

export const createBucket = async (req, res) => {
  const bucket = await savingsService.createBucket(req.user.id, req.body);
  res.status(201).json({ data: bucket });
};

export const listBuckets = async (req, res) => {
  const filters = {
    status: req.query.status,
  };

  const buckets = await savingsService.getBuckets(req.user.id, filters);
  res.status(200).json({
    data: buckets,
    meta: { count: buckets.length },
  });
};

export const getBucket = async (req, res) => {
  const bucket = await savingsService.getBucketById(req.params.bucketId, req.user.id);
  res.status(200).json({ data: bucket });
};

export const updateBucket = async (req, res) => {
  const bucket = await savingsService.updateBucket(req.params.bucketId, req.user.id, req.body);
  res.status(200).json({ data: bucket });
};

export const archiveBucket = async (req, res) => {
  const bucket = await savingsService.archiveBucket(req.params.bucketId, req.user.id);
  res.status(200).json({ data: bucket });
};

export const deleteBucket = async (req, res) => {
  await savingsService.deleteBucket(req.params.bucketId, req.user.id);
  res.status(204).send();
};

export const createGoal = async (req, res) => {
  const goal = await savingsService.createGoal(req.user.id, req.body);
  res.status(201).json({ data: goal });
};

export const listGoals = async (req, res) => {
  const filters = {
    status: req.query.status,
  };

  const goals = await savingsService.getGoals(req.user.id, filters); 
  res.status(200).json({
    data: goals,
    meta: { count: goals.length },
  });
};

export const getGoal = async (req, res) => {
  const goal = await savingsService.getGoalById(req.params.goalId, req.user.id);
  res.status(200).json({ data: goal });
};

export const updateGoal = async (req, res) => {
  const goal = await savingsService.updateGoal(req.params.goalId, req.user.id, req.body);
  res.status(200).json({ data: goal });
};

export const archiveGoal = async (req, res) => {
  const goal = await savingsService.archiveGoal(req.params.goalId, req.user.id);
  res.status(200).json({ data: goal });
};

export const deleteGoal = async (req, res) => {
  await savingsService.deleteGoal(req.params.goalId, req.user.id);
  res.status(204).send();
};

export const createEntry = async (req, res) => {
  const entry = await savingsService.createEntry(req.user.id, req.body);
  res.status(201).json({ data: entry });
};

export const listEntries = async (req, res) => {
  const { bucketId, goalId } = req.query;
  const entries = await savingsService.getEntries(req.user.id, { bucketId, goalId });
  res.status(200).json({
    data: entries,
    meta: { count: entries.length },
  });
};

export const getEntry = async (req, res) => {
  const entry = await savingsService.getEntryById(req.params.entryId, req.user.id);
  res.status(200).json({ data: entry });
};

export const updateEntry = async (req, res) => {
  const entry = await savingsService.updateEntry(req.params.entryId, req.user.id, req.body);
  res.status(200).json({ data: entry });
};

export const deleteEntry = async (req, res) => {
  await savingsService.deleteEntry(req.params.entryId, req.user.id);
  res.status(204).send();
};

export const getSavingsSummary = async (req, res) => {
  const summary = await savingsService.getSavingsSummary(req.user.id);
  res.status(200).json({ data: summary });
};
