import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials. Please check your .env file');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to check if table exists
export async function checkTableExists(tableName: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', tableName);

  if (error) {
    console.error('Error checking if table exists:', error);
    return false;
  }

  return data && data.length > 0;
}

// Helper function to initialize database tables if needed
export async function initializeDatabase() {
  try {
    // Check if assets table exists
    const assetsTableExists = await checkTableExists('assets');
    if (!assetsTableExists) {
      console.log('Creating assets table...');
      
      // Create the assets table
      const { error } = await supabase.rpc('create_assets_table');
      
      if (error) {
        console.error('Error creating assets table:', error);
      } else {
        console.log('Assets table created successfully');
      }
    }
    
    // Check if templates table exists
    const templatesTableExists = await checkTableExists('templates');
    if (!templatesTableExists) {
      console.log('Creating templates table...');
      
      // Create the templates table
      const { error } = await supabase.rpc('create_templates_table');
      
      if (error) {
        console.error('Error creating templates table:', error);
      } else {
        console.log('Templates table created successfully');
      }
    }
    
    // Check if campaigns table exists
    const campaignsTableExists = await checkTableExists('campaigns');
    if (!campaignsTableExists) {
      console.log('Creating campaigns table...');
      
      // Create the campaigns table
      const { error } = await supabase.rpc('create_campaigns_table');
      
      if (error) {
        console.error('Error creating campaigns table:', error);
      } else {
        console.log('Campaigns table created successfully');
      }
    }
    
    // Check if executions table exists
    const executionsTableExists = await checkTableExists('executions');
    if (!executionsTableExists) {
      console.log('Creating executions table...');
      
      // Create the executions table
      const { error } = await supabase.rpc('create_executions_table');
      
      if (error) {
        console.error('Error creating executions table:', error);
      } else {
        console.log('Executions table created successfully');
      }
    }
    
    // Check if exports table exists
    const exportsTableExists = await checkTableExists('exports');
    if (!exportsTableExists) {
      console.log('Creating exports table...');
      
      // Create the exports table
      const { error } = await supabase.rpc('create_exports_table');
      
      if (error) {
        console.error('Error creating exports table:', error);
      } else {
        console.log('Exports table created successfully');
      }
    }
    
    console.log('Database initialization complete.');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}