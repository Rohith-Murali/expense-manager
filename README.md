# Expense Manager

A full-stack expense tracking application with a React frontend and an Express/MongoDB backend.

## Features

- Authentication with JWT access and refresh tokens
- Account, category, payment-type, transaction, and budget management
- Analytics and reporting endpoints for transaction data
- Health check endpoint for deployment monitoring

## Local development

### Backend

1. Navigate to the backend folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the sample environment file and update the values:
   ```bash
   cp .env.example .env
   ```
4. Start the API:
   ```bash
   npm run dev
   ```

### Frontend

1. Navigate to the frontend folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite app:
   ```bash
   npm run dev
   ```

## Environment variables

The backend expects the following variables:

- PORT
- NODE_ENV
- MONGODB_URI
- JWT_ACCESS_SECRET
- JWT_REFRESH_SECRET
- CLIENT_ORIGIN (required in production)

## Deployment notes

- Keep secrets in your hosting provider environment variables rather than in committed files.
- In production, set CLIENT_ORIGIN to your deployed frontend URL.
- Render provides HTTPS automatically, so the app should run behind that TLS layer.

## API checks

- Health endpoint: GET /api/health
- Auth endpoints: POST /api/auth/register, POST /api/auth/login
