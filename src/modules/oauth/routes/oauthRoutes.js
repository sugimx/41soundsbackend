import { Router } from 'express';
import { OAuthController } from '../controllers/OAuthController.js';

const router = Router();
const oauthController = new OAuthController();

/**
 * @swagger
 * /api/oauth/google:
 *   post:
 *     summary: Google OAuth authentication
 *     description: Verify Google token and authenticate user
 *     tags:
 *       - OAuth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Google ID token
 *     responses:
 *       200:
 *         description: Authentication successful
 *       400:
 *         description: Bad request
 *       500:
 *         description: Google authentication failed
 */
router.post('/google', async (req, res, next) => {
  try {
    await oauthController.googleCallback(req, res);
  } catch (error) {
    console.error('❌ OAuth route error:', error.message || error);
    console.error('Error stack:', error.stack);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Google authentication failed',
    });
  }
});

export default router;
