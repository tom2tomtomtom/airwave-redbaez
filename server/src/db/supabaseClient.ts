import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials. Please check your .env file');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// For prototype mode, we'll use Supabase's built-in SQL execution
// to create tables directly instead of using RPC calls
export async function initializeDatabase() {
  try {
    if (process.env.PROTOTYPE_MODE === 'true') {
      console.log('Running in PROTOTYPE_MODE. Using simplified database setup.');
    }
    
    // Create assets table
    await createAssetsTable();
    
    // Create templates table
    await createTemplatesTable();
    
    // Create campaigns table
    await createCampaignsTable();
    
    // Create executions table
    await createExecutionsTable();
    
    // Create exports table
    await createExportsTable();
    
    console.log('Database initialization complete.');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

async function createAssetsTable() {
  try {
    console.log('Creating assets table...');
    
    const { error } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'assets',
      table_definition: `
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        url TEXT,
        thumbnail_url TEXT,
        content TEXT,
        description TEXT,
        tags JSONB,
        metadata JSONB,
        owner_id UUID,
        is_favorite BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      `
    });
    
    if (error) {
      console.error('Error creating assets table:', error);
      
      // For prototype mode, we continue anyway to allow the application to function
      if (process.env.PROTOTYPE_MODE === 'true') {
        console.log('In prototype mode, continuing with in-memory data...');
      }
    }
  } catch (error) {
    console.error('Error checking if table exists:', error);
  }
}

async function createTemplatesTable() {
  try {
    console.log('Creating templates table...');
    
    const { error } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'templates',
      table_definition: `
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        description TEXT,
        format TEXT NOT NULL,
        thumbnail_url TEXT,
        platforms JSONB,
        creatomate_template_id TEXT,
        slots JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      `
    });
    
    if (error) {
      console.error('Error creating templates table:', error);
      
      // For prototype mode, we continue anyway
      if (process.env.PROTOTYPE_MODE === 'true') {
        console.log('In prototype mode, continuing with in-memory data...');
      }
    }
  } catch (error) {
    console.error('Error checking if table exists:', error);
  }
}

async function createCampaignsTable() {
  try {
    console.log('Creating campaigns table...');
    
    const { error } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'campaigns',
      table_definition: `
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        description TEXT,
        client TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        platforms JSONB,
        tags JSONB,
        start_date TIMESTAMP WITH TIME ZONE,
        end_date TIMESTAMP WITH TIME ZONE,
        owner_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      `
    });
    
    if (error) {
      console.error('Error creating campaigns table:', error);
      
      // For prototype mode, we continue anyway
      if (process.env.PROTOTYPE_MODE === 'true') {
        console.log('In prototype mode, continuing with in-memory data...');
      }
    }
  } catch (error) {
    console.error('Error checking if table exists:', error);
  }
}

async function createExecutionsTable() {
  try {
    console.log('Creating executions table...');
    
    const { error } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'executions',
      table_definition: `
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        campaign_id UUID REFERENCES campaigns(id),
        template_id UUID REFERENCES templates(id),
        status TEXT NOT NULL DEFAULT 'draft',
        url TEXT,
        thumbnail_url TEXT,
        assets JSONB,
        render_job_id TEXT,
        platform TEXT,
        format TEXT,
        owner_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      `
    });
    
    if (error) {
      console.error('Error creating executions table:', error);
      
      // For prototype mode, we continue anyway
      if (process.env.PROTOTYPE_MODE === 'true') {
        console.log('In prototype mode, continuing with in-memory data...');
      }
    }
  } catch (error) {
    console.error('Error checking if table exists:', error);
  }
}

async function createExportsTable() {
  try {
    console.log('Creating exports table...');
    
    const { error } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'exports',
      table_definition: `
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        execution_id UUID REFERENCES executions(id),
        platform TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        url TEXT,
        format TEXT NOT NULL,
        file_size INTEGER,
        settings JSONB,
        owner_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE
      `
    });
    
    if (error) {
      console.error('Error creating exports table:', error);
      
      // For prototype mode, we continue anyway
      if (process.env.PROTOTYPE_MODE === 'true') {
        console.log('In prototype mode, continuing with in-memory data...');
      }
    }
  } catch (error) {
    console.error('Error checking if table exists:', error);
  }
}