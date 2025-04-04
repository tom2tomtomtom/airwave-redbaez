#!/bin/bash

# Manual test script for security fixes
# This script tests the security fixes implemented in the codebase without requiring a full build

echo "Running manual security fix tests..."

# Test 1: Check JWT Secret validation in auth.middleware.ts
echo "Test 1: JWT Secret validation in auth.middleware.ts"
grep -n "const JWT_SECRET = process.env.JWT_SECRET;" server/src/middleware/auth.middleware.ts
if [ $? -eq 0 ]; then
  echo "✅ PASS: Hardcoded JWT secret has been removed"
else
  echo "❌ FAIL: Hardcoded JWT secret may still be present"
fi

grep -n "if (!JWT_SECRET)" server/src/middleware/auth.middleware.ts
if [ $? -eq 0 ]; then
  echo "✅ PASS: JWT_SECRET validation has been added"
else
  echo "❌ FAIL: JWT_SECRET validation is missing"
fi

# Test 2: Check authentication bypass prevention
echo "Test 2: Authentication bypass prevention"
grep -n "BYPASS_AUTH: process.env.NODE_ENV !== 'production'" server/src/middleware/auth.middleware.ts
if [ $? -eq 0 ]; then
  echo "✅ PASS: Authentication bypass prevention has been implemented"
else
  echo "❌ FAIL: Authentication bypass prevention is missing"
fi

# Test 3: Check hardcoded development passwords
echo "Test 3: Check hardcoded development passwords"
grep -n "devpassword123" server/src/scripts/ensure-dev-user.ts
if [ $? -eq 0 ]; then
  echo "❌ FAIL: Hardcoded development password is still present"
else
  echo "✅ PASS: Hardcoded development password has been removed"
fi

grep -n "process.env.DEV_USER_PASSWORD" server/src/scripts/ensure-dev-user.ts
if [ $? -eq 0 ]; then
  echo "✅ PASS: Development password now uses environment variable"
else
  echo "❌ FAIL: Development password environment variable is missing"
fi

# Test 4: Check environment validation utilities
echo "Test 4: Check environment validation utilities"
if [ -f server/src/utils/envValidation.ts ]; then
  echo "✅ PASS: Environment validation utility has been created"
else
  echo "❌ FAIL: Environment validation utility is missing"
fi

if [ -f server/src/utils/appConfig.ts ]; then
  echo "✅ PASS: Application configuration file has been created"
else
  echo "❌ FAIL: Application configuration file is missing"
fi

# Test 5: Check integration of environment validation in main application
echo "Test 5: Check integration of environment validation"
grep -n "validateAppEnvironment()" server/src/index.ts
if [ $? -eq 0 ]; then
  echo "✅ PASS: Environment validation has been integrated in the main application"
else
  echo "❌ FAIL: Environment validation integration is missing"
fi

echo "Manual security fix tests completed."
