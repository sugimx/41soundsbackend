import swaggerJsdoc from 'swagger-jsdoc';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../../..');

const apiFiles = [
  path.join(projectRoot, 'src/index.js'),
  path.join(projectRoot, 'src/modules/user/routes/userRoutes.js'),
  path.join(projectRoot, 'src/modules/payment/routes/paymentRoutes.js'),
  path.join(projectRoot, 'src/modules/tickets/routes/ticketRoutes.js'),
  path.join(projectRoot, 'src/modules/oauth/routes/oauthRoutes.js'),
  path.join(projectRoot, 'src/modules/support/routes/supportRoutes.js'),
  path.join(projectRoot, 'src/modules/admin/routes/adminRoutes.js'),
];

console.log('[SWAGGER] Scanning files:', apiFiles);

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '41 Sounds API',
      version: '1.0.0',
      description: 'API documentation for 41 Sounds backend with user authentication',
      contact: {
        name: '41 Sounds Team',
        email: 'support@41sounds.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User ID',
            },
            email: {
              type: 'string',
              description: 'User email address',
            },
            fullName: {
              type: 'string',
              description: 'User full name',
            },
            mobile: {
              type: 'string',
              description: 'User mobile number',
            },
            gender: {
              type: 'string',
              enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
              description: 'User gender',
            },
            dateOfBirth: {
              type: 'string',
              format: 'date',
              description: 'User date of birth',
            },
            profileImage: {
              type: 'string',
              description: 'User profile image URL',
            },
            isActive: {
              type: 'boolean',
              description: 'Account status',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation date',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update date',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              description: 'Error message',
            },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              description: 'Validation error message',
              example: 'Password must contain at least 8 characters, one uppercase letter (A-Z), one lowercase letter (a-z), one number (0-9), one special character (!@#$%^&*)',
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
            },
            data: {
              $ref: '#/components/schemas/User',
            },
          },
        },
        Payment: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Payment ID (MongoDB ObjectId)',
            },
            userId: {
              type: 'string',
              description: 'User ID who made the payment',
            },
            orderId: {
              type: 'string',
              description: 'Unique order ID for this payment',
            },
            amount: {
              type: 'number',
              format: 'double',
              description: 'Payment amount in rupees',
              example: 99.99,
            },
            currency: {
              type: 'string',
              description: 'Currency code',
              example: 'INR',
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'],
              description: 'Payment status',
            },
            paymentMethod: {
              type: 'string',
              enum: ['UPI', 'CARD', 'NETBANKING', 'WALLET', 'UNKNOWN'],
              description: 'Payment method used',
            },
            description: {
              type: 'string',
              description: 'Payment description',
            },
            cashfreeOrderId: {
              type: 'string',
              description: 'Cashfree order ID',
              nullable: true,
            },
            cashfreePaymentId: {
              type: 'string',
              description: 'Cashfree payment ID',
              nullable: true,
            },
            transactionId: {
              type: 'string',
              description: 'Transaction ID',
              nullable: true,
            },
            paymentLink: {
              type: 'string',
              format: 'uri',
              description: 'Cashfree hosted payment link',
              nullable: true,
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata',
              properties: {
                email: {
                  type: 'string',
                },
                phone: {
                  type: 'string',
                },
              },
            },
            errorMessage: {
              type: 'string',
              description: 'Error message if payment failed',
              nullable: true,
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Date when payment was completed',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Payment creation date',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update date',
            },
          },
        },
        Ticket: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Ticket ID (MongoDB ObjectId)',
            },
            ticketNumber: {
              type: 'string',
              description: 'Unique ticket number',
              example: 'TKT-1704067200000-5a8c',
            },
            eventId: {
              type: 'string',
              description: 'Reference to Event',
            },
            userId: {
              type: 'string',
              description: 'Reference to User who owns the ticket',
            },
            paymentId: {
              type: 'string',
              description: 'Reference to Payment',
            },
            ticketType: {
              type: 'string',
              enum: ['Gold', 'Platinum', 'VIP', 'MVIP'],
              description: 'Type of ticket',
            },
            price: {
              type: 'number',
              format: 'double',
              description: 'Ticket price',
            },
            status: {
              type: 'string',
              enum: ['VALID', 'USED', 'CANCELLED', 'REFUNDED'],
              description: 'Ticket status',
            },
            seatSection: {
              type: 'string',
              description: 'Seat section',
            },
            seatNumber: {
              type: 'string',
              description: 'Seat number',
            },
            issuedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When ticket was issued',
            },
            expiryDate: {
              type: 'string',
              format: 'date-time',
              description: 'Ticket expiry date',
            },
            usedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When ticket was used',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Ticket creation date',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update date',
            },
          },
        },
        Event: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Event ID (MongoDB ObjectId)',
            },
            eventName: {
              type: 'string',
              description: 'Name of the event',
            },
            eventDate: {
              type: 'string',
              format: 'date',
              description: 'Event date',
            },
            eventTime: {
              type: 'string',
              description: 'Event time',
            },
            venue: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                address: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                zipCode: { type: 'string' },
                capacity: { type: 'number' },
              },
            },
            organizer: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                email: { type: 'string' },
                phone: { type: 'string' },
              },
            },
            ticketTypes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  price: { type: 'number' },
                  totalQuantity: { type: 'number' },
                  soldQuantity: { type: 'number' },
                },
              },
            },
            status: {
              type: 'string',
              enum: ['DRAFT', 'ACTIVE', 'CANCELLED', 'COMPLETED'],
              description: 'Event status',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    tags: [
      {
        name: 'Users',
        description: 'User authentication and profile management',
      },
      {
        name: 'Payments',
        description: 'Payment operations and Cashfree payment gateway integration',
      },
      {
        name: 'Tickets',
        description: 'Ticket management and redemption',
      },
      {
        name: 'OAuth',
        description: 'OAuth authentication with Google and other providers',
      },
      {
        name: 'Support',
        description: 'Support ticket management',
      },
      {
        name: 'Admin Dashboard',
        description: 'Admin dashboard statistics',
      },
      {
        name: 'Admin Tickets',
        description: 'Admin ticket management',
      },
      {
        name: 'Admin Users',
        description: 'Admin user management',
      },
      {
        name: 'Admin Payments',
        description: 'Admin payment management',
      },
      {
        name: 'Admin Support',
        description: 'Admin support ticket management',
      },
      {
        name: 'Admin Analytics',
        description: 'Admin analytics and reporting',
      },
      {
        name: 'Health',
        description: 'Application health check',
      },
    ],
  },
  apis: apiFiles,
};

export const swaggerSpec = swaggerJsdoc(options);

// Log the paths found in swagger spec
console.log('[SWAGGER] Paths found:', Object.keys(swaggerSpec.paths || {}).length, 'paths');
if (swaggerSpec.tags) {
  console.log('[SWAGGER] Tags found:', swaggerSpec.tags.map(t => t.name).join(', '));
}
