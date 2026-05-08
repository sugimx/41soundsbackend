import express from 'express';
import { userController } from '../controllers/UserController.js';
import { authenticate } from '../../../core/middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register a new user
 *     description: |
 *       Register a new user account with email and password.
 *       
 *       **Password Requirements (Strong):**
 *       - Minimum 8 characters
 *       - At least one uppercase letter (A-Z)
 *       - At least one lowercase letter (a-z)
 *       - At least one number (0-9)
 *       - At least one special character (!@#$%^&*)
 *       
 *       **Email Format:** Valid email address
 *       
 *       **Full Name:** 2-100 characters, letters/spaces/hyphens/apostrophes only
 *       
 *       **Mobile:** 10-20 digits, can include +, -, spaces, ()
 *       
 *       **Age:** Must be 18 years or older
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - fullName
 *               - mobile
 *               - gender
 *               - dateOfBirth
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecurePass123!
 *                 description: Strong password (8+ characters, mixed case, number, special char)
 *               fullName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: John Doe
 *               mobile:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 20
 *                 example: "+1-234-567-8900"
 *               gender:
 *                 type: string
 *                 enum: [Male, Female, Other, "Prefer not to say"]
 *                 example: Male
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: "1990-01-15"
 *               profileImage:
 *                 type: string
 *                 description: URL to profile image (optional)
 *                 example: "https://example.com/image.jpg"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                   description: JWT authentication token
 *       400:
 *         description: Bad request - Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', (req, res) => userController.register(req, res));

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: User login with email and password
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecurePass123!
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                   description: JWT authentication token
 *       400:
 *         description: Bad request - Missing email or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', (req, res) => userController.login(req, res));

/**
 * @swagger
 * /api/users/logout:
 *   post:
 *     summary: User logout (revokes token)
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 *       401:
 *         description: Unauthorized - User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/logout', authenticate, (req, res) => userController.logout(req, res));

/**
 * @swagger
 * /api/users/change-password:
 *   post:
 *     summary: Change user password (requires authentication)
 *     description: Securely change user password. Current password must be verified.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 description: Current password for verification
 *                 example: OldPass123!
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: New password (must be strong - 8+ chars, uppercase, lowercase, number, special char)
 *                 example: NewPass456!
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 description: Confirm new password (must match newPassword)
 *                 example: NewPass456!
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Password changed successfully
 *       400:
 *         description: Bad request - Invalid input or validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "New password and confirm password do not match"
 *       401:
 *         description: Unauthorized - Invalid current password or user not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/change-password', authenticate, (req, res) => userController.changePassword(req, res));

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get user profile (requires authentication)
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Not found - User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   put:
 *     summary: Update user profile (requires authentication)
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: Jane Doe
 *               mobile:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 20
 *                 example: "+1-987-654-3210"
 *               gender:
 *                 type: string
 *                 enum: [Male, Female, Other, "Prefer not to say"]
 *                 example: Female
 *               profileImage:
 *                 type: string
 *                 description: URL to profile image
 *                 example: "https://example.com/new-image.jpg"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Profile updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request - Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/profile', authenticate, (req, res) => userController.getProfile(req, res));
router.put('/profile', authenticate, (req, res) => userController.updateProfile(req, res));

/**
 * @swagger
 * /api/users/forgot-password:
 *   post:
 *     summary: Request password reset
 *     description: Send password reset token to user's email address
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Password reset token sent to email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Password reset token sent to your email
 *       400:
 *         description: Bad request - Invalid email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/forgot-password', (req, res) => userController.forgotPassword(req, res));

/**
 * @swagger
 * /api/users/reset-password:
 *   post:
 *     summary: Reset password using token
 *     description: Reset user password using the token sent to their email
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: Password reset token from email
 *                 example: "a1b2c3d4e5f6..."
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: New password (must be strong - 8+ chars, uppercase, lowercase, number, special char)
 *                 example: NewPass123!
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 description: Confirm new password (must match newPassword)
 *                 example: NewPass123!
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Password reset successfully
 *       400:
 *         description: Bad request - Invalid token or weak password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/reset-password', (req, res) => userController.resetPassword(req, res));

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get authenticated user profile
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439011"
 *                     email:
 *                       type: string
 *                       example: "user@example.com"
 *                     fullName:
 *                       type: string
 *                       example: "John Doe"
 *                     mobile:
 *                       type: string
 *                       example: "+1-234-567-8900"
 *                     gender:
 *                       type: string
 *                       example: "Male"
 *                     dateOfBirth:
 *                       type: string
 *                       format: date
 *                       example: "1990-01-15"
 *                     profileImage:
 *                       type: string
 *                       example: "https://example.com/image.jpg"
 *                     role:
 *                       type: string
 *                       enum: ["user", "admin", "super_admin"]
 *                       example: "user"
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized - User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Not found - User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/profile', authenticate, (req, res) => userController.getProfile(req, res));

export default router;
