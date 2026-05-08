import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { adminController } from '../controllers/AdminController.js';
import { authenticate } from '../../../core/middlewares/authMiddleware.js';
import { User } from '../../user/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../../../..');

const router = express.Router();
console.log('✅ Admin routes module loaded');

// Write to file to verify import
try {
  fs.writeFileSync(path.join(projectRoot, 'admin-routes-imported.txt'), 'Admin routes imported at ' + new Date().toISOString());
} catch(e) {
  console.error('Failed to write test file:', e.message);
}

// Test route (no auth required)
router.get('/test', (req, res) => {
  res.json({ message: 'Admin routes are loaded!' });
});

/**
 * Middleware to check if user is admin
 */
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to verify admin role',
    });
  }
};

// All routes require authentication and admin role
router.use(authenticate);
router.use(isAdmin);

/**
 * @swagger
 * /api/admin/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags:
 *       - Admin Dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 */
router.get('/dashboard/stats', adminController.getDashboardStats.bind(adminController));