import express from 'express';
import { supportController } from '../controllers/SupportController.js';
import { authenticate } from '../../../core/middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/support:
 *   post:
 *     summary: Submit a new support ticket
 *     tags:
 *       - Support
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               subject:
 *                 type: string
 *               message:
 *                 type: string
 *               category:
 *                 type: string
 */
router.post('/', supportController.createTicket.bind(supportController));

/**
 * @swagger
 * /api/support/{id}:
 *   get:
 *     summary: Get support ticket by ID
 *     tags:
 *       - Support
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', supportController.getTicket.bind(supportController));

/**
 * @swagger
 * /api/support/{id}/respond:
 *   post:
 *     summary: Add response to support ticket
 *     tags:
 *       - Support
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
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/respond', authenticate, supportController.respondToTicket.bind(supportController));

export default router;
