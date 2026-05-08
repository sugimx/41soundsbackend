import { SupportTicket } from '../models/SupportTicket.js';

export class SupportController {
  /**
   * Create a new support ticket
   * POST /api/support
   */
  async createTicket(req, res) {
    try {
      const { name, email, subject, message, category, attachments } = req.body;

      // Validate required fields
      if (!name || !email || !subject || !message) {
        return res.status(400).json({
          success: false,
          message: 'Name, email, subject, and message are required',
        });
      }

      // Create new support ticket
      const ticket = new SupportTicket({
        name,
        email,
        subject,
        message,
        category: category || 'other',
        attachments: attachments || [],
        status: 'open',
        priority: 'medium',
      });

      await ticket.save();

      return res.status(201).json({
        success: true,
        message: 'Support ticket created successfully',
        data: ticket,
      });
    } catch (error) {
      console.error('Error creating support ticket:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create support ticket',
        error: error.message,
      });
    }
  }

  /**
   * Get support ticket by ID
   * GET /api/support/:id
   */
  async getTicket(req, res) {
    try {
      const ticket = await SupportTicket.findById(req.params.id).populate(
        'responses.respondedBy',
        'email fullName'
      );

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Support ticket not found',
        });
      }

      return res.json({
        success: true,
        data: ticket,
      });
    } catch (error) {
      console.error('Error fetching support ticket:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch support ticket',
        error: error.message,
      });
    }
  }

  /**
   * Add response to support ticket
   * POST /api/support/:id/respond
   */
  async respondToTicket(req, res) {
    try {
      const { message, attachments } = req.body;

      if (!message) {
        return res.status(400).json({
          success: false,
          message: 'Response message is required',
        });
      }

      const ticket = await SupportTicket.findByIdAndUpdate(
        req.params.id,
        {
          $push: {
            responses: {
              respondedBy: req.userId,
              message,
              attachments: attachments || [],
            },
          },
          status: 'in-progress',
        },
        { returnDocument: 'after' }
      ).populate('responses.respondedBy', 'email fullName');

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Support ticket not found',
        });
      }

      return res.json({
        success: true,
        message: 'Response added successfully',
        data: ticket,
      });
    } catch (error) {
      console.error('Error responding to support ticket:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to add response',
        error: error.message,
      });
    }
  }
}

export const supportController = new SupportController();
