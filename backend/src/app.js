import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { responseFormatter } from './middleware/responseFormatter.js';

export const app = express();

// Middleware order: parsers, logger, response formatter, routes, error handler
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Ensure consistent success response shape
app.use(responseFormatter);

// Routes
app.use('/api', apiRouter);

// 404 handler
app.use((req, res, next) => {
  const err = new Error('Route not found');
  err.statusCode = 404;
  next(err);
});

// Error handler
app.use(errorHandler);