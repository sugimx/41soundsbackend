/**
 * Simple logger utility
 * Can be extended to integrate with logging services like Winston, Bunyan, etc.
 */

export class Logger {
  info(message, metadata = {}) {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, metadata);
  }

  error(message, metadata = {}) {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, metadata);
  }

  warn(message, metadata = {}) {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, metadata);
  }

  debug(message, metadata = {}) {
    if (process.env.DEBUG_MODE === 'true') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, metadata);
    }
  }
}

export const logger = new Logger();
