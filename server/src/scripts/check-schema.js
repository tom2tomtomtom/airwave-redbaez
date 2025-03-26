// Script to check database schema
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Create a Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Development user constants
const DEV_USER_ID = '00000000-0000-0000-0000-000000000000';

async function checkSchemaAndRelationships() {
  console.log('Checking database schema and relationships...');
  
  try {
    // First, let's check what tables exist
    console.log('Checking all tables in the database...');
    const { data: tables, error: tablesError } = await supabase
      .from('pg_tables')
      .select('schemaname, tablename')
      .eq('schemaname', 'public');
    
    if (tablesError) {
      console.log('Error retrieving tables:', tablesError.message);
    } else {
      console.log('Tables in the database:');
      tables.forEach(table => {
        console.log(`- ${table.schemaname}.${table.tablename}`);
      });
    }
    
    // Now let's check the assets table structure
    console.log('\nChecking assets table structure...');
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_info', { table_name: 'assets' });
    
    if (columnsError) {
      console.log('Error getting assets table info:', columnsError.message);
    } else {
      console.log('Assets table columns:');
      columns.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
      });
    }
    
    // Check if the auth table has our development user
    console.log('\nChecking for development user in auth.users...');
    try {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(DEV_USER_ID);
      
      if (authError) {
        console.log('Error or user not found in auth.users:', authError.message);
      } else if (authUser) {
        console.log('User exists in auth.users:', authUser.user?.id);
      }
    } catch (e) {
      console.log('Exception checking auth.users:', e.message);
    }

    // Direct SQL query to check foreign key constraints
    console.log('\nChecking foreign key constraints...');
    
    // First, check if we can create a direct DB client
    try {
      const { data: fkData, error: fkError } = await supabase.rpc('get_foreign_keys', { target_table: 'assets' });
      
      if (fkError) {
        console.log('Error getting foreign keys:', fkError.message);
      } else {
        console.log('Foreign key constraints on assets table:');
        fkData.forEach(fk => {
          console.log(`- Column ${fk.column_name} references ${fk.foreign_table}.${fk.foreign_column}`);
        });
      }
    } catch (e) {
      console.log('Exception checking foreign keys:', e.message);
    }
    
    // Create another test user with a different ID
    console.log('\nCreating an alternate test user...');
    const TEST_USER_ID = '11111111-1111-1111-1111-111111111111';
    
    const { data: testUser, error: testUserError } = await supabase
      .from('users')
      .upsert({
        id: TEST_USER_ID,
        email: 'test-user@example.com',
        name: 'Test User',
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (testUserError) {
      console.log('Error creating test user:', testUserError.message);
    } else {
      console.log('Test user created or updated');
      
      // Try with the new test user
      console.log('Attempting to insert a test asset with alternate user...');
      const { data: assetData, error: assetError } = await supabase
        .from('assets')
        .insert({
          name: 'Test Asset 2',
          type: 'image',
          user_id: TEST_USER_ID,
          url: '/test/url2.jpg',
          thumbnail_url: '/test/thumb2.jpg',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (assetError) {
        console.log('Asset insertion with alternate user still failing:', assetError.message);
      } else {
        console.log('Successfully inserted test asset with alternate user!');
      }
    }
    
    // Create SQL functions to help with debugging
    console.log('\nCreating utility SQL functions...');
    
    // Function to get table info
    try {
      const tableFunctionSql = `
      CREATE OR REPLACE FUNCTION get_table_info(table_name text)
      RETURNS TABLE (
        column_name text,
        data_type text,
        is_nullable text
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT c.column_name::text, c.data_type::text, c.is_nullable::text
        FROM information_schema.columns c
        WHERE c.table_schema = 'public' 
          AND c.table_name = table_name;
      END;
      $$ LANGUAGE plpgsql;
      `;
      
      const { error: tableError } = await supabase.rpc('exec_sql', { sql: tableFunctionSql });
      if (tableError) console.log('Error creating table_info function:', tableError.message);
    } catch (e) {
      console.log('Exception creating table_info function:', e.message);
    }
    
    // Function to get foreign keys
    try {
      const fkFunctionSql = `
      CREATE OR REPLACE FUNCTION get_foreign_keys(target_table text)
      RETURNS TABLE (
        column_name text,
        foreign_table text,
        foreign_column text
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT
          kcu.column_name::text,
          ccu.table_name::text AS foreign_table,
          ccu.column_name::text AS foreign_column
        FROM
          information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_name = target_table
          AND tc.table_schema = 'public';
      END;
      $$ LANGUAGE plpgsql;
      `;
      
      const { error: fkError } = await supabase.rpc('exec_sql', { sql: fkFunctionSql });
      if (fkError) console.log('Error creating foreign_keys function:', fkError.message);
    } catch (e) {
      console.log('Exception creating foreign_keys function:', e.message);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error.message || error);
  }
}

// Run the function
checkSchemaAndRelationships().then(() => {
  console.log('Schema check completed');
  process.exit(0);
}).catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
