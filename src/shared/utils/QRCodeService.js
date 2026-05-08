import QRCode from 'qrcode';
import { logger } from '../logger/logger.js';

export class QRCodeService {
  /**
   * Generate QR code as data URL (image embedded in string)
   * @param {string} data - Data to encode in QR code
   * @param {Object} options - QRCode options
   * @returns {Promise<string>} QR code as data URL
   */
  async generateQRCodeDataURL(data, options = {}) {
    try {
      const defaultOptions = {
        errorCorrectionLevel: 'H', // High error correction
        type: 'image/png',
        width: 300,
        margin: 1,
        color: {
          dark: '#000000', // Black
          light: '#FFFFFF', // White
        },
      };

      const mergedOptions = { ...defaultOptions, ...options };

      const qrCodeDataURL = await QRCode.toDataURL(data, mergedOptions);
      logger.debug('QR code generated successfully');
      return qrCodeDataURL;
    } catch (error) {
      logger.error('Error generating QR code data URL', { error: error.message });
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  /**
   * Generate QR code as PNG buffer
   * @param {string} data - Data to encode in QR code
   * @param {Object} options - QRCode options
   * @returns {Promise<Buffer>} QR code as PNG buffer
   */
  async generateQRCodeBuffer(data, options = {}) {
    try {
      const defaultOptions = {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      };

      const mergedOptions = { ...defaultOptions, ...options };

      const qrCodeBuffer = await QRCode.toBuffer(data, mergedOptions);
      logger.debug('QR code buffer generated successfully');
      return qrCodeBuffer;
    } catch (error) {
      logger.error('Error generating QR code buffer', { error: error.message });
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  /**
   * Generate QR code as SVG string
   * @param {string} data - Data to encode in QR code
   * @param {Object} options - QRCode options
   * @returns {Promise<string>} QR code as SVG string
   */
  async generateQRCodeSVG(data, options = {}) {
    try {
      const defaultOptions = {
        errorCorrectionLevel: 'H',
        type: 'svg',
        width: 300,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      };

      // Remove unsupported options for toString
      const toStringOptions = {
        errorCorrectionLevel: defaultOptions.errorCorrectionLevel,
        type: 'svg',
        width: defaultOptions.width,
      };

      const qrCodeSVG = await QRCode.toString(data, toStringOptions);
      logger.debug('QR code SVG generated successfully');
      return qrCodeSVG;
    } catch (error) {
      logger.error('Error generating QR code SVG', { error: error.message });
      // Fallback: Return data URL as SVG fallback
      const dataURL = await this.generateQRCodeDataURL(data, options);
      return dataURL;
    }
  }

  /**
   * Generate QR code for ticket verification
   * Encodes ticket number and QR code value
   * @param {Object} ticket - Ticket document
   * @returns {Promise<Object>} QR code data and image
   */
  async generateTicketQRCode(ticket) {
    try {
      // Create data to encode: ticket number and QR code value
      const qrData = JSON.stringify({
        ticketNumber: ticket.ticketNumber,
        qrValue: ticket.qrCode.value,
        eventId: ticket.eventId.toString(),
        ticketType: ticket.ticketType,
        validUntil: ticket.expiryDate.toISOString(),
      });

      // Generate QR code as data URL
      const dataURL = await this.generateQRCodeDataURL(qrData);

      logger.info('Ticket QR code generated', {
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
      });

      return {
        data: qrData,
        image: dataURL,
        format: 'dataURL',
      };
    } catch (error) {
      logger.error('Error generating ticket QR code', {
        error: error.message,
        ticketId: ticket._id,
      });
      throw error;
    }
  }

  /**
   * Generate simple QR code for verification endpoint
   * @param {string} ticketId - Ticket ID
   * @param {string} qrCodeValue - QR code value
   * @returns {Promise<Object>} QR code data
   */
  async generateVerificationQRCode(ticketId, qrCodeValue) {
    try {
      // Create verification URL/data
      const verificationData = {
        ticketId,
        qrValue: qrCodeValue,
        generatedAt: new Date().toISOString(),
      };

      const qrData = JSON.stringify(verificationData);
      const dataURL = await this.generateQRCodeDataURL(qrData);

      return {
        data: qrData,
        image: dataURL,
      };
    } catch (error) {
      logger.error('Error generating verification QR code', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate and decode QR code data
   * @param {string} qrData - QR code data (usually JSON)
   * @returns {Object} Decoded QR code data
   */
  validateAndDecodeQRData(qrData) {
    try {
      const decoded = JSON.parse(qrData);

      // Validate required fields
      if (!decoded.ticketNumber || !decoded.qrValue) {
        throw new Error('Invalid QR code data: missing required fields');
      }

      return decoded;
    } catch (error) {
      logger.error('Error decoding QR data', { error: error.message });
      throw new Error(`Invalid QR code: ${error.message}`);
    }
  }

  /**
   * Generate batch QR codes for multiple tickets
   * @param {Array} tickets - Array of ticket documents
   * @returns {Promise<Array>} Array of QR code data
   */
  async generateBatchQRCodes(tickets) {
    try {
      const qrCodes = [];

      for (const ticket of tickets) {
        const qrCode = await this.generateTicketQRCode(ticket);
        qrCodes.push({
          ticketId: ticket._id,
          ticketNumber: ticket.ticketNumber,
          qrCode,
        });
      }

      logger.info('Batch QR codes generated', { count: qrCodes.length });
      return qrCodes;
    } catch (error) {
      logger.error('Error generating batch QR codes', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate QR code with custom configuration
   * Useful for creating branded QR codes
   * @param {string} data - Data to encode
   * @param {Object} config - Custom QR code configuration
   * @returns {Promise<string>} QR code as data URL
   */
  async generateCustomQRCode(data, config = {}) {
    try {
      const defaultConfig = {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: config.width || 300,
        margin: config.margin || 1,
        color: {
          dark: config.darkColor || '#000000',
          light: config.lightColor || '#FFFFFF',
        },
      };

      const qrCodeDataURL = await QRCode.toDataURL(data, defaultConfig);
      return qrCodeDataURL;
    } catch (error) {
      logger.error('Error generating custom QR code', { error: error.message });
      throw error;
    }
  }
}

export const qrCodeService = new QRCodeService();
