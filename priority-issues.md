# Priority Issues to Fix

Based on the code audit findings, the following issues have been prioritized for immediate implementation:

## Critical Security Vulnerabilities

1. **Hardcoded JWT Secret**
   - Location: `server/src/middleware/auth.middleware.ts`
   - Issue: `const JWT_SECRET = process.env.JWT_SECRET || 'airwave-jwt-secret-key'`
   - Fix: Remove hardcoded fallback and require JWT_SECRET environment variable

2. **Hardcoded Development Passwords**
   - Location: `server/src/scripts/ensure-dev-user.ts`
   - Issue: `password: 'devpassword123'`
   - Fix: Use environment variables for all credentials

3. **Authentication Bypass Flags**
   - Location: `server/src/middleware/auth.middleware.ts`
   - Issue: `BYPASS_AUTH: process.env.DEV_BYPASS_AUTH === 'true' || process.env.PROTOTYPE_MODE === 'true'`
   - Fix: Ensure these flags cannot be enabled in production

4. **Environment Validation**
   - Issue: Insufficient validation of required environment variables
   - Fix: Implement strict validation for all required environment variables in production

5. **Security Middleware in Production**
   - Issue: Security features can be bypassed in development mode
   - Fix: Ensure all security middleware is enforced in production

These issues will be addressed first, followed by performance improvements, code quality issues, and architectural concerns in subsequent phases.
