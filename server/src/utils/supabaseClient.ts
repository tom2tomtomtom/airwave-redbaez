import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { logger } from './logger';

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
      { id: '1', name: 'Test Client', slug: 'test-client', logo_url: 'https://via.placeholder.com/150' },
      { id: '2', name: 'Demo Client', slug: 'demo-client', logo_url: 'https://via.placeholder.com/150' }
    ]);
    
    this.storage.set('assets', [
      { id: '1', client_id: '1', name: 'Test Asset 1', type: 'image', url: 'https://via.placeholder.com/300' },
      { id: '2', client_id: '1', name: 'Test Asset 2', type: 'video', url: 'https://example.com/video.mp4' }
    ]);
  }
  
  from(table: string) {
    return {
      select: (columns: string = '*') => {
        return {
          eq: (column: string, value: any) => {
            return {
              single: () => {
                const items = this.storage.get(table) || [];
                const item = items.find(item => item[column] === value);
                return {
                  data: item || null,
                  error: item ? null : { message: 'Item not found' }
                };
              },
              order: () => {
                return {
                  limit: () => {
                    const items = this.storage.get(table) || [];
                    const filteredItems = items.filter(item => item[column] === value);
                    return {
                      data: filteredItems,
                      error: null
                    };
                  }
                };
              }
            };
          },
          order: () => {
            return {
              limit: (limit: number) => {
                const items = this.storage.get(table) || [];
                return {
                  data: items.slice(0, limit),
                  error: null
                };
              }
            };
          }
        };
      },
      insert: ($1: unknown) => {
        if (!this.storage.has(table)) {
          this.storage.set(table, []);
        }
        
        const items = this.storage.get(table)!;
        items.push(data);
        
        return {
          data,
          error: null
        };
      },
      update: ($1: unknown) => {
        return {
          eq: (column: string, value: any) => {
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
          eq: (column: string, value: any) => {
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
    }
  };
}

// Determine whether to use real Supabase or mock
const useRealSupabase = process.env.USE_REAL_SUPABASE === 'true';
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

export const getSupabaseClient = (): SupabaseClient | MockSupabaseClient => {
  return supabase;
};

// For backward compatibility
export { supabase };
