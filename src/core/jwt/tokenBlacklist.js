/**
 * In-memory token blacklist
 * For production, use Redis or MongoDB for persistence
 */
class TokenBlacklist {
  constructor() {
    this.blacklist = new Set();
    // Clean up expired tokens every 24 hours
    this.startCleanupInterval();
  }

  /**
   * Add token to blacklist
   * @param {string} token - JWT token
   * @param {number} expiresAt - Token expiration timestamp
   */
  add(token, expiresAt) {
    this.blacklist.add({
      token,
      expiresAt,
    });
  }

  /**
   * Check if token is blacklisted
   * @param {string} token - JWT token
   * @returns {boolean}
   */
  isBlacklisted(token) {
    for (const entry of this.blacklist) {
      if (entry.token === token) {
        return true;
      }
    }
    return false;
  }

  /**
   * Clean up expired tokens
   */
  cleanup() {
    const now = Date.now();
    for (const entry of this.blacklist) {
      if (entry.expiresAt < now) {
        this.blacklist.delete(entry);
      }
    }
  }

  /**
   * Start periodic cleanup
   */
  startCleanupInterval() {
    setInterval(() => {
      this.cleanup();
    }, 24 * 60 * 60 * 1000); // Run every 24 hours
  }

  /**
   * Clear all blacklisted tokens (for testing)
   */
  clear() {
    this.blacklist.clear();
  }

  /**
   * Get blacklist size
   */
  size() {
    return this.blacklist.size;
  }
}

export const tokenBlacklist = new TokenBlacklist();
