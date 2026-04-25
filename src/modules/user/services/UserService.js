import { User } from '../models/User.js';
import crypto from 'crypto';

export class UserService {
  /**
   * Register a new user
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} fullName - User full name
   * @param {string} mobile - User mobile number
   * @param {string} gender - User gender
   * @param {string} dateOfBirth - User date of birth (ISO 8601 format)
   * @param {string} profileImage - User profile image URL (optional)
   * @returns {Promise<Object>} Created user
   */
  async register(email, password, fullName, mobile, gender, dateOfBirth, profileImage = null) {
    const userExists = await User.findOne({ email });

    if (userExists) {
      throw new Error('User already exists with that email');
    }

    const user = await User.create({
      email,
      password,
      fullName,
      mobile,
      gender,
      dateOfBirth,
      profileImage,
    });

    return {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      mobile: user.mobile,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      profileImage: user.profileImage,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  /**
   * Login user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} User data
   */
  async login(email, password) {
    // Validate email and password
    if (!email || !password) {
      throw new Error('Please provide email and password');
    }

    // Check for user (we need the password field too, so select('+password'))
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    if (!user.isActive) {
      throw new Error('User account is inactive');
    }

    return {
      _id: user._id,
      email: user.email,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Success message
   */
  async changePassword(userId, currentPassword, newPassword) {
    // Get user with password field
    const user = await User.findById(userId).select('+password');

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isPasswordMatch = await user.matchPassword(currentPassword);
    if (!isPasswordMatch) {
      throw new Error('Current password is incorrect');
    }

    // Prevent using the same password
    const isSamePassword = await user.matchPassword(newPassword);
    if (isSamePassword) {
      throw new Error('New password must be different from current password');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return {
      message: 'Password changed successfully',
    };
  }

  /**
   * Request password reset - generate token and save to database
   * @param {string} email - User email
   * @returns {Promise<Object>} Reset token
   */
  async forgotPassword(email) {
    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if email exists for security
      throw new Error('User not found');
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Save token to database with 10-minute expiration
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    // Return the unhashed token (to send to user)
    return {
      message: 'Password reset token sent to your email',
      resetToken, // In real app, this would be sent via email
    };
  }

  /**
   * Reset password using token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Success message
   */
  async resetPassword(token, newPassword) {
    // Hash the token to compare with saved token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user by reset token and check if token is still valid
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Update password
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return {
      message: 'Password reset successfully',
    };
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated user
   */
  async updateProfile(userId, updateData) {
    // Fields that can be updated
    const allowedFields = ['fullName', 'mobile', 'gender', 'profileImage'];
    
    // Filter only allowed fields
    const filteredData = {};
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    });

    // Prevent empty updates
    if (Object.keys(filteredData).length === 0) {
      throw new Error('No valid fields provided to update');
    }

    const user = await User.findByIdAndUpdate(userId, filteredData, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User data
   */
  async getUserById(userId) {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Get user by email
   * @param {string} email - User email
   * @returns {Promise<Object>} User data
   */
  async getUserByEmail(email) {
    const user = await User.findOne({ email });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }
}

export const userService = new UserService();
