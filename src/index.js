import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { mongoDatabase } from './shared/database/mongo.js';
import userRoutes from './modules/user/routes/userRoutes.js';
import paymentRoutes from './modules/payment/routes/paymentRoutes.js';
import { swaggerSpec } from './core/swagger/swaggerConfig.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://dev.41sounds.com',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  swaggerOptions: {
    persistAuthorization: true,
  },
}));

/**
 * @swagger
 * /:
 *   get:
 *     summary: Welcome endpoint
 *     tags:
 *       - API Info
 *     responses:
 *       200:
 *         description: Welcome message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Welcome to 41Sounds Backend API
 */

// Welcome route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to 41Sounds Backend API' });
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Server is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Middleware to ensure MongoDB is connected (for API routes)
let mongoConnected = false;

app.use('/api', async (req, res, next) => {
  if (!mongoConnected) {
    try {
      console.log('🔄 Initializing MongoDB connection...');
      await mongoDatabase.connect();
      mongoConnected = true;
      console.log('✅ MongoDB connected via middleware');
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      return res.status(503).json({
        success: false,
        message: 'Database connection failed. Please try again later.',
      });
    }
  }
  next();
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// Connect to database and start server
async function start() {
  try {
    console.log('🚀 Starting application...');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Port:', PORT);
    
    // Connect to MongoDB
    await mongoDatabase.connect();
    mongoConnected = true;
    
    // Only use app.listen in local development
    if (process.env.NODE_ENV !== 'production') {
      const server = app.listen(PORT, () => {
        console.log(`✅ Server running on http://localhost:${PORT}`);
      });

      // Graceful shutdown
      process.on('SIGTERM', async () => {
        console.log('🛑 SIGTERM received, shutting down gracefully...');
        server.close(async () => {
          await mongoDatabase.disconnect();
          process.exit(0);
        });
      });
    } else {
      console.log('✅ Application ready for Vercel');
    }
  } catch (error) {
    console.error('❌ Failed to start application:', error.message);
    console.error('Stack:', error.stack);
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
}

// Start on local, export for Vercel
if (process.env.NODE_ENV !== 'production') {
  start();
}

// Export app for Vercel
export default app;
