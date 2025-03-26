/**
 * Script to add slug column to clients table
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function addSlugToClientsTable() {
  console.log('=== Adding slug column to clients table ===');
  
  try {
    // First check if we need to add the column (it may not exist yet)
    const { data: columnCheck, error: checkError } = await supabase.rpc(
      'get_column_exists',
      { table_name: 'clients', column_name: 'slug' }
    );
    
    if (checkError) {
      console.log('Cannot check if column exists, will try to add it anyway:', checkError.message);
    } else {
      console.log('Column check result:', columnCheck);
      if (columnCheck) {
        console.log('Slug column already exists in clients table');
        await updateClientSlugs();
        return;
      }
    }
    
    // Use raw SQL to add the column if it doesn't exist
    const { error } = await supabase.rpc(
      'execute_sql',
      { 
        sql: `
          ALTER TABLE clients 
          ADD COLUMN IF NOT EXISTS slug TEXT;
          
          CREATE UNIQUE INDEX IF NOT EXISTS clients_slug_idx 
          ON clients (slug) 
          WHERE slug IS NOT NULL;
        `
      }
    );
    
    if (error) {
      console.error('Error adding slug column:', error);
      
      // If RPC function doesn't exist, try alternative approach
      console.log('Trying alternative approach with direct SQL...');
      
      // Use raw SQL via REST API - note this is not ideal but works in development
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'X-Client-Info': 'supabase-js/1.0.0',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          query: `
            ALTER TABLE clients 
            ADD COLUMN IF NOT EXISTS slug TEXT;
            
            CREATE UNIQUE INDEX IF NOT EXISTS clients_slug_idx 
            ON clients (slug) 
            WHERE slug IS NOT NULL;
          `
        })
      });
      
      const result = await response.json();
      console.log('SQL execution result:', result);
    } else {
      console.log('Successfully added slug column to clients table');
    }
    
    // Now update the client slugs
    await updateClientSlugs();
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

/**
 * Update client slugs based on their names
 */
async function updateClientSlugs() {
  console.log('\n--- Updating client slugs ---');
  
  // Get all clients
  const { data: clients, error } = await supabase
    .from('clients')
    .select('*');
    
  if (error) {
    console.error('Error fetching clients:', error);
    return;
  }
  
  if (!clients || clients.length === 0) {
    console.log('No clients found in database');
    return;
  }
  
  console.log(`Found ${clients.length} clients`);
  
  let updateCount = 0;
  
  // Process each client
  for (const client of clients) {
    console.log(`\nUpdating client: ${client.name} (ID: ${client.id})`);
    
    // If client already has a slug, skip
    if (client.slug) {
      console.log(`Client already has slug: ${client.slug}`);
      continue;
    }
    
    // Generate a slug from the name
    const slug = client.name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '');
      
    console.log(`Setting slug: ${slug}`);
    
    // Update the client
    const { error: updateError } = await supabase
      .from('clients')
      .update({ slug })
      .eq('id', client.id);
      
    if (updateError) {
      console.error(`Error updating client ${client.id}:`, updateError);
    } else {
      console.log(`✅ Updated client ${client.name} with slug: ${slug}`);
      updateCount++;
    }
  }
  
  console.log(`\nUpdated ${updateCount} clients with slugs`);
}

// Run function
addSlugToClientsTable().catch(console.error);
