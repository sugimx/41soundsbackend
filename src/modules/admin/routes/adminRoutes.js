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

/**
 * @swagger
 * /api/admin/tickets:
 *   get:
 *     summary: Get all tickets with pagination
 *     tags:
 *       - Admin Tickets
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: tier
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 */
router.get('/tickets', adminController.getTickets.bind(adminController));

/**
 * @swagger
 * /api/admin/tickets:
 *   post:
 *     summary: Create new ticket(s) by admin
 *     tags:
 *       - Admin Tickets
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userEmail
 *               - userName
 *               - ticketTier
 *               - quantity
 *             properties:
 *               userEmail:
 *                 type: string
 *               userName:
 *                 type: string
 *               mobileNumber:
 *                 type: string
 *               ticketTier:
 *                 type: string
 *                 enum: [Rocker, Gold, Platinum, VIP]
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       201:
 *         description: Ticket(s) created successfully
 *       400:
 *         description: Bad request - missing required fields or invalid tier
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin role required
 *       500:
 *         description: Internal server error
 *     security:
 *       - bearerAuth: []
 */
router.post('/tickets', adminController.createTicket.bind(adminController));

/**
 * @swagger
 * /api/admin/tickets/{id}:
 *   get:
 *     summary: Get ticket by ID
 *     tags:
 *       - Admin Tickets
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 */
router.get('/tickets/:id', adminController.getTicketById.bind(adminController));

/**
 * @swagger
 * /api/admin/tickets/{id}/status:
 *   patch:
 *     summary: Update ticket status
 *     tags:
 *       - Admin Tickets
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [VALID, USED, CANCELLED, REFUNDED]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/tickets/:id/status', adminController.updateTicketStatus.bind(adminController));

/**
 * @swagger
 * /api/admin/tickets/{id}/refund:
 *   post:
 *     summary: Refund a ticket
 *     tags:
 *       - Admin Tickets
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     security:
 *       - bearerAuth: []
 */
router.post('/tickets/:id/refund', adminController.refundTicket.bind(adminController));

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users with pagination
 *     tags:
 *       - Admin Users
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 */
router.get('/users', adminController.getUsers.bind(adminController));

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags:
 *       - Admin Users
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 */
router.get('/users/:id', adminController.getUserById.bind(adminController));

/**
 * @swagger
 * /api/admin/users/{id}/status:
 *   patch:
 *     summary: Update user status
 *     tags:
 *       - Admin Users
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *     security:
 *       - bearerAuth: []
 */
router.patch('/users/:id/status', adminController.updateUserStatus.bind(adminController));

/**
 * @swagger
 * /api/admin/users/{id}/promote:
 *   patch:
 *     summary: Promote user to admin role
 *     tags:
 *       - Admin Users
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, super_admin]
 *                 description: The role to promote user to
 *     responses:
 *       200:
 *         description: User promoted successfully
 *       400:
 *         description: Invalid role specified
 *       403:
 *         description: Forbidden - only super_admin can demote/change existing admin roles
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 *     security:
 *       - bearerAuth: []
 */
router.patch('/users/:id/promote', adminController.promoteUserToAdmin.bind(adminController));

/**
 * @swagger
 * /api/admin/payments:
 *   get:
 *     summary: Get all payments with pagination
 *     tags:
 *       - Admin Payments
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 */
router.get('/payments', adminController.getPayments.bind(adminController));

/**
 * @swagger
 * /api/admin/payments/{id}:
 *   get:
 *     summary: Get payment by ID
 *     tags:
 *       - Admin Payments
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 */
router.get('/payments/:id', adminController.getPaymentById.bind(adminController));

/**
 * @swagger
 * /api/admin/payments/{id}/refund:
 *   post:
 *     summary: Refund a payment
 *     tags:
 *       - Admin Payments
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     security:
 *       - bearerAuth: []
 */
router.post('/payments/:id/refund', adminController.refundPayment.bind(adminController));

/**
 * @swagger
 * /api/admin/support:
 *   get:
 *     summary: Get all support tickets with pagination
 *     tags:
 *       - Admin Support
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 */
router.get('/support', adminController.getSupportTickets.bind(adminController));

/**
 * @swagger
 * /api/admin/support/{id}:
 *   get:
 *     summary: Get support ticket by ID
 *     tags:
 *       - Admin Support
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 */
router.get('/support/:id', adminController.getSupportTicketById.bind(adminController));

/**
 * @swagger
 * /api/admin/support/{id}/respond:
 *   post:
 *     summary: Add response to support ticket
 *     tags:
 *       - Admin Support
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *     security:
 *       - bearerAuth: []
 */
router.post('/support/:id/respond', adminController.respondToSupportTicket.bind(adminController));

/**
 * @swagger
 * /api/admin/support/{id}/status:
 *   patch:
 *     summary: Update support ticket status
 *     tags:
 *       - Admin Support
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [open, in-progress, resolved, closed]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/support/:id/status', adminController.updateSupportTicketStatus.bind(adminController));

/**
 * @swagger
 * /api/admin/analytics:
 *   get:
 *     summary: Get analytics data
 *     tags:
 *       - Admin Analytics
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *     security:
 *       - bearerAuth: []
 */
router.get('/analytics', adminController.getAnalytics.bind(adminController));

export default router;
