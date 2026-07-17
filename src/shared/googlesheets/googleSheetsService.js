import { google } from 'googleapis';
import { logger } from '../logger/logger.js';

class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID || process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    this.ticketsSheetName = process.env.GOOGLE_SHEETS_TICKETS_SHEET || 'Tickets';
    this.webhookSheetName = process.env.GOOGLE_SHEETS_WEBHOOK_SHEET || 'Webhooks';
    this.isInitialized = false;
    this.sheetHeaders = {
      [this.ticketsSheetName]: [
        'S.No',
        'Name',
        'Phone Number',
        'To',
        'Tickets',
        'Seat Category',
        'Price',
        'Transaction Date',
        'BookingID',
        'Seat Number',
      ],
      [this.webhookSheetName]: [
        'Timestamp',
        'Order ID',
        'User ID',
        'Amount (Paise)',
        'Order Status',
        'Payment Method',
        'Transaction ID',
        'Cashfree Payment ID',
        'Description',
        'Payment Status',
        'Error Message',
        'Email',
        'Phone',
        'Tickets Created',
        'Email Sent',
        'WhatsApp Sent',
        'Scanned',
        'Scanned At',
      ],
    };
  }

  /**
   * Initialize Google Sheets API client with Service Account credentials
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        return;
      }

      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, '');

      const credentials = {
        type: 'service_account',
        project_id: 'sounds-project-494515',
        private_key: privateKey,
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: '',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
      };

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      this.isInitialized = true;
      logger.info('Google Sheets service initialized successfully', {
        spreadsheetId: this.spreadsheetId,
        clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
      });
    } catch (error) {
      logger.error('Failed to initialize Google Sheets service', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Ensure worksheet exists, create if not
   */
  async ensureSheetExists(sheetName) {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheets = response.data.sheets || [];
      const sheetExists = sheets.some(sheet => sheet.properties.title === sheetName);

      if (!sheetExists) {
        logger.info(`Sheet '${sheetName}' does not exist, creating it...`);
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: sheetName,
                    gridProperties: {
                      rowCount: 1000,
                      columnCount: 15,
                    },
                  },
                },
              },
            ],
          },
        });

        // Add header row
        await this.addHeaderRow(sheetName, this.sheetHeaders[sheetName] || []);
      }
    } catch (error) {
      logger.error('Error ensuring sheet exists', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Add header row to the sheet
   */
  async addHeaderRow(sheetName, headers) {
    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers],
        },
      });

      logger.info(`Header row added to Google Sheet sheet=${sheetName}`);
    } catch (error) {
      logger.error('Error adding header row', {
        error: error.message,
      });
      throw error;
    }
  }

  async appendRows(sheetName, values) {
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });
  }

  async ensureHeaderColumns(sheetName, requiredHeaders) {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!1:1`,
      });

      const existingHeaders = response.data.values?.[0] || [];
      const missingHeaders = requiredHeaders.filter(header => !existingHeaders.includes(header));

      if (missingHeaders.length === 0) {
        return;
      }

      const updatedHeaders = [...existingHeaders, ...missingHeaders];
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [updatedHeaders],
        },
      });
    } catch (error) {
      logger.error('Error ensuring Google Sheet header columns', {
        error: error.message,
        sheetName,
      });
    }
  }

  async getNextSerialNo(sheetName) {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A2:A`,
    });

    const values = response.data.values || [];
    const serials = values
      .map(row => parseInt(row[0], 10))
      .filter(value => !Number.isNaN(value));

    return serials.length > 0 ? Math.max(...serials) + 1 : 1;
  }

  async logTicketData(details) {
    try {
      if (!this.spreadsheetId) {
        logger.warn('Google Sheets spreadsheet ID not configured. Set GOOGLE_SHEET_ID or GOOGLE_SHEETS_SPREADSHEET_ID, skipping ticket logging');
        return;
      }

      await this.initialize();
      await this.ensureSheetExists(this.ticketsSheetName);

      const serialNo = await this.getNextSerialNo(this.ticketsSheetName);
      const transactionDate = details.transactionDate || new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
      });
      const phoneNumber = details.customerPhone?.replace(/\D/g, '') || '';
      const amount = details.orderAmount != null ? details.orderAmount.toString() : '0';

      const rowData = [
        [
          serialNo.toString(),
          details.customerName || 'N/A',
          phoneNumber,
          details.customerEmail?.toLowerCase().trim() || 'N/A',
          details.numberOfTickets != null ? details.numberOfTickets.toString() : '0',
          details.ticketCategory || 'Standard',
          amount,
          transactionDate,
          details.orderId || 'N/A',
          details.seatNumber || '',
        ],
      ];

      await this.appendRows(this.ticketsSheetName, rowData);
      logger.info('Ticket data logged to Google Sheet', {
        orderId: details.orderId,
        serialNo,
      });
    } catch (error) {
      logger.error('Error logging ticket data to Google Sheet', {
        error: error.message,
      });
      // Don't throw - ticket logging should not fail the main workflow
    }
  }

  /**
   * Log webhook data to Google Sheet
   * @param {Object} webhookData - The webhook data from Cashfree
   * @param {Object} payment - The payment record from database
   * @param {Object} user - The user details
   */
  async logWebhookData(webhookData, payment, user) {
    try {
      if (!this.spreadsheetId) {
        logger.warn('Google Sheets spreadsheet ID not configured. Set GOOGLE_SHEET_ID or GOOGLE_SHEETS_SPREADSHEET_ID, skipping webhook logging');
        return;
      }

      await this.initialize();
      await this.ensureSheetExists(this.webhookSheetName);

      const { data } = webhookData;
      const order = data?.order || data;

      const rowData = [
        [
          new Date().toISOString(),
          payment?.cashfreeOrderId || order?.order_id || 'N/A',
          payment?.userId?.toString() || 'N/A',
          payment?.amount?.toString() || order?.amount || 'N/A',
          order?.order_status || 'N/A',
          payment?.paymentMethod || 'N/A',
          payment?.transactionId || 'N/A',
          payment?.cashfreePaymentId || order?.cf_payment_id || 'N/A',
          payment?.description || 'N/A',
          payment?.status || 'PENDING',
          payment?.errorMessage || '',
          user?.email || 'N/A',
          user?.mobile || 'N/A',
          payment?.ticketIds?.length?.toString() || '0',
          payment?.notificationStatus?.email?.sent ? 'Yes' : 'No',
          payment?.notificationStatus?.whatsapp?.sent ? 'Yes' : 'No',
        ],
      ];

      // Append data to sheet
      await this.appendRows(this.webhookSheetName, rowData);

      logger.info('Webhook data logged to Google Sheet', {
        orderId: payment?.cashfreeOrderId,
      });
    } catch (error) {
      logger.error('Error logging webhook data to Google Sheet', {
        error: error.message,
      });
      // Don't throw - webhook processing shouldn't fail if Google Sheets logging fails
    }
  }

  /**
   * Log admin ticket creation data to Google Sheet
   * @param {Object} payment - The payment record
   * @param {Object} user - The user details
   * @param {Object} customer - The customer details  
   * @param {number} ticketsCreatedCount - Number of tickets created by admin
   */
  async logAdminTicketCreation(payment, user, customer, ticketsCreatedCount = 0) {
    try {
      if (!this.spreadsheetId) {
        logger.warn('Google Sheets spreadsheet ID not configured. Set GOOGLE_SHEET_ID or GOOGLE_SHEETS_SPREADSHEET_ID, skipping admin ticket logging');
        return;
      }

      await this.initialize();
      await this.ensureSheetExists(this.webhookSheetName);

      const rowData = [
        [
          new Date().toISOString(),
          payment?.orderId || 'N/A',
          user?._id?.toString() || 'N/A',
          payment?.amount != null ? Math.round(payment.amount * 100).toString() : 'N/A',
          payment?.status || 'SUCCESS',
          payment?.paymentMethod || 'UNKNOWN',
          payment?.transactionId || payment?.cashfreePaymentId || 'N/A',
          payment?.cashfreePaymentId || 'N/A',
          payment?.description || 'Admin ticket creation',
          payment?.status || 'SUCCESS',
          '',
          customer.email || user?.email || 'N/A',
          customer.mobile || user?.mobile || 'N/A',
          ticketsCreatedCount.toString(),
          payment?.notificationStatus?.email?.sent ? 'Yes' : 'No',
          payment?.notificationStatus?.whatsapp?.sent ? 'Yes' : 'No',
        ],
      ];

      await this.appendRows(this.webhookSheetName, rowData);

      logger.info('Admin ticket creation logged to Google Sheet', {
        orderId: payment?.orderId,
      });
    } catch (error) {
      logger.error('Error logging admin ticket creation to Google Sheet', {
        error: error.message,
      });
      // Don't throw - admin notification should not fail ticket creation
    }
  }

  /**
   * Get all webhook logs from sheet
   * @param {number} limit - Maximum number of rows to retrieve
   */
  async updateNotificationStatus(orderId, { emailSent = null, whatsappSent = null } = {}) {
    try {
      if (!this.spreadsheetId || !orderId) {
        return;
      }

      await this.initialize();
      await this.ensureSheetExists(this.webhookSheetName);
      await this.ensureHeaderColumns(this.webhookSheetName, ['Email Sent', 'WhatsApp Sent']);

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.webhookSheetName}!A:P`,
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex(row => (row[1] || '').toString() === orderId.toString());

      if (rowIndex < 0) {
        logger.warn('No matching Google Sheets row found for notification status update', { orderId });
        return;
      }

      const targetRowNumber = rowIndex + 1;
      const updates = [];

      if (emailSent !== null) {
        updates.push(emailSent ? 'Yes' : 'No');
      }

      if (whatsappSent !== null) {
        updates.push(whatsappSent ? 'Yes' : 'No');
      }

      if (updates.length === 0) {
        return;
      }

      const range = updates.length === 2
        ? `${this.webhookSheetName}!O${targetRowNumber}:P${targetRowNumber}`
        : emailSent !== null
          ? `${this.webhookSheetName}!O${targetRowNumber}:O${targetRowNumber}`
          : `${this.webhookSheetName}!P${targetRowNumber}:P${targetRowNumber}`;

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [updates],
        },
      });

      logger.info('Updated Google Sheet notification status', {
        orderId,
        emailSent,
        whatsappSent,
      });
    } catch (error) {
      logger.error('Error updating Google Sheet notification status', {
        error: error.message,
        orderId,
      });
    }
  }

  async updateTicketScanStatus(orderId, scannedAt = new Date()) {
    try {
      if (!this.spreadsheetId || !orderId) {
        return;
      }

      await this.initialize();
      await this.ensureSheetExists(this.webhookSheetName);
      await this.ensureHeaderColumns(this.webhookSheetName, ['Scanned', 'Scanned At']);

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.webhookSheetName}!A:R`,
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex(row => (row[1] || '').toString() === orderId.toString());

      if (rowIndex < 0) {
        logger.warn('No matching Google Sheets row found for ticket scan update', { orderId });
        return;
      }

      const targetRowNumber = rowIndex + 1;
      const scanValue = 'Yes';
      const scanTimestamp = scannedAt instanceof Date ? scannedAt.toISOString() : scannedAt;

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.webhookSheetName}!Q${targetRowNumber}:R${targetRowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[scanValue, scanTimestamp]],
        },
      });

      logger.info('Updated Google Sheet ticket scan status', {
        orderId,
        scannedAt: scanTimestamp,
      });
    } catch (error) {
      logger.error('Error updating Google Sheet ticket scan status', {
        error: error.message,
        orderId,
      });
    }
  }

  async getWebhookLogs(limit = 100) {
    try {
      await this.initialize();

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.webhookSheetName}!A1:P${limit + 1}`,
      });

      const rows = response.data.values || [];
      const headers = rows[0] || [];
      const data = rows.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });

      return {
        count: data.length,
        headers,
        data,
      };
    } catch (error) {
      logger.error('Error retrieving webhook logs from Google Sheet', {
        error: error.message,
      });
      throw error;
    }
  }
}

export const googleSheetsService = new GoogleSheetsService();
