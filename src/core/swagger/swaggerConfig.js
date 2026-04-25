import swaggerJsdoc from 'swagger-jsdoc';

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
        name: 'Health',
        description: 'Application health check',
      },
    ],
  },
  apis: ['./src/modules/user/routes/*.js', './src/modules/payment/routes/*.js', './src/index.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
