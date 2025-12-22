const app = require('./app');
const connectDB = require('./config/db');
const { PORT } = require('./config/env');

// Connect to database
connectDB();

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});