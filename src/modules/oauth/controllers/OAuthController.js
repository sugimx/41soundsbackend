import { OAuth2Client } from 'google-auth-library';
import { User } from '../../user/models/User.js';
import { generateToken } from '../../../core/jwt/jwtHelper.js';
import { logger } from '../../../shared/logger/logger.js';

const oauth2Client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export class OAuthController {
  /**
   * Verify Google token and create/update user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async googleCallback(req, res) {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        return res.status(400).json({
          success: false,
          message: 'ID token is required',
        });
      }

      // Verify Google credentials are configured
      if (!process.env.GOOGLE_CLIENT_ID) {
        logger.error('Google OAuth error: GOOGLE_CLIENT_ID not configured');
        return res.status(500).json({
          success: false,
          message: 'Google authentication is not properly configured',
        });
      }

      // Verify the ID Token (JWT) using google-auth-library
      let ticket;
      try {
        console.log('🔍 Verifying token with CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
        console.log('🔍 Token received (first 50 chars):', idToken.substring(0, 50) + '...');
        
        ticket = await oauth2Client.verifyIdToken({
          idToken,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        console.log('✅ Token verified successfully');
      } catch (tokenError) {
        console.error('❌ Token verification error:', tokenError);
        logger.error('Google token verification failed:', { 
          error: tokenError.message,
          clientId: process.env.GOOGLE_CLIENT_ID,
        });
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired Google token',
          error: process.env.NODE_ENV === 'development' ? tokenError.message : undefined,
        });
      }

      // Extract user info from the verified token payload
      const payload = ticket.getPayload();
      const { email, name, picture } = payload;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email not provided by Google',
        });
      }

      // Check if user exists
      let user = await User.findOne({ email });

      if (!user) {
        // Create new user from Google data
        user = await User.create({
          email,
          fullName: name || 'Google User',
          profileImage: picture || null,
          // Optional fields (mobile, gender, dateOfBirth) left undefined - users can add later
        });
      } else {
        // Update user profile image if not set
        if (!user.profileImage && picture) {
          user.profileImage = picture;
          await user.save();
        }
      }

      console.log('✅ User:', user);
      // Generate JWT token
      const { token, expiresAt } = generateToken(user._id);

      res.status(200).json({
        success: true,
        message: 'Google login successful',
        token,
        user: {
          _id: user._id,
          email: user.email,
          fullName: user.fullName,
          mobile: user.mobile,
          gender: user.gender,
          dateOfBirth: user.dateOfBirth,
          profileImage: user.profileImage,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      logger.error('Google OAuth error:', { error: error.message });
      res.status(401).json({
        success: false,
        message: error.message || 'Google authentication failed',
      });
    }
  }
}
