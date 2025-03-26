import { AppError } from '../utils/errorHandling';

interface ErrorMetadata {
  userId?: string;
  organisationId?: string;
  path?: string;
  component?: string;
  action?: string;
  context?: Record<string, unknown>;
}

interface LogMetadata extends ErrorMetadata {
  level: 'info' | 'warn' | 'error';
  timestamp: string;
  error?: Record<string, any>; // Add the error field for logError
  message?: string; // Add message field
}

class MonitoringService {
  private static instance: MonitoringService;
  private isInitialized = false;
  private organisationId: string | null = null;
  private userId: string | undefined = undefined;

  private constructor() {}

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  public initialize(organisationId: string, userId?: string) {
    if (this.isInitialized) {
      console.warn('MonitoringService already initialized');
      return;
    }

    this.organisationId = organisationId;
    this.userId = userId;
    this.isInitialized = true;
  }

  private checkInitialization() {
    if (!this.isInitialized) {
      throw new Error('MonitoringService not initialized');
    }
  }

  private sanitizeError(error: Error | AppError): Record<string, any> {
    const sanitizedError = {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };

    if (error instanceof AppError) {
      return {
        ...sanitizedError,
        code: error.code,
        context: this.sanitizeContext(error.context || {}),
      };
    }

    return sanitizedError;
  }

  private sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
    // Remove sensitive information
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'credential'];
    const sanitized: Record<string, unknown> = {};

    Object.entries(context).forEach(([key, value]) => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeContext(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  private async sendToLoggingService(data: LogMetadata) {
    this.checkInitialization();

    // Add organisation context
    const enrichedData = {
      ...data,
      environment: process.env.NODE_ENV,
      clientVersion: process.env.REACT_APP_VERSION,
      userAgent: navigator.userAgent,
    };

    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.log('[Monitoring]', enrichedData);
      return;
    }

    try {
      const response = await fetch('/api/logging', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Organisation-ID': this.organisationId || '',
        },
        body: JSON.stringify(enrichedData),
      });

      if (!response.ok) {
        console.error('Failed to send log:', await response.text());
      }
    } catch (err) {
      console.error('Error sending log:', err);
    }
  }

  private formatLogData(message: string, metadata?: Partial<ErrorMetadata>): LogMetadata {
    // Add organisation context
    return {
      ...metadata,
      level: 'info',
      timestamp: new Date().toISOString(),
      organisationId: this.organisationId || undefined, // Convert null to undefined to match type
      userId: this.userId,
      path: window.location.pathname,
    };
  }

  public async logError(error: Error | AppError, metadata: ErrorMetadata = {}) {
    const logData: LogMetadata = {
      ...this.formatLogData(error.message || 'An error occurred', metadata),
      level: 'error',
      error: this.sanitizeError(error),
    };

    await this.sendToLoggingService(logData);
  }

  public async logWarning(message: string, metadata: ErrorMetadata = {}) {
    const logData: LogMetadata = {
      ...this.formatLogData(message, metadata),
      level: 'warn',
    };

    await this.sendToLoggingService(logData);
  }

  public async logInfo(message: string, metadata: ErrorMetadata = {}) {
    const logData: LogMetadata = {
      ...this.formatLogData(message, metadata),
      level: 'info',
    };

    await this.sendToLoggingService(logData);
  }

  public async trackEvent(
    eventName: string,
    properties: Record<string, unknown> = {}
  ) {
    this.checkInitialization();

    const sanitizedProperties = this.sanitizeContext(properties);

    const logData: LogMetadata = {
      ...this.formatLogData(''),
      level: 'info',
      action: eventName,
      context: sanitizedProperties,
    };

    await this.sendToLoggingService(logData);
  }

  public setOrganisationContext(organisationId: string) {
    this.organisationId = organisationId;
  }

  public clearOrganisationContext() {
    this.organisationId = null;
  }
}

export const monitoring = MonitoringService.getInstance();
