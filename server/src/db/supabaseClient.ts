// Fix missing data variable in insert and update methods
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { logger } from '../utils/logger';
import { auditLogger, AuditEventType } from '../utils/auditLogger';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://example.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || 'mock-anon-key-for-development';

// Create a mock Supabase client for development/testing
class MockSupabaseClient {
  private storage: Map<string, Record<string, unknown>[]> = new Map();
  
  constructor() {
    logger.info('Using mock Supabase client for development/testing');
    
    // Initialize with some mock data
    this.storage.set('users', [
      { id: '1', email: 'admin@example.com', role: 'admin', name: 'Admin User' },
      { id: '2', email: 'user@example.com', role: 'user', name: 'Regular User' }
    ]);
    
    this.storage.set('clients', [
      { id: '1', name: 'Test Client', client_slug: 'test-client', logo_url: 'https://via.placeholder.com/150' },
      { id: '2', name: 'Demo Client', client_slug: 'demo-client', logo_url: 'https://via.placeholder.com/150' }
    ]);
    
    this.storage.set('assets', [
      { id: '1', client_id: '1', name: 'Test Asset 1', type: 'image', url: 'https://via.placeholder.com/300' },
      { id: '2', client_id: '1', name: 'Test Asset 2', type: 'video', url: 'https://example.com/video.mp4' }
    ]);

    this.storage.set('templates', [
      { id: '1', client_id: '1', name: 'Test Template 1', description: 'A test template' },
      { id: '2', client_id: '1', name: 'Test Template 2', description: 'Another test template' }
    ]);

    this.storage.set('campaigns', [
      { id: '1', client_id: '1', name: 'Test Campaign 1', description: 'A test campaign' },
      { id: '2', client_id: '1', name: 'Test Campaign 2', description: 'Another test campaign' }
    ]);
  }
  
  from(table: string) {
    return {
      select: (columns: string = '*', options?: { count?: string }) => {
        const baseQuery = {
          eq: (column: string, value: unknown) => {
            const items = this.storage.get(table) || [];
            const filteredItems = items.filter(item => item[column] === value);
            
            return {
              single: () => {
                const item = filteredItems.length > 0 ? filteredItems[0] : null;
                return {
                  data: item,
                  error: item ? null : { message: 'Item not found', code: 'PGRST116' }
                };
              },
              order: (column: string, options?: { ascending?: boolean }) => {
                return {
                  limit: (limit: number) => {
                    return {
                      data: filteredItems.slice(0, limit),
                      error: null,
                      count: filteredItems.length
                    };
                  },
                  range: (from: number, to: number) => {
                    return {
                      data: filteredItems.slice(from, to + 1),
                      error: null,
                      count: filteredItems.length
                    };
                  }
                };
              },
              ilike: (column: string, pattern: string) => {
                const patternWithoutWildcards = pattern.replace(/%/g, '').toLowerCase();
                const nestedFilteredItems = filteredItems.filter(item => {
                  const value = String(item[column] || '').toLowerCase();
                  return value.includes(patternWithoutWildcards);
                });
                
                return {
                  order: (column: string, options?: { ascending?: boolean }) => {
                    return {
                      limit: (limit: number) => {
                        return {
                          data: nestedFilteredItems.slice(0, limit),
                          error: null,
                          count: nestedFilteredItems.length
                        };
                      },
                      range: (from: number, to: number) => {
                        return {
                          data: nestedFilteredItems.slice(from, to + 1),
                          error: null,
                          count: nestedFilteredItems.length
                        };
                      }
                    };
                  },
                  range: (from: number, to: number) => {
                    return {
                      data: nestedFilteredItems.slice(from, to + 1),
                      error: null,
                      count: nestedFilteredItems.length
                    };
                  }
                };
              },
              range: (from: number, to: number) => {
                return {
                  data: filteredItems.slice(from, to + 1),
                  error: null,
                  count: filteredItems.length
                };
              }
            };
          },
          ilike: (column: string, pattern: string) => {
            const items = this.storage.get(table) || [];
            const patternWithoutWildcards = pattern.replace(/%/g, '').toLowerCase();
            const filteredItems = items.filter(item => {
              const value = String(item[column] || '').toLowerCase();
              return value.includes(patternWithoutWildcards);
            });
            
            return {
              order: (column: string, options?: { ascending?: boolean }) => {
                return {
                  limit: (limit: number) => {
                    return {
                      data: filteredItems.slice(0, limit),
                      error: null,
                      count: filteredItems.length
                    };
                  },
                  range: (from: number, to: number) => {
                    return {
                      data: filteredItems.slice(from, to + 1),
                      error: null,
                      count: filteredItems.length
                    };
                  }
                };
              },
              range: (from: number, to: number) => {
                return {
                  data: filteredItems.slice(from, to + 1),
                  error: null,
                  count: filteredItems.length
                };
              }
            };
          },
          order: (column: string, options?: { ascending?: boolean }) => {
            const items = this.storage.get(table) || [];
            // Simple sorting, doesn't handle complex cases
            const sortedItems = [...items].sort((a, b) => {
              const aValue = a[column];
              const bValue = b[column];
              if (aValue < bValue) return options?.ascending ? -1 : 1;
              if (aValue > bValue) return options?.ascending ? 1 : -1;
              return 0;
            });
            
            return {
              limit: (limit: number) => {
                return {
                  data: sortedItems.slice(0, limit),
                  error: null,
                  count: sortedItems.length
                };
              },
              range: (from: number, to: number) => {
                return {
                  data: sortedItems.slice(from, to + 1),
                  error: null,
                  count: sortedItems.length
                };
              }
            };
          },
          limit: (limit: number) => {
            const items = this.storage.get(table) || [];
            return {
              data: items.slice(0, limit),
              error: null,
              count: items.length
            };
          },
          range: (from: number, to: number) => {
            const items = this.storage.get(table) || [];
            return {
              data: items.slice(from, to + 1),
              error: null,
              count: items.length
            };
          }
        };
        
        return baseQuery;
      },
      insert: (data: Record<string, unknown>) => {
        if (!this.storage.has(table)) {
          this.storage.set(table, []);
        }
        
        const items = this.storage.get(table)!;
        items.push(data);
        
        return {
          data: data,
          error: null
        };
      },
      update: (data: Record<string, unknown>) => {
        return {
          eq: (column: string, value: unknown) => {
            const items = this.storage.get(table) || [];
            const index = items.findIndex(item => item[column] === value);
            
            if (index !== -1) {
              items[index] = { ...items[index], ...data };
              return {
                data: items[index],
                error: null
              };
            }
            
            return {
              data: null,
              error: { message: 'Item not found' }
            };
          }
        };
      },
      delete: () => {
        return {
          eq: (column: string, value: unknown) => {
            const items = this.storage.get(table) || [];
            const filteredItems = items.filter(item => item[column] !== value);
            this.storage.set(table, filteredItems);
            
            return {
              data: {},
              error: null
            };
          }
        };
      }
    };
  }
  
