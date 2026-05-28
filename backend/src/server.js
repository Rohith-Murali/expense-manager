import { app } from './app.js';
import { connectDB } from './config/db.js';
import { PORT } from './config/env.js';
import { logger } from './utils/logger.js';

// Global process handlers
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Connect to database
connectDB();

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
