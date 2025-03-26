import '@testing-library/jest-dom';

// Load environment variables for testing
process.env.REACT_APP_SUPABASE_URL = 'https://example.supabase.co';
process.env.REACT_APP_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test_mock_key';

// Mock TextEncoder/Decoder for JSDOM
class MockTextEncoder {
  encode(input?: string): Uint8Array {
    return new Uint8Array(Buffer.from(input || ''));
  }
}

class MockTextDecoder {
  decode(input?: ArrayBufferView | ArrayBuffer | null): string {
    if (!input) return '';
    return Buffer.from(input as ArrayBuffer).toString();
  }
}

global.TextEncoder = MockTextEncoder as any;
global.TextDecoder = MockTextDecoder as any;

// Mock Supabase client with organisation context
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token',
            user: {
              id: 'test-user',
              email: 'test@example.com',
              user_metadata: {
                organisation_id: 'test-org'
              }
            }
          }
        },
        error: null
      }),
      onAuthStateChange: jest.fn(),
      signOut: jest.fn().mockResolvedValue({ error: null })
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      match: jest.fn().mockReturnThis(),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ error: null }),
        download: jest.fn().mockResolvedValue({ error: null }),
        remove: jest.fn().mockResolvedValue({ error: null })
      }))
    }
  })),
}));

// Mock Material-UI components that use portals
jest.mock('@mui/material/Modal', () => {
  const React = require('react');
  return function MockModal({ children }: { children: React.ReactNode }) {
    return React.createElement('div', { 'data-testid': 'modal' }, children);
  };
});

// Mock window.URL utilities
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: jest.fn(),
    revokeObjectURL: jest.fn(),
  },
});

// Mock window.performance
Object.defineProperty(window, 'performance', {
  value: {
    getEntriesByType: jest.fn().mockReturnValue([{
      responseStart: 50,
      responseEnd: 100,
      startTime: 0,
      connectEnd: 20,
      domComplete: 200,
      fetchStart: 5,
      loadEventEnd: 250
    }]),
    mark: jest.fn(),
    measure: jest.fn(),
    now: jest.fn().mockReturnValue(Date.now()),
    navigation: {
      type: 0
    },
    timing: {
      navigationStart: 0,
      loadEventEnd: 250
    }
  },
  writable: true
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

global.IntersectionObserver = MockIntersectionObserver as any;

// Mock ResizeObserver
class MockResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

global.ResizeObserver = MockResizeObserver as any;

// Mock PerformanceObserver with supportedEntryTypes
class MockPerformanceObserver {
  static supportedEntryTypes = ['element', 'event', 'first-input', 'layout-shift', 'largest-contentful-paint', 'load', 'longtask', 'mark', 'measure', 'navigation', 'paint', 'resource'];
  
  observe = jest.fn();
  disconnect = jest.fn();
  takeRecords = jest.fn().mockReturnValue([]);

  constructor(callback: PerformanceObserverCallback) {
    this.observe = jest.fn((options) => {
      if (options && options.entryTypes) {
        // Create a more complete mock implementation that satisfies the TypeScript interface
        const mockEntryList: PerformanceObserverEntryList = {
          getEntries: () => [],
          getEntriesByType: (type: string) => [],
          getEntriesByName: (name: string, type?: string) => []
        };
        callback(mockEntryList, this);
      }
    });
  }
}

global.PerformanceObserver = MockPerformanceObserver as any;

// Mock Fetch API
global.fetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    blob: () => Promise.resolve(new Blob()),
    text: () => Promise.resolve(''),
    headers: new Headers(),
  })
);

// Security settings
class MockStorage {
  private store: { [key: string]: string } = {};
  
  getItem = jest.fn((key: string) => this.store[key] || null);
  setItem = jest.fn((key: string, value: string) => { this.store[key] = value; });
  removeItem = jest.fn((key: string) => { delete this.store[key]; });
  clear = jest.fn(() => { this.store = {}; });
}

Object.defineProperty(window, 'localStorage', {
  value: new MockStorage(),
});

Object.defineProperty(window, 'sessionStorage', {
  value: new MockStorage(),
});

// Mock console methods for clean test output
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

