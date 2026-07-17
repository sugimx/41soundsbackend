import { Ticket } from '../models/Ticket.js';
import { Event } from '../../events/models/Event.js';
import { User } from '../../user/models/User.js';
import { Payment } from '../../payment/models/Payment.js';
import { logger } from '../../../shared/logger/logger.js';
import mongoose from 'mongoose';
import { googleSheetsService } from '../../../shared/googlesheets/googleSheetsService.js';

export class TicketService {
  /**
   * Generate a unique ticket number
   * @returns {string} Unique ticket number
   */
  static generateTicketNumber() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 9).toUpperCase();
    return `TKT-${timestamp}-${random}`;
  }



  /**
   * Create tickets for a payment
   * @param {string} paymentId - Payment ID
   * @param {number} quantity - Number of tickets to create
   * @param {string} ticketType - Type of ticket (VIP, Premium, Regular, Student, Child)
   * @returns {Promise<Array>} Array of created tickets
   */
  async createTicketsForPayment(paymentId, quantity, ticketType) {
    try {
      // Get payment details
      const payment = await Payment.findById(paymentId).populate('userId');
      if (!payment) {
        throw new Error('Payment not found');
      }

      // Get event from order metadata
      const eventId = payment.metadata?.eventId;
      if (!eventId) {
        throw new Error('Event ID not found in payment metadata');
      }

      // Get event details
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Validate ticket type exists in event
      const ticketTypeConfig = event.ticketTypes.find(tt => tt.name === ticketType);
      if (!ticketTypeConfig) {
        throw new Error(`Ticket type ${ticketType} not available for this event`);
      }

      // Check availability
      const availableTickets = ticketTypeConfig.totalQuantity - ticketTypeConfig.soldQuantity;
      if (availableTickets < quantity) {
        throw new Error(`Only ${availableTickets} tickets available for ${ticketType}`);
      }

      // Create tickets
      const tickets = [];
      const expiryDate = new Date(event.eventDate);
      expiryDate.setHours(23, 59, 59, 999); // Ticket valid until end of event day

      for (let i = 0; i < quantity; i++) {
        const ticket = await Ticket.create({
          ticketNumber: TicketService.generateTicketNumber(),
          eventId,
          userId: payment.userId._id,
          paymentId,
          ticketType,
          price: ticketTypeConfig.price,
          status: 'VALID',
          expiryDate,
          metadata: {
            orderId: payment.orderId,
            seatAssignedAt: null,
          },
        });

        tickets.push(ticket);
      }

      // Update event sold quantity
      ticketTypeConfig.soldQuantity += quantity;
      await event.save();

      logger.info('Tickets created successfully', {
        paymentId,
        ticketCount: tickets.length,
        ticketType,
        userId: payment.userId._id,
      });

      return tickets;
    } catch (error) {
      logger.error('Error creating tickets for payment', {
        error: error.message,
        paymentId,
      });
      throw error;
    }
  }



  /**
   * Get ticket by ID
   * @param {string} ticketId - Ticket ID
   * @returns {Promise<Object>} Ticket document
   */
  async getTicketById(ticketId) {
    try {
      const ticket = await Ticket.findById(ticketId)
        .populate('eventId', 'eventName eventDate venue')
        .populate('userId', 'email fullName mobile')
        .populate('paymentId', 'orderId amount');

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      return ticket;
    } catch (error) {
      logger.error('Error fetching ticket', { error: error.message, ticketId });
      throw error;
    }
  }


    /**
   * Get ticket by ID
   * @param {string} ticketId - Ticket ID
   * @returns {Promise<Object>} Ticket document
   */
  async getTicketByTicketNumber(ticketNumber) {
    try {
      const ticket = await Ticket.findOne({ ticketNumber })
        .populate('eventId', 'eventName eventDate venue')
        .populate('userId', 'email fullName mobile')
        .populate('paymentId', 'orderId amount');

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      return ticket;
    } catch (error) {
      logger.error('Error fetching ticket', { error: error.message, ticketId });
      throw error;
    }
  }


  /**
   * Get user's tickets
   * @param {string} userId - User ID
   * @param {Object} options - Query options (limit, skip, status)
   * @returns {Promise<Object>} Paginated tickets
   */
  async getUserTickets(userId, options = {}) {
    try {
      const { limit = 10, skip = 0, status = null } = options;

      const query = { userId };
      if (status) {
        query.status = status;
      }

      const total = await Ticket.countDocuments(query);
      const tickets = await Ticket.find(query)
        .populate('eventId', 'eventName eventDate venue')
        .populate('paymentId', 'orderId amount')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip));

      return {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        tickets,
      };
    } catch (error) {
      logger.error('Error fetching user tickets', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get event's tickets
   * @param {string} eventId - Event ID
   * @param {Object} options - Query options (limit, skip, status)
   * @returns {Promise<Object>} Paginated tickets
   */
  async getEventTickets(eventId, options = {}) {
    try {
      const { limit = 100, skip = 0, status = null } = options;

      const query = { eventId };
      if (status) {
        query.status = status;
      }

      const total = await Ticket.countDocuments(query);
      const tickets = await Ticket.find(query)
        .populate('userId', 'email fullName mobile')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip));

      return {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        tickets,
      };
    } catch (error) {
      logger.error('Error fetching event tickets', { error: error.message, eventId });
      throw error;
    }
  }

  /**
   * Redeem a ticket (mark as used)
   * @param {string} ticketId - Ticket ID
   * @param {string} location - Location where ticket was scanned
   * @returns {Promise<Object>} Updated ticket
   */
  async redeemTicket(ticketId, location = null) {
    try {
      const ticket = await Ticket.findById(ticketId);

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      if (!ticket.isValid()) {
        throw new Error('Ticket is not valid for redemption');
      }

      if (ticket.isExpired()) {
        throw new Error('Ticket has expired');
      }

      ticket.status = 'USED';
      ticket.usedAt = new Date();
      ticket.usedLocation = location;

      await ticket.save();

      try {
        const orderId = ticket.metadata?.orderId || (ticket.paymentId ? (await Payment.findById(ticket.paymentId))?.orderId : null);
        if (orderId) {
          await googleSheetsService.updateTicketScanStatus(orderId, ticket.usedAt);
        }
      } catch (sheetError) {
        logger.warn('Failed to update Google Sheet after ticket scan', {
          error: sheetError.message,
          ticketId,
        });
      }

      logger.info('Ticket redeemed successfully', {
        ticketId,
        location,
        userId: ticket.userId,
      });

      return ticket;
    } catch (error) {
      logger.error('Error redeeming ticket', { error: error.message, ticketId });
      throw error;
    }
  }



  /**
   * Cancel a ticket
   * @param {string} ticketId - Ticket ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Cancelled ticket
   */
  async cancelTicket(ticketId, reason = null) {
    try {
      const ticket = await Ticket.findById(ticketId);

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      if (ticket.status === 'USED') {
        throw new Error('Cannot cancel a ticket that has already been used');
      }

      ticket.status = 'CANCELLED';
      ticket.notes = reason || 'Cancelled by user';

      await ticket.save();

      logger.info('Ticket cancelled', {
        ticketId,
        reason,
        userId: ticket.userId,
      });

      return ticket;
    } catch (error) {
      logger.error('Error cancelling ticket', { error: error.message, ticketId });
      throw error;
    }
  }

  /**
   * Get ticket statistics for an event
   * @param {string} eventId - Event ID
   * @returns {Promise<Object>} Ticket statistics
   */
  async getEventTicketStats(eventId) {
    try {
      const objectId = new mongoose.Types.ObjectId(eventId);
      
      const stats = await Ticket.aggregate([
        { $match: { eventId: objectId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      const typeStats = await Ticket.aggregate([
        { $match: { eventId: objectId } },
        {
          $group: {
            _id: '$ticketType',
            count: { $sum: 1 },
            revenue: { $sum: '$price' },
          },
        },
      ]);

      return {
        byStatus: stats,
        byType: typeStats,
        total: stats.reduce((sum, s) => sum + s.count, 0),
      };
    } catch (error) {
      logger.error('Error fetching ticket stats', { error: error.message, eventId });
      throw error;
    }
  }

  /**
   * Create a single ticket directly
   * @param {Object} ticketData - Ticket data
   * @returns {Promise<Object>} Created ticket
   */
  async createSingleTicket(ticketData) {
    try {
      const { eventId, userId, paymentId, ticketType, price } = ticketData;

      // Validate event exists
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Validate user exists
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Validate payment exists
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      // Create ticket
      const expiryDate = new Date(event.eventDate);
      expiryDate.setHours(23, 59, 59, 999);

      const ticket = await Ticket.create({
        ticketNumber: TicketService.generateTicketNumber(),
        eventId,
        userId,
        paymentId,
        ticketType,
        price,
        status: 'VALID',
        expiryDate,
        metadata: {
          orderId: payment.orderId,
          createdBy: 'admin',
        },
      });

      logger.info('Ticket created by admin', {
        ticketId: ticket._id,
        ticketType,
        userId,
      });

      return ticket;
    } catch (error) {
      logger.error('Error creating single ticket', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update ticket details
   * @param {string} ticketId - Ticket ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>} Updated ticket
   */
  async updateTicket(ticketId, updateData) {
    try {
      const ticket = await Ticket.findById(ticketId);

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // Only allow updating specific fields
      const allowedFields = ['status', 'seatSection', 'seatNumber', 'price'];
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key) && updateData[key] !== undefined) {
          ticket[key] = updateData[key];
        }
      });

      await ticket.save();

      logger.info('Ticket updated by admin', {
        ticketId,
        updatedFields: Object.keys(updateData),
      });

      return ticket;
    } catch (error) {
      logger.error('Error updating ticket', {
        error: error.message,
        ticketId,
      });
      throw error;
    }
  }

  /**
   * Delete ticket
   * @param {string} ticketId - Ticket ID
   * @returns {Promise<void>}
   */
  async deleteTicket(ticketId) {
    try {
      const ticket = await Ticket.findByIdAndDelete(ticketId);

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      logger.info('Ticket deleted by admin', {
        ticketId,
      });
    } catch (error) {
      logger.error('Error deleting ticket', {
        error: error.message,
        ticketId,
      });
      throw error;
    }
  }
}

export const ticketService = new TicketService();
