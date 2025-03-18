"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
exports.initializeDatabase = initializeDatabase;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials. Please check your .env file');
}
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
// For prototype mode, we'll use Supabase's built-in SQL execution
// to create tables directly instead of using RPC calls
/**
 * Create signoff sessions table
 */
async function createSignoffSessionsTable() {
    try {
        console.log('Checking signoff_sessions table...');
        // Check if the table is accessible
        const { error } = await exports.supabase.from('signoff_sessions').select('count').limit(1);
        if (!error) {
            console.log('signoff_sessions table already exists');
            return;
        }
        console.log('Creating signoff_sessions table...');
        // Create the table with SQL
        const { error: createError } = await exports.supabase.rpc('exec_sql', {
            sql_string: `
        CREATE TABLE IF NOT EXISTS signoff_sessions (
          id UUID PRIMARY KEY,
          campaign_id UUID REFERENCES campaigns(id),
          title TEXT NOT NULL,
          description TEXT,
          status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'in_review', 'approved', 'rejected', 'completed')),
          client_email TEXT NOT NULL,
          client_name TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          expires_at TIMESTAMP WITH TIME ZONE,
          access_token TEXT NOT NULL,
          created_by UUID REFERENCES auth.users(id),
          feedback TEXT,
          matrix_id UUID,
          review_url TEXT
        );
      `
        });
        if (createError) {
            console.error('Error creating signoff_sessions table:', createError);
            throw createError;
        }
        console.log('signoff_sessions table created successfully');
    }
    catch (error) {
        console.error('Error in createSignoffSessionsTable:', error);
        throw error;
    }
}
/**
 * Create signoff assets table
 */
async function createSignoffAssetsTable() {
    try {
        console.log('Checking signoff_assets table...');
        // Check if the table is accessible
        const { error } = await exports.supabase.from('signoff_assets').select('count').limit(1);
        if (!error) {
            console.log('signoff_assets table already exists');
            return;
        }
        console.log('Creating signoff_assets table...');
        // Create the table with SQL
        const { error: createError } = await exports.supabase.rpc('exec_sql', {
            sql_string: `
        CREATE TABLE IF NOT EXISTS signoff_assets (
          id UUID PRIMARY KEY,
          session_id UUID REFERENCES signoff_sessions(id) ON DELETE CASCADE,
          asset_id UUID REFERENCES assets(id),
          status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
          feedback TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          version_number INTEGER NOT NULL DEFAULT 1
        );
      `
        });
        if (createError) {
            console.error('Error creating signoff_assets table:', createError);
            throw createError;
        }
        console.log('signoff_assets table created successfully');
    }
    catch (error) {
        console.error('Error in createSignoffAssetsTable:', error);
        throw error;
    }
}
/**
 * Create signoff responses table
 */
async function createSignoffResponsesTable() {
    try {
        console.log('Checking signoff_responses table...');
        // Check if the table is accessible
        const { error } = await exports.supabase.from('signoff_responses').select('count').limit(1);
        if (!error) {
            console.log('signoff_responses table already exists');
            return;
        }
        console.log('Creating signoff_responses table...');
        // Create the table with SQL
        const { error: createError } = await exports.supabase.rpc('exec_sql', {
            sql_string: `
        CREATE TABLE IF NOT EXISTS signoff_responses (
          id UUID PRIMARY KEY,
          session_id UUID REFERENCES signoff_sessions(id) ON DELETE CASCADE,
          client_name TEXT NOT NULL,
          client_email TEXT NOT NULL,
          feedback TEXT,
          status TEXT NOT NULL CHECK (status IN ('approved', 'rejected', 'partial')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          approved_assets JSONB,
          rejected_assets JSONB
        );
      `
        });
        if (createError) {
            console.error('Error creating signoff_responses table:', createError);
            throw createError;
        }
        console.log('signoff_responses table created successfully');
    }
    catch (error) {
        console.error('Error in createSignoffResponsesTable:', error);
        throw error;
    }
}
async function initializeDatabase() {
    try {
        console.log('Initializing database with real database connection.');
        // Create users table first (since other tables may reference it)
        await createUsersTable();
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
        // Create signoff sessions table
        await createSignoffSessionsTable();
        // Create signoff assets table
        await createSignoffAssetsTable();
        // Create signoff responses table
        await createSignoffResponsesTable();
        console.log('Database initialization complete.');
    }
    catch (error) {
        console.error('Error initializing database:', error);
    }
}
async function createAssetsTable() {
    try {
        console.log('Checking assets table...');
        // Just check if the table is accessible
        const { error } = await exports.supabase.from('assets').select('count').limit(1);
        if (error) {
            console.error('Error checking assets table:', error);
            // For prototype mode, we continue anyway to allow the application to function
            if (process.env.PROTOTYPE_MODE === 'true') {
                console.log('In prototype mode, continuing with in-memory data...');
            }
        }
        else {
            console.log('Assets table seems to be accessible.');
        }
    }
    catch (error) {
        console.error('Error checking if table exists:', error);
    }
}
async function createTemplatesTable() {
    try {
        console.log('Creating templates table...');
        const { error } = await exports.supabase.rpc('create_table_if_not_exists', {
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
            // Log error but don't throw to allow other tables to be created
            console.log('Continuing with database initialization...');
        }
    }
    catch (error) {
        console.error('Error checking if table exists:', error);
    }
}
async function createCampaignsTable() {
    try {
        console.log('Creating campaigns table...');
        const { error } = await exports.supabase.rpc('create_table_if_not_exists', {
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
            // Log error but don't throw to allow other tables to be created
            console.log('Continuing with database initialization...');
        }
    }
    catch (error) {
        console.error('Error checking if table exists:', error);
    }
}
async function createExecutionsTable() {
    try {
        console.log('Creating executions table...');
        const { error } = await exports.supabase.rpc('create_table_if_not_exists', {
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
            // Log error but don't throw to allow other tables to be created
            console.log('Continuing with database initialization...');
        }
    }
    catch (error) {
        console.error('Error checking if table exists:', error);
    }
}
async function createExportsTable() {
    try {
        console.log('Creating exports table...');
        const { error } = await exports.supabase.rpc('create_table_if_not_exists', {
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
            // Log error but don't throw to allow other tables to be created
            console.log('Continuing with database initialization...');
        }
    }
    catch (error) {
        console.error('Error checking if table exists:', error);
    }
}
/**
 * Create users table for authentication and authorization
 */
async function createUsersTable() {
    try {
        console.log('Checking users table...');
        // Just check if the table is accessible
        const { error } = await exports.supabase.from('users').select('count').limit(1);
        if (error) {
            console.error('Error checking users table:', error);
            // Try to create the default admin user if in development
            if (process.env.NODE_ENV === 'development') {
                try {
                    // Create a user via auth API
                    const { error: signUpError } = await exports.supabase.auth.signUp({
                        email: 'admin@airwave.com',
                        password: 'Admin123!',
                        options: {
                            data: {
                                name: 'Admin User',
                                role: 'admin'
                            }
                        }
                    });
                    if (signUpError) {
                        console.error('Error creating default admin user:', signUpError);
                    }
                    else {
                        console.log('Default admin user created successfully.');
                    }
                }
                catch (e) {
                    console.error('Exception creating default user:', e);
                }
            }
        }
        else {
            console.log('Users table seems to be accessible.');
        }
    }
    catch (error) {
        console.error('Error checking users table:', error);
    }
}
