import axios from 'axios';
import { Payment } from '../models/Payment.js';
import { User } from '../../user/models/User.js';
import { logger } from '../../../shared/logger/logger.js';
import { emailService } from '../../../shared/email/emailService.js';
import { whatsappService } from '../../../shared/whatsapp/whatsappService.js';

// Lazy-initialized Cashfree client
let cashfreeClient = null;

function initializeCashfreeClient() {
  if (cashfreeClient) return cashfreeClient;

  const CASHFREE_MODE = process.env.CASHFREE_MODE || 'SANDBOX';
  const BASE_URL = CASHFREE_MODE === 'SANDBOX' 
    ? 'https://sandbox.cashfree.com/pg'
    : 'https://api.cashfree.com/pg';

  // Log credentials for debugging
  console.log('[DEBUG] Initializing Cashfree Client:', {
    mode: CASHFREE_MODE,
    baseUrl: BASE_URL,
    appIdExists: !!process.env.CASHFREE_APP_ID,
    appSecretExists: !!process.env.CASHFREE_APP_SECRET,
    appId: process.env.CASHFREE_APP_ID ? process.env.CASHFREE_APP_ID.substring(0, 15) + '...' : 'MISSING',
  });

  cashfreeClient = axios.create({
    baseURL: BASE_URL,
    headers: {
      'X-API-Version': '2023-08-01',
      'X-Client-Id': process.env.CASHFREE_APP_ID,
      'X-Client-Secret': process.env.CASHFREE_APP_SECRET,
      'Content-Type': 'application/json',
    },
  });

  // Add response interceptor for debugging
  cashfreeClient.interceptors.response.use(
    response => response,
    error => {
      logger.error('Cashfree API Error Response:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
      });
      return Promise.reject(error);
    }
  );

  return cashfreeClient;
}

export class PaymentService {
  /**
   * Create a payment order with Cashfree
   * @param {string} userId - User ID
   * @param {number} amount - Payment amount in smallest currency unit (paise for INR)
   * @param {string} description - Payment description
   * @param {Object} orderDetails - Order details including items, quantities, and prices
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Payment record with payment link
   */
  async createPayment(userId, amount, description, orderDetails, metadata = {}) {
    try {
      // Generate unique order ID
      const orderId = `ORDER_${userId}_${Date.now()}`;

      // Create payment order in database first
      const payment = await Payment.create({
        userId,
        orderId,
        amount: amount / 100, // Convert paise to rupees for storage
        description,
        orderDetails,
        status: 'PENDING',
        metadata,
      });

      try {
        // Initialize Cashfree client on first use
        const client = initializeCashfreeClient();
        
        // Create order with Cashfree API
        const cashfreeResponse = await client.post('/orders', {
          order_id: orderId,
          order_amount: amount / 100, // Amount in rupees
          order_currency: 'INR',
          customer_details: {
            customer_id: userId.toString(),
            customer_email: metadata.email || 'customer@example.com',
            customer_phone: metadata.phone || '9999999999',
          },
          order_meta: {
            return_url: process.env.PAYMENT_RETURN_URL || 'https://www.41sounds.com/success',
            notify_url: process.env.PAYMENT_WEBHOOK_URL || 'http://localhost:5000/api/payments/webhook',
          },
          order_note: description,
          order_tags: {
            userId,
            source: '41_sounds_app',
          },
        });

        // Update payment with Cashfree order details
        payment.cashfreeOrderId = cashfreeResponse.data.order_id;
        payment.paymentSessionId = cashfreeResponse.data.payment_session_id;
        payment.paymentLink = cashfreeResponse.data.payment_link;
        await payment.save();

        logger.info(`Payment order created: ${orderId}`, { 
          orderId, 
          cashfreeOrderId: cashfreeResponse.data.order_id,
          paymentSessionId: cashfreeResponse.data.payment_session_id
        });
      } catch (cashfreeError) {
        const errorDetails = {
          message: cashfreeError.message,
          status: cashfreeError.response?.status,
          data: cashfreeError.response?.data,
          orderId,
        };
        logger.error(`Cashfree API error: ${cashfreeError.message}`, errorDetails);
        // Continue without payment link - user can verify later
        payment.errorMessage = `Cashfree API error: ${cashfreeError.message}`;
        await payment.save();
      }

      return {
        success: true,
        payment: {
          _id: payment._id,
          orderId: payment.orderId,
          amount: payment.amount,
          orderDetails: payment.orderDetails,
          status: payment.status,
          paymentSessionId: payment.paymentSessionId,
          paymentLink: payment.paymentLink,
          description: payment.description,
        },
      };
    } catch (error) {
      logger.error('Failed to create payment', { error: error.message, userId, amount });
      throw new Error(`Failed to create payment: ${error.message}`);
    }
  }

