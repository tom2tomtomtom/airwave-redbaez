# AIrWAVE API Documentation

## Overview
This document outlines the AIrWAVE API endpoints, authentication requirements, and usage examples. All requests require proper organisation context and authentication.

## Authentication
All API requests must include:
- `Authorization`: Bearer token from Supabase authentication
- `X-Organisation-ID`: Current organisation ID

```typescript
// Example request headers
const headers = {
  'Authorization': `Bearer ${session.access_token}`,
  'X-Organisation-ID': organisationId,
  'Content-Type': 'application/json'
};
```

## Rate Limiting
- Standard tier: 100 requests per minute
- Enterprise tier: 1000 requests per minute
- Export operations: 10 per hour per organisation

## Endpoints

### Campaign Management

#### List Campaigns
```typescript
GET /api/campaigns

Query Parameters:
- page: number (default: 1)
- limit: number (default: 20)
- status: 'draft' | 'pending' | 'active' | 'completed'
- sortBy: 'created_at' | 'updated_at' | 'name'
- sortOrder: 'asc' | 'desc'

Response:
{
  data: Array<{
    id: string;
    name: string;
    status: string;
    created_at: string;
    updated_at: string;
    metrics: {
      impressions: number;
      clicks: number;
      conversions: number;
    };
  }>;
  metadata: {
    total: number;
    page: number;
    limit: number;
  };
}
```

#### Create Campaign
```typescript
POST /api/campaigns

Request Body:
{
  name: string;
  objective: string;
  target_audience?: {
    age_range?: [number, number];
    locations?: string[];
    interests?: string[];
  };
  budget?: {
    amount: number;
    currency: string;
  };
}

Response:
{
  id: string;
  name: string;
  status: 'draft';
  created_at: string;
  updated_at: string;
}
```

#### Update Campaign
```typescript
PATCH /api/campaigns/:id

Request Body:
{
  name?: string;
  objective?: string;
  target_audience?: {
    age_range?: [number, number];
    locations?: string[];
    interests?: string[];
  };
  budget?: {
    amount: number;
    currency: string;
  };
}

Response:
{
  id: string;
  name: string;
  status: string;
  updated_at: string;
}
```

### Asset Management

#### Upload Asset
```typescript
POST /api/assets

Request Body (multipart/form-data):
- file: File
- metadata: {
    name: string;
    description?: string;
    tags?: string[];
    campaign_id?: string;
  }

Response:
{
  id: string;
  url: string;
  name: string;
  size: number;
  type: string;
  metadata: {
    description?: string;
    tags?: string[];
    campaign_id?: string;
  };
  created_at: string;
}
```

#### List Assets
```typescript
GET /api/assets

Query Parameters:
- page: number (default: 1)
- limit: number (default: 20)
- campaign_id?: string
- type?: 'image' | 'video' | 'audio'
- tags?: string[]

Response:
{
  data: Array<{
    id: string;
    url: string;
    name: string;
    size: number;
    type: string;
    metadata: {
      description?: string;
      tags?: string[];
      campaign_id?: string;
    };
    created_at: string;
  }>;
  metadata: {
    total: number;
    page: number;
    limit: number;
  };
}
```

### Campaign Approval

#### Submit for Approval
```typescript
POST /api/campaigns/:id/approval

Request Body:
{
  message?: string;
  variations: Array<{
    id: string;
    assets: string[];
    settings: {
      platform: string;
      format: string;
      targeting?: object;
    };
  }>;
}

Response:
{
  id: string;
  status: 'pending';
  submitted_at: string;
  variations: Array<{
    id: string;
    status: 'pending';
  }>;
}
```

#### Check Approval Status
```typescript
GET /api/campaigns/:id/approval

Response:
{
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  reviewer?: {
    id: string;
    name: string;
  };
  feedback?: string;
  variations: Array<{
    id: string;
    status: string;
    feedback?: string;
  }>;
}
```

### Analytics

#### Campaign Metrics
```typescript
GET /api/campaigns/:id/metrics

Query Parameters:
- start_date?: string (ISO date)
- end_date?: string (ISO date)
- granularity?: 'hour' | 'day' | 'week' | 'month'

Response:
{
  summary: {
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    ctr: number;
    cpc: number;
    conversion_rate: number;
  };
  timeseries: Array<{
    date: string;
    metrics: {
      impressions: number;
      clicks: number;
      conversions: number;
      spend: number;
      ctr: number;
      cpc: number;
      conversion_rate: number;
    };
  }>;
}
```

