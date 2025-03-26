# Authentication System Guide

This document explains the consolidated authentication system for the AIrWAVE application.

## Authentication Modes

The application now has a single, consistent authentication system with three operating modes:

1. **Production Mode**: Full Supabase authentication with JWT verification and database user lookups.
2. **Development Mode**: Normal authentication flow but with the option to bypass auth for testing.
3. **Prototype Mode**: File-based storage with auth bypass capability for rapid prototyping.

## Configuration

The authentication mode is determined by environment variables in this order:

1. `NODE_ENV === 'production'` → Production Mode
2. `PROTOTYPE_MODE === 'true'` → Prototype Mode
3. Otherwise → Development Mode

To enable authentication bypass (for development and prototype modes only):
- Set `DEV_BYPASS_AUTH=true` in your .env file

## Implementation Details

The authentication system is centralized in `server/src/middleware/auth.ts`, which exports:

- `AUTH_MODE` object with the current mode and bypass settings
- `authenticateToken` middleware for request authentication
- `requireAdmin` middleware for role-based access control

## How It Works

### Normal Authentication Flow

1. Client obtains a token via Supabase Auth
2. Token is sent in the Authorization header with requests
3. `authenticateToken` middleware validates the token with Supabase
4. User data is fetched from the database and attached to the request
5. Protected routes can access the user via `req.user`

### Development/Prototype Testing

When `DEV_BYPASS_AUTH=true` and in a non-production environment:

1. Authentication checks are bypassed
2. A mock admin user is attached to all requests
3. Protected routes function normally without requiring real authentication

## Best Practices

1. **Always use the `authenticateToken` middleware** for protected routes
2. Use the `AUTH_MODE` object to check the current mode, not direct environment variable checks
3. Set all authentication-related variables in `.env` files, not in code
4. Add appropriate guards around admin functions even if using auth bypass

## Environment Setup

```
# Production
NODE_ENV=production
DEV_BYPASS_AUTH=false # or omit
PROTOTYPE_MODE=false # or omit

# Development
NODE_ENV=development # or omit
DEV_BYPASS_AUTH=false # for normal auth, true for bypass

# Prototype 
PROTOTYPE_MODE=true
DEV_BYPASS_AUTH=true # recommended for prototyping
```

## Security Notes

- The auth bypass feature is ONLY available in non-production modes
- Production mode always enforces full authentication and authorization
- Admin routes should always use the `requireAdmin` middleware in addition to `authenticateToken`