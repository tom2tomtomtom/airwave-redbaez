"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabaseClient_1 = require("../db/supabaseClient");
const auth_1 = require("../middleware/auth");
/**
 * Script to properly create the development user in all required tables
 * This ensures foreign key constraints are satisfied for asset uploads
 */
async function createDevUser() {
    console.log('Starting development user fix...');
    const DEV_USER_ID = auth_1.AUTH_MODE.DEV_USER_ID;
    console.log(`Using development user ID: ${DEV_USER_ID}`);
    try {
        // Step 1: Check if user exists in auth.users table (using service role key if available)
        console.log('Checking auth.users table...');
        const { data: authUser, error: authError } = await supabaseClient_1.supabase.auth.admin.getUserById(DEV_USER_ID);
        if (authError) {
            console.log('Error checking auth.users or user not found:', authError.message);
            console.log('Attempting to create development user in auth.users...');
            // Try to create the user in auth.users (requires admin privileges)
            // Note: This might fail without service role key
            try {
                const { data: newAuthUser, error: createError } = await supabaseClient_1.supabase.auth.admin.createUser({
                    uuid: DEV_USER_ID,
                    email: 'dev@example.com',
                    email_confirm: true,
                    user_metadata: {
                        name: 'Development User',
                        role: 'admin'
                    }
                });
                if (createError) {
                    console.log('Could not create user in auth.users:', createError.message);
                }
                else {
                    console.log('User created in auth.users successfully');
                }
            }
            catch (e) {
                console.log('Exception creating auth user:', e.message);
            }
        }
        else {
            console.log('User exists in auth.users:', authUser?.user?.id);
        }
        // Step 2: Ensure the user exists in the public.users table
        console.log('Checking public.users table...');
        const { data: dbUser, error: dbError } = await supabaseClient_1.supabase
            .from('users')
            .select('id')
            .eq('id', DEV_USER_ID)
            .single();
        if (dbError || !dbUser) {
            console.log('User not found in public.users, inserting...');
            // Direct SQL approach - sometimes more reliable than the API with RLS policies
            const { data: insertData, error: insertError } = await supabaseClient_1.supabase.rpc('insert_development_user', {
                user_id: DEV_USER_ID,
                user_email: 'dev@example.com',
                user_name: 'Development User',
                user_role: 'admin'
            });
            if (insertError) {
                console.log('Error inserting into public.users via RPC:', insertError.message);
                // Fallback to direct insert
                const { data: directData, error: directError } = await supabaseClient_1.supabase
                    .from('users')
                    .upsert({
                    id: DEV_USER_ID,
                    email: 'dev@example.com',
                    name: 'Development User',
                    role: 'admin',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });
                if (directError) {
                    console.log('Error with direct insert to public.users:', directError.message);
                    console.log('Details:', directError);
                }
                else {
                    console.log('User inserted into public.users via direct insert');
                }
            }
            else {
                console.log('User inserted into public.users via RPC function');
            }
        }
        else {
            console.log('User exists in public.users:', dbUser.id);
        }
        // Step 3: Verify the user now exists in public.users
        const { data: verifyUser, error: verifyError } = await supabaseClient_1.supabase
            .from('users')
            .select('id, email, name, role')
            .eq('id', DEV_USER_ID)
            .single();
        if (verifyError || !verifyUser) {
            console.log('VERIFICATION FAILED: User still not in public.users:', verifyError?.message);
        }
        else {
            console.log('VERIFICATION SUCCESS: Development user exists in public.users');
            console.log('User details:', verifyUser);
        }
        // Step 4: Create stored function for direct user insertion
        console.log('Creating stored function for dev user insertion...');
        const { error: funcError } = await supabaseClient_1.supabase.rpc('create_insert_development_user_function');
        if (funcError) {
            console.log('Error creating function (may already exist):', funcError.message);
        }
        else {
            console.log('Function created or already exists');
        }
    }
    catch (error) {
        console.error('Unexpected error:', error.message);
    }
}
// Run the script
createDevUser().then(() => {
    console.log('Development user fix completed');
    process.exit(0);
}).catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
});
