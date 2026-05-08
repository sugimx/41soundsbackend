import express from 'express';
import process from 'process';

const router = express.Router();

// Use process.stderr to ensure output
process.stderr.write('🚀🚀🚀 TEST ROUTES MODULE LOADED 🚀🚀🚀\n');
console.log('TEST ROUTES LOADED');

router.get('/test', (req, res) => {
  res.json({ message: 'Test routes loaded!' });
});

router.get('/dashboard/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalUsers: 100,
      totalTicketsSold: 500,
      totalRevenue: 50000,
      pendingPayments: 10,
      openSupportTickets: 5,
    }
  });
});

export default router;
