import { app } from './app.js';
import { connectDB } from './config/db.js';
import { PORT, validateEnv } from './config/env.js';
import { logger } from './utils/logger.js';

validateEnv();

// Global process handlers
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

const startServer = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    logger.operational(`Server running on port ${PORT}`);
  });

  const shutdown = (signal) => {
    logger.operational(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      logger.operational('Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
