import { performance } from '../../services/performance';
import { monitoring } from '../../services/monitoring';

// Mock dependencies
jest.mock('../../services/monitoring');

describe('PerformanceService', () => {
  const mockOrganisationId = 'test-org';

  beforeEach(() => {
    jest.clearAllMocks();
    performance.setOrganisationContext(mockOrganisationId);
  });

  describe('Performance Metrics Recording', () => {
    it('should record and buffer metrics correctly', () => {
      // Mock PerformanceObserver
      const mockObserver = {
        observe: jest.fn(),
        disconnect: jest.fn(),
      };
      global.PerformanceObserver = jest.fn(() => mockObserver) as any;

      // Mock performance entries
      const mockEntry = {
        startTime: 100,
        duration: 50,
        entryType: 'largest-contentful-paint',
      };

      // Simulate LCP observer callback
      const lcpCallback = ((global.PerformanceObserver as unknown) as jest.Mock).mock.calls[0][0];
      lcpCallback({
        getEntries: () => [mockEntry],
      });

      // Verify monitoring was called
      expect(monitoring.logInfo).toHaveBeenCalled();
    });

    it('should handle missing performance entries gracefully', () => {
      // Mock PerformanceObserver with empty entries
      const mockObserver = {
        observe: jest.fn(),
        disconnect: jest.fn(),
      };
      global.PerformanceObserver = jest.fn(() => mockObserver) as any;

      // Simulate observer callback with no entries
      const callback = ((global.PerformanceObserver as unknown) as jest.Mock).mock.calls[0][0];
      callback({
        getEntries: () => [],
      });

      // Verify no errors were logged
      expect(monitoring.logError).not.toHaveBeenCalled();
    });
  });

  describe('Resource Metrics', () => {
    const mockResourceMetric = {
      name: 'https://example.com/image.jpg',
      initiatorType: 'img',
      duration: 500,
      transferSize: 1024,
      decodedBodySize: 2048,
    };

    it('should record resource metrics with organisation context', () => {
      // Mock PerformanceObserver
      const mockObserver = {
        observe: jest.fn(),
        disconnect: jest.fn(),
      };
      global.PerformanceObserver = jest.fn(() => mockObserver) as any;

      // Simulate resource timing observer callback
      const callback = ((global.PerformanceObserver as unknown) as jest.Mock).mock.calls[3][0];
      callback({
        getEntries: () => [mockResourceMetric],
      });

      // Verify resource metric was logged with organisation context
      expect(monitoring.logInfo).toHaveBeenCalledWith(
        'Resource performance metric recorded',
        expect.objectContaining({
          context: expect.objectContaining({
            organisationId: mockOrganisationId,
          }),
        })
      );
    });

    it('should handle resource errors gracefully', () => {
      // Mock PerformanceObserver with error
      const mockObserver = {
        observe: jest.fn().mockImplementation(() => {
          throw new Error('Observer error');
        }),
        disconnect: jest.fn(),
      };
      global.PerformanceObserver = jest.fn(() => mockObserver) as any;

      // Verify error was handled
      expect(() => {
        const callback = ((global.PerformanceObserver as unknown) as jest.Mock).mock.calls[3][0];
        callback({
          getEntries: () => [mockResourceMetric],
        });
      }).not.toThrow();
    });
  });

  describe('Performance Reports', () => {
    it('should generate performance recommendations based on metrics', async () => {
      // Mock poor performance metrics
      const mockMetrics = {
        timeToFirstByte: 800, // > 600ms threshold
        largestContentfulPaint: 3000, // > 2500ms threshold
        cumulativeLayoutShift: 0.15, // > 0.1 threshold
        firstInputDelay: 150, // > 100ms threshold
      };

      // Mock getCurrentMetrics to return poor metrics
      jest.spyOn(performance as any, 'getCurrentMetrics').mockReturnValue(mockMetrics);

      const report = await performance.getPerformanceReport();

      expect(report.recommendations).toContain(
        'Consider optimising server response time or using a CDN'
      );
      expect(report.recommendations).toContain(
        'Optimise image loading and delivery'
      );
      expect(report.recommendations).toContain(
        'Improve layout stability by setting explicit dimensions for images and dynamic content'
      );
      expect(report.recommendations).toContain(
        'Optimise JavaScript execution and reduce main thread blocking'
      );
    });

    it('should handle missing metrics in reports', async () => {
      // Mock missing metrics
      jest.spyOn(performance as any, 'getCurrentMetrics').mockReturnValue({});

      const report = await performance.getPerformanceReport();

      expect(report.metrics).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(monitoring.logError).not.toHaveBeenCalled();
    });
  });

  describe('Asset Performance Optimisation', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    it('should analyse large assets and log warnings', async () => {
      const mockResponse = {
        headers: new Headers({
          'content-length': '2097152', // 2MB
          'content-type': 'image/jpeg',
        }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await performance.optimiseAssetDelivery('https://example.com/large-image.jpg');

      expect(monitoring.logWarning).toHaveBeenCalledWith(
        'Large asset detected',
        expect.objectContaining({
          context: expect.objectContaining({
            size: expect.any(Number),
            organisationId: mockOrganisationId,
          }),
        })
      );
    });

    it('should handle asset analysis errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await performance.optimiseAssetDelivery('https://example.com/error-image.jpg');

      expect(monitoring.logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          action: 'optimiseAssetDelivery',
        })
      );
    });
  });

  describe('Metrics Flushing', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    it('should flush metrics with proper organisation context', async () => {
      const mockResponse = { ok: true };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Trigger metrics flush
      await (performance as any).flushMetrics();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/performance-metrics',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Organisation-ID': mockOrganisationId,
          }),
        })
      );
    });

    it('should handle flush errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      // Trigger metrics flush
      await (performance as any).flushMetrics();

      expect(monitoring.logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          action: 'flushMetrics',
          context: expect.objectContaining({
            organisationId: mockOrganisationId,
          }),
        })
      );
    });
  });
});
