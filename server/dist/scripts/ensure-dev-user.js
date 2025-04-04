"use strict";
/**
 * Script to ensure development user exists in the database
 * This resolves the asset upload issues in development mode
 */
Object.defineProperty(exports, "__esModule", { value: true });
const supabaseClient_1 = require("../db/supabaseClient");
const auth_1 = require("../middleware/auth");
// Use AUTH_MODE constants to ensure consistency
const DEV_USER_ID = auth_1.AUTH_MODE.DEV_USER_ID;
async function ensureDevUser() {
    console.log(`Current auth mode: ${auth_1.AUTH_MODE.CURRENT}`);
    if (auth_1.AUTH_MODE.CURRENT !== 'development' && auth_1.AUTH_MODE.CURRENT !== 'prototype') {
        console.log('Not in development or prototype mode, exiting');
        return;
    }
    console.log('Checking if development user exists...');
    // First, check if we have the 'users' table
    const { data: tableExists, error: tableError } = await supabaseClient_1.supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'users')
        .eq('table_schema', 'public')
        .single();
    if (tableError || !tableExists) {
        console.log('Users table may not exist in the database. Creating it if possible...');
        try {
            // Try to create the users table if it doesn't exist
            const createTableQuery = `
        CREATE TABLE IF NOT EXISTS public.users (
          id UUID PRIMARY KEY,
          email TEXT NOT NULL,
          name TEXT,
          role TEXT DEFAULT 'user',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
            const { error: createError } = await supabaseClient_1.supabase.rpc('execute', { query: createTableQuery });
            if (createError) {
                console.error('Failed to create users table:', createError);
                console.log('Continuing with other operations...');
            }
            else {
                console.log('Users table created successfully');
            }
        }
        catch (e) {
            console.error('Exception creating users table:', e);
            console.log('Continuing with other operations...');
        }
    }
    // Check if the user already exists in the users table
    const { data: existingUser, error: checkError } = await supabaseClient_1.supabase
        .from('users')
        .select('id')
        .eq('id', DEV_USER_ID)
        .single();
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is 'not found'
        console.error('Error checking for existing user:', checkError);
        console.log('Attempting to create development user despite error...');
    }
    else if (existingUser) {
        console.log('Development user already exists in users table with ID:', existingUser.id);
        // Update user to ensure all fields are correct
        const { error: updateError } = await supabaseClient_1.supabase
            .from('users')
            .update({
            email: 'dev@example.com',
            name: 'Development User',
            role: 'admin',
            updated_at: new Date().toISOString()
        })
            .eq('id', DEV_USER_ID);
        if (updateError) {
            console.error('Error updating development user:', updateError);
        }
        else {
            console.log('Development user updated successfully');
        }
    }
    else {
        console.log('Development user not found in users table, creating...');
        // Insert the development user into the users table
        const { data: userData, error: userError } = await supabaseClient_1.supabase
            .from('users')
            .insert([
            {
                id: DEV_USER_ID,
                email: 'dev@example.com',
                name: 'Development User',
                role: 'admin',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ])
            .select();
        if (userError) {
            console.error('Error creating development user in users table:', userError);
            // Try alternative approach if insert failed
            try {
                console.log('Attempting alternative insertion approach...');
                const insertQuery = `
          INSERT INTO public.users (id, email, name, role, created_at, updated_at)
          VALUES ('${DEV_USER_ID}', 'dev@example.com', 'Development User', 'admin', NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            updated_at = EXCLUDED.updated_at;
        `;
                const { error: insertError } = await supabaseClient_1.supabase.rpc('execute', { query: insertQuery });
                if (insertError) {
                    console.error('Alternative insertion failed:', insertError);
                }
                else {
                    console.log('Development user created via alternative approach');
                }
            }
            catch (e) {
                console.error('Exception in alternative insertion:', e);
            }
        }
        else {
            console.log('Development user created in users table:', userData);
        }
    }
    // Now check for the user in the auth.users table (if it exists)
    try {
        const { data: authUser, error: authCheckError } = await supabaseClient_1.supabase.auth.admin.getUserById(DEV_USER_ID);
        if (authCheckError) {
            console.error('Error checking for auth user:', authCheckError);
        }
        else if (authUser) {
            console.log('Development user exists in auth.users table');
        }
        else {
            console.log('Development user not found in auth.users table');
            // Try creating the auth user - this may fail if we don't have admin permissions
            try {
                console.log('Attempting to create auth user...');
                // Use environment variable for password or generate a secure random one
                const devPassword = process.env.DEV_USER_PASSWORD || require('crypto').randomBytes(16).toString('hex');
                const { data: newAuthUser, error: createAuthError } = await supabaseClient_1.supabase.auth.admin.createUser({
                    email: 'dev@example.com',
                    password: devPassword,
                    user_metadata: { name: 'Development User' },
                    email_confirm: true,
                    id: DEV_USER_ID
                });
                // Log the generated password only in development mode
                if (!process.env.DEV_USER_PASSWORD && process.env.NODE_ENV !== 'production') {
                    console.log(`Generated random password for dev user: ${devPassword}`);
                    console.log('Set this as DEV_USER_PASSWORD in your .env file if you need to log in as this user');
                }
                if (createAuthError) {
                    console.error('Error creating auth user:', createAuthError);
                }
                else {
                    console.log('Auth user created:', newAuthUser);
                }
            }
            catch (e) {
                console.error('Exception creating auth user:', e);
            }
        }
    }
    catch (e) {
        console.error('Exception checking auth user:', e);
    }
    // Check if the assets table has a foreign key constraint on user_id
    // If it does, we might need to modify it for development mode
    try {
        console.log('Checking assets table foreign keys...');
        // Check if assets table exists first
        const { data: assetsExists, error: assetsCheckError } = await supabaseClient_1.supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_name', 'assets')
            .eq('table_schema', 'public')
            .single();
        if (assetsCheckError || !assetsExists) {
            console.log('Assets table may not exist yet, skipping foreign key check');
        }
        else {
            console.log('Assets table exists, checking foreign keys...');
            // For development mode, consider making the user_id nullable if it causes issues
            // This is optional and we're not implementing it automatically
            console.log('For development mode, you might want to make user_id nullable if upload issues persist');
        }
    }
    catch (e) {
        console.error('Exception checking assets table:', e);
    }
    console.log('Development user setup completed');
}
// Run the function
ensureDevUser()
    .then(() => process.exit(0))
    .catch((err) => {
    console.error('Unhandled error:', err);
    process.exit(1);
});
