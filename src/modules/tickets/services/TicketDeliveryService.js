import { Ticket } from '../../tickets/models/Ticket.js';
import { Event } from '../../events/models/Event.js';
import { User } from '../../user/models/User.js';
import { logger } from '../../../shared/logger/logger.js';
import { emailService } from '../../../shared/email/emailService.js';
import { whatsappService } from '../../../shared/whatsapp/whatsappService.js';
import { qrCodeService } from '../../../shared/utils/QRCodeService.js';

export class TicketDeliveryService {
  /**
   * Send ticket details via email
   * @param {string} ticketId - Ticket ID
   * @returns {Promise<Object>} Delivery status
   */
  async sendTicketViaEmail(ticketId) {
    try {
      const ticket = await Ticket.findById(ticketId)
        .populate('userId', 'email fullName')
        .populate('eventId', 'eventName eventDate venue');

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      if (!ticket.userId.email) {
        throw new Error('User email not available');
      }

      // Generate QR code image if not already generated
      if (!ticket.qrCode.data) {
        const qrCodeData = await qrCodeService.generateTicketQRCode(ticket);
        ticket.qrCode.data = qrCodeData.image;
        await ticket.save();
      }

      // Prepare ticket details for email
      const ticketDetails = {
        ticketNumber: ticket.ticketNumber,
        eventName: ticket.eventId.eventName,
        eventDate: ticket.eventId.eventDate,
        ticketType: ticket.ticketType,
        price: ticket.price,
        seatSection: ticket.seatSection || 'General',
        seatNumber: ticket.seatNumber || 'Not assigned',
        qrCodeImage: ticket.qrCode.data,
        expiryDate: ticket.expiryDate,
        venue: ticket.eventId.venue,
      };

      // Send email with ticket details and QR code
      const emailResult = await emailService.sendTicketDelivery(
        ticket.userId.email,
        ticket.userId.fullName,
        ticketDetails
      );

      logger.info('Ticket delivered via email', {
        ticketId,
        email: ticket.userId.email,
        messageId: emailResult.messageId,
      });

      return {
        success: true,
        channel: 'email',
        ticketId,
        email: ticket.userId.email,
        messageId: emailResult.messageId,
        deliveredAt: new Date(),
      };
    } catch (error) {
      logger.error('Error delivering ticket via email', {
        error: error.message,
        ticketId,
      });
      return {
        success: false,
        channel: 'email',
        ticketId,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send ticket details via WhatsApp
   * @param {string} ticketId - Ticket ID
   * @returns {Promise<Object>} Delivery status
   */
  async sendTicketViaWhatsApp(ticketId) {
    try {
      const ticket = await Ticket.findById(ticketId)
        .populate('userId', 'mobile fullName')
        .populate('eventId', 'eventName eventDate');

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      if (!ticket.userId.mobile) {
        throw new Error('User mobile not available');
      }

      // Prepare ticket details for WhatsApp
      const ticketMessage = `
🎫 *Your Ticket is Ready!*

Hi ${ticket.userId.fullName}!

*Event:* ${ticket.eventId.eventName}
*Date:* ${new Date(ticket.eventId.eventDate).toLocaleDateString()}
*Ticket Type:* ${ticket.ticketType}
*Ticket Number:* ${ticket.ticketNumber}
*Price:* ₹${ticket.price}

Please save your QR code which will be sent via email. Show it at the venue for entry.

*Don't lose this ticket!*
Valid until: ${new Date(ticket.expiryDate).toLocaleDateString()}

🎵 41Sounds
      `.trim();

      // Send message via WhatsApp
      const whatsappResult = await whatsappService.sendMessage(
        ticket.userId.mobile,
        ticketMessage
      );

      if (!whatsappResult.success) {
        throw new Error(whatsappResult.error || 'WhatsApp delivery failed');
      }

      logger.info('Ticket delivered via WhatsApp', {
        ticketId,
        phone: ticket.userId.mobile,
        messageId: whatsappResult.messageId,
      });

      return {
        success: true,
        channel: 'whatsapp',
        ticketId,
        phone: ticket.userId.mobile,
        messageId: whatsappResult.messageId,
        deliveredAt: new Date(),
      };
    } catch (error) {
      logger.error('Error delivering ticket via WhatsApp', {
        error: error.message,
        ticketId,
      });
      return {
        success: false,
        channel: 'whatsapp',
        ticketId,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send ticket via both email and WhatsApp
   * @param {string} ticketId - Ticket ID
   * @returns {Promise<Object>} Delivery status for both channels
   */
  async sendTicket(ticketId) {
    try {
      logger.info('Starting ticket delivery', { ticketId });

      // Send via both channels in parallel
      const [emailResult, whatsappResult] = await Promise.all([
        this.sendTicketViaEmail(ticketId),
        this.sendTicketViaWhatsApp(ticketId),
      ]);

      // Update ticket with delivery status
      const ticket = await Ticket.findById(ticketId);
      if (ticket) {
        ticket.metadata = ticket.metadata || {};
        ticket.metadata.deliveryStatus = {
          email: emailResult.success,
          whatsapp: whatsappResult.success,
          deliveredAt: new Date(),
          emailMessageId: emailResult.messageId || null,
          whatsappMessageId: whatsappResult.messageId || null,
        };
        await ticket.save();
      }

      logger.info('Ticket delivery completed', {
        ticketId,
        email: emailResult.success,
        whatsapp: whatsappResult.success,
      });

      return {
        success: emailResult.success || whatsappResult.success,
        email: emailResult,
        whatsapp: whatsappResult,
      };
    } catch (error) {
      logger.error('Error in ticket delivery service', {
        error: error.message,
        ticketId,
      });
      throw error;
    }
  }

  /**
   * Send tickets for a payment
   * @param {string} paymentId - Payment ID
   * @returns {Promise<Array>} Delivery status for each ticket
   */
  async sendTicketsForPayment(paymentId) {
    try {
      // Get all tickets for this payment
      const tickets = await Ticket.find({ paymentId });

      if (!tickets || tickets.length === 0) {
        throw new Error('No tickets found for this payment');
      }

      logger.info('Sending tickets for payment', {
        paymentId,
        ticketCount: tickets.length,
      });

      // Send each ticket
      const deliveryResults = await Promise.all(
        tickets.map(ticket => this.sendTicket(ticket._id))
      );

      logger.info('All tickets sent for payment', {
        paymentId,
        total: tickets.length,
        successful: deliveryResults.filter(r => r.success).length,
      });

      return deliveryResults;
    } catch (error) {
      logger.error('Error sending tickets for payment', {
        error: error.message,
        paymentId,
      });
      throw error;
    }
  }

  /**
   * Resend ticket to user
   * @param {string} ticketId - Ticket ID
   * @param {Array} channels - Channels to send through ('email', 'whatsapp')
   * @returns {Promise<Object>} Delivery status
   */
  async resendTicket(ticketId, channels = ['email', 'whatsapp']) {
    try {
      const results = {};

      if (channels.includes('email')) {
        results.email = await this.sendTicketViaEmail(ticketId);
      }

      if (channels.includes('whatsapp')) {
        results.whatsapp = await this.sendTicketViaWhatsApp(ticketId);
      }

      // Update ticket metadata
      const ticket = await Ticket.findById(ticketId);
      if (ticket) {
        ticket.metadata = ticket.metadata || {};
        ticket.metadata.resendHistory = ticket.metadata.resendHistory || [];
        ticket.metadata.resendHistory.push({
          channels,
          results,
          timestamp: new Date(),
        });
        await ticket.save();
      }

      logger.info('Ticket resent', {
        ticketId,
        channels,
      });

      return {
        success: Object.values(results).some(r => r.success),
        results,
      };
    } catch (error) {
      logger.error('Error resending ticket', {
        error: error.message,
        ticketId,
      });
      throw error;
    }
  }

  /**
   * Send reminder about upcoming event
   * @param {string} eventId - Event ID
   * @param {string} daysBeforeEvent - Send reminder X days before event
   * @returns {Promise<Object>} Reminder delivery status
   */
  async sendEventReminders(eventId, daysBeforeEvent = 1) {
    try {
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Get all valid tickets for this event
      const tickets = await Ticket.find({
        eventId,
        status: 'VALID',
      }).populate('userId', 'email mobile fullName');

      logger.info('Sending event reminders', {
        eventId,
        eventName: event.eventName,
        ticketCount: tickets.length,
      });

      const reminderResults = [];

      for (const ticket of tickets) {
        try {
          const user = ticket.userId;

          // Send email reminder
          if (user.email) {
            const emailReminder = await emailService.sendEventReminder(
              user.email,
              user.fullName,
              {
                eventName: event.eventName,
                eventDate: event.eventDate,
                ticketNumber: ticket.ticketNumber,
              }
            );

            reminderResults.push({
              ticketId: ticket._id,
              channel: 'email',
              success: true,
              messageId: emailReminder.messageId,
            });
          }

          // Send WhatsApp reminder
          if (user.mobile) {
            const reminderMessage = `
🎵 *Reminder!*

Your event "${event.eventName}" is coming up!
📅 Date: ${new Date(event.eventDate).toLocaleDateString()}

Don't forget to bring your ticket (${ticket.ticketNumber}).

See you there! 🎉
            `.trim();

            const whatsappReminder = await whatsappService.sendMessage(
              user.mobile,
              reminderMessage
            );

            reminderResults.push({
              ticketId: ticket._id,
              channel: 'whatsapp',
              success: whatsappReminder.success,
              messageId: whatsappReminder.messageId || null,
            });
          }
        } catch (error) {
          logger.warn('Error sending reminder to ticket holder', {
            error: error.message,
            ticketId: ticket._id,
          });
        }
      }

      logger.info('Event reminders sent', {
        eventId,
        totalSent: reminderResults.length,
      });

      return {
        success: true,
        eventId,
        eventName: event.eventName,
        remindersCount: reminderResults.length,
        results: reminderResults,
      };
    } catch (error) {
      logger.error('Error sending event reminders', {
        error: error.message,
        eventId,
      });
      throw error;
    }
  }

  /**
   * Get delivery history for a ticket
   * @param {string} ticketId - Ticket ID
   * @returns {Promise<Object>} Delivery history
   */
  async getDeliveryHistory(ticketId) {
    try {
      const ticket = await Ticket.findById(ticketId);

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      const deliveryStatus = ticket.metadata?.deliveryStatus || {};
      const resendHistory = ticket.metadata?.resendHistory || [];

      return {
        ticketId,
        initialDelivery: deliveryStatus,
        resendHistory,
        lastDelivery: resendHistory.length > 0 
          ? resendHistory[resendHistory.length - 1].timestamp 
          : deliveryStatus.deliveredAt || null,
      };
    } catch (error) {
      logger.error('Error fetching delivery history', {
        error: error.message,
        ticketId,
      });
      throw error;
    }
  }
}

export const ticketDeliveryService = new TicketDeliveryService();
