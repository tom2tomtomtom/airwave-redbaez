import { supabase } from '../db/supabaseClient';

/**
 * Generates a URL-friendly slug from a client name
 */
export function generateClientSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-'); // Remove consecutive hyphens
}

/**
 * Ensures a slug is unique among existing clients
 */
async function ensureUniqueSlug(slug: string, clientId?: string): Promise<string> {
  // Check if this slug already exists for a different client
  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('client_slug', slug)
    .not('id', 'eq', clientId || 'no-id-provided');
  
  if (!existing || existing.length === 0) {
    return slug; // Slug is unique
  }
  
  // If not unique, append a number
  let counter = 1;
  let newSlug = `${slug}-${counter}`;
  
  while (true) {
    const { data: check } = await supabase
      .from('clients')
      .select('id')
      .eq('client_slug', newSlug)
      .not('id', 'eq', clientId || 'no-id-provided');
    
    if (!check || check.length === 0) {
      return newSlug; // Found a unique slug
    }
    
    counter++;
    newSlug = `${slug}-${counter}`;
  }
}

/**
 * Adds the client_slug column to the clients table if it doesn't exist
 */
export async function addClientSlugColumn(): Promise<void> {
  console.log('Checking if client_slug column exists...');
  
  // Check if column exists
  const { data: columnExists, error: checkError } = await supabase
    .rpc('column_exists', { 
      table_name: 'clients', 
      column_name: 'client_slug' 
    });
  
  if (checkError) {
    console.error('Error checking column existence:', checkError);
    
    // Try an alternative approach
    try {
      // Using raw SQL might require additional permissions
      await supabase.rpc('add_client_slug_column');
      console.log('Added client_slug column using RPC');
    } catch (err) {
      console.error('Failed to add column using RPC:', err);
      throw new Error('Could not add client_slug column');
    }
    return;
  }
  
  if (columnExists) {
    console.log('client_slug column already exists');
    return;
  }
  
  console.log('Adding client_slug column...');
  
  try {
    // Add the column using raw SQL via RPC
    await supabase.rpc('add_client_slug_column');
    console.log('Added client_slug column');
  } catch (err) {
    console.error('Failed to add column using RPC:', err);
    throw new Error('Could not add client_slug column');
  }
}

/**
 * Migrates all existing clients to have slugs
 */
export async function migrateClientsToSlugs(): Promise<void> {
  // First check if column exists and add it if needed
  await addClientSlugColumn();
  
  // Get all clients that don't have a slug yet
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, name, client_slug')
    .is('client_slug', null);
  
  if (error) {
    console.error('Error fetching clients:', error);
    return;
  }
  
  console.log(`Found ${clients?.length || 0} clients without slugs`);
  
  // Update each client with a slug
  for (const client of clients || []) {
    const baseSlug = generateClientSlug(client.name);
    const uniqueSlug = await ensureUniqueSlug(baseSlug, client.id);
    
    // Special handling for Juniper client
    if (client.id === 'fd790d19-6610-4cd5-b90f-214808e94a19') {
      console.log('Setting slug for Juniper client:', uniqueSlug);
    }
    
    const { error: updateError } = await supabase
      .from('clients')
      .update({ client_slug: uniqueSlug })
      .eq('id', client.id);
    
    if (updateError) {
      console.error(`Error updating slug for client ${client.id}:`, updateError);
    } else {
      console.log(`Updated client ${client.id} with slug: ${uniqueSlug}`);
    }
  }
  
  // Create an index on the client_slug column for faster lookups
  try {
    await supabase.rpc('create_client_slug_index');
    console.log('Created index on client_slug column');
  } catch (err) {
    console.error('Failed to create index:', err);
  }
}

/**
 * Function to run the migration
 */
export async function runClientSlugMigration(): Promise<void> {
  console.log('Running client slug migration...');
  
  try {
    await migrateClientsToSlugs();
    console.log('Client slug migration completed successfully');
  } catch (err) {
    console.error('Client slug migration failed:', err);
  }
}

// Add a function to get client by slug
export async function getClientBySlug(slug: string) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('client_slug', slug)
    .single();
  
  if (error) {
    console.error('Error fetching client by slug:', error);
    return null;
  }
  
  return data;
}
