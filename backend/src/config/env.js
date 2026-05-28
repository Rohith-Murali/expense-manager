import dotenv from 'dotenv';

dotenv.config();

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const PORT = process.env.PORT || 5000;
export const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://Rohith:Rohith@cluster0.gligv3f.mongodb.net/expense-manager';
export const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'qwerty';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'asdfgh';
export const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
export const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';
