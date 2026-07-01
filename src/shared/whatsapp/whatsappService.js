import axios from 'axios';
import { logger } from '../logger/logger.js';

// WhatsApp Business API base URL
const WHATSAPP_API_BASE_URL = 'https://graph.facebook.com/v25.0';

export class WhatsAppService {
  /**
   * Send payment confirmation via WhatsApp using template
   * @param {string} phoneNumber - Recipient phone number (with country code, e.g., +91XXXXXXXXXX)
   * @param {string} userName - Recipient name
   * @param {Object} paymentDetails - Payment details object
   * @param {string} ticketTier - Ticket tier (e.g., 'VIP', 'General')
   * @returns {Promise<Object>} Send result
   */
  async sendPaymentConfirmation(phoneNumber, userName, paymentDetails, ticketTier) {
    try {
      // Validate configuration
      if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
        logger.warn('WhatsApp service not fully configured. Access token or Phone Number ID missing.');
        return { success: false, message: 'WhatsApp service not configured' };
      }

      // Format phone number to 91XXXXXXXXXX format
      const cleaned = phoneNumber.replace(/\D/g, '');
      const formattedPhone = cleaned.startsWith('91') ? cleaned : (cleaned.length === 10 ? `91${cleaned}` : cleaned);

      // Validate phone number format
      if (!/^\d{12,13}$/.test(formattedPhone)) {
        logger.error('Invalid phone number format', { phoneNumber, formattedPhone });
        return { success: false, error: `Invalid phone number format: ${formattedPhone}` };
      }

      // Format date as DD MMM YYYY
      const formattedDate = new Date(paymentDetails.completedAt || new Date()).toLocaleDateString(
        'en-IN',
        { day: '2-digit', month: 'short', year: 'numeric' }
      );

      // Use template-based message with parameters
      const requestBody = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: 'payment_confirmation_3',
          language: {
            code: 'en_US',
          },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: userName },
                { type: 'text', text: ticketTier || 'Concert Ticket' },
                { type: 'text', text: paymentDetails.orderId },
                { type: 'text', text: formattedDate },
                { type: 'text', text: String(paymentDetails.amount) },
              ],
            },
          ],
        },
      };

      const url = `${WHATSAPP_API_BASE_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

      const response = await axios.post(url, requestBody, {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      const messageId = response.data?.messages?.[0]?.id;
      logger.info('WhatsApp payment confirmation sent', {
        phone: formattedPhone,
        orderId: paymentDetails.orderId,
        messageId,
      });

      return { success: true, messageId };
    } catch (error) {
      logger.error('Failed to send WhatsApp payment confirmation', {
        error: error.message,
        phoneNumber,
        orderId: paymentDetails.orderId,
        response: error.response?.data,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send payment confirmation via WhatsApp using template
   * @param {string} phoneNumber - Recipient phone number (with country code, e.g., +91XXXXXXXXXX)
   * @param {string} userName - Recipient name
   * @param {Object} paymentDetails - Payment details object
   * @param {string} ticketTier - Ticket tier (e.g., 'VIP', 'General')
   * @returns {Promise<Object>} Send result
   */
  async sendTicketDelivery(phoneNumber, userName, paymentDetails) {
    try {
      // Validate configuration
      if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
        logger.warn('WhatsApp service not fully configured. Access token or Phone Number ID missing.');
        return { success: false, message: 'WhatsApp service not configured' };
      }

      // Format phone number to 91XXXXXXXXXX format
      const cleaned = phoneNumber.replace(/\D/g, '');
      const formattedPhone = cleaned.startsWith('91') ? cleaned : (cleaned.length === 10 ? `91${cleaned}` : cleaned);

      // Validate phone number format
      if (!/^\d{12,13}$/.test(formattedPhone)) {
        logger.error('Invalid phone number format', { phoneNumber, formattedPhone });
        return { success: false, error: `Invalid phone number format: ${formattedPhone}` };
      }

      // Format date as DD MMM YYYY
      const formattedDate = new Date(paymentDetails.completedAt || new Date()).toLocaleDateString(
        'en-IN',
        { day: '2-digit', month: 'short', year: 'numeric' }
      );

      console.log('Sending ticket delivery message', {
        formattedPhone,
        userName,
        paymentDetails,
      });
      // Use template-based message with parameters
      const requestBody = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: 'ticket_delivery_2',
          language: {
            code: 'en_US',
          },
          components: [
            {
              type: "header",
              parameters: [
                {
                  type: "document",
                  document: {
                    link: "https://41Sounds.com/tickets/CFPAY_VIPSEAT_A685_1781018756248.pdf",
                    filename: "Ticket.pdf"
                  }
                }
              ]
            },
            {
              type: 'body',
              parameters: [
                { type: 'text', text: userName || "N/A" },
                { type: 'text', text: "Muthamazhai 2.0" },
                { type: 'text', text: paymentDetails.orderId || "N/A" },
                { type: 'text', text: paymentDetails.ticketTier || "N/A" },
                { type: 'text', text: String(paymentDetails.ticketQuantity) || "N/A" },
                { type: 'text', text: paymentDetails.seatNumber || "N/A" },
              ],
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [
                { type: "text", text: paymentDetails.orderId }
              ]
            }
          ],
          
        },
      };

      const url = `${WHATSAPP_API_BASE_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

      const response = await axios.post(url, requestBody, {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      const messageId = response.data?.messages?.[0]?.id;
      logger.info('WhatsApp payment confirmation sent', {
        phone: formattedPhone,
        orderId: paymentDetails.orderId,
        messageId,
      });

      return { success: true, messageId };
    } catch (error) {
      console.error(
        JSON.stringify(error.response?.data, null, 2)
      );
      logger.error('Failed to send WhatsApp payment confirmation', {
        error: error.message,
        phoneNumber,
        orderId: paymentDetails.orderId,
        response: error.response?.data,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send custom WhatsApp message
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} message - Message text
   * @returns {Promise<Object>} Send result
   */
  async sendCustomMessage(phoneNumber, message) {
    try {
      if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
        logger.warn('WhatsApp service not configured.');
        return { success: false, message: 'WhatsApp service not configured' };
      }

      const normalizedPhone = phoneNumber.replace(/\D/g, '+').replace(/^\+*/, '+');

      const response = await axios.post(
        `${WHATSAPP_API_BASE_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: message,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info('Custom WhatsApp message sent', {
        to: normalizedPhone,
        messageId: response.data?.messages?.[0]?.id,
      });

      return {
        success: true,
        messageId: response.data?.messages?.[0]?.id,
      };
    } catch (error) {
      logger.error('Failed to send custom WhatsApp message', {
        error: error.message,
        phoneNumber,
        response: error.response?.data,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send payment reminder via WhatsApp
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} userName - Recipient name
   * @param {Object} paymentDetails - Payment details
   * @returns {Promise<Object>} Send result
   */
  async sendPaymentReminder(phoneNumber, userName, paymentDetails) {
    try {
      const normalizedPhone = phoneNumber.replace(/\D/g, '+').replace(/^\+*/, '+');

      const message = `Hi ${userName},

This is a friendly reminder about your pending payment.

Order ID: ${paymentDetails.orderId}
Amount: ₹${paymentDetails.amount}

Please complete your payment to proceed.

Thank you! 🙏
41Sounds Team`;

      return await this.sendCustomMessage(normalizedPhone, message);
    } catch (error) {
      logger.error('Failed to send payment reminder', {
        error: error.message,
        phoneNumber,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send generic WhatsApp message
   * Alias for sendCustomMessage with normalized phone number
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} message - Message text
   * @returns {Promise<Object>} Send result
   */
  async sendMessage(phoneNumber, message) {
    return this.sendCustomMessage(phoneNumber, message);
  }
}

export const whatsappService = new WhatsAppService();
