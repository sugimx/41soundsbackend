import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    orderId: {
      type: String,
      required: [true, 'Order ID is required'],
      unique: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be greater than 0'],
    },
    currency: {
      type: String,
      default: 'INR',
    },
    description: {
      type: String,
      required: [true, 'Payment description is required'],
    },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'],
      default: 'PENDING',
    },
    paymentMethod: {
      type: String,
      enum: ['UPI', 'CARD', 'NETBANKING', 'WALLET', 'UNKNOWN'],
      default: 'UNKNOWN',
    },
    cashfreeOrderId: {
      type: String,
      unique: true,
      sparse: true,
    },
    paymentSessionId: {
      type: String,
      unique: true,
      sparse: true,
    },
    cashfreePaymentId: {
      type: String,
      unique: true,
      sparse: true,
    },
    transactionId: {
      type: String,
      unique: true,
      sparse: true,
    },
    paymentLink: {
      type: String,
    },
    errorMessage: {
      type: String,
    },
    metadata: {
      type: Object,
      default: {},
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for quick lookup by userId and status
paymentSchema.index({ userId: 1, status: 1 });
// Note: orderId, cashfreeOrderId, and cashfreePaymentId indices are created automatically
// by the 'unique: true' constraint on those fields

export const Payment = mongoose.model('Payment', paymentSchema);
