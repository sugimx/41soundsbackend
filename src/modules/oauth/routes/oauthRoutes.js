import { Router } from 'express';
import { OAuthController } from '../controllers/OAuthController.js';

const router = Router();
const oauthController = new OAuthController();

// POST /api/oauth/google - Verify Google token
router.post('/google', async (req, res, next) => {
  try {
    await oauthController.googleCallback(req, res);
  } catch (error) {
    console.error('❌ OAuth route error:', error);
    next(error);
  }
});

export default router;
