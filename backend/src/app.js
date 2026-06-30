import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { responseFormatter } from './middleware/responseFormatter.js';
import { CLIENT_ORIGIN, NODE_ENV } from './config/env.js';

export const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

const allowedOrigins = CLIENT_ORIGIN
  ? CLIENT_ORIGIN.split(',').map((origin) => origin.trim())
  : NODE_ENV === 'production'
    ? []
    : [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
      ];

const corsOptions = {
  origin: (origin, callback) => {
    console.log('Origin:', origin);
    console.log('Allowed:', allowedOrigins);
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    if (NODE_ENV !== 'production') {
      return callback(null, true);
    }

    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middleware order: parsers, logger, response formatter, routes, error handler
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(limiter);

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
