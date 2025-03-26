// This file re-exports the supabase client from lib/supabase.ts
// to maintain backward compatibility with code that imports from this file
import { supabase } from './lib/supabase';

// Re-export the supabase client with authentication bypass
export { supabase };
