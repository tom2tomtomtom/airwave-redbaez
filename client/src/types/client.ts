/**
 * Client interface with slug as primary identifier
 */
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
 * Form data for creating/updating clients
 */
export interface ClientFormData {
  slug: string;           // Required - must be URL-friendly (lowercase, no spaces)
  name: string;           // Required
  logoUrl?: string;       
  brandColour?: string;   
  secondaryColour?: string;
  description?: string;   
  isActive?: boolean;     // Defaults to true if not provided
}
