import dotenv from 'dotenv';

dotenv.config();

export const NODE_ENV = process.env.NODE_ENV || 'development';

const requiredEnvVars = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

export function validateEnv() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (NODE_ENV === 'production') {
    if (!process.env.CLIENT_ORIGIN) {
      missing.push('CLIENT_ORIGIN');
    }

    if (process.env.JWT_ACCESS_SECRET && process.env.JWT_ACCESS_SECRET.length < 32) {
      missing.push('JWT_ACCESS_SECRET (must be at least 32 characters)');
    }

    if (process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length < 32) {
      missing.push('JWT_REFRESH_SECRET (must be at least 32 characters)');
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export const PORT = Number(process.env.PORT || 5000);
export const MONGODB_URI = process.env.MONGODB_URI;
export const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
export const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
export const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '';
