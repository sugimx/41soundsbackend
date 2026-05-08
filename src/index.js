import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { mongoDatabase } from './shared/database/mongo.js';
import { authenticate } from './core/middlewares/authMiddleware.js';
import userRoutes from './modules/user/routes/userRoutes.js';
import paymentRoutes from './modules/payment/routes/paymentRoutes.js';
import oauthRoutes from './modules/oauth/routes/oauthRoutes.js';
import ticketRoutes from './modules/tickets/routes/ticketRoutes.js';
import supportRoutes from './modules/support/routes/supportRoutes.js';
import adminRoutes from './modules/admin/routes/adminRoutes.js';
import { swaggerSpec } from './core/swagger/swaggerConfig.js';

// Log to file for debugging
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logPath = path.join(__dirname, '..', 'server-startup.log');

try {
  fs.writeFileSync(logPath, `[${new Date().toISOString()}] Server starting with admin routes from original adminRoutes.js\n`);
} catch(e) {
  //  ignore
}

// Load .env file from project root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log('[DEBUG] Environment loaded:', {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  CASHFREE_MODE: process.env.CASHFREE_MODE,
});

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

// Serve the raw Swagger JSON spec at root level
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  swaggerOptions: {
    persistAuthorization: true,
    url: '/swagger.json',  // Tell Swagger UI where to fetch the spec
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
  try {
    if (!mongoConnected) {
      await mongoDatabase.connect();
      mongoConnected = true;
      console.log('✅ MongoDB connected via middleware');
    }
    next();
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return res.status(503).json({
      success: false,
      message: 'Database connection failed. Please try again later.',
    });
  }
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/support', supportRoutes);

// 404 handler for undefined routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: `Route not found: ${req.originalUrl}`,
    });
  }
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  res.status(status).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
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
