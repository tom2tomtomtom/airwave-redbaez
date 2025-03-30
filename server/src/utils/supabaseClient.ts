// server/src/utils/supabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Supabase URL not found in environment variables.');
}
if (!supabaseAnonKey) {
  throw new Error('Supabase Anon Key not found in environment variables.');
}

let supabase: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      // Optional: Add global fetch options or other configurations
      // auth: {
      //   persistSession: false // Recommended for server-side usage
      // }
    });
  }
  return supabase;
};
