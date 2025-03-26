/**
 * Client types and interfaces
 */

/**
 * Client status options
 */
export type ClientStatus = 'active' | 'inactive';

/**
 * Client interface with consistent property naming
 */
export interface Client {
  // Core properties
  id: string;
  name: string;
  slug: string;
  
  // Optional properties
  logoUrl?: string;
  brandColour?: string; // UK English spelling as per user rules
  status?: ClientStatus;
  
  // Contact information
  email?: string;
  phone?: string;
  website?: string;
  
  // Dates - ISO format strings
  createdAt?: string;
  updatedAt?: string;
  
  // Additional metadata
  metadata?: Record<string, any>;
}

/**
 * Client filters for searching and filtering clients
 */
export interface ClientFilters {
  // Text search
  search?: string;
  
  // Status filter
  status?: ClientStatus | 'all';
  
  // Sorting
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  
  // Pagination
  limit?: number;
  offset?: number;
  page?: number;
}

/**
 * Client creation request
 */
export interface CreateClientRequest {
  name: string;
  slug?: string;
  logoUrl?: string;
  brandColour?: string; // UK English spelling
  status?: ClientStatus;
  email?: string;
  phone?: string;
  website?: string;
  metadata?: Record<string, any>;
}

/**
 * Client update request
 */
export interface UpdateClientRequest {
  name?: string;
  slug?: string;
  logoUrl?: string;
  brandColour?: string; // UK English spelling
  status?: ClientStatus;
  email?: string;
  phone?: string;
  website?: string;
  metadata?: Record<string, any>;
}

/**
 * Client response format
 */
export interface ClientResponse {
  success: boolean;
  message?: string;
  client?: Client;
}

/**
 * Clients list response format
 */
export interface ClientsListResponse {
  success: boolean;
  message?: string;
  clients: Client[];
  total?: number;
  page?: number;
  limit?: number;
}
