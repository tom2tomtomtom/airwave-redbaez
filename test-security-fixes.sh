#!/bin/bash

# Test script for security fixes
# This script tests the security fixes implemented in the codebase

echo "Running security fix tests..."

# Create a test environment file
cat > .env.test << EOL
# Test environment variables
NODE_ENV=development
PORT=3099
JWT_SECRET=test_jwt_secret_for_testing_only
SUPABASE_URL=https://example.supabase.co
SUPABASE_ANON_KEY=test_anon_key
REDIS_URL=redis://localhost:6379
DEV_USER_PASSWORD=test_password_123
EOL

# Test 1: JWT Secret validation
echo "Test 1: JWT Secret validation"
# Test with JWT_SECRET set
NODE_ENV=development JWT_SECRET=test_secret node -e "
const { validateEnvironment } = require('./server/dist/utils/envValidation');
const result = validateEnvironment(['JWT_SECRET']);
console.log('Test with JWT_SECRET set:', result.isValid ? 'PASS' : 'FAIL');
"

# Test without JWT_SECRET in development (should warn but not fail)
NODE_ENV=development node -e "
const { validateEnvironment } = require('./server/dist/utils/envValidation');
const result = validateEnvironment(['JWT_SECRET']);
console.log('Test without JWT_SECRET in development:', !result.isValid && result.missing.includes('JWT_SECRET') ? 'PASS' : 'FAIL');
"

# Test without JWT_SECRET in production (should fail)
NODE_ENV=production node -e "
try {
  const { validateEnvironment } = require('./server/dist/utils/envValidation');
  const result = validateEnvironment(['JWT_SECRET']);
  console.log('Test without JWT_SECRET in production:', !result.isValid && result.missing.includes('JWT_SECRET') ? 'PASS' : 'FAIL');
} catch (e) {
  console.log('Test without JWT_SECRET in production: PASS (threw error as expected)');
}
"

# Test 2: Authentication bypass prevention
echo "Test 2: Authentication bypass prevention"
# Test AUTH_MODE.BYPASS_AUTH in development
NODE_ENV=development DEV_BYPASS_AUTH=true node -e "
const { AUTH_MODE } = require('./server/dist/middleware/auth.middleware');
console.log('Test AUTH_MODE.BYPASS_AUTH in development:', AUTH_MODE.BYPASS_AUTH === true ? 'PASS' : 'FAIL');
"

# Test AUTH_MODE.BYPASS_AUTH in production (should be false regardless of env vars)
NODE_ENV=production DEV_BYPASS_AUTH=true node -e "
const { AUTH_MODE } = require('./server/dist/middleware/auth.middleware');
console.log('Test AUTH_MODE.BYPASS_AUTH in production:', AUTH_MODE.BYPASS_AUTH === false ? 'PASS' : 'FAIL');
"

# Test 3: Environment variable validation utility
echo "Test 3: Environment variable validation utility"
# Test getEnvVar with fallback
NODE_ENV=development node -e "
const { getEnvVar } = require('./server/dist/utils/envValidation');
const value = getEnvVar('TEST_VAR', 'fallback_value');
console.log('Test getEnvVar with fallback:', value === 'fallback_value' ? 'PASS' : 'FAIL');
"

# Test getEnvVar with required variable in production
NODE_ENV=production node -e "
try {
  const { getEnvVar } = require('./server/dist/utils/envValidation');
  const value = getEnvVar('REQUIRED_VAR', 'fallback', true);
  console.log('Test getEnvVar with required variable in production: FAIL (should have thrown)');
} catch (e) {
  console.log('Test getEnvVar with required variable in production: PASS (threw error as expected)');
}
"

# Clean up
rm .env.test

echo "Security fix tests completed."
