import nodemailer from 'nodemailer';
import { logger } from '../logger/logger.js';
import QRCode from 'qrcode';
import { qrCodeService } from '../utils/QRCodeService.js';

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
   * @param {string} ticketTier - Ticket tier (e.g., 'VIP', 'General')
   * @returns {Promise<Object>} Send result
   */
  async sendPaymentConfirmation(userEmail, userName, paymentDetails, ticketTier) {
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
        html: this.generatePaymentConfirmationHTML(userName, paymentDetails, ticketTier),
        text: this.generatePaymentConfirmationText(userName, paymentDetails, ticketTier),
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
   * @param {string} ticketTier - Ticket tier (e.g. 'VIP', 'General')
   * @returns {string} HTML template
   */
  generatePaymentConfirmationHTML(userName, paymentDetails, ticketTier) {
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

            <p>Thank you for booking your ${ticketTier} tickets for our upcoming Muthamazhai 2.0 event on 18 July 2026 at Hindustan Concert Ground, Coimbatore at 6:30 PM.</p>

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

            <p>Your booking is being processed, and you will receive your ticket details via email/whatsapp within the last 24 hours before the event starts.</p>

            <p>If you have any questions or need further assistance, please don't hesitate to contact our support team.</p>

            <a href="${'https://www.41sounds.com'}" class="cta-button">Visit 41Sounds</a>

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
   * @param {string} ticketTier - Ticket tier (e.g. 'VIP', 'General')
   * @returns {string} Plain text template
   */
  generatePaymentConfirmationText(userName, paymentDetails, ticketTier) {
    const formattedDate = new Date(paymentDetails.completedAt || new Date()).toLocaleDateString(
      'en-IN',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );

    return `
Hello ${userName},

Your payment has been successfully processed! Thank you for your transaction with 41Sounds.

You've booked ${ticketTier || 'your'} tickets for the upcoming Muthamazhai 2.0 event on 18 July 2026 at Hindustan Concert Ground, Coimbatore at 6:30 PM.

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

  /**
   * Send ticket delivery email
   * @param {string} userEmail - Recipient email address
   * @param {string} userName - Recipient name
   * @param {Object} ticketDetails - Ticket details object
   * @returns {Promise<Object>} Send result
   */
  async sendTicketDelivery(userEmail, userName, ticketDetails) {
    try {
      const emailTransporter = initializeTransporter();

      if (!emailTransporter) {
        logger.warn('Email service not configured. Skipping ticket delivery email.', {
          userEmail,
          ticketNumber: ticketDetails.ticketNumber,
        });
        return { success: false, message: 'Email service not configured' };
      }

      const qrImage = await qrCodeService.generateQRCodeDataURL(ticketDetails.ticketNumber);

        const qrBase64 = qrImage.replace(/^data:image\/png;base64,/, "");
      
      const mailOptions = {
        from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
        to: userEmail,
        subject: `Your Event Ticket - Stunts & Street - 41Sounds`,
        html: this.generateTicketDeliveryHTML(userName, ticketDetails, qrImage),
        text: this.generateTicketDeliveryText(userName, ticketDetails),
         attachments: [
          {
            filename: "ticket-qr.png",
            content: qrBase64,
            encoding: "base64",
            cid: "ticketqr",
            contentType: "image/png",
          },
        ],
      };

      const result = await emailTransporter.sendMail(mailOptions);

      logger.info('Ticket delivery email sent', {
        to: userEmail,
        ticketNumber: ticketDetails.ticketNumber,
        messageId: result.messageId,
      });

      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error('Failed to send ticket delivery email', {
        error: error.message,
        userEmail,
        ticketNumber: ticketDetails.ticketNumber,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate HTML email template for ticket delivery
   * @param {string} userName - User name
   * @param {Object} ticketDetails - Ticket details
   * @returns {string} HTML template
   */
  generateTicketDeliveryHTML(userName, ticketDetails, qrImage) {
    const eventDate = new Date(ticketDetails.eventDate).toLocaleDateString(
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
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #fff;
              padding: 30px;
              border-radius: 12px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #667eea;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #667eea;
              margin: 0;
              font-size: 28px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 10px;
            }
            .ticket-badge {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: #ffffff;
              padding: 10px 15px;
              border-radius: 50px;
              font-size: 12px;
              font-weight: bold;
            }
            .event-section {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: #ffffff;
              padding: 25px;
              border-radius: 8px;
              margin: 20px 0;
              text-align: center;
            }
            .event-section h2 {
              margin: 0 0 15px 0;
              font-size: 22px;
              text-transform: uppercase;
            }
            .event-date {
              font-size: 18px;
              margin: 10px 0;
              font-weight: bold;
            }
            .qr-section {
              text-align: center;
              margin: 25px 0;
              padding: 20px;
              background-color: #f5f5f5;
              border-radius: 8px;
            }
            .qr-section img {
              max-width: 250px;
              height: auto;
              border-radius: 8px;
            }
            .qr-label {
              font-size: 12px;
              color: #666;
              margin-top: 10px;
              text-transform: uppercase;
              font-weight: bold;
            }
            .details-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin: 20px 0;
            }
            .detail-box {
              padding: 15px;
              background-color: #f9f9f9;
              border-left: 4px solid #667eea;
              border-radius: 4px;
            }
            .detail-label {
              font-size: 12px;
              color: #999;
              text-transform: uppercase;
              font-weight: bold;
              display: block;
              margin-bottom: 5px;
            }
            .detail-value {
              font-size: 18px;
              font-weight: bold;
              color: #333;
            }
            .instructions {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              border-radius: 4px;
              margin: 20px 0;
            }
            .instructions h3 {
              color: #856404;
              margin-top: 0;
            }
            .instructions ul {
              margin: 10px 0;
              padding-left: 20px;
              color: #856404;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #999;
            }
            .cta-button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: #ffffff !important;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 50px;
              font-weight: bold;
              margin: 20px 0;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎫 Your Ticket is Ready!</h1>
            </div>

            <p>Hello ${userName},</p>

            <p>
              Thank you for your booking! Your ticket for <strong>Stunts & Street</strong> is ready.
              Please find your ticket details and QR code below.
              </p>

              <p>
              Your Chinmayi Live Concert ticket has been converted to the Stunts & Street event.
              Your existing QR code is valid for entry.
              </p>

            <div class="event-section">
              <h2>Stunts & Street</h2>
              <div class="event-date">📅 18 July 2026</div>
            </div>

            <div class="qr-section">
              <p><strong>Your QR Code</strong></p>
              <img src="cid:ticketqr" alt="Ticket QR Code" style="max-width:250px;height:auto;border-radius:8px;" />
              <div class="qr-label">Show this QR code at the venue for entry</div>
            </div>

            <div class="details-grid">
              <div class="detail-box">
                <span class="detail-label">Ticket Number</span>
                <span class="detail-value">${ticketDetails.ticketNumber}</span>
              </div>
            </div>

            <div class="instructions">

            <h3>💰 Refund Information</h3>

            <ul>
            <li>
            If you attend Stunts & Street, the difference between your original ticket amount and ₹270 will be automatically refunded within 15 business days.
            </li>

            <li>
            If you do not attend the event, your full original ticket amount will be refunded within 15 business days.
            </li>

            </ul>

            </div>

            <p><strong>Venue Details:</strong></p>
            <p>
              📍 Hindustan Concert Ground, Coimbatore, Tamilnadu
            </p>

            <center>
              <a href="${'https://www.41sounds.com'}" class="cta-button">Visit 41Sounds</a>
            </center>

            <div class="footer">
              <p>If you have any questions, please contact our support team.</p>
              <p>&copy; 2026 41Sounds. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate plain text email template for ticket delivery
   * @param {string} userName - User name
   * @param {Object} ticketDetails - Ticket details
   * @returns {string} Plain text template
   */
  generateTicketDeliveryText(userName, ticketDetails) {
    const eventDate = new Date(ticketDetails.eventDate).toLocaleDateString(
      'en-IN',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );

    return `
Hello ${userName},

Your ticket for the event is ready!

EVENT: Stunts & Street
DATE: 18 July 2026

TICKET DETAILS:
---
Ticket Number: ${ticketDetails.ticketNumber}

EVENT DETAILS:
---
Date: 18 July 2026
Ticket Value: ₹270

Highlights:
- Bike Stunt Performances from 10:00 AM
- Food Street
- Live Music Performances from 6:00 PM
- Full-day entertainment

Please save your QR code (attached) and present it at the venue for entry.

VENUE:
Hindustan Concert Ground, Coimbatore, Tamilnadu

If you have any questions, contact our support team.

---
© 2026 41Sounds. All rights reserved.
    `;
  }

  /**
   * Send event reminder email
   * @param {string} userEmail - Recipient email address
   * @param {string} userName - Recipient name
   * @param {Object} reminderDetails - Reminder details
   * @returns {Promise<Object>} Send result
   */
  async sendEventReminder(userEmail, userName, reminderDetails) {
    try {
      const emailTransporter = initializeTransporter();

      if (!emailTransporter) {
        logger.warn('Email service not configured. Skipping event reminder email.', {
          userEmail,
          eventName: reminderDetails.eventName,
        });
        return { success: false, message: 'Email service not configured' };
      }

      const mailOptions = {
        from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
        to: userEmail,
        subject: `Reminder: ${reminderDetails.eventName} is Coming Up! - 41Sounds`,
        html: this.generateEventReminderHTML(userName, reminderDetails),
        text: this.generateEventReminderText(userName, reminderDetails),
      };

      const result = await emailTransporter.sendMail(mailOptions);

      logger.info('Event reminder email sent', {
        to: userEmail,
        eventName: reminderDetails.eventName,
        messageId: result.messageId,
      });

      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error('Failed to send event reminder email', {
        error: error.message,
        userEmail,
        eventName: reminderDetails.eventName,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate HTML email template for event reminder
   * @param {string} userName - User name
   * @param {Object} reminderDetails - Reminder details
   * @returns {string} HTML template
   */
  generateEventReminderHTML(userName, reminderDetails) {
    const eventDate = new Date(reminderDetails.eventDate).toLocaleDateString(
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
              background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .event-info {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              border-radius: 4px;
              margin: 20px 0;
            }
            .event-name {
              font-size: 20px;
              font-weight: bold;
              color: #333;
              margin: 10px 0;
            }
            .event-date {
              font-size: 16px;
              color: #666;
              margin: 10px 0;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #999;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎵 Don't Miss Out!</h1>
            </div>

            <p>Hi ${userName},</p>

            <p>This is a friendly reminder that your upcoming event is just around the corner!</p>

            <div class="event-info">
              <p><strong>Event:</strong></p>
              <div class="event-name">${reminderDetails.eventName}</div>
              <p><strong>Date:</strong></p>
              <div class="event-date">📅 ${eventDate}</div>
              <p><strong>Ticket Number:</strong></p>
              <div>${reminderDetails.ticketNumber}</div>
            </div>

            <p><strong>Things to Remember:</strong></p>
            <ul>
              <li>Bring your QR code with you</li>
              <li>Arrive early for better seating</li>
              <li>Check the weather and dress accordingly</li>
              <li>Bring valid ID if required</li>
            </ul>

            <p>Get ready for an amazing experience! See you there! 🎉</p>

            <div class="footer">
              <p>&copy; 2026 41Sounds. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate plain text email template for event reminder
   * @param {string} userName - User name
   * @param {Object} reminderDetails - Reminder details
   * @returns {string} Plain text template
   */
  generateEventReminderText(userName, reminderDetails) {
    const eventDate = new Date(reminderDetails.eventDate).toLocaleDateString(
      'en-IN',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );

    return `
Hi ${userName},

Don't miss your upcoming event!

EVENT: ${reminderDetails.eventName}
DATE: ${eventDate}
TICKET: ${reminderDetails.ticketNumber}

Remember to:
- Bring your QR code
- Arrive early
- Check the weather
- Bring valid ID if needed

See you there! 🎉

---
© 2024 41Sounds. All rights reserved.
    `;
  }
}

export const emailService = new EmailService();
