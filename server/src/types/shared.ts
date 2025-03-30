/**
 * Shared type definitions between client and server
 */

export interface Asset {
  id: string;
  name: string;
  type: string;
  url: string;
  thumbnailUrl?: string;
  description?: string;
  tags?: string[];
  clientSlug: string;
  clientId?: string;  // Legacy - kept for backward compatibility
  isFavourite?: boolean;
  size?: number;
  width?: number;
  height?: number;
  duration?: number;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  status?: string;
  metadata?: Record<string, any>;
}

export interface Client {
  slug: string;           // Primary identifier - URL-friendly unique string
  name: string;           // Display name
  logoUrl?: string;       // URL to client logo
  brandColour?: string;   // Primary brand colour (hex code)
  secondaryColour?: string; // Secondary brand colour (hex code)
  description?: string;   // Brief client description
  isActive: boolean;      // Whether the client is active
  createdAt: string;      // ISO date string
  updatedAt: string;      // ISO date string
  id?: string;            // Legacy UUID (kept for backward compatibility)
}

/**
 * Standardised response structure for services
 */
export interface ServiceResult<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: any; // Consider a more specific error type
  statusCode?: number;
}

/**
 * Canonical representation of an authenticated user attached to requests.
 */
export interface AuthenticatedUser {
  userId: string; 
  email: string;
  role: string;
  sessionId: string;
  // Add other essential properties if needed, e.g., clientId
}