#### Export Analytics
```typescript
POST /api/campaigns/:id/export

Request Body:
{
  format: 'csv' | 'xlsx';
  date_range: {
    start_date: string;
    end_date: string;
  };
  metrics: string[];
  granularity?: 'hour' | 'day' | 'week' | 'month';
}

Response:
{
  id: string;
  status: 'processing';
  estimated_completion: string;
}
```

#### Check Export Status
```typescript
GET /api/exports/:id

Response:
{
  id: string;
  status: 'processing' | 'completed' | 'failed';
  url?: string;
  error?: string;
  expires_at?: string;
}
```

## Error Handling

### Error Response Format
```typescript
{
  error: {
    code: string;
    message: string;
    details?: object;
  };
}
```

### Common Error Codes
- `AUTH_REQUIRED`: Authentication required
- `INVALID_ORG`: Invalid or missing organisation context
- `PERMISSION_DENIED`: Insufficient permissions
- `RATE_LIMITED`: Rate limit exceeded
- `INVALID_INPUT`: Invalid request parameters
- `NOT_FOUND`: Resource not found
- `CONFLICT`: Resource conflict
- `SERVER_ERROR`: Internal server error

## Security Considerations

### Authentication
- All endpoints require valid JWT tokens
- Tokens must be obtained through Supabase authentication
- Tokens expire after 1 hour
- Refresh tokens are available for seamless re-authentication

### Authorisation
- All requests are subject to organisation-based access control
- RLS policies enforce data isolation between organisations
- Role-based access control within organisations
- Specific permissions required for sensitive operations

### Rate Limiting
- Implemented per organisation and per endpoint
- Burst allowance for occasional spikes
- Separate limits for resource-intensive operations
- Headers indicate remaining quota

### Data Validation
- All inputs are strictly validated
- File uploads are scanned for malware
- Size limits enforced for all requests
- Content type verification for assets

## Best Practices

### Performance
1. **Pagination**
   - Use appropriate page sizes
   - Implement cursor-based pagination for large datasets
   - Cache frequently accessed data

2. **Asset Optimisation**
   - Compress images before upload
   - Use appropriate video codecs
   - Implement progressive loading

### Error Handling
1. **Retry Strategy**
   ```typescript
   const fetchWithRetry = async (url: string, options: object, retries = 3) => {
     try {
       const response = await fetch(url, options);
       if (!response.ok) throw new Error(response.statusText);
       return response;
     } catch (error) {
       if (retries > 0) {
         await new Promise(resolve => setTimeout(resolve, 1000));
         return fetchWithRetry(url, options, retries - 1);
       }
       throw error;
     }
   };
   ```

2. **Error Recovery**
   - Implement proper cleanup on failure
   - Provide meaningful error messages
   - Log errors for debugging

### Caching
1. **Response Caching**
   ```typescript
   // Example caching headers
   {
     'Cache-Control': 'public, max-age=300',
     'ETag': '"33a64df551425fcc55e4d42a148795d9f25f89d4"'
   }
   ```

2. **Cache Invalidation**
   - Use appropriate cache TTLs
   - Implement cache busting when needed
   - Clear cache on relevant updates

## Rate Limits and Quotas

### Standard Tier
- API Calls: 100/minute
- Asset Storage: 10GB
- Export Operations: 10/hour
- Maximum File Size: 100MB

### Enterprise Tier
- API Calls: 1000/minute
- Asset Storage: 1TB
- Export Operations: 100/hour
- Maximum File Size: 500MB

## Webhook Integration

### Event Types
- `campaign.created`
- `campaign.updated`
- `campaign.approved`
- `campaign.rejected`
- `asset.uploaded`
- `export.completed`

### Webhook Format
```typescript
{
  id: string;
  type: string;
  created_at: string;
  data: {
    id: string;
    [key: string]: any;
  };
  organisation_id: string;
}
```

### Webhook Security
- HMAC signature verification required
- Retry mechanism for failed deliveries
- Rate limiting per endpoint
