import { google } from 'googleapis';
import { logger } from '../logger/logger.js';

class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
    this.webhookSheetName = process.env.GOOGLE_SHEETS_WEBHOOK_SHEET || 'Webhooks';
    this.isInitialized = false;
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
  async ensureSheetExists() {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheets = response.data.sheets || [];
      const sheetExists = sheets.some(sheet => sheet.properties.title === this.webhookSheetName);

      if (!sheetExists) {
        logger.info(`Sheet '${this.webhookSheetName}' does not exist, creating it...`);
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: this.webhookSheetName,
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
        await this.addHeaderRow();
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
  async addHeaderRow() {
    try {
      const headers = [
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
      ];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.webhookSheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers],
        },
      });

      logger.info('Header row added to Google Sheet');
    } catch (error) {
      logger.error('Error adding header row', {
        error: error.message,
      });
      throw error;
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
        logger.warn('GOOGLE_SHEETS_SPREADSHEET_ID not configured, skipping webhook logging');
        return;
      }

      await this.initialize();
      await this.ensureSheetExists();

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
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${this.webhookSheetName}!A:P`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: rowData,
        },
      });

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
   * @param {number} ticketsCreatedCount - Number of tickets created by admin
   */
  async logAdminTicketCreation(payment, user, ticketsCreatedCount = 0) {
    try {
      if (!this.spreadsheetId) {
        logger.warn('GOOGLE_SHEETS_SPREADSHEET_ID not configured, skipping admin ticket logging');
        return;
      }

      await this.initialize();
      await this.ensureSheetExists();

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
          user?.email || 'N/A',
          user?.mobile || 'N/A',
          ticketsCreatedCount.toString(),
          payment?.notificationStatus?.email?.sent ? 'Yes' : 'No',
          payment?.notificationStatus?.whatsapp?.sent ? 'Yes' : 'No',
        ],
      ];

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${this.webhookSheetName}!A:P`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: rowData,
        },
      });

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
