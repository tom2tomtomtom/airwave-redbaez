/**
 * Clear all assets and clients from the database
 * This script is used to start fresh with an empty database
 */
// Import path module for resolving paths
const path = require('path');

// Register TypeScript to handle .ts imports
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    esModuleInterop: true,
  }
});

// Import supabase client from the TypeScript file
const { supabase } = require('../db/supabaseClient');

async function clearDatabase() {
  try {
    console.log('Starting database cleanup...');
    
    // Delete all assets first (due to potential foreign key constraints)
    const { error: assetsError, count: assetsCount } = await supabase
      .from('assets')
      .delete()
      .neq('id', 0) // This ensures we're deleting all records
      .select('count');
    
    if (assetsError) {
      throw assetsError;
    }
    
    console.log(`✅ Successfully deleted ${assetsCount || 'all'} assets`);
    
    // Delete all clients
    const { error: clientsError, count: clientsCount } = await supabase
      .from('clients')
      .delete()
      .neq('id', 0) // This ensures we're deleting all records
      .select('count');
    
    if (clientsError) {
      throw clientsError;
    }
    
    console.log(`✅ Successfully deleted ${clientsCount || 'all'} clients`);
    
    console.log('🎉 Database has been cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
  } finally {
    process.exit(0);
  }
}

// Run the function
clearDatabase();
