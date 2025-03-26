# AIrWAVE API Server

This is the backend API server for the AIrWAVE platform, providing asset management, client management, and other services.

## API Structure

The API follows a structured, modular approach with standardised patterns for route handling, validation, and error management.

### Core Components

#### Route Registry System

All routes are managed through a central registry system that dynamically loads route handlers:

- **BaseRouter**: Abstract base class that all route handlers extend
- **RouteRegistry**: Central registry for route registration and initialization
- **Middleware**: Standardised middleware for validation, error handling, and response formatting

#### Middleware

- **Validation**: Uses Joi for request validation
- **Error Handling**: Centralised error handling with standardised responses
- **Response Handler**: Standardised success/error response format
- **Auth**: JWT-based authentication

### API Endpoints

The API is organised into the following main endpoints:

#### Core Resources

- `/api/assets` - Asset management (images, videos, audio)
- `/api/clients` - Client management
- `/api/templates` - Template management
- `/api/campaigns` - Campaign management

#### Services

- `/api/creatomate` - Creatomate integration
- `/api/runway` - Runway integration
- `/api/exports` - Export management
- `/api/llm` - Language model services

#### Administration

- `/api/auth` - Authentication and user management
- `/api/signoff` - Approval workflows
- `/api/webhooks` - Webhook handlers

#### v2 API (Slug-based)

For improved URL structure, v2 APIs use slugs instead of IDs in URLs:

- `/api/v2/clients` - Client management with slug-based endpoints
- `/api/v2/assets/by-client/:slug` - Get assets by client slug

## Route Implementation Pattern

All routes follow a consistent implementation pattern:

```typescript
export class ExampleRouter extends BaseRouter {
  constructor() {
    super('/example-path');
  }
  
  protected initializeRoutes(): void {
    // GET - Get all items
    this.router.get(
      '/',
      validateRequest(validationSchema),
      this.protectedRoute(this.getAllItems.bind(this))
    );
    
    // Other routes...
  }
  
  // Handler methods...
}

// Export instance
export default new ExampleRouter().getRouter();
```

## Validation

All request validation uses Joi schemas defined for each route:

```typescript
const validationSchema = {
  getById: Joi.object({
    id: Joi.string().uuid().required()
  }),
  
  create: Joi.object({
    name: Joi.string().required(),
    // Other fields...
  })
};
```

## Error Handling

Errors are handled consistently through the ApiError class:

```typescript
throw new ApiError(404, 'Resource not found');
```

## Response Format

All responses follow a consistent format:

```json
{
  "success": true,
  "message": "Resource retrieved successfully",
  "data": { ... },
  "timestamp": "2023-03-26T10:15:30.123Z"
}
```

## Client Context

All asset operations require a client context (client_id). This is validated automatically:

```typescript
const clientId = this.validateClientId(req);
```

## Setup & Development

1. Install dependencies:
```
npm install
```

2. Run in development mode:
```
npm run dev
```

3. Build for production:
```
npm run build
```

4. Run in production mode:
```
npm start
```

## Environment Variables

See `.env.example` for required environment variables.
