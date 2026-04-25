# 41Sounds Backend

A comprehensive Express.js backend API for the 41Sounds concert platform with user management, authentication, and payment processing capabilities.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Running the Server](#running-the-server)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Payment Integration](#payment-integration)
- [Database](#database)
- [Error Handling](#error-handling)

## Features

- 🔐 JWT-based authentication with token blacklisting
- 👤 User registration and profile management
- 💳 Payment processing with Cashfree integration
- 📚 Auto-generated API documentation with Swagger
- 🗄️ MongoDB integration with Mongoose
- 🔒 Bcrypt password hashing
- 📝 Input validation
- 🏥 Health check endpoint

## Tech Stack

- **Framework:** Express.js 5.2.1
- **Database:** MongoDB with Mongoose 9.3.1
- **Authentication:** JWT (jsonwebtoken 9.0.0)
- **Password Security:** Bcryptjs 2.4.3
- **Payment Gateway:** Cashfree 3.0.0
- **API Documentation:** Swagger/OpenAPI
- **HTTP Client:** Axios 1.13.6
- **Environment:** Node.js with dotenv 17.3.1

## Prerequisites

- Node.js v16 or higher
- npm or yarn
- MongoDB Atlas account (or local MongoDB)
- Cashfree account (for payment processing)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create `.env` file** in the root directory (see [Environment Configuration](#environment-configuration))

## Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=7d

# Cashfree Payment Gateway
CASHFREE_APP_ID=your_cashfree_app_id
CASHFREE_APP_SECRET=your_cashfree_app_secret
CASHFREE_API_KEY=your_cashfree_api_key

# Optional
LOG_LEVEL=info
```

### Environment Variables Details

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development`, `production` |
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/dbname` |
| `JWT_SECRET` | Secret key for JWT signing | `your-secret-key` |
| `JWT_EXPIRE` | Token expiration time | `7d`, `24h`, `1w` |
| `CASHFREE_*` | Cashfree payment credentials | From Cashfree dashboard |

## Running the Server

### Development Mode
```bash
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT)

### Check Server Health
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-04-25T10:30:00.000Z"
}
```

## API Documentation

### Swagger/OpenAPI UI

Once the server is running, access the interactive API documentation at:

```
http://localhost:3000/api-docs
```

The Swagger UI provides:
- Complete endpoint documentation
- Request/response schemas
- Test endpoints directly from the browser
- Authentication token persistence option

## Project Structure

```
Backend/
├── src/
│   ├── index.js                    # Main entry point
│   ├── core/
│   │   ├── bootstrap/              # Server initialization
│   │   ├── di/                     # Dependency injection
│   │   ├── events/                 # Event handlers
│   │   ├── jwt/                    # JWT utilities
│   │   │   ├── jwtHelper.js
│   │   │   └── tokenBlacklist.js
│   │   ├── middlewares/
│   │   │   └── authMiddleware.js   # Authentication middleware
│   │   ├── module-registry/        # Module registration
│   │   ├── swagger/
│   │   │   └── swaggerConfig.js
│   │   └── validators/
│   │       └── inputValidator.js
│   ├── modules/
│   │   ├── user/                   # User management module
│   │   │   ├── controllers/
│   │   │   ├── models/
│   │   │   ├── routes/
│   │   │   └── services/
│   │   └── payment/                # Payment module
│   │       ├── controllers/
│   │       ├── models/
│   │       ├── routes/
│   │       └── services/
│   └── shared/
│       ├── database/
│       │   └── mongo.js            # MongoDB connection
│       └── logger/
│           └── logger.js
├── tests/                          # Test files
│   ├── unit/
│   ├── integration/
│   └── database/
├── package.json
├── index.js                        # Legacy entry point (use src/index.js)
└── README.md
```

## Authentication

### JWT Token Flow

1. **Register/Login:** Send credentials to get a JWT token
2. **Store Token:** Keep token in localStorage or state management
3. **Include Token:** Add to Authorization header for protected routes
4. **Token Refresh:** Tokens expire after the configured duration (default: 7 days)

### Using Authorization Header

All protected endpoints require the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Example with cURL:
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
     http://localhost:3000/api/users/profile
```

### Token Blacklist

Logout removes the token from the blacklist. Attempting to use a blacklisted token will return a 401 Unauthorized error.

## API Endpoints

### Health Check
```
GET /health
```
Returns server status

### User Endpoints
```
POST   /api/users/register       # Register new user
POST   /api/users/login          # Login user
GET    /api/users/profile        # Get user profile (protected)
PUT    /api/users/profile        # Update user profile (protected)
POST   /api/users/logout         # Logout user (protected)
```

### Payment Endpoints
```
POST   /api/payments/create      # Create payment order
GET    /api/payments/:id         # Get payment details
PUT    /api/payments/:id/verify  # Verify payment (protected)
GET    /api/payments/history     # Get payment history (protected)
```

**Note:** Refer to Swagger UI (`/api-docs`) for complete endpoint documentation with request/response schemas.

## Frontend Integration

### Base URL Configuration

Frontend should use:
```javascript
const API_BASE_URL = 'http://localhost:3000';
```

For production:
```javascript
const API_BASE_URL = 'https://api.41sounds.com';
```

### Example: User Registration

```javascript
const registerUser = async (userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) throw new Error('Registration failed');
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Example: Protected Route with Token

```javascript
const getProfile = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) throw new Error('Failed to fetch profile');
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
  }
};
```

## Payment Integration

### Cashfree Payment Flow

1. **Create Order:** Frontend sends payment details to backend
2. **Generate Payment Link:** Backend creates Cashfree order
3. **Redirect to Payment:** Frontend redirects user to Cashfree payment gateway
4. **Verify Payment:** Backend verifies payment after completion

### Example Payment Request

```javascript
const createPayment = async (token, paymentData) => {
  const response = await fetch(`${API_BASE_URL}/api/payments/create`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(paymentData),
  });
  return await response.json();
};
```

## Database

### MongoDB Setup

1. Create a MongoDB Atlas cluster at https://www.mongodb.com/cloud/atlas
2. Create a database user with a strong password
3. Get your connection string
4. Add to `.env`:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
   ```

