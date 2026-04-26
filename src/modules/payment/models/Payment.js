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
    orderDetails: {
      itemCount: {
        type: Number,
        required: [true, 'Item count is required'],
        min: [1, 'Item count must be at least 1'],
      },
      items: [
        {
          name: {
            type: String,
            required: true,
          },
          quantity: {
            type: Number,
            required: true,
            min: [1, 'Quantity must be at least 1'],
          },
          unitPrice: {
            type: Number,
            required: true,
            min: [0, 'Unit price must be non-negative'],
          },
          totalPrice: {
            type: Number,
            required: true,
            min: [0, 'Total price must be non-negative'],
          },
        },
      ],
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
// Index for finding payments by item count
paymentSchema.index({ userId: 1, 'orderDetails.itemCount': 1 });
// Note: orderId, cashfreeOrderId, and cashfreePaymentId indices are created automatically
// by the 'unique: true' constraint on those fields

export const Payment = mongoose.model('Payment', paymentSchema);
