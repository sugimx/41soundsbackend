import mongoose from 'mongoose';

const supportResponseSchema = new mongoose.Schema(
  {
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: [true, 'Response message is required'],
    },
    attachments: [
      {
        type: String, // URL to attachment
      },
    ],
  },
  {
    timestamps: true,
  }
);

const supportTicketSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'resolved', 'closed'],
      default: 'open',
    },
    category: {
      type: String,
      enum: ['ticket_issue', 'payment_issue', 'technical_issue', 'account_issue', 'other'],
      default: 'other',
    },
    attachments: [
      {
        type: String, // URL to attachment
      },
    ],
    responses: [supportResponseSchema],
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Index for searching
supportTicketSchema.index({ email: 1, status: 1 });
supportTicketSchema.index({ priority: 1, status: 1 });

export const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);
