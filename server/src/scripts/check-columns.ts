import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableColumns() {
  console.log('=== Checking Database Table Columns ===');
  
  try {
    // Get one record from assets table to see the structure
    console.log('\nAttempting to fetch one asset record...');
    const { data: assetSample, error: assetError } = await supabase
      .from('assets')
      .select('*')
      .limit(1);
      
    if (assetError) {
      console.error('Error fetching asset sample:', assetError);
    } else if (assetSample && assetSample.length > 0) {
      console.log('Asset sample found with columns:');
      const columns = Object.keys(assetSample[0]);
      columns.forEach(column => console.log(`- ${column}`));
      
      console.log('\nFull sample data:');
      console.log(JSON.stringify(assetSample[0], null, 2));
    } else {
      console.log('No assets found in the database');
      
      // Try direct query to see if table exists
      console.log('\nTrying minimal asset insertion with just required fields...');
      
      // Try inserting a minimal test asset to see what columns are required
      const testAsset = {
        user_id: '00000000-0000-0000-0000-000000000000',
        name: 'test-check-columns.txt',
        type: 'text/plain'
      };
      
      const { data: testInsert, error: insertError } = await supabase
        .from('assets')
        .insert(testAsset)
        .select();
        
      if (insertError) {
        console.error('Error inserting test asset:', insertError);
        
        if (insertError.message.includes('violates foreign key constraint')) {
          console.log('\nForeign key constraint violation detected.');
          console.log('This confirms that user_id needs to reference a valid user.');
        }
        
        if (insertError.message.includes('null value in column')) {
          console.log('\nNull value constraint violation detected.');
          console.log('This indicates required columns that cannot be null.');
          
          // Extract column name from error message if possible
          const match = insertError.message.match(/null value in column "([^"]+)"/);
          if (match) {
            console.log(`Required column identified: ${match[1]}`);
          }
        }
      } else {
        console.log('Successfully inserted minimal asset:', testInsert);
        
        // Clean up test asset
        if (testInsert && testInsert.length > 0) {
          await supabase.from('assets').delete().eq('id', testInsert[0].id);
          console.log('Test asset cleaned up');
        }
      }
    }
    
    // Check users table structure for comparison
    console.log('\nFetching users table structure...');
    const { data: userSample, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .single();
      
    if (userError) {
      console.error('Error fetching user sample:', userError);
    } else {
      console.log('User columns:');
      const userColumns = Object.keys(userSample);
      userColumns.forEach(column => console.log(`- ${column}`));
    }
    
    // Try to determine assets table foreign keys
    console.log('\nChecking for assets table foreign keys (inferring from errors)...');
    
    // Test with invalid user_id to see constraint error
    const invalidTest = {
      user_id: '11111111-1111-1111-1111-111111111111', // Non-existent user
      name: 'invalid-test.txt',
      type: 'text/plain'
    };
    
    const { error: invalidError } = await supabase
      .from('assets')
      .insert(invalidTest);
      
    if (invalidError) {
      console.log('Error with invalid user_id:', invalidError.message);
      
      if (invalidError.message.includes('violates foreign key constraint')) {
        console.log('Confirmed: user_id is a foreign key to another table');
        
        // Try to extract the constraint name
        const match = invalidError.message.match(/constraint "([^"]+)"/);
        if (match) {
          console.log(`Constraint name: ${match[1]}`);
        }
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
  
  console.log('=== Column Check Complete ===');
}

// Run the script
checkTableColumns().catch(err => {
  console.error('Unhandled error:', err);
}).finally(() => {
  process.exit(0);
});
