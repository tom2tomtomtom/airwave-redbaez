// server/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Optional: Specify test file pattern if needed
  // testMatch: ['**/__tests__/**/*.+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)'],
  // Optional: Module name mapping for aliases (like '@/' -> 'src/')
  // Needs 'tsconfig-paths/register' if using paths in tsconfig
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Optional: Setup files to run before tests
  // setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
};
