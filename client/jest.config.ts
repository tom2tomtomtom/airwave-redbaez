import type { Config } from '@jest/types';

// For Jest 28.x compatibility
const config: Config.InitialOptions = {
  // Automatically clear mock calls, instances and results before every test
  clearMocks: true,

  // Use jsdom environment to provide browser globals
  testEnvironment: 'jsdom',

  // Files to run before tests
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],

  // Map file extensions to transformers
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      isolatedModules: true
    }]
  },

  // CSS and asset module mappings
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/src/__mocks__/fileMock.js',
  },

  // Files to test
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)', '**/tests/**/*.test.(ts|tsx)'],
  
  // File extensions to process
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Don't transform ESM modules that could cause issues
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm|@mui|@babel|@remix-run)/)',
  ],
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost'
  }
};

export default config;