  /**
   * Get payment details
   * @param {string} paymentId - Payment record ID
   * @returns {Promise<Object>} Payment details
   */
  async getPaymentDetails(paymentId) {
    try {
      const payment = await Payment.findById(paymentId);

      if (!payment) {
        throw new Error('Payment not found');
      }

      // If payment is still pending, verify status with Cashfree
      if (payment.status === 'PENDING' && payment.cashfreeOrderId) {
        await this.verifyPaymentStatus(payment.cashfreeOrderId);
        // Refresh payment from database
        return await Payment.findById(paymentId);
      }

      return payment;
    } catch (error) {
      logger.error('Failed to fetch payment details', { error: error.message, paymentId });
      throw new Error(`Failed to fetch payment: ${error.message}`);
    }
  }

  /**
   * Verify payment status with Cashfree
   * @param {string} orderId - Cashfree order ID
   * @returns {Promise<Object>} Updated payment status
   */
  async verifyPaymentStatus(orderId) {
    try {
      // Initialize Cashfree client on first use
      const client = initializeCashfreeClient();
      
      // Fetch order status from Cashfree API
      const response = await client.get(`/orders/${orderId}`);

      // Update payment record if it exists
      const payment = await Payment.findOne({ cashfreeOrderId: orderId });

      if (payment) {
        const orderStatus = response.data.order_status;

        if (orderStatus === 'PAID') {
          payment.status = 'SUCCESS';
          payment.paymentMethod = response.data.order_meta?.payment_method || 'UNKNOWN';
          payment.cashfreePaymentId = response.data.cf_payment_id;
          payment.transactionId = response.data.order_id;
          payment.completedAt = new Date();
        } else if (['EXPIRED', 'CANCELLED'].includes(orderStatus)) {
          payment.status = 'CANCELLED';
        } else if (orderStatus === 'ACTIVE') {
          payment.status = 'PENDING';
        }

        await payment.save();
        logger.info(`Payment status updated: ${orderId} -> ${payment.status}`);
      }

      return response.data;
    } catch (error) {
      logger.error('Failed to verify payment status', { error: error.message, orderId });
      throw new Error(`Failed to verify payment: ${error.message}`);
    }
  }

  /**
   * Get user's payment history
   * @param {string} userId - User ID
   * @param {number} limit - Number of records to fetch
   * @param {number} skip - Number of records to skip
   * @returns {Promise<Array>} Payment records
   */
  async getPaymentHistory(userId, limit = 10, skip = 0) {
    try {
      const payments = await Payment.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      const total = await Payment.countDocuments({ userId });

      return {
        total,
        payments,
      };
    } catch (error) {
      logger.error('Failed to fetch payment history', { error: error.message, userId });
      throw new Error(`Failed to fetch payment history: ${error.message}`);
    }
  }

