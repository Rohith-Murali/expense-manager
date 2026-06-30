import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEnv } from '../src/config/env.js';

test('validateEnv throws when required variables are missing', () => {
  const originalMongo = process.env.MONGODB_URI;
  const originalAccess = process.env.JWT_ACCESS_SECRET;
  const originalRefresh = process.env.JWT_REFRESH_SECRET;

  delete process.env.MONGODB_URI;
  delete process.env.JWT_ACCESS_SECRET;
  delete process.env.JWT_REFRESH_SECRET;

  assert.throws(() => validateEnv(), /MONGODB_URI/);

  if (originalMongo !== undefined) process.env.MONGODB_URI = originalMongo;
  if (originalAccess !== undefined) process.env.JWT_ACCESS_SECRET = originalAccess;
  if (originalRefresh !== undefined) process.env.JWT_REFRESH_SECRET = originalRefresh;
});
