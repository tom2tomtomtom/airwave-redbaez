import { monitoring } from './monitoring';

interface PerformanceMetrics {
  timeToFirstByte: number;
  timeToInteractive: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
}

interface ResourceMetrics {
  name: string;
  initiatorType: string;
  duration: number;
  transferSize: number;
  decodedBodySize: number;
}

class PerformanceService {
  private static instance: PerformanceService;
  private organisationId: string | null = null;
  private metricsBuffer: PerformanceMetrics[] = [];
  private readonly BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL = 60000; // 1 minute

  private constructor() {
    this.initPerformanceObservers();
    setInterval(() => this.flushMetrics(), this.FLUSH_INTERVAL);
  }

  public static getInstance(): PerformanceService {
    if (!PerformanceService.instance) {
      PerformanceService.instance = new PerformanceService();
    }
    return PerformanceService.instance;
  }

  public setOrganisationContext(organisationId: string) {
    this.organisationId = organisationId;
  }

  private initPerformanceObservers() {
    // Observe Largest Contentful Paint
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      if (entries.length > 0) {
        const lastEntry = entries[entries.length - 1];
        this.recordMetric('largestContentfulPaint', lastEntry.startTime);
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // Observe Cumulative Layout Shift
    new PerformanceObserver((entryList) => {
      let totalCLS = 0;
      entryList.getEntries().forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          totalCLS += entry.value;
        }
      });
      this.recordMetric('cumulativeLayoutShift', totalCLS);
    }).observe({ entryTypes: ['layout-shift'] });

    // Observe First Input Delay
    new PerformanceObserver((entryList) => {
      const firstInput = entryList.getEntries()[0];
      if (firstInput) {
        // Safely access processingStart which may not exist on all PerformanceEntry types
        const processingStart = (firstInput as any).processingStart || firstInput.startTime;
        this.recordMetric('firstInputDelay', processingStart - firstInput.startTime);
      }
    }).observe({ entryTypes: ['first-input'] });

    // Observe Resource Timing
    new PerformanceObserver((entryList) => {
      entryList.getEntries().forEach((entry: any) => {
        this.recordResourceMetric({
          name: entry.name,
          initiatorType: entry.initiatorType,
          duration: entry.duration,
          transferSize: entry.transferSize,
          decodedBodySize: entry.decodedBodySize
        });
      });
    }).observe({ entryTypes: ['resource'] });
  }

  private recordMetric(name: keyof PerformanceMetrics, value: number) {
    const metrics = this.getCurrentMetrics();
    metrics[name] = value;

    this.metricsBuffer.push(metrics);
    if (this.metricsBuffer.length >= this.BUFFER_SIZE) {
      this.flushMetrics();
    }
  }

  private recordResourceMetric(metrics: ResourceMetrics) {
    if (!this.organisationId) return;

    monitoring.logInfo('Resource performance metric recorded', {
      action: 'recordResourceMetric',
      context: {
        ...metrics,
        organisationId: this.organisationId
      }
    });
  }

  private getCurrentMetrics(): PerformanceMetrics {
    // Get navigation entry safely with fallbacks for tests
    let navigationEntry: any = {};
    try {
      // Check if performance API is available and has the method
      if (typeof window !== 'undefined' && window.performance && typeof window.performance.getEntriesByType === 'function') {
        const entries = window.performance.getEntriesByType('navigation');
        if (entries && entries.length > 0) {
          navigationEntry = entries[0];
        }
      }
    } catch (error) {
      console.error('Error accessing performance metrics:', error);
    }

    return {
      timeToFirstByte: navigationEntry?.responseStart || 0,
      timeToInteractive: this.calculateTimeToInteractive(),
      firstContentfulPaint: this.getFirstContentfulPaint(),
      largestContentfulPaint: 0, // Will be updated by observer
      cumulativeLayoutShift: 0, // Will be updated by observer
      firstInputDelay: 0, // Will be updated by observer
    };
  }

  private calculateTimeToInteractive(): number {
    try {
      if (typeof window !== 'undefined' && window.performance && typeof window.performance.getEntriesByType === 'function') {
        const entries = window.performance.getEntriesByType('navigation');
        if (entries && entries.length > 0) {
          const navigationEntry = entries[0] as any;
          return navigationEntry?.domInteractive || 0;
        }
      }
    } catch (error) {
      console.error('Error calculating Time to Interactive:', error);
    }
    return 0;
  }

  private getFirstContentfulPaint(): number {
    try {
      if (typeof window !== 'undefined' && window.performance && typeof window.performance.getEntriesByType === 'function') {
        const paintEntries = window.performance.getEntriesByType('paint');
        if (paintEntries && paintEntries.length > 0) {
          const fcpEntry = paintEntries.find((entry: PerformanceEntry) => entry.name === 'first-contentful-paint');
          return fcpEntry ? fcpEntry.startTime : 0;
        }
      }
    } catch (error) {
      console.error('Error getting First Contentful Paint:', error);
    }
    return 0;
  }

  private async flushMetrics() {
    if (this.metricsBuffer.length === 0 || !this.organisationId) return;

    const averageMetrics = this.calculateAverageMetrics();
    const timestamp = new Date().toISOString();

    try {
      const response = await fetch('/api/performance-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Organisation-ID': this.organisationId
        },
        body: JSON.stringify({
          metrics: averageMetrics,
          timestamp,
          organisationId: this.organisationId,
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send performance metrics');
      }

      this.metricsBuffer = [];
    } catch (error) {
      monitoring.logError(error as Error, {
        action: 'flushMetrics',
        context: {
          bufferSize: this.metricsBuffer.length,
          organisationId: this.organisationId
        }
      });
    }
  }

  private calculateAverageMetrics(): PerformanceMetrics {
    const sum = this.metricsBuffer.reduce((acc, metrics) => {
      Object.keys(metrics).forEach(key => {
        acc[key] = (acc[key] || 0) + metrics[key as keyof PerformanceMetrics];
      });
      return acc;
    }, {} as { [key: string]: number });

    const count = this.metricsBuffer.length;
    return {
      timeToFirstByte: sum.timeToFirstByte / count,
      timeToInteractive: sum.timeToInteractive / count,
      firstContentfulPaint: sum.firstContentfulPaint / count,
      largestContentfulPaint: sum.largestContentfulPaint / count,
      cumulativeLayoutShift: sum.cumulativeLayoutShift / count,
      firstInputDelay: sum.firstInputDelay / count
    };
  }

  public async getPerformanceReport(): Promise<{
    metrics: PerformanceMetrics;
    recommendations: string[];
  }> {
    const metrics = this.calculateAverageMetrics();
    const recommendations: string[] = [];

    // Analyse metrics and provide recommendations
    if (metrics.timeToFirstByte > 600) {
      recommendations.push('Consider optimising server response time or using a CDN');
    }

    if (metrics.largestContentfulPaint > 2500) {
      recommendations.push('Optimise image loading and delivery');
    }

    if (metrics.cumulativeLayoutShift > 0.1) {
      recommendations.push('Improve layout stability by setting explicit dimensions for images and dynamic content');
    }

    if (metrics.firstInputDelay > 100) {
      recommendations.push('Optimise JavaScript execution and reduce main thread blocking');
    }

    return {
      metrics,
      recommendations
    };
  }

  public async optimiseAssetDelivery(assetUrl: string): Promise<void> {
    if (!this.organisationId) return;

    try {
      const response = await fetch(assetUrl);
      const contentLength = response.headers.get('content-length');
      const contentType = response.headers.get('content-type');

      if (!contentLength || !contentType) return;

      const sizeInMB = parseInt(contentLength) / (1024 * 1024);

      if (sizeInMB > 1) {
        monitoring.logWarning('Large asset detected', {
          action: 'optimiseAssetDelivery',
          context: {
            assetUrl,
            size: sizeInMB,
            contentType,
            organisationId: this.organisationId
          }
        });
      }

      // Record asset performance metrics
      let duration = 0;
      try {
        // Use window.performance to avoid confusion with our exported service
        if (typeof window.performance !== 'undefined' && typeof window.performance.now === 'function') {
          duration = window.performance.now();
        }
      } catch (error) {
        console.error('Error accessing window.performance.now():', error);
      }
      
      this.recordResourceMetric({
        name: assetUrl,
        initiatorType: 'asset',
        duration: duration,
        transferSize: parseInt(contentLength),
        decodedBodySize: parseInt(contentLength)
      });
    } catch (error) {
      monitoring.logError(error as Error, {
        action: 'optimiseAssetDelivery',
        context: { assetUrl }
      });
    }
  }
}

export const performance = PerformanceService.getInstance();
