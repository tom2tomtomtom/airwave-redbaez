#!/bin/bash

# Test script for code quality improvements
# This script tests the code quality improvements implemented in the codebase

echo "Running code quality improvement tests..."

# Create test directory if it doesn't exist
mkdir -p /home/ubuntu/airwave-redbaez-clone/tests/code-quality

# Test 1: Check logger implementation
echo "Test 1: Logger implementation"
if [ -f /home/ubuntu/airwave-redbaez-clone/server/src/utils/logger.ts ]; then
  echo "✅ PASS: Logger utility has been created"
else
  echo "❌ FAIL: Logger utility is missing"
fi

# Test 2: Check console.log replacements in database clients
echo "Test 2: Console.log replacements in database clients"
grep -r "logger\." --include="*.ts" /home/ubuntu/airwave-redbaez-clone/server/src/db | wc -l > /tmp/logger_count.txt
LOGGER_COUNT=$(cat /tmp/logger_count.txt)

if [ $LOGGER_COUNT -gt 10 ]; then
  echo "✅ PASS: Found $LOGGER_COUNT logger calls in database clients"
else
  echo "❌ FAIL: Not enough logger calls in database clients (found $LOGGER_COUNT, expected >10)"
fi

grep -r "console\.log" --include="*.ts" /home/ubuntu/airwave-redbaez-clone/server/src/db | wc -l > /tmp/console_count.txt
CONSOLE_COUNT=$(cat /tmp/console_count.txt)

if [ $CONSOLE_COUNT -eq 0 ]; then
  echo "✅ PASS: No console.log calls found in database clients"
else
  echo "❌ FAIL: Found $CONSOLE_COUNT console.log calls in database clients"
fi

# Test 3: Check TypeScript interfaces and types
echo "Test 3: TypeScript interfaces and types"
if grep -q "interface User" /home/ubuntu/airwave-redbaez-clone/server/src/middleware/auth.middleware.ts; then
  echo "✅ PASS: User interface has been defined in auth.middleware.ts"
else
  echo "❌ FAIL: User interface is missing in auth.middleware.ts"
fi

if grep -q "interface TokenPayload" /home/ubuntu/airwave-redbaez-clone/server/src/middleware/auth.middleware.ts; then
  echo "✅ PASS: TokenPayload interface has been defined in auth.middleware.ts"
else
  echo "❌ FAIL: TokenPayload interface is missing in auth.middleware.ts"
fi

if grep -q "MockSupabaseClientType" /home/ubuntu/airwave-redbaez-clone/server/src/db/supabaseClient.ts; then
  echo "✅ PASS: MockSupabaseClientType has been defined in supabaseClient.ts"
else
  echo "❌ FAIL: MockSupabaseClientType is missing in supabaseClient.ts"
fi

if grep -q "Record<string, unknown>" /home/ubuntu/airwave-redbaez-clone/server/src/db/supabaseClient.ts; then
  echo "✅ PASS: Record<string, unknown> type is used in supabaseClient.ts"
else
  echo "❌ FAIL: Record<string, unknown> type is not used in supabaseClient.ts"
fi

# Test 4: Check error handling
echo "Test 4: Error handling"
if [ -f /home/ubuntu/airwave-redbaez-clone/server/src/types/errorTypes.ts ]; then
  echo "✅ PASS: Error types have been defined"
else
  echo "❌ FAIL: Error types are missing"
fi

if [ -f /home/ubuntu/airwave-redbaez-clone/server/src/utils/ApiError.ts ]; then
  echo "✅ PASS: ApiError class has been implemented"
else
  echo "❌ FAIL: ApiError class is missing"
fi

if [ -f /home/ubuntu/airwave-redbaez-clone/server/src/middleware/errorHandler.ts ]; then
  echo "✅ PASS: Error handler middleware has been implemented"
else
  echo "❌ FAIL: Error handler middleware is missing"
fi

# Test 5: Compile TypeScript files to check for type errors
echo "Test 5: TypeScript compilation"
cd /home/ubuntu/airwave-redbaez-clone/server && npx tsc --noEmit src/utils/logger.ts src/middleware/auth.middleware.ts src/utils/ApiError.ts src/types/errorTypes.ts src/middleware/errorHandler.ts

if [ $? -eq 0 ]; then
  echo "✅ PASS: TypeScript compilation successful"
else
  echo "❌ FAIL: TypeScript compilation failed"
fi

echo "Code quality improvement tests completed."
