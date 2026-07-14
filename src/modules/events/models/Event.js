import mongoose from 'mongoose';

const ticketTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Ticket type name is required'],
    enum: ['Gold', 'Platinum', 'VIP', 'MVIP', 'Standing'],
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
  },
  totalQuantity: {
    type: Number,
    required: [true, 'Total quantity is required'],
    min: [1, 'Total quantity must be at least 1'],
  },
  soldQuantity: {
    type: Number,
    default: 0,
    min: [0, 'Sold quantity cannot be negative'],
  },
  description: {
    type: String,
    default: '',
  },
});

const eventSchema = new mongoose.Schema(
  {
    eventName: {
      type: String,
      required: [true, 'Event name is required'],
      trim: true,
      minlength: [3, 'Event name must be at least 3 characters'],
      maxlength: [200, 'Event name cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
      minlength: [10, 'Description must be at least 10 characters'],
    },
    eventDate: {
      type: Date,
      required: [true, 'Event date is required'],
      validate: {
        validator: function (value) {
          return value > new Date();
        },
        message: 'Event date must be in the future',
      },
    },
    eventTime: {
      type: String, // HH:MM format (e.g., "19:30")
      required: [true, 'Event time is required'],
      match: [/^\d{2}:\d{2}$/, 'Event time must be in HH:MM format'],
    },
    venue: {
      name: {
        type: String,
        required: [true, 'Venue name is required'],
      },
      address: {
        type: String,
        required: [true, 'Venue address is required'],
      },
      city: {
        type: String,
        required: [true, 'City is required'],
      },
      state: {
        type: String,
        required: [true, 'State is required'],
      },
      zipCode: {
        type: String,
        required: [true, 'Zip code is required'],
      },
      capacity: {
        type: Number,
        required: [true, 'Venue capacity is required'],
        min: [1, 'Capacity must be at least 1'],
      },
    },
    ticketTypes: {
      type: [ticketTypeSchema],
      required: [true, 'At least one ticket type is required'],
      validate: {
        validator: function (value) {
          return value.length > 0;
        },
        message: 'At least one ticket type must be provided',
      },
    },
    organizer: {
      name: {
        type: String,
        required: [true, 'Organizer name is required'],
      },
      email: {
        type: String,
        required: [true, 'Organizer email is required'],
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format'],
      },
      phone: {
        type: String,
        required: [true, 'Organizer phone is required'],
      },
    },
    image: {
      type: String, // URL to event image
      default: null,
    },
    isPublished: {
      type: Boolean,
      default: false, // Events are draft until published
    },
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'CANCELLED', 'COMPLETED'],
      default: 'DRAFT',
    },
    cancellationReason: {
      type: String,
      default: null,
    },
    cancellationDate: {
      type: Date,
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

// Index for faster queries
eventSchema.index({ eventDate: 1, status: 1 });
eventSchema.index({ isPublished: 1, status: 1 });

// Virtual for available tickets
eventSchema.virtual('totalAvailableTickets').get(function () {
  if (!this.ticketTypes || this.ticketTypes.length === 0) return 0;
  return this.ticketTypes.reduce((total, type) => {
    return total + (type.totalQuantity - type.soldQuantity);
  }, 0);
});

// Virtual for total sold tickets
eventSchema.virtual('totalSoldTickets').get(function () {
  if (!this.ticketTypes || this.ticketTypes.length === 0) return 0;
  return this.ticketTypes.reduce((total, type) => {
    return total + type.soldQuantity;
  }, 0);
});

// Virtual for occupancy percentage
eventSchema.virtual('occupancyPercentage').get(function () {
  const totalCapacity = this.ticketTypes.reduce((total, type) => {
    return total + type.totalQuantity;
  }, 0);
  if (totalCapacity === 0) return 0;
  return Math.round((this.totalSoldTickets / totalCapacity) * 100);
});

export const Event = mongoose.model('Event', eventSchema);
