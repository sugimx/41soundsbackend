import { ticketService } from '../services/TicketService.js';
import { logger } from '../../../shared/logger/logger.js';

export class TicketController {
  /**
   * Get ticket by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTicket(req, res) {
    try {
      const { ticketId } = req.params;
      const userId = req.userId;

      const ticket = await ticketService.getTicketById(ticketId);

      // Verify ticket belongs to authenticated user (unless admin)
      if (ticket.userId._id.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access to this ticket',
        });
      }

      res.json({
        success: true,
        data: ticket,
      });
    } catch (error) {
      logger.error('Get ticket error', { error: error.message, ticketId: req.params.ticketId });
      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get ticket by Ticket Number (for verification) - Public endpoint
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTicketByTicketNumber(req, res) {
    try {
      const { ticketNumber } = req.params;

      const ticket = await ticketService.getTicketByTicketNumber(ticketNumber);

      console.log('Ticket retrieved by ticket number:', ticket);

      res.json({
        success: true,
        data: ticket,
      });
    } catch (error) {
      logger.error('Get ticket error', { error: error.message, ticketNumber: req.params.ticketNumber });
      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get user's tickets
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserTickets(req, res) {
    try {
      const userId = req.userId;
      const { limit = 10, skip = 0, status = null } = req.query;

      const result = await ticketService.getUserTickets(userId, {
        limit: parseInt(limit),
        skip: parseInt(skip),
        status,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Get user tickets error', { error: error.message, userId: req.userId });
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Redeem ticket (mark as used)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async redeemTicket(req, res) {
    try {
      const { ticketId } = req.params;
      const { location } = req.body;

      if (!ticketId) {
        return res.status(400).json({
          success: false,
          message: 'Ticket ID is required',
        });
      }

      const ticket = await ticketService.redeemTicket(ticketId, location);

      res.json({
        success: true,
        message: 'Ticket redeemed successfully',
        data: ticket,
      });
    } catch (error) {
      logger.error('Redeem ticket error', { error: error.message, ticketId: req.params.ticketId });
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Cancel ticket
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async cancelTicket(req, res) {
    try {
      const { ticketId } = req.params;
      const { reason } = req.body;
      const userId = req.userId;

      if (!ticketId) {
        return res.status(400).json({
          success: false,
          message: 'Ticket ID is required',
        });
      }

      // Verify ticket belongs to user
      const ticket = await ticketService.getTicketById(ticketId);
      if (ticket.userId._id.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to cancel this ticket',
        });
      }

      const cancelledTicket = await ticketService.cancelTicket(ticketId, reason);

      res.json({
        success: true,
        message: 'Ticket cancelled successfully',
        data: cancelledTicket,
      });
    } catch (error) {
      logger.error('Cancel ticket error', { error: error.message, ticketId: req.params.ticketId });
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get event tickets (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getEventTickets(req, res) {
    try {
      const { eventId } = req.params;
      const { limit = 100, skip = 0, status = null } = req.query;

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required',
        });
      }

      const result = await ticketService.getEventTickets(eventId, {
        limit: parseInt(limit),
        skip: parseInt(skip),
        status,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Get event tickets error', { error: error.message, eventId: req.params.eventId });
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get event ticket statistics (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getEventTicketStats(req, res) {
    try {
      const { eventId } = req.params;

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required',
        });
      }

      const stats = await ticketService.getEventTicketStats(eventId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Get event ticket stats error', { error: error.message, eventId: req.params.eventId });
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Create a single ticket
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createTicket(req, res) {
    try {
      const { eventId, userId, paymentId, ticketType, price } = req.body;

      // Validate required fields
      if (!eventId || !userId || !paymentId || !ticketType || price === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: eventId, userId, paymentId, ticketType, price',
        });
      }

      const ticket = await ticketService.createSingleTicket({
        eventId,
        userId,
        paymentId,
        ticketType,
        price,
      });

      res.status(201).json({
        success: true,
        data: ticket,
        message: 'Ticket created successfully',
      });
    } catch (error) {
      logger.error('Create ticket error', { error: error.message });
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Create multiple tickets
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createTicketsBulk(req, res) {
    try {
      const { eventId, userId, paymentId, ticketType, quantity } = req.body;

      if (!eventId || !userId || !paymentId || !ticketType || !quantity) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: eventId, userId, paymentId, ticketType, quantity',
        });
      }

      if (quantity < 1 || quantity > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be between 1 and 1000',
        });
      }

      const tickets = await ticketService.createTicketsForPayment(paymentId, quantity, ticketType);

      res.status(201).json({
        success: true,
        data: tickets,
        count: tickets.length,
        message: `${tickets.length} tickets created successfully`,
      });
    } catch (error) {
      logger.error('Create tickets bulk error', { error: error.message });
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Update ticket
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateTicket(req, res) {
    try {
      const { ticketId } = req.params;
      const { status, seatSection, seatNumber, price } = req.body;

      if (!ticketId) {
        return res.status(400).json({
          success: false,
          message: 'Ticket ID is required',
        });
      }

      const updatedTicket = await ticketService.updateTicket(ticketId, {
        status,
        seatSection,
        seatNumber,
        price,
      });

      res.json({
        success: true,
        data: updatedTicket,
        message: 'Ticket updated successfully',
      });
    } catch (error) {
      logger.error('Update ticket error', { error: error.message, ticketId: req.params.ticketId });
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Delete ticket
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteTicket(req, res) {
    try {
      const { ticketId } = req.params;

      if (!ticketId) {
        return res.status(400).json({
          success: false,
          message: 'Ticket ID is required',
        });
      }

      await ticketService.deleteTicket(ticketId);

      res.json({
        success: true,
        message: 'Ticket deleted successfully',
      });
    } catch (error) {
      logger.error('Delete ticket error', { error: error.message, ticketId: req.params.ticketId });
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export const ticketController = new TicketController();
