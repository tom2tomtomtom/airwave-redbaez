// Client related types
export interface Client {
  id: string;
  name: string;
  slug?: string;
  logo?: string;
  status?: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

// Filters for querying clients
export interface ClientFilters {
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}
