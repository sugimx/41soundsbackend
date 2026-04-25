import axios from 'axios';
import { Payment } from '../models/Payment.js';
import { logger } from '../../../shared/logger/logger.js';

// Initialize Cashfree SDK configuration
const CASHFREE_MODE = process.env.CASHFREE_MODE || 'SANDBOX';
const BASE_URL = CASHFREE_MODE === 'SANDBOX' 
  ? 'https://sandbox.cashfree.com/pg'
  : 'https://api.cashfree.com/pg';

const cashfreeClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'X-Client-Id': process.env.CASHFREE_APP_ID,
    'X-Client-Secret': process.env.CASHFREE_APP_SECRET,
    'Content-Type': 'application/json',
  },
});

export class PaymentService {
  /**
   * Create a payment order with Cashfree
   * @param {string} userId - User ID
   * @param {number} amount - Payment amount in smallest currency unit (paise for INR)
   * @param {string} description - Payment description
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Payment record with payment link
   */
  async createPayment(userId, amount, description, metadata = {}) {
    try {
      // Generate unique order ID
      const orderId = `ORDER_${userId}_${Date.now()}`;

      // Create payment order in database first
      const payment = await Payment.create({
        userId,
        orderId,
        amount: amount / 100, // Convert paise to rupees for storage
        description,
        status: 'PENDING',
        metadata,
      });

      try {
        // Create order with Cashfree API
        const cashfreeResponse = await cashfreeClient.post('/orders', {
          order_id: orderId,
          order_amount: amount / 100, // Amount in rupees
          order_currency: 'INR',
          customer_details: {
            customer_id: userId.toString(),
            customer_email: metadata.email || 'customer@example.com',
            customer_phone: metadata.phone || '9999999999',
          },
          order_meta: {
            return_url: process.env.PAYMENT_RETURN_URL || 'http://localhost:5000/api/payments/success',
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
        payment.paymentLink = cashfreeResponse.data.payment_link;
        await payment.save();

        logger.info(`Payment order created: ${orderId}`, { 
          orderId, 
          cashfreeOrderId: cashfreeResponse.data.order_id 
        });
      } catch (cashfreeError) {
        logger.warn(`Cashfree API error: ${cashfreeError.message}`, { orderId });
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
          status: payment.status,
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
      // Fetch order status from Cashfree API
      const response = await cashfreeClient.get(`/orders/${orderId}`);

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
      const orderId = data.order_id;

      const payment = await Payment.findOne({ cashfreeOrderId: orderId });

      if (!payment) {
        logger.warn('Webhook received for unknown order', { orderId });
        return { success: false, message: 'Order not found' };
      }

      // Update payment status based on webhook event
      const orderStatus = data.order_status;

      if (orderStatus === 'PAID') {
        payment.status = 'SUCCESS';
        payment.paymentMethod = data.payment_method || 'UNKNOWN';
        payment.cashfreePaymentId = data.cf_payment_id;
        payment.transactionId = data.payment_id;
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
