import { userService } from '../services/UserService.js';
import { generateToken, decodeToken } from '../../../core/jwt/jwtHelper.js';
import { tokenBlacklist } from '../../../core/jwt/tokenBlacklist.js';
import {
  validateEmail,
  validatePasswordStrength,
  validateMobile,
  validateFullName,
} from '../../../core/validators/inputValidator.js';

export class UserController {
  /**
   * Handle user registration
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async register(req, res) {
    try {
      const { email, password, fullName, mobile, gender, dateOfBirth, profileImage } = req.body;

      // Validate required fields
      if (!email || !password || !fullName || !mobile || !gender || !dateOfBirth) {
        return res.status(400).json({
          success: false,
          message: 'Email, password, full name, mobile, gender, and date of birth are required',
        });
      }

      // Validate email format
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: emailValidation.message,
        });
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: passwordValidation.message,
        });
      }

      // Validate full name
      const nameValidation = validateFullName(fullName);
      if (!nameValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: nameValidation.message,
        });
      }

      // Validate mobile number
      const mobileValidation = validateMobile(mobile);
      if (!mobileValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: mobileValidation.message,
        });
      }

      // Validate gender enum
      const validGenders = ['Male', 'Female', 'Other', 'Prefer not to say'];
      if (!validGenders.includes(gender)) {
        return res.status(400).json({
          success: false,
          message: `Gender must be one of: ${validGenders.join(', ')}`,
        });
      }

      // Validate date of birth format
      const dob = new Date(dateOfBirth);
      if (isNaN(dob.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date of birth format. Use ISO 8601 format (YYYY-MM-DD)',
        });
      }

      // Check if user is at least 18 years old
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        if (age < 18) {
          return res.status(400).json({
            success: false,
            message: 'User must be at least 18 years old',
          });
        }
      }

      const user = await userService.register(email, password, fullName, mobile, gender, dob, profileImage);
      const { token, expiresAt } = generateToken(user._id);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: user,
        token,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Handle user login
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
      }

      const user = await userService.login(email, password);
      const { token, expiresAt } = generateToken(user._id);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: user,
        token,
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Handle user logout
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async logout(req, res) {
    try {
      const token = req.token;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'No token provided',
        });
      }

      // Decode token to get expiration time
      const decoded = decodeToken(token);
      const expiresAt = decoded.exp * 1000; // Convert to milliseconds

      // Add token to blacklist
      tokenBlacklist.add(token, expiresAt);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Handle change password
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async changePassword(req, res) {
    try {
      const userId = req.userId;
      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      // Validate required fields
      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password, new password, and confirm password are required',
        });
      }

      // Validate passwords match
      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'New password and confirm password do not match',
        });
      }

      // Validate new password is different from current
      if (currentPassword === newPassword) {
        return res.status(400).json({
          success: false,
          message: 'New password must be different from current password',
        });
      }

      // Validate new password strength
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: passwordValidation.message,
        });
      }

      // Change password
      const result = await userService.changePassword(userId, currentPassword, newPassword);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      // Check if it's an authentication error
      if (error.message === 'Current password is incorrect') {
        return res.status(401).json({
          success: false,
          message: error.message,
        });
      }

      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Update user profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateProfile(req, res) {
    try {
      const userId = req.userId;
      const { fullName, mobile, gender, profileImage } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      // At least one field must be provided
      if (!fullName && !mobile && !gender && !profileImage) {
        return res.status(400).json({
          success: false,
          message: 'At least one field must be provided to update',
        });
      }

      // Validate full name if provided
      if (fullName) {
        const nameValidation = validateFullName(fullName);
        if (!nameValidation.isValid) {
          return res.status(400).json({
            success: false,
            message: nameValidation.message,
          });
        }
      }

      // Validate mobile number if provided
      if (mobile) {
        const mobileValidation = validateMobile(mobile);
        if (!mobileValidation.isValid) {
          return res.status(400).json({
            success: false,
            message: mobileValidation.message,
          });
        }
      }

      // Validate gender if provided
      if (gender) {
        const validGenders = ['Male', 'Female', 'Other', 'Prefer not to say'];
        if (!validGenders.includes(gender)) {
          return res.status(400).json({
            success: false,
            message: `Gender must be one of: ${validGenders.join(', ')}`,
          });
        }
      }

      const updateData = {};
      if (fullName) updateData.fullName = fullName;
      if (mobile) updateData.mobile = mobile;
      if (gender) updateData.gender = gender;
      if (profileImage) updateData.profileImage = profileImage;

      const user = await userService.updateProfile(userId, updateData);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: user,
      });
    } catch (error) {
      if (error.message.includes('validation failed')) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get current user profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getProfile(req, res) {
    try {
      // This would typically be used after authentication middleware
      const userId = req.userId; // Assuming auth middleware sets this

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const user = await userService.getUserById(userId);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Handle forgot password request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
        });
      }

      // Validate email format
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: emailValidation.message,
        });
      }

      const result = await userService.forgotPassword(email);

      res.status(200).json({
        success: true,
        message: 'Password reset token generated. Check your email for reset link.',
        // In development, return token for testing. Remove in production!
        ...(process.env.NODE_ENV === 'development' && { resetToken: result.resetToken }),
      });
    } catch (error) {
      // Don't reveal if email exists for security
      res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    }
  }

  /**
   * Handle password reset
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async resetPassword(req, res) {
    try {
      const { token, newPassword, confirmPassword } = req.body;

      if (!token || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Token, new password, and confirm password are required',
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Passwords do not match',
        });
      }

      // Validate new password strength
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: passwordValidation.message,
        });
      }

      const result = await userService.resetPassword(token, newPassword);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get user profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getProfile(req, res) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const user = await userService.getUserById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      res.status(200).json({
        success: true,
        data: {
          _id: user._id,
          email: user.email,
          fullName: user.fullName,
          mobile: user.mobile,
          gender: user.gender,
          dateOfBirth: user.dateOfBirth,
          profileImage: user.profileImage,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export const userController = new UserController();
