import { paymentService } from '../services/PaymentService.js';
import { logger } from '../../../shared/logger/logger.js';

export class PaymentController {
  /**
   * Initiate a payment
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async initiatePayment(req, res) {
    try {
      const { amount, description, metadata } = req.body;
      const userId = req.userId;

      // Validate required fields
      if (!amount || !description) {
        return res.status(400).json({
          success: false,
          message: 'Amount and description are required',
        });
      }

      // Validate amount
      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be a positive number',
        });
      }

      // Amount in paise (convert to smallest currency unit)
      const amountInPaise = Math.round(amount * 100);

      if (amountInPaise < 100) {
        // Minimum 1 rupee (100 paise)
        return res.status(400).json({
          success: false,
          message: 'Minimum payment amount is ₹1',
        });
      }

      const payment = await paymentService.createPayment(userId, amountInPaise, description, metadata);

      res.status(201).json({
        success: true,
        data: payment.payment,
      });
    } catch (error) {
      logger.error('Initiate payment error', { error: error.message, userId: req.userId });
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get payment details
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPayment(req, res) {
    try {
      const { paymentId } = req.params;
      const userId = req.userId;

      const payment = await paymentService.getPaymentDetails(paymentId);

      // Verify payment belongs to the authenticated user
      if (payment.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access to this payment',
        });
      }

      res.json({
        success: true,
        payment,
      });
    } catch (error) {
      logger.error('Get payment error', { error: error.message, paymentId: req.params.paymentId });
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get user's payment history
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPaymentHistory(req, res) {
    try {
      const userId = req.userId;
      const { limit = 10, skip = 0 } = req.query;

      const result = await paymentService.getPaymentHistory(userId, parseInt(limit), parseInt(skip));

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Get payment history error', { error: error.message, userId: req.userId });
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Verify payment status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async verifyPayment(req, res) {
    try {
      const { paymentId } = req.params;
      const userId = req.userId;

      const payment = await paymentService.getPaymentDetails(paymentId);

      // Verify payment belongs to the authenticated user
      if (payment.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access to this payment',
        });
      }

      // Verify with Cashfree if pending
      if (payment.status === 'PENDING' && payment.cashfreeOrderId) {
        await paymentService.verifyPaymentStatus(payment.cashfreeOrderId);
        const updatedPayment = await paymentService.getPaymentDetails(paymentId);
        return res.json({
          success: true,
          payment: updatedPayment,
        });
      }

      res.json({
        success: true,
        payment,
      });
    } catch (error) {
      logger.error('Verify payment error', { error: error.message, paymentId: req.params.paymentId });
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Handle payment webhook from Cashfree
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async handleWebhook(req, res) {
    try {
      const webhookData = req.body;

      // Verify webhook signature (optional but recommended)
      // TODO: Implement Cashfree webhook signature verification
      // const isValid = verifyWebhookSignature(webhookData, req.headers['x-webhook-signature']);

      await paymentService.processWebhook(webhookData);

      // Cashfree expects 200 OK response
      res.status(200).json({
        success: true,
        message: 'Webhook processed',
      });
    } catch (error) {
      logger.error('Webhook processing error', { error: error.message });
      // Still return 200 OK to acknowledge receipt
      res.status(200).json({
        success: false,
        message: 'Webhook processing failed',
      });
    }
  }

  /**
   * Cancel a payment
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async cancelPayment(req, res) {
    try {
      const { paymentId } = req.params;
      const userId = req.userId;

      const payment = await paymentService.getPaymentDetails(paymentId);

      // Verify payment belongs to the authenticated user
      if (payment.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access to this payment',
        });
      }

      // Validate payment status before cancellation
      if (payment.status === 'CANCELLED') {
        return res.status(400).json({
          success: false,
          message: 'Payment is already cancelled',
        });
      }

      if (payment.status === 'SUCCESS') {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel a completed payment',
        });
      }

      const result = await paymentService.cancelPayment(paymentId);

      res.json(result);
    } catch (error) {
      logger.error('Cancel payment error', { error: error.message, paymentId: req.params.paymentId });
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export const paymentController = new PaymentController();
