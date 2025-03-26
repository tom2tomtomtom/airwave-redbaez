# Authentication System Changes

## Overview of Changes

We've streamlined the authentication system by creating a single source of truth for authentication modes. Previously, the codebase had inconsistent checking of environment variables like `PROTOTYPE_MODE`, `DEV_MODE`, and `DEV_BYPASS_AUTH` scattered throughout different files. This led to confusion and potential security issues.

## Key Improvements

1. **Single Source of Truth**: Created an `AUTH_MODE` object in `middleware/auth.ts` that defines the current authentication mode and bypass settings.

2. **Consolidated Auth Modes**: Reduced to three clear auth modes:
   - Production: Full Supabase authentication
   - Development: Normal authentication with optional bypass
   - Prototype: File-based storage with optional auth bypass

3. **Consistent Auth Checks**: Updated all files to use the centralized `AUTH_MODE` object instead of checking environment variables directly.

4. **Better Code Organization**: Removed redundant checks and duplicate mock user creation.

5. **Documentation**: Added comprehensive README files explaining the auth system.

6. **Helper Script**: Created `set-auth-mode.sh` to easily switch between auth modes.

## Code Changes

1. **server/src/middleware/auth.ts**:
   - Added `AUTH_MODE` object
   - Updated `authenticateToken` to use `AUTH_MODE`
   - Simplified auth bypass logic

2. **server/src/routes/assetRoutes.ts**:
   - Updated to use `AUTH_MODE` instead of direct env var checks
   - Removed duplicate mock user creation

3. **server/src/services/assetService.ts**:
   - Imported `AUTH_MODE` for consistent auth checks
   - Updated prototype mode check

4. Added helper documentation:
   - `AUTH_README.md`: Explains the auth system
   - `AUTH_CHANGES.md`: This document
   - `set-auth-mode.sh`: Script to easily configure auth modes

## How To Use

1. To switch auth modes, run:
   ```
   ./set-auth-mode.sh
   ```

2. When coding, always use the `AUTH_MODE` object:
   ```typescript
   import { AUTH_MODE } from '../middleware/auth';

   if (AUTH_MODE.CURRENT === 'prototype') {
     // Prototype mode specific code
   }
   ```

3. For protected routes, always use the `authenticateToken` middleware:
   ```typescript
   router.get('/protected-route', authenticateToken, (req, res) => {
     // Access user via req.user
   });
   ```

## Benefits

- **Security**: Consistent authentication enforcement
- **Clarity**: Clear indication of which auth mode is running
- **Maintainability**: Single place to update auth logic
- **Developer Experience**: Easy switching between auth modes