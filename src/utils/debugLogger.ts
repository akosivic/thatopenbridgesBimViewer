/**
 * Debug utility for conditional logging
 * Only shows debug messages when ?debug parameter is present in URL
 */
export class DebugLogger {
  private static isDebugMode: boolean | null = null;

  /**
   * Check if debug mode is enabled via URL parameter
   */
  private static checkDebugMode(): boolean {
    if (this.isDebugMode === null) {
      // Check for ?debug parameter in URL (any value or no value)
      this.isDebugMode = window.location.search.toLowerCase().includes('debug');
    }
    return this.isDebugMode;
  }

  /**
   * Log message only in debug mode
   */
  static log(...args: any[]): void {
    if (this.checkDebugMode()) {
      console.log(...args);
    }
  }

  /**
   * Log warning only in debug mode
   */
  static warn(...args: any[]): void {
    if (this.checkDebugMode()) {
      console.warn(...args);
    }
  }

  /**
   * Log error (always shown, but with debug prefix when in debug mode)
   */
  static error(...args: any[]): void {
    if (this.checkDebugMode()) {
      console.error('[DEBUG]', ...args);
    } else {
      console.error(...args);
    }
  }

  /**
   * Force log message regardless of debug mode (for critical messages)
   */
  static forceLog(...args: any[]): void {
    console.log(...args);
  }

  /**
   * Check if debug mode is currently enabled
   */
  static isEnabled(): boolean {
    return this.checkDebugMode();
  }

  /**
   * Reset debug mode detection (useful for testing)
   */
  static reset(): void {
    this.isDebugMode = null;
  }
}

// Convenience exports for shorter syntax
export const debugLog = DebugLogger.log.bind(DebugLogger);
export const debugWarn = DebugLogger.warn.bind(DebugLogger);
export const debugError = DebugLogger.error.bind(DebugLogger);
export const isDebugMode = DebugLogger.isEnabled.bind(DebugLogger);