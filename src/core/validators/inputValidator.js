/**
 * Input Validation Utilities
 */

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {Object} { isValid: boolean, message: string }
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      message: 'Email must be a non-empty string',
    };
  }

  const trimmedEmail = email.trim();

  if (!emailRegex.test(trimmedEmail)) {
    return {
      isValid: false,
      message: 'Please provide a valid email address',
    };
  }

  if (trimmedEmail.length > 255) {
    return {
      isValid: false,
      message: 'Email cannot exceed 255 characters',
    };
  }

  return {
    isValid: true,
    message: 'Email is valid',
  };
};

/**
 * Validate password strength
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character (!@#$%^&*)
 * @param {string} password - Password to validate
 * @returns {Object} { isValid: boolean, message: string, strength: string }
 */
export const validatePasswordStrength = (password) => {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      message: 'Password must be a non-empty string',
      strength: 'none',
    };
  }

  const errors = [];

  // Length check
  if (password.length < 8) {
    errors.push('at least 8 characters');
  }

  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    errors.push('one uppercase letter (A-Z)');
  }

  // Lowercase check
  if (!/[a-z]/.test(password)) {
    errors.push('one lowercase letter (a-z)');
  }

  // Number check
  if (!/\d/.test(password)) {
    errors.push('one number (0-9)');
  }

  // Special character check
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('one special character (!@#$%^&*)');
  }

  let strength = 'weak';
  if (errors.length === 0) {
    strength = 'strong';
  } else if (errors.length <= 2) {
    strength = 'moderate';
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      message: `Password must contain ${errors.join(', ')}`,
      strength,
    };
  }

  return {
    isValid: true,
    message: 'Password is strong',
    strength: 'strong',
  };
};

/**
 * Validate mobile number
 * @param {string} mobile - Mobile number to validate
 * @returns {Object} { isValid: boolean, message: string }
 */
export const validateMobile = (mobile) => {
  if (!mobile || typeof mobile !== 'string') {
    return {
      isValid: false,
      message: 'Mobile number must be a non-empty string',
    };
  }

  const trimmedMobile = mobile.trim();

  // Remove common formatting characters
  const digitsOnly = trimmedMobile.replace(/\D/g, '');

  if (digitsOnly.length < 10) {
    return {
      isValid: false,
      message: 'Mobile number must contain at least 10 digits',
    };
  }

  if (digitsOnly.length > 15) {
    return {
      isValid: false,
      message: 'Mobile number cannot exceed 15 digits',
    };
  }

  // Check if it contains only valid characters
  const validMobileRegex = /^[0-9+\-\s()]+$/;
  if (!validMobileRegex.test(trimmedMobile)) {
    return {
      isValid: false,
      message: 'Mobile number contains invalid characters',
    };
  }

  return {
    isValid: true,
    message: 'Mobile number is valid',
  };
};

/**
 * Validate full name
 * @param {string} fullName - Full name to validate
 * @returns {Object} { isValid: boolean, message: string }
 */
export const validateFullName = (fullName) => {
  if (!fullName || typeof fullName !== 'string') {
    return {
      isValid: false,
      message: 'Full name must be a non-empty string',
    };
  }

  const trimmedName = fullName.trim();

  if (trimmedName.length < 2) {
    return {
      isValid: false,
      message: 'Full name must be at least 2 characters long',
    };
  }

  if (trimmedName.length > 100) {
    return {
      isValid: false,
      message: 'Full name cannot exceed 100 characters',
    };
  }

  // Check for invalid characters (allow letters, spaces, hyphens, apostrophes)
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!nameRegex.test(trimmedName)) {
    return {
      isValid: false,
      message: 'Full name can only contain letters, spaces, hyphens, and apostrophes',
    };
  }

  return {
    isValid: true,
    message: 'Full name is valid',
  };
};
