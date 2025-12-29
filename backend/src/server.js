import { app } from './app.js';
import { connectDB } from './config/db.js';
import { PORT } from './config/env.js';

// Connect to database
connectDB();

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});