### Collections

- **users:** User accounts and profiles
- **payments:** Payment transaction records
- **tokens_blacklist:** Blacklisted JWT tokens for logout

## Error Handling

The API returns consistent error responses:

### Success Response (200-201)
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response (4xx-5xx)
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": { ... }
}
```

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 422 | Unprocessable Entity - Validation error |
| 500 | Server Error - Internal server error |

## CORS Configuration

If running frontend and backend on different domains, ensure CORS is properly configured in production. By default, the backend accepts requests from `http://localhost:3000` in development.

## Troubleshooting

### MongoDB Connection Fails
- Check `.env` file has correct `MONGODB_URI`
- Verify IP is whitelisted in MongoDB Atlas
- Ensure network access is enabled

### JWT Token Errors
- Verify `JWT_SECRET` is set in `.env`
- Check token hasn't expired
- Ensure Authorization header format is correct: `Bearer <token>`

### Payment Processing Fails
- Verify Cashfree credentials in `.env`
- Check if Cashfree account is in test or production mode
- Ensure webhook URLs are correctly configured

### Port Already in Use
```bash
# Change PORT in .env or use command line
PORT=3001 npm start
```

## Development Tips

1. **Use Swagger UI** for testing endpoints: `http://localhost:3000/api-docs`
2. **Check Health Endpoint** to verify server is running: `GET /health`
3. **Review Logs** for detailed error messages
4. **Use Postman/Insomnia** for complex testing scenarios
5. **Store JWT tokens securely** on frontend (httpOnly cookies recommended)

## Security Recommendations

- ✅ Use strong JWT_SECRET in production (minimum 32 characters)
- ✅ Set `NODE_ENV=production` for production deployment
- ✅ Use HTTPS only in production
- ✅ Enable CORS restrictively (only allow trusted domains)
- ✅ Implement rate limiting for login/registration endpoints
- ✅ Use environment variables for all sensitive data
- ✅ Regularly update dependencies for security patches
- ✅ Implement API request logging and monitoring

## Contributing

To contribute to the 41Sounds backend:

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

ISC License

## Support

For issues or questions:
- Check the Swagger documentation at `/api-docs`
- Review error responses for specific error codes
- Contact the development team

---

**Last Updated:** April 2026

For frontend developers: Copy this README and use it to understand how to connect your frontend application to the 41Sounds backend API.
