import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: [true, 'Ticket number is required'],
      unique: true,
      index: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID is required'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: [true, 'Payment ID is required'],
    },
    ticketType: {
      type: String,
      enum: ['Gold', 'Platinum', 'VIP', 'MVIP'],
      required: [true, 'Ticket type is required'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    seatSection: {
      type: String,
      default: null, // e.g., "A", "B", "VIP1"
    },
    seatNumber: {
      type: String,
      default: null, // e.g., "A-101"
    },
    status: {
      type: String,
      enum: ['VALID', 'USED', 'CANCELLED', 'REFUNDED'],
      default: 'VALID',
    },
    usedAt: {
      type: Date,
      default: null,
    },
    usedLocation: {
      type: String, // Where the ticket was scanned
      default: null,
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },
    transferredTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // If ticket was transferred to another user
    },
    transferredAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for finding user's tickets for an event
ticketSchema.index({ userId: 1, eventId: 1 });

// Index for finding valid tickets
ticketSchema.index({ status: 1, expiryDate: 1 });

// Pre-save hook to validate expiry date
ticketSchema.pre('save', async function () {
  if (this.expiryDate <= new Date()) {
    throw new Error('Expiry date must be in the future');
  }
});

// Method to check if ticket is still valid
ticketSchema.methods.isValid = function () {
  return (
    this.status === 'VALID' &&
    this.expiryDate > new Date()
  );
};

// Method to mark ticket as used
ticketSchema.methods.markAsUsed = function (location) {
  if (!this.isValid()) {
    throw new Error('Cannot use invalid or expired ticket');
  }
  this.status = 'USED';
  this.usedAt = new Date();
  this.usedLocation = location || null;
  return this.save();
};

// Method to check if ticket is expired
ticketSchema.methods.isExpired = function () {
  return this.expiryDate <= new Date();
};

// Virtual for days until expiry
ticketSchema.virtual('daysUntilExpiry').get(function () {
  const now = new Date();
  const timeDiff = this.expiryDate - now;
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
});

export const Ticket = mongoose.model('Ticket', ticketSchema);
