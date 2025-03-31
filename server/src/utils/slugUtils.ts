import { supabase } from '../db/supabaseClient';

/**
 * Generates a slug from a client name
 * @param name The client name to convert to a slug
 * @returns A URL-friendly slug
 */
export function generateSlug(name: string): string {
  // Convert to lowercase
  let slug = name.toLowerCase();
  
  // Replace spaces with hyphens
  slug = slug.replace(/\s+/g, '-');
  
  // Remove special characters
  slug = slug.replace(/[^\w-]/g, '');
  
  // Trim hyphens from start and end
  slug = slug.replace(/^-+|-+$/g, '');
  
  return slug;
}

/**
 * Ensures a slug is unique in the clients table
 * @param slug The base slug to check
 * @param existingId Optional ID of existing client (for updates)
 * @returns A unique slug, possibly with a number suffix
 */
export async function ensureUniqueSlug(slug: string, existingId?: string): Promise<string> {
  // Check if slug already exists
  const { data, error } = await supabase
    .from('clients')
    .select('client_slug')
    .eq('client_slug', slug)
    .not('id', existingId || 'none', { foreignTable: null }) // Skip the current client if updating
    .maybeSingle();
  
  if (error) {
    console.error('Error checking slug uniqueness:', error);
    throw new Error(`Error checking slug uniqueness: ${error.message}`);
  }
  
  // If slug exists, append a number and try again
  if (data) {
    // Find all slugs that start with this base
    const { data: similarSlugs } = await supabase
      .from('clients')
      .select('client_slug')
      .like('client_slug', `${slug}-%`)
      .not('id', existingId || 'none', { foreignTable: null });
    
    const numbers = (similarSlugs || [])
      .map(item => {
        const match = item.client_slug.match(new RegExp(`^${slug}-(\\d+)$`));
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => num > 0);
    
    const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return `${slug}-${nextNumber}`;
  }
  
  return slug;
}

/**
 * Creates a slug from a client name and ensures it's unique
 * @param name The client name
 * @param existingId Optional ID of existing client (for updates)
 * @returns A unique slug for the client
 */
export async function createUniqueSlug(name: string, existingId?: string): Promise<string> {
  const baseSlug = generateSlug(name);
  return ensureUniqueSlug(baseSlug, existingId);
}
