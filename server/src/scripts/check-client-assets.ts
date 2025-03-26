import { supabase } from '../db/supabaseClient';

/**
 * Script to check client and asset relationships in the database
 * Run with: npx tsx src/scripts/check-client-assets.ts
 */
async function main() {
  console.log('Checking client and asset database relationships...');
  
  try {
    // 1. Check if the "juniper" client exists
    console.log('\n--- Checking for client with slug "juniper" ---');
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('client_slug', 'juniper')
      .single();
    
    if (clientError) {
      console.error('Error finding client:', clientError);
      return;
    }
    
    if (!client) {
      console.log('❌ No client found with slug "juniper"');
      return;
    }
    
    console.log('✅ Found client:', client);
    
    // 2. Check if any assets exist for this client
    console.log('\n--- Checking for assets with client_id:', client.id, '---');
    const { data: assets, error: assetError, count } = await supabase
      .from('assets')
      .select('*', { count: 'exact' })
      .eq('client_id', client.id);
    
    if (assetError) {
      console.error('Error finding assets:', assetError);
      return;
    }
    
    if (!assets || assets.length === 0) {
      console.log(`❌ No assets found for client ID: ${client.id}`);
    } else {
      console.log(`✅ Found ${assets.length} assets for client ID: ${client.id}`);
      console.log('Sample asset:', assets[0]);
    }
    
    // 3. Check the asset table columns to ensure client_id exists
    console.log('\n--- Checking asset table structure ---');
    const { data: sampleAsset, error: sampleError } = await supabase
      .from('assets')
      .select('*')
      .limit(1)
      .single();
    
    if (sampleError) {
      console.error('Error fetching sample asset:', sampleError);
      return;
    }
    
    if (!sampleAsset) {
      console.log('❌ No assets found in the database at all');
      return;
    }
    
    console.log('Asset table columns:', Object.keys(sampleAsset));
    
    if (Object.keys(sampleAsset).includes('client_id')) {
      console.log('✅ asset table has client_id column');
    } else {
      console.log('❌ asset table is missing client_id column');
    }
    
    // 4. Check API routes
    console.log('\n--- Testing API routes in database ---');
    
    // Check if the by-client route exists in the server routes table (if available)
    const { data: routes, error: routesError } = await supabase
      .from('routes')
      .select('*')
      .ilike('path', '%by-client%');
    
    if (routesError && routesError.code !== 'PGRST116') {
      console.error('Error checking routes:', routesError);
    } else if (routes && routes.length > 0) {
      console.log('✅ Found API routes with "by-client" pattern:', routes);
    } else {
      console.log('ℹ️ No routes found in the database (table might not exist)');
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  } finally {
    // Close the connection
    await supabase.auth.signOut();
  }
}

main().catch(console.error);