  /**
   * Process webhook payment notification
   * @param {Object} webhookData - Cashfree webhook data
   * @returns {Promise<Object>} Processing result
   */
  async processWebhook(webhookData) {
    try {
      const { data } = webhookData;
      const order = data.order;

      // Extract order ID - handle both nested and flat structures
      const orderId = order?.order_id || data?.order_id;
      const orderStatus = order?.order_status || data?.order_status;

      if (!orderId) {
        logger.error('Webhook received with missing order_id', { data });
        return { success: false, message: 'Missing order_id in webhook' };
      }

      // Find payment by cashfree order ID
      const payment = await Payment.findOne({ cashfreeOrderId: orderId });

      if (!payment) {
        logger.warn('Webhook received for unknown order', { orderId });
        return { success: false, message: 'Order not found' };
      }

      // Update payment status based on webhook event
      if (orderStatus === 'PAID') {
        payment.status = 'SUCCESS';
        payment.paymentMethod = order?.payment_method || data?.payment_method || 'UNKNOWN';
        payment.cashfreePaymentId = order?.cf_payment_id || data?.cf_payment_id;
        payment.transactionId = order?.payment_id || data?.payment_id;
        payment.completedAt = new Date();
        logger.info(`Payment confirmed via webhook: ${orderId}`);
      } else if (['EXPIRED', 'CANCELLED'].includes(orderStatus)) {
        payment.status = 'CANCELLED';
        payment.errorMessage = 'Payment was cancelled or expired';
        logger.warn(`Payment cancelled: ${orderId}`);
      } else if (orderStatus === 'PENDING') {
        payment.status = 'PENDING';
      } else {
        payment.status = 'FAILED';
        payment.errorMessage = data.error_message || 'Payment failed';
        logger.error(`Payment failed: ${orderId}`, { error: data.error_message });
      }

      await payment.save();

      // Send confirmation email and WhatsApp message if payment is successful
      if (orderStatus === 'PAID') {
        try {
          const user = await User.findById(payment.userId);
          
          if (user) {
            const paymentDetails = {
              orderId: payment.orderId,
              amount: payment.amount,
              description: payment.description,
              paymentMethod: payment.paymentMethod,
              transactionId: payment.transactionId,
              cashfreePaymentId: payment.cashfreePaymentId,
              completedAt: payment.completedAt,
            };

            // Send email confirmation
            if (user.email) {
              await emailService.sendPaymentConfirmation(user.email, user.fullName, paymentDetails);
            }

            // Send WhatsApp confirmation
            if (user.mobile) {
              await whatsappService.sendPaymentConfirmation(user.mobile, user.fullName, paymentDetails);
            }
          } else {
            logger.warn('Unable to send confirmations - user not found', { 
              userId: payment.userId,
              orderId,
            });
          }
        } catch (confirmationError) {
          logger.error('Error sending payment confirmations', {
            error: confirmationError.message,
            orderId,
            userId: payment.userId,
          });
          // Don't throw - notification sending failure shouldn't block webhook processing
        }
      }

      return { success: true, payment };
    } catch (error) {
      logger.error('Failed to process webhook', { error: error.message });
      throw new Error(`Failed to process webhook: ${error.message}`);
    }
  }

  /**
   * Cancel a payment
   * @param {string} paymentId - Payment record ID
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelPayment(paymentId) {
    try {
      const payment = await Payment.findById(paymentId);

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status === 'SUCCESS') {
        throw new Error('Cannot cancel a completed payment');
      }

      if (payment.status === 'CANCELLED') {
        throw new Error('Payment is already cancelled');
      }

      payment.status = 'CANCELLED';
      payment.errorMessage = 'Cancelled by user';
      await payment.save();

      logger.info(`Payment cancelled: ${payment.orderId}`);

      return {
        success: true,
        message: 'Payment cancelled successfully',
        payment,
      };
    } catch (error) {
      logger.error('Failed to cancel payment', { error: error.message, paymentId });
      throw new Error(`Failed to cancel payment: ${error.message}`);
    }
  }
}

export const paymentService = new PaymentService();
