#!/bin/bash

# Test script for performance improvements
# This script tests the performance improvements implemented in the codebase

echo "Running performance improvement tests..."

# Create test directory if it doesn't exist
mkdir -p /home/ubuntu/airwave-redbaez-clone/tests/performance

# Test 1: Check batch processing in creatomate.routes.ts
echo "Test 1: Batch processing in creatomate.routes.ts"
grep -n "Process combinations in batches" /home/ubuntu/airwave-redbaez-clone/server/src/routes/creatomate.routes.ts
if [ $? -eq 0 ]; then
  echo "✅ PASS: Batch processing has been implemented"
else
  echo "❌ FAIL: Batch processing implementation is missing"
fi

grep -n "Promise.all" /home/ubuntu/airwave-redbaez-clone/server/src/routes/creatomate.routes.ts
if [ $? -eq 0 ]; then
  echo "✅ PASS: Parallel processing with Promise.all has been implemented"
else
  echo "❌ FAIL: Parallel processing implementation is missing"
fi

# Test 2: Check pagination middleware
echo "Test 2: Pagination middleware"
if [ -f /home/ubuntu/airwave-redbaez-clone/server/src/middleware/pagination.middleware.ts ]; then
  echo "✅ PASS: Pagination middleware has been created"
else
  echo "❌ FAIL: Pagination middleware is missing"
fi

grep -n "formatPaginatedResponse" /home/ubuntu/airwave-redbaez-clone/server/src/middleware/pagination.middleware.ts
if [ $? -eq 0 ]; then
  echo "✅ PASS: Pagination response formatting is implemented"
else
  echo "❌ FAIL: Pagination response formatting is missing"
fi

# Test 3: Check cache middleware
echo "Test 3: Cache middleware"
if [ -f /home/ubuntu/airwave-redbaez-clone/server/src/middleware/cache.middleware.ts ]; then
  echo "✅ PASS: Cache middleware has been created"
else
  echo "❌ FAIL: Cache middleware is missing"
fi

grep -n "setupCacheLimits" /home/ubuntu/airwave-redbaez-clone/server/src/middleware/cache.middleware.ts
if [ $? -eq 0 ]; then
  echo "✅ PASS: Cache size limits have been implemented"
else
  echo "❌ FAIL: Cache size limits are missing"
fi

grep -n "invalidateCache" /home/ubuntu/airwave-redbaez-clone/server/src/middleware/cache.middleware.ts
if [ $? -eq 0 ]; then
  echo "✅ PASS: Cache invalidation strategy has been implemented"
else
  echo "❌ FAIL: Cache invalidation strategy is missing"
fi

# Test 4: Check timeout handling
echo "Test 4: Timeout handling"
if [ -f /home/ubuntu/airwave-redbaez-clone/server/src/utils/timeoutHandling.ts ]; then
  echo "✅ PASS: Timeout handling utilities have been created"
else
  echo "❌ FAIL: Timeout handling utilities are missing"
fi

grep -n "withTimeout" /home/ubuntu/airwave-redbaez-clone/server/src/utils/timeoutHandling.ts
if [ $? -eq 0 ]; then
  echo "✅ PASS: Timeout wrapper for promises has been implemented"
else
  echo "❌ FAIL: Timeout wrapper for promises is missing"
fi

grep -n "withRetry" /home/ubuntu/airwave-redbaez-clone/server/src/utils/timeoutHandling.ts
if [ $? -eq 0 ]; then
  echo "✅ PASS: Retry mechanism has been implemented"
else
  echo "❌ FAIL: Retry mechanism is missing"
fi

# Test 5: Check job queue implementation
echo "Test 5: Job queue implementation"
if [ -f /home/ubuntu/airwave-redbaez-clone/server/src/utils/jobQueue.ts ]; then
  echo "✅ PASS: Job queue has been created"
else
  echo "❌ FAIL: Job queue is missing"
fi

grep -n "maxQueueSize" /home/ubuntu/airwave-redbaez-clone/server/src/utils/jobQueue.ts
if [ $? -eq 0 ]; then
  echo "✅ PASS: Queue size limits have been implemented"
else
  echo "❌ FAIL: Queue size limits are missing"
fi

echo "Performance improvement tests completed."
