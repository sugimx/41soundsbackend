import express from 'express';
import { paymentController } from '../controllers/PaymentController.js';
import { authenticate } from '../../../core/middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/payments/initiate:
 *   post:
 *     summary: Initiate a payment
 *     description: Create a new payment order and get payment link for user to complete payment
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - description
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Payment amount in rupees (e.g., 99.99)
 *                 example: 99.99
 *               description:
 *                 type: string
 *                 description: Payment description
 *                 example: "Charging Station Credits"
 *               metadata:
 *                 type: object
 *                 description: Additional metadata
 *                 properties:
 *                   email:
 *                     type: string
 *                   phone:
 *                     type: string
 *     responses:
 *       201:
 *         description: Payment order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 payment:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     orderId:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     status:
 *                       type: string
 *                     paymentLink:
 *                       type: string
 *                     description:
 *                       type: string
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/initiate', authenticate, (req, res) => paymentController.initiatePayment(req, res));

/**
 * @swagger
 * /api/payments/history:
 *   get:
 *     summary: Get user's payment history
 *     description: Retrieve paginated list of user's payments
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of records to return
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of records to skip
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 total:
 *                   type: integer
 *                 payments:
 *                   type: array
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/history', authenticate, (req, res) => paymentController.getPaymentHistory(req, res));

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     summary: Payment webhook
 *     description: Cashfree webhook for payment notifications (no authentication required)
 *     tags:
 *       - Payments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed
 */
router.post('/webhook', (req, res) => paymentController.handleWebhook(req, res));

/**
 * @swagger
 * /api/payments/{paymentId}:
 *   get:
 *     summary: Get payment details
 *     description: Retrieve details of a specific payment
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         schema:
 *           type: string
 *         required: true
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 payment:
 *                   type: object
 *       403:
 *         description: Unauthorized access
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Server error
 */
router.get('/:paymentId', authenticate, (req, res) => paymentController.getPayment(req, res));

/**
 * @swagger
 * /api/payments/{paymentId}/verify:
 *   post:
 *     summary: Verify payment status
 *     description: Verify and update payment status with Cashfree
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         schema:
 *           type: string
 *         required: true
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 payment:
 *                   type: object
 *       403:
 *         description: Unauthorized access
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Server error
 */
router.post('/:paymentId/verify', authenticate, (req, res) =>
  paymentController.verifyPayment(req, res)
);

/**
 * @swagger
 * /api/payments/{paymentId}/cancel:
 *   post:
 *     summary: Cancel a payment
 *     description: Cancel a pending payment order
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         schema:
 *           type: string
 *         required: true
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       403:
 *         description: Unauthorized access
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Server error
 */
router.post('/:paymentId/cancel', authenticate, (req, res) =>
  paymentController.cancelPayment(req, res)
);

export default router;