  rpc(functionName: string, params: Record<string, unknown>) {
    // Mock RPC calls
    logger.debug(`Mock RPC call to ${functionName} with params:`, params);
    return {
      data: null,
      error: null
    };
  }
  
  auth = {
    signIn: () => {
      return {
        data: { user: { id: '1', email: 'admin@example.com', role: 'admin' } },
        error: null
      };
    },
    signOut: () => {
      return {
        error: null
      };
    },
    getUser: (token: string) => {
      return {
        data: { 
          user: { 
            id: '1', 
            email: 'admin@example.com', 
            user_metadata: { role: 'admin', name: 'Admin User' } 
          } 
        },
        error: null
      };
    },
    admin: {
      createUser: (userData: Record<string, unknown>) => {
        return {
          data: { 
            user: { 
              id: '3', 
              email: userData.email as string, 
              user_metadata: userData.user_metadata 
            } 
          },
          error: null
        };
      }
    }
  };
}

// Determine whether to use real Supabase or mock
const useRealSupabase = process.env.USE_REAL_SUPABASE === 'true';

// Force real Supabase in production environment
if (process.env.NODE_ENV === 'production' && !useRealSupabase) {
  throw new Error('Production environment requires USE_REAL_SUPABASE to be set to true');
}

let supabase: SupabaseClient | MockSupabaseClient;

if (useRealSupabase) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    // Optional: Add global fetch options or other configurations
    // auth: {
    //   persistSession: false // Recommended for server-side usage
    // }
  });
} else {
  supabase = new MockSupabaseClient();
}

/**
 * Test the database connection
 * @returns Promise that resolves to true if connection is successful, false otherwise
 */
async function testDatabaseConnection(): Promise<boolean> {
  try {
    // For mock client, always return true
    if (!useRealSupabase) {
      return true;
    }
    
    // For real client, test the connection
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      logger.error('Database connection test failed:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error('Error testing database connection:', error);
    return false;
  }
}

// Export the Supabase client
export { supabase, testDatabaseConnection };

// Export a getter function for type safety
export const getSupabaseClient = (): SupabaseClient | MockSupabaseClient => {
  return supabase;
};
