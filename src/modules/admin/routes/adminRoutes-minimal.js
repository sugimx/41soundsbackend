import express from 'express';

const router = express.Router();

console.log('🔥🔥🔥 MINIMAL ADMIN ROUTES IMPORTED 🔥🔥🔥');

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Minimal admin routes are loaded!' });
});

// Another test route
router.get('/health', (req, res) => {
  res.json({ status: 'Admin routes OK' });
});

export default router;
