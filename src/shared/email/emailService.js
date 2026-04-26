import nodemailer from 'nodemailer';
import { logger } from '../logger/logger.js';

// Lazy-initialized transporter
let transporter = null;

function initializeTransporter() {
  if (transporter) return transporter;

  const emailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  };

  // Validate required environment variables
  if (!emailConfig.auth.user || !emailConfig.auth.pass) {
    logger.warn('Email service not fully configured. SMTP credentials missing.');
    return null;
  }

  transporter = nodemailer.createTransport(emailConfig);

  logger.info('Email service initialized', {
    host: emailConfig.host,
    port: emailConfig.port,
    user: emailConfig.auth.user?.substring(0, 10) + '...',
  });

  return transporter;
}

export class EmailService {
  /**
   * Send payment confirmation email
   * @param {string} userEmail - Recipient email address
   * @param {string} userName - Recipient name
   * @param {Object} paymentDetails - Payment details object
   * @returns {Promise<Object>} Send result
   */
  async sendPaymentConfirmation(userEmail, userName, paymentDetails) {
    try {
      const emailTransporter = initializeTransporter();

      if (!emailTransporter) {
        logger.warn('Email service not configured. Skipping email send for payment confirmation.', {
          userEmail,
          orderId: paymentDetails.orderId,
        });
        return { success: false, message: 'Email service not configured' };
      }

      const mailOptions = {
        from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
        to: userEmail,
        subject: 'Payment Confirmation - 41Sounds',
        html: this.generatePaymentConfirmationHTML(userName, paymentDetails),
        text: this.generatePaymentConfirmationText(userName, paymentDetails),
      };

      const result = await emailTransporter.sendMail(mailOptions);

      logger.info('Payment confirmation email sent', {
        to: userEmail,
        orderId: paymentDetails.orderId,
        messageId: result.messageId,
      });

      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error('Failed to send payment confirmation email', {
        error: error.message,
        userEmail,
        orderId: paymentDetails.orderId,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate HTML email template for payment confirmation
   * @param {string} userName - User name
   * @param {Object} paymentDetails - Payment details
   * @returns {string} HTML template
   */
  generatePaymentConfirmationHTML(userName, paymentDetails) {
    const formattedDate = new Date(paymentDetails.completedAt || new Date()).toLocaleDateString(
      'en-IN',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f9f9f9;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #fff;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
              border-bottom: 3px solid #007bff;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .header h1 {
              color: #007bff;
              margin: 0;
              font-size: 24px;
            }
            .success-badge {
              display: inline-block;
              background-color: #28a745;
              color: white;
              padding: 8px 12px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: bold;
              margin-left: 10px;
            }
            .details-section {
              margin: 20px 0;
              padding: 15px;
              background-color: #f5f5f5;
              border-left: 4px solid #007bff;
              border-radius: 4px;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #ddd;
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .detail-label {
              font-weight: bold;
              color: #666;
            }
            .detail-value {
              color: #333;
            }
            .amount-highlight {
              font-size: 20px;
              color: #28a745;
              font-weight: bold;
            }
            .footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 1px solid #ddd;
              text-align: center;
              color: #999;
              font-size: 12px;
            }
            .cta-button {
              display: inline-block;
              margin-top: 20px;
              padding: 10px 20px;
              background-color: #007bff;
              color: white;
              text-decoration: none;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>41Sounds <span class="success-badge">✓ PAID</span></h1>
            </div>

            <p>Hello <strong>${userName}</strong>,</p>

            <p>Your payment has been successfully processed! Thank you for your transaction with 41Sounds.</p>

            <div class="details-section">
              <div class="detail-row">
                <span class="detail-label">Order ID:</span>
                <span class="detail-value">${paymentDetails.orderId}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Amount Paid:</span>
                <span class="detail-value amount-highlight">₹${paymentDetails.amount}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Payment Method:</span>
                <span class="detail-value">${paymentDetails.paymentMethod || 'N/A'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Transaction ID:</span>
                <span class="detail-value">${paymentDetails.transactionId || paymentDetails.cashfreePaymentId || 'N/A'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">${formattedDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Description:</span>
                <span class="detail-value">${paymentDetails.description}</span>
              </div>
            </div>

            <p>If you have any questions or need further assistance, please don't hesitate to contact our support team.</p>

            <a href="${process.env.APP_URL || 'https://www.41sounds.com'}" class="cta-button">Visit 41Sounds</a>

            <div class="footer">
              <p>This is an automated email. Please do not reply to this email.</p>
              <p>&copy; 2024 41Sounds. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate plain text email template for payment confirmation
   * @param {string} userName - User name
   * @param {Object} paymentDetails - Payment details
   * @returns {string} Plain text template
   */
  generatePaymentConfirmationText(userName, paymentDetails) {
    const formattedDate = new Date(paymentDetails.completedAt || new Date()).toLocaleDateString(
      'en-IN',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );

    return `
Hello ${userName},

Your payment has been successfully processed! Thank you for your transaction with 41Sounds.

Payment Details:
---
Order ID: ${paymentDetails.orderId}
Amount Paid: ₹${paymentDetails.amount}
Payment Method: ${paymentDetails.paymentMethod || 'N/A'}
Transaction ID: ${paymentDetails.transactionId || paymentDetails.cashfreePaymentId || 'N/A'}
Date: ${formattedDate}
Description: ${paymentDetails.description}

If you have any questions or need further assistance, please contact our support team.

Visit: ${process.env.APP_URL || 'https://www.41sounds.com'}

---
This is an automated email. Please do not reply to this email.
© 2024 41Sounds. All rights reserved.
    `;
  }
}

export const emailService = new EmailService();
