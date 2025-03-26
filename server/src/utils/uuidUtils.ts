/**
 * Utility functions for handling UUIDs throughout the application
 * Centralizes UUID generation, validation, and conversion
 */
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../db/supabaseClient';

/**
 * Generates a new UUID v4
 * @returns {string} A new UUID v4 string
 */
export function generateUuid(): string {
  return uuidv4();
}

/**
 * Validates if a string is a valid UUID
 * @param id String to check
 * @returns {boolean} True if the string is a valid UUID
 */
export function isValidUuid(id: string): boolean {
  if (!id) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Gets a UUID from a slug by looking up the corresponding record
 * @param slug The slug to look up
 * @param table The table to query
 * @returns {Promise<string>} The UUID corresponding to the slug
 * @throws {Error} If the slug cannot be found
 */
export async function getUuidFromSlug(slug: string, table: string): Promise<string> {
  if (!slug || !table) {
    throw new Error('Slug and table name are required');
  }
  
  // Look up UUID from slug in the database
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq('slug', slug.toLowerCase())
    .single();
    
  if (error || !data) {
    throw new Error(`Cannot find UUID for slug: ${slug} in table: ${table}`);
  }
  
  return data.id;
}

/**
 * Gets a slug from a UUID by looking up the corresponding record
 * @param uuid The UUID to look up
 * @param table The table to query
 * @returns {Promise<string|null>} The slug corresponding to the UUID, or null if not found
 */
export async function getSlugFromUuid(uuid: string, table: string): Promise<string | null> {
  if (!isValidUuid(uuid) || !table) {
    return null;
  }
  
  // Look up slug from UUID in the database
  const { data, error } = await supabase
    .from(table)
    .select('slug')
    .eq('id', uuid)
    .single();
    
  if (error || !data || !data.slug) {
    return null;
  }
  
  return data.slug;
}

/**
 * Cache for UUID-slug mappings to reduce database queries
 */
const uuidCache: Record<string, Record<string, string>> = {};

/**
 * Gets a UUID from a slug with caching for performance
 * @param slug The slug to look up
 * @param table The table to query
 * @returns {Promise<string>} The UUID corresponding to the slug
 */
export async function cachedGetUuidFromSlug(slug: string, table: string): Promise<string> {
  // Initialize cache for this table if it doesn't exist
  if (!uuidCache[table]) {
    uuidCache[table] = {};
  }
  
  // Check if we have this slug in the cache
  if (uuidCache[table][slug]) {
    return uuidCache[table][slug];
  }
  
  // Get the UUID and cache it
  const uuid = await getUuidFromSlug(slug, table);
  uuidCache[table][slug] = uuid;
  
  return uuid;
}

/**
 * Resolves an ID that could be either a UUID or a slug
 * @param id The ID to resolve (could be UUID or slug)
 * @param table The table to query if it's a slug
 * @returns {Promise<string>} The resolved UUID
 */
export async function resolveId(id: string, table: string): Promise<string> {
  if (isValidUuid(id)) {
    return id; // It's already a UUID
  }
  
  // Assume it's a slug and try to get the UUID
  try {
    return await cachedGetUuidFromSlug(id, table);
  } catch (error) {
    throw new Error(`Could not resolve ID: ${id}`);
  }
}
