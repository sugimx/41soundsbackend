import express from 'express';
import { ticketController } from '../controllers/TicketController.js';
import { authenticate } from '../../../core/middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/tickets:
 *   get:
 *     summary: Get user's tickets
 *     tags:
 *       - Tickets
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's tickets
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, ticketController.getUserTickets.bind(ticketController));

/**
 * @swagger
 * /api/tickets/create:
 *   post:
 *     summary: Create a new ticket
 *     tags:
 *       - Tickets
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               eventId:
 *                 type: string
 *               ticketType:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       201:
 *         description: Ticket created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/create', authenticate, ticketController.createTicket.bind(ticketController));

/**
 * @swagger
 * /api/tickets/bulk:
 *   post:
 *     summary: Create multiple tickets in bulk
 *     tags:
 *       - Tickets
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tickets:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Tickets created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/bulk', authenticate, ticketController.createTicketsBulk.bind(ticketController));

/**
 * @swagger
 * /api/tickets/{ticketId}:
 *   get:
 *     summary: Get ticket by ID
 *     tags:
 *       - Tickets
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ticket details
 *       404:
 *         description: Ticket not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:ticketId', ticketController.getTicket.bind(ticketController));

/**
 * @swagger
 * /api/tickets/{ticketId}:
 *   put:
 *     summary: Update a ticket
 *     tags:
 *       - Tickets
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Ticket updated successfully
 *       404:
 *         description: Ticket not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:ticketId', authenticate, ticketController.updateTicket.bind(ticketController));

/**
 * @swagger
 * /api/tickets/{ticketId}:
 *   delete:
 *     summary: Delete a ticket
 *     tags:
 *       - Tickets
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ticket deleted successfully
 *       404:
 *         description: Ticket not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:ticketId', authenticate, ticketController.deleteTicket.bind(ticketController));

/**
 * @swagger
 * /api/tickets/{ticketId}/redeem:
 *   post:
 *     summary: Redeem a ticket
 *     tags:
 *       - Tickets
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ticket redeemed successfully
 *       404:
 *         description: Ticket not found
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/:ticketId/redeem', authenticate, ticketController.redeemTicket.bind(ticketController));

/**
 * @swagger
 * /api/tickets/{ticketId}/cancel:
 *   post:
 *     summary: Cancel a ticket
 *     tags:
 *       - Tickets
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ticket cancelled successfully
 *       404:
 *         description: Ticket not found
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/:ticketId/cancel', authenticate, ticketController.cancelTicket.bind(ticketController));

/**
 * @swagger
 * /api/tickets/event/{eventId}:
 *   get:
 *     summary: Get tickets for an event
 *     tags:
 *       - Tickets
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of event tickets
 *       404:
 *         description: Event not found
 *       401:
 *         description: Unauthorized
 */
router.get('/event/:eventId', authenticate, ticketController.getEventTickets.bind(ticketController));

/**
 * @swagger
 * /api/tickets/event/{eventId}/stats:
 *   get:
 *     summary: Get event ticket statistics
 *     tags:
 *       - Tickets
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Event ticket statistics
 *       404:
 *         description: Event not found
 *       401:
 *         description: Unauthorized
 */
router.get('/event/:eventId/stats', authenticate, ticketController.getEventTicketStats.bind(ticketController));

export default router;
