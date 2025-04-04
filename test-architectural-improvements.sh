#!/bin/bash

# Test script for architectural improvements
# This script tests the architectural improvements implemented in the codebase

echo "Running architectural improvement tests..."

# Create test directory if it doesn't exist
mkdir -p /home/ubuntu/airwave-redbaez-clone/tests/architecture

# Test 1: Check service interfaces
echo "Test 1: Service interfaces"
if [ -f /home/ubuntu/airwave-redbaez-clone/server/src/types/serviceInterfaces.ts ]; then
  echo "✅ PASS: Service interfaces have been defined"
else
  echo "❌ FAIL: Service interfaces are missing"
fi

# Test 2: Check abstract base classes
echo "Test 2: Abstract base classes"
if [ -f /home/ubuntu/airwave-redbaez-clone/server/src/services/AbstractBaseService.ts ]; then
  echo "✅ PASS: AbstractBaseService has been implemented"
else
  echo "❌ FAIL: AbstractBaseService is missing"
fi

if [ -f /home/ubuntu/airwave-redbaez-clone/server/src/services/AbstractExternalApiService.ts ]; then
  echo "✅ PASS: AbstractExternalApiService has been implemented"
else
  echo "❌ FAIL: AbstractExternalApiService is missing"
fi

if [ -f /home/ubuntu/airwave-redbaez-clone/server/src/services/AbstractAssetService.ts ]; then
  echo "✅ PASS: AbstractAssetService has been implemented"
else
  echo "❌ FAIL: AbstractAssetService is missing"
fi

if [ -f /home/ubuntu/airwave-redbaez-clone/server/src/services/AbstractMediaProcessingService.ts ]; then
  echo "✅ PASS: AbstractMediaProcessingService has been implemented"
else
  echo "❌ FAIL: AbstractMediaProcessingService is missing"
fi

# Test 3: Check concrete service implementations
echo "Test 3: Concrete service implementations"
if [ -f /home/ubuntu/airwave-redbaez-clone/server/src/services/UnifiedAssetService.ts ]; then
  echo "✅ PASS: UnifiedAssetService has been implemented"
else
  echo "❌ FAIL: UnifiedAssetService is missing"
fi

# Test 4: Check for inheritance patterns
echo "Test 4: Inheritance patterns"
if grep -q "extends AbstractBaseService" /home/ubuntu/airwave-redbaez-clone/server/src/services/AbstractExternalApiService.ts; then
  echo "✅ PASS: AbstractExternalApiService extends AbstractBaseService"
else
  echo "❌ FAIL: AbstractExternalApiService does not extend AbstractBaseService"
fi

if grep -q "extends AbstractBaseService" /home/ubuntu/airwave-redbaez-clone/server/src/services/AbstractAssetService.ts; then
  echo "✅ PASS: AbstractAssetService extends AbstractBaseService"
else
  echo "❌ FAIL: AbstractAssetService does not extend AbstractBaseService"
fi

if grep -q "extends AbstractExternalApiService" /home/ubuntu/airwave-redbaez-clone/server/src/services/AbstractMediaProcessingService.ts; then
  echo "✅ PASS: AbstractMediaProcessingService extends AbstractExternalApiService"
else
  echo "❌ FAIL: AbstractMediaProcessingService does not extend AbstractExternalApiService"
fi

if grep -q "extends AbstractAssetService" /home/ubuntu/airwave-redbaez-clone/server/src/services/UnifiedAssetService.ts; then
  echo "✅ PASS: UnifiedAssetService extends AbstractAssetService"
else
  echo "❌ FAIL: UnifiedAssetService does not extend AbstractAssetService"
fi

# Test 5: Check for interface implementations
echo "Test 5: Interface implementations"
if grep -q "implements BaseService" /home/ubuntu/airwave-redbaez-clone/server/src/services/AbstractBaseService.ts; then
  echo "✅ PASS: AbstractBaseService implements BaseService interface"
else
  echo "❌ FAIL: AbstractBaseService does not implement BaseService interface"
fi

if grep -q "implements ExternalApiService" /home/ubuntu/airwave-redbaez-clone/server/src/services/AbstractExternalApiService.ts; then
  echo "✅ PASS: AbstractExternalApiService implements ExternalApiService interface"
else
  echo "❌ FAIL: AbstractExternalApiService does not implement ExternalApiService interface"
fi

if grep -q "implements AssetService" /home/ubuntu/airwave-redbaez-clone/server/src/services/AbstractAssetService.ts; then
  echo "✅ PASS: AbstractAssetService implements AssetService interface"
else
  echo "❌ FAIL: AbstractAssetService does not implement AssetService interface"
fi

if grep -q "implements MediaProcessingService" /home/ubuntu/airwave-redbaez-clone/server/src/services/AbstractMediaProcessingService.ts; then
  echo "✅ PASS: AbstractMediaProcessingService implements MediaProcessingService interface"
else
  echo "❌ FAIL: AbstractMediaProcessingService does not implement MediaProcessingService interface"
fi

# Test 6: Compile TypeScript files to check for type errors
echo "Test 6: TypeScript compilation"
cd /home/ubuntu/airwave-redbaez-clone/server && npx tsc --noEmit src/types/serviceInterfaces.ts src/services/AbstractBaseService.ts src/services/AbstractExternalApiService.ts src/services/AbstractAssetService.ts src/services/AbstractMediaProcessingService.ts src/services/UnifiedAssetService.ts

if [ $? -eq 0 ]; then
  echo "✅ PASS: TypeScript compilation successful"
else
  echo "❌ FAIL: TypeScript compilation failed"
fi

echo "Architectural improvement tests completed."
