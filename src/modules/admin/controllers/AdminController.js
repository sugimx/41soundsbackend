import { User } from '../../user/models/User.js';
import { Ticket } from '../../tickets/models/Ticket.js';
import { Payment } from '../../payment/models/Payment.js';
import { SupportTicket } from '../../support/models/SupportTicket.js';
import { Event } from '../../events/models/Event.js';
import { emailService } from '../../../shared/email/emailService.js';
import { whatsappService } from '../../../shared/whatsapp/whatsappService.js';
import { googleSheetsService } from '../../../shared/googlesheets/googleSheetsService.js';

/**
 * Admin Dashboard Controller
 * Handles all admin dashboard operations: stats, tickets, users, payments, support
 */
export class AdminController {
  /**
   * Get dashboard statistics
   * GET /api/admin/dashboard/stats
   */
  async getDashboardStats(req, res) {
    try {
      // Get total users
      const totalUsers = await User.countDocuments({});

      // Get total tickets sold
      const totalTicketsSold = await Ticket.countDocuments({});

      // Get total revenue
      const revenueData = await Payment.aggregate([
        { $match: { status: 'SUCCESS' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      const totalRevenue = revenueData[0]?.total || 0;

      // Get pending payments
      const pendingPayments = await Payment.countDocuments({ status: 'PENDING' });

      // Get open support tickets
      const openSupportTickets = await SupportTicket.countDocuments({
        status: { $in: ['open', 'in-progress'] },
      });

      // Get tickets by tier
      const ticketsByTier = await Ticket.aggregate([
        { $group: { _id: '$ticketType', count: { $sum: 1 } } },
        { $project: { _id: 0, tier: '$_id', count: 1 } },
      ]);

      // Get revenue by tier
      const revenueByTier = await Ticket.aggregate([
        {
          $match: {
            paymentId: { $exists: true },
          },
        },
        {
          $lookup: {
            from: 'payments',
            localField: 'paymentId',
            foreignField: '_id',
            as: 'paymentInfo',
          },
        },
        {
          $unwind: '$paymentInfo',
        },
        {
          $match: { 'paymentInfo.status': 'SUCCESS' },
        },
        {
          $group: {
            _id: '$ticketType',
            total: { $sum: '$paymentInfo.amount' },
          },
        },
        {
          $project: {
            _id: 0,
            tier: '$_id',
            revenue: '$total',
          },
        },
      ]);

      // Get payment stats
      const paymentStats = await Payment.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      const stats = {
        completed: 0,
        pending: 0,
        failed: 0,
        cancelled: 0,
      };

      paymentStats.forEach((stat) => {
        if (stat._id === 'SUCCESS') stats.completed = stat.count;
        if (stat._id === 'PENDING') stats.pending = stat.count;
        if (stat._id === 'FAILED') stats.failed = stat.count;
        if (stat._id === 'CANCELLED') stats.cancelled = stat.count;
      });

      // Get 7-day revenue trend
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const revenueTrend = await Payment.aggregate([
        {
          $match: {
            status: 'SUCCESS',
            createdAt: { $gte: sevenDaysAgo },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt',
              },
            },
            revenue: { $sum: '$amount' },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      return res.json({
        success: true,
        data: {
          totalUsers,
          totalTicketsSold,
          totalRevenue,
          pendingPayments,
          openSupportTickets,
          ticketsByTier,
          revenueByTier,
          paymentStats: stats,
          revenueTrend,
        },
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard statistics',
        error: error.message,
      });
    }
  }

  /**
   * Get all tickets with pagination and filtering
   * GET /api/admin/tickets
   */
  async getTickets(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const status = req.query.status;
      const tier = req.query.tier;
      const search = req.query.search;

      const skip = (page - 1) * limit;

      let filter = {};

      if (status) filter.status = status;
      if (tier) filter.ticketType = tier;
      if (search) {
        // Search by email or user name
        const user = await User.findOne({
          $or: [
            { email: { $regex: search, $options: 'i' } },
            { fullName: { $regex: search, $options: 'i' } },
          ],
        });
        if (user) filter.userId = user._id;
        else return res.json({ success: true, data: [], total: 0 });
      }

      const tickets = await Ticket.find(filter)
        .populate('userId', 'email fullName')
        .populate('paymentId', 'orderId amount status')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await Ticket.countDocuments(filter);

      // Transform response to match dashboard needs
      const data = tickets.map((ticket) => ({
        _id: ticket._id,
        userId: ticket.userId?._id,
        userEmail: ticket.userId?.email,
        userName: ticket.userId?.fullName,
        ticketTier: ticket.ticketType,
        quantity: 1, // Each ticket is 1
        unitPrice: ticket.price,
        totalPrice: ticket.price,
        status: ticket.status,
        paymentId: ticket.paymentId?._id,
        qrCode: ticket.ticketNumber,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      }));

      return res.json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching tickets:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch tickets',
        error: error.message,
      });
    }
  }

  /**
   * Get ticket by ID
   * GET /api/admin/tickets/:id
   */
  async getTicketById(req, res) {
    try {
      const ticket = await Ticket.findById(req.params.id)
        .populate('userId', 'email fullName mobile')
        .populate('paymentId');

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found',
        });
      }

      return res.json({
        success: true,
        data: ticket,
      });
    } catch (error) {
      console.error('Error fetching ticket:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch ticket',
        error: error.message,
      });
    }
  }

  /**
   * Update ticket status
   * PATCH /api/admin/tickets/:id/status
   */
  async updateTicketStatus(req, res) {
    try {
      const { status } = req.body;

      if (!['VALID', 'USED', 'CANCELLED', 'REFUNDED'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid ticket status',
        });
      }

      const ticket = await Ticket.findByIdAndUpdate(
        req.params.id,
        {
          status,
          ...(status === 'USED' && { usedAt: new Date() }),
          ...(status === 'CANCELLED' && { usedAt: new Date() }),
        },
        { returnDocument: 'after' }
      );

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found',
        });
      }

      return res.json({
        success: true,
        message: 'Ticket status updated',
        data: ticket,
      });
    } catch (error) {
      console.error('Error updating ticket status:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update ticket status',
        error: error.message,
      });
    }
  }

  /**
   * Refund ticket
   * POST /api/admin/tickets/:id/refund
   */
  async refundTicket(req, res) {
    try {
      const { reason } = req.body;

      const ticket = await Ticket.findById(req.params.id);

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found',
        });
      }

      if (ticket.status === 'REFUNDED') {
        return res.status(400).json({
          success: false,
          message: 'Ticket already refunded',
        });
      }

      // Update ticket status
      ticket.status = 'REFUNDED';
      await ticket.save();

      // Update payment status
      const payment = await Payment.findById(ticket.paymentId);
      if (payment) {
        payment.status = 'CANCELLED';
        payment.metadata = {
          ...payment.metadata,
          refundReason: reason,
          refundedAt: new Date(),
        };
        await payment.save();
      }

      return res.json({
        success: true,
        message: 'Ticket refunded successfully',
        refund_id: `REF-${ticket._id}`,
        data: ticket,
      });
    } catch (error) {
      console.error('Error refunding ticket:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to refund ticket',
        error: error.message,
      });
    }
  }

  /**
   * Create ticket (admin endpoint)
   * POST /api/admin/tickets
   */
  async createTicket(req, res) {
    try {
      const { userEmail, userName, mobileNumber, ticketTier, quantity } = req.body;
      const quantityValue = parseInt(quantity, 10);

      // Validate required fields
      if (!userEmail || !userName || !ticketTier || Number.isNaN(quantityValue) || quantityValue < 1) {
        return res.status(400).json({
          success: false,
          message: 'Missing or invalid required fields: userEmail, userName, ticketTier, quantity',
        });
      }

      // Tier price mapping
      const tierPrices = {
        Gold: 800,
        Platinum: 1200,
        VIP: 2000,
        MVIP: 5000,
      };

      if (!tierPrices[ticketTier]) {
        return res.status(400).json({
          success: false,
          message: 'Invalid ticket tier. Must be one of: Gold, Platinum, VIP, MVIP',
        });
      }

      // Tier to ticket type mapping
      const tierToType = {
        Gold: 'Gold',
        Platinum: 'Platinum',
        VIP: 'VIP',
        MVIP: 'MVIP',
      };

      // Find or create user
      let user = await User.findOne({ email: userEmail });
      
      if (!user) {
        user = new User({
          email: userEmail,
          fullName: userName,
          mobile: mobileNumber || null,
          password: null, // Admin-created users can set password later
        });
      } else {
        // Update mobile if provided
        if (mobileNumber) {
          user.mobile = mobileNumber;
        }
      }

      await user.save();

      // Get event ID (using the first event or create default)
      let event = await Event.findOne();
      if (!event) {
        // Create a default event for 41 Sounds
        event = await Event.create({
          name: '41 Sounds Concert',
          date: new Date(),
          description: 'Main 41 Sounds Concert Event',
        });
      }

      // Calculate total price
      const unitPrice = tierPrices[ticketTier];
      const totalPrice = unitPrice * quantityValue;

      // Create payment record
      const orderId = `ADM-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      const payment = new Payment({
        userId: user._id,
        orderId,
        amount: totalPrice,
        status: 'SUCCESS',
        paymentMethod: 'UNKNOWN', // Set to UNKNOWN since admin is creating it
        description: `Admin created ${quantityValue} ${ticketTier} ticket(s)`,
        metadata: {
          createdByAdmin: true,
          ticketTier: ticketTier,
          quantity: quantityValue,
          eventId: event._id,
        },
        orderDetails: {
          itemCount: quantityValue,
          items: [
            {
              name: `${ticketTier} Ticket`,
              quantity: quantityValue,
              unitPrice,
              totalPrice,
            },
          ],
        },
        completedAt: new Date(),
        notificationStatus: {
          email: { sent: false },
          whatsapp: { sent: false },
        },
      });

      await payment.save();

      // Create ticket records
      const createdTickets = [];
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 6); // Tickets valid for 6 months
      
      for (let i = 0; i < quantityValue; i++) {
        const ticket = new Ticket({
          ticketNumber: `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          eventId: event._id,
          userId: user._id,
          paymentId: payment._id,
          ticketType: tierToType[ticketTier],
          price: unitPrice,
          status: 'VALID',
          expiryDate: expiryDate,
          metadata: {
            tier: ticketTier,
            createdByAdmin: true,
          },
        });

        await ticket.save();
        createdTickets.push(ticket);
      }

      payment.ticketIds = createdTickets.map((ticket) => ticket._id);
      await payment.save();

      const paymentDetails = {
        orderId: payment.orderId,
        amount: payment.amount,
        description: payment.description,
        paymentMethod: payment.paymentMethod,
        transactionId: payment.transactionId || '',
        completedAt: payment.completedAt,
      };

      const emailPromise = user.email
        ? emailService.sendPaymentConfirmation(user.email, user.fullName, paymentDetails)
        : Promise.resolve({ success: false, message: 'No email configured for user' });

      const whatsappPromise = user.mobile
        ? whatsappService.sendPaymentConfirmation(user.mobile, user.fullName, paymentDetails)
        : Promise.resolve({ success: false, message: 'No mobile configured for user' });

      const sheetPromise = googleSheetsService.logAdminTicketCreation(
        payment,
        user,
        createdTickets.length
      );

      const [emailResult, whatsappResult, sheetResult] = await Promise.allSettled([
        emailPromise,
        whatsappPromise,
        sheetPromise,
      ]);

      if (sheetResult.status === 'rejected') {
        console.error('Google Sheets notification error:', sheetResult.reason);
      }

      if (!payment.notificationStatus) {
        payment.notificationStatus = { email: {}, whatsapp: {} };
      }

      if (emailResult.status === 'fulfilled' && emailResult.value?.success) {
        payment.notificationStatus.email = {
          sent: true,
          messageId: emailResult.value.messageId || 'sent',
          sentAt: new Date(),
        };
      } else {
        payment.notificationStatus.email = {
          sent: false,
          error: emailResult.status === 'rejected' ? emailResult.reason?.message : emailResult.value?.error || emailResult.value?.message,
          sentAt: new Date(),
        };
        if (emailResult.status === 'rejected') {
          console.error('Email notification error:', emailResult.reason);
        }
      }

      if (whatsappResult.status === 'fulfilled' && whatsappResult.value?.success) {
        payment.notificationStatus.whatsapp = {
          sent: true,
          messageId: whatsappResult.value.messageId || 'sent',
          sentAt: new Date(),
        };
      } else {
        payment.notificationStatus.whatsapp = {
          sent: false,
          error: whatsappResult.status === 'rejected' ? whatsappResult.reason?.message : whatsappResult.value?.error || whatsappResult.value?.message,
          sentAt: new Date(),
        };
        if (whatsappResult.status === 'rejected') {
          console.error('WhatsApp notification error:', whatsappResult.reason);
        }
      }

      await payment.save();

      // Format response
      const responseTickets = createdTickets.map(ticket => ({
        _id: ticket._id,
        userId: ticket.userId,
        userEmail: user.email,
        userName: user.fullName,
        mobileNumber: user.mobile,
        ticketTier: ticketTier,
        quantity: 1,
        unitPrice: unitPrice,
        totalPrice: unitPrice,
        status: ticket.status,
        paymentId: ticket.paymentId,
        qrCode: ticket.ticketNumber,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      }));

      return res.status(201).json({
        success: true,
        message: `${quantityValue} ticket(s) created successfully`,
        data: responseTickets[0], // Return first ticket as example
        summary: {
          ticketsCreated: quantityValue,
          totalAmount: totalPrice,
          orderId: orderId,
          emailNotification: payment.notificationStatus.email,
          whatsappNotification: payment.notificationStatus.whatsapp,
        },
      });
    } catch (error) {
      console.error('Error creating ticket:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create ticket',
        error: error.message,
      });
    }
  }

  /**
   * Get all users with pagination and search
   * GET /api/admin/users
   */
  async getUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search;

      const skip = (page - 1) * limit;

      let filter = {};

      if (search) {
        filter = {
          $or: [
            { email: { $regex: search, $options: 'i' } },
            { fullName: { $regex: search, $options: 'i' } },
          ],
        };
      }

      const users = await User.find(filter)
        .select('-password')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      // Get purchase stats for each user
      const usersWithStats = await Promise.all(
        users.map(async (user) => {
          const tickets = await Ticket.countDocuments({ userId: user._id });
          const payments = await Payment.aggregate([
            { $match: { userId: user._id, status: 'SUCCESS' } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ]);

          return {
            _id: user._id,
            email: user.email,
            fullName: user.fullName,
            mobile: user.mobile,
            gender: user.gender,
            dateOfBirth: user.dateOfBirth,
            isActive: user.isActive,
            totalTicketsPurchased: tickets,
            totalAmountSpent: payments[0]?.total || 0,
            createdAt: user.createdAt,
            lastPurchaseDate: user.updatedAt,
          };
        })
      );

      const total = await User.countDocuments(filter);

      return res.json({
        success: true,
        data: usersWithStats,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
        error: error.message,
      });
    }
  }

  /**
   * Get user by ID
   * GET /api/admin/users/:id
   */
  async getUserById(req, res) {
    try {
      const user = await User.findById(req.params.id).select('-password');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Get user purchase stats
      const tickets = await Ticket.countDocuments({ userId: user._id });
      const payments = await Payment.aggregate([
        { $match: { userId: user._id, status: 'SUCCESS' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);

      return res.json({
        success: true,
        data: {
          ...user.toObject(),
          totalTicketsPurchased: tickets,
          totalAmountSpent: payments[0]?.total || 0,
        },
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch user',
        error: error.message,
      });
    }
  }

  /**
   * Update user status
   * PATCH /api/admin/users/:id/status
   */
  async updateUserStatus(req, res) {
    try {
      const { isActive } = req.body;

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { isActive },
        { returnDocument: 'after' }
      ).select('-password');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      return res.json({
        success: true,
        message: 'User status updated',
        data: user,
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update user status',
        error: error.message,
      });
    }
  }

  /**
   * Get all payments with pagination and filtering
   * GET /api/admin/payments
   */
  async getPayments(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const status = req.query.status;
      const search = req.query.search;

      const skip = (page - 1) * limit;

      let filter = {};

      if (status) filter.status = status;
      if (search) {
        filter = {
          $or: [
            { orderId: { $regex: search, $options: 'i' } },
            { userId: new (require('mongoose')).Types.ObjectId(search) },
          ],
        };
      }

      const payments = await Payment.find(filter)
        .populate('userId', 'email fullName')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await Payment.countDocuments(filter);

      // Transform to match dashboard needs
      const data = payments.map((payment) => ({
        _id: payment._id,
        userId: payment.userId?._id,
        userEmail: payment.userId?.email,
        amount: payment.amount,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        description: payment.description,
        orderId: payment.orderId,
        paymentSessionId: payment.paymentSessionId,
        refundId: null,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      }));

      return res.json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching payments:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch payments',
        error: error.message,
      });
    }
  }

  /**
   * Get payment by ID
   * GET /api/admin/payments/:id
   */
  async getPaymentById(req, res) {
    try {
      const payment = await Payment.findById(req.params.id).populate(
        'userId',
        'email fullName mobile'
      );

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found',
        });
      }

      return res.json({
        success: true,
        data: payment,
      });
    } catch (error) {
      console.error('Error fetching payment:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch payment',
        error: error.message,
      });
    }
  }

  /**
   * Refund payment
   * POST /api/admin/payments/:id/refund
   */
  async refundPayment(req, res) {
    try {
      const { reason } = req.body;

      const payment = await Payment.findById(req.params.id);

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found',
        });
      }

      if (payment.status !== 'SUCCESS') {
        return res.status(400).json({
          success: false,
          message: 'Only successful payments can be refunded',
        });
      }

      // Update payment status
      payment.status = 'CANCELLED';
      payment.metadata = {
        ...payment.metadata,
        refundReason: reason,
        refundedAt: new Date(),
      };
      await payment.save();

      // Also update related tickets
      await Ticket.updateMany(
        { paymentId: payment._id },
        {
          status: 'REFUNDED',
        }
      );

      return res.json({
        success: true,
        message: 'Payment refunded successfully',
        refund_id: `REF-${payment._id}`,
        data: payment,
      });
    } catch (error) {
      console.error('Error refunding payment:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to refund payment',
        error: error.message,
      });
    }
  }

  /**
   * Get all support tickets with pagination
   * GET /api/admin/support
   */
  async getSupportTickets(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const status = req.query.status;
      const priority = req.query.priority;
      const search = req.query.search;

      const skip = (page - 1) * limit;

      let filter = {};

      if (status) filter.status = status;
      if (priority) filter.priority = priority;
      if (search) {
        filter = {
          $or: [
            { email: { $regex: search, $options: 'i' } },
            { name: { $regex: search, $options: 'i' } },
            { subject: { $regex: search, $options: 'i' } },
          ],
        };
      }

      const tickets = await SupportTicket.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await SupportTicket.countDocuments(filter);

      return res.json({
        success: true,
        data: tickets,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch support tickets',
        error: error.message,
      });
    }
  }

  /**
   * Get support ticket by ID
   * GET /api/admin/support/:id
   */
  async getSupportTicketById(req, res) {
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
   * POST /api/admin/support/:id/respond
   */
  async respondToSupportTicket(req, res) {
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
      console.error('Error adding response to ticket:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to add response',
        error: error.message,
      });
    }
  }

  /**
   * Update support ticket status
   * PATCH /api/admin/support/:id/status
   */
  async updateSupportTicketStatus(req, res) {
    try {
      const { status } = req.body;

      if (!['open', 'in-progress', 'resolved', 'closed'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid ticket status',
        });
      }

      const ticket = await SupportTicket.findByIdAndUpdate(
        req.params.id,
        {
          status,
          ...(status === 'resolved' && { resolvedAt: new Date() }),
        },
        { returnDocument: 'after' }
      );

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Support ticket not found',
        });
      }

      return res.json({
        success: true,
        message: 'Support ticket status updated',
        data: ticket,
      });
    } catch (error) {
      console.error('Error updating support ticket status:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update support ticket status',
        error: error.message,
      });
    }
  }

  /**
   * Get analytics data
   * GET /api/admin/analytics
   */
  async getAnalytics(req, res) {
    try {
      const days = parseInt(req.query.days) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Revenue trend
      const revenueTrend = await Payment.aggregate([
        {
          $match: {
            status: 'SUCCESS',
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt',
              },
            },
            revenue: { $sum: '$amount' },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      // User growth
      const userGrowth = await User.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt',
              },
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      // Ticket sales by tier
      const ticketsByTier = await Ticket.aggregate([
        {
          $group: {
            _id: '$ticketType',
            count: { $sum: 1 },
          },
        },
      ]);

      // Payment status distribution
      const paymentStatusDist = await Payment.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      // Calculate metrics
      const totalRevenue = revenueTrend.reduce((sum, day) => sum + day.revenue, 0);
      const avgRevenuePerDay = totalRevenue / (days || 1);
      const totalUsers = await User.countDocuments();
      const totalTickets = await Ticket.countDocuments();
      const avgTicketValue = totalRevenue / (totalTickets || 1);

      return res.json({
        success: true,
        data: {
          avgRevenuePerDay: Math.round(avgRevenuePerDay),
          conversionRate: 85, // Placeholder - calculate based on your logic
          avgTicketValue: Math.round(avgTicketValue),
          customerRetention: 92, // Placeholder - calculate based on your logic
          revenueTrend,
          userGrowth,
          ticketsByTier,
          paymentStatusDist,
          totalRevenue,
          totalUsers,
          totalTickets,
        },
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch analytics',
        error: error.message,
      });
    }
  }

  /**
   * Promote user to admin role
   * PATCH /api/admin/users/:id/promote
   */
  async promoteUserToAdmin(req, res) {
    try {
      const { role } = req.body;

      // Only allow promotion to 'admin' or 'super_admin'
      if (!['admin', 'super_admin'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Must be either "admin" or "super_admin".',
        });
      }

      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Prevent demoting an admin if requester is not super_admin
      const requesterRole = await User.findById(req.userId).select('role');
      if (user.role !== 'user' && requesterRole.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Only super_admin can change existing admin roles',
        });
      }

      // Update user role
      user.role = role;
      await user.save();

      return res.json({
        success: true,
        message: `User promoted to ${role}`,
        data: {
          _id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          previousRole: 'user',
          promotedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error promoting user:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to promote user',
        error: error.message,
      });
    }
  }
}

export const adminController = new AdminController();
