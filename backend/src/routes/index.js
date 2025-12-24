const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const accountRoutes = require('./accountRoutes');

router.use('/auth', authRoutes);
router.use('/accounts', accountRoutes);

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;