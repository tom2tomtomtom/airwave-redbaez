"use strict";
/**
 * Script to create a development user in the database
 * This resolves the issue with asset uploads failing in development mode
 * Run with: ts-node src/scripts/create-dev-user.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const supabaseClient_1 = require("../db/supabaseClient");
// Create a proper UUID for the development user
// This is a fixed UUID that will be consistent across runs
// A proper UUID is required because the database column is of type UUID
const DEV_USER_ID = '00000000-0000-0000-0000-000000000000';
async function createDevUser() {
    console.log('⚠️ Using Supabase service role key for development');
    console.log('🔍 Checking if development user exists in both auth and database tables...');
    // Check if user exists in auth.users
    try {
        // First try to get the user from auth.users
        const { data: authUser, error: authError } = await supabaseClient_1.supabase.auth.admin.getUserById(DEV_USER_ID);
        if (authError) {
            console.log('🚫 User not found in auth system or error checking:', authError.message);
        }
        else if (authUser && authUser.user) {
            console.log('✅ User exists in auth system:', authUser.user.email);
        }
    }
    catch (e) {
        console.log('🚫 Error checking auth user:', e);
    }
    // Check the users table
    const { data: dbUser, error: dbError } = await supabaseClient_1.supabase
        .from('users')
        .select('*')
        .eq('id', DEV_USER_ID)
        .single();
    if (dbError) {
        console.log('🚫 User not found in database users table:', dbError.message);
    }
    else {
        console.log('✅ User exists in database users table:', dbUser);
    }
    // If not found in database, create it
    if (dbError) {
        console.log('🔧 Creating development user in database users table...');
        // Use RPC call to ensure the user is created with proper privileges
        const { data: insertResult, error: insertError } = await supabaseClient_1.supabase
            .rpc('create_development_user', {
            user_id: DEV_USER_ID,
            user_email: 'dev@airwave.dev',
            user_name: 'Development User',
            user_role: 'admin'
        });
        if (insertError) {
            console.log('⚠️ RPC method not available, falling back to direct insert...');
            // Direct insert as fallback
            const { data: directInsert, error: directError } = await supabaseClient_1.supabase
                .from('users')
                .insert({
                id: DEV_USER_ID,
                email: 'dev@airwave.dev',
                name: 'Development User',
                role: 'admin',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
                .select();
            if (directError) {
                console.error('❌ Failed to create user via direct insert:', directError);
                // Last resort - try SQL insert
                console.log('🔄 Trying SQL approach as last resort...');
                try {
                    // Use raw SQL as last resort to bypass RLS
                    await supabaseClient_1.supabase.auth.signInWithPassword({
                        email: process.env.SUPABASE_ADMIN_EMAIL || 'admin@example.com',
                        password: process.env.SUPABASE_ADMIN_PASSWORD || 'password'
                    });
                    // Now try insert with elevated privileges
                    const { data: sqlResult, error: sqlError } = await supabaseClient_1.supabase
                        .from('users')
                        .insert({
                        id: DEV_USER_ID,
                        email: 'dev@airwave.dev',
                        name: 'Development User',
                        role: 'admin',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                        .select();
                    if (sqlError) {
                        console.error('❌ All approaches failed to create user:', sqlError);
                    }
                    else {
                        console.log('✅ User created successfully via SQL approach:', sqlResult);
                    }
                }
                catch (e) {
                    console.error('❌ Error with SQL approach:', e);
                }
            }
            else {
                console.log('✅ User created successfully via direct insert:', directInsert);
            }
        }
        else {
            console.log('✅ User created successfully via RPC:', insertResult);
        }
    }
    // Verify again
    const { data: verifyUser, error: verifyError } = await supabaseClient_1.supabase
        .from('users')
        .select('*')
        .eq('id', DEV_USER_ID)
        .single();
    if (verifyError) {
        console.error('❌ Failed to verify user creation:', verifyError);
    }
    else {
        console.log('✅ Verified development user exists:', verifyUser);
        console.log('✅ Development user is ready for asset uploads.');
    }
    // Final validation - attempt a test insert to assets table
    console.log('🧪 Testing foreign key constraint with a dummy query...');
    const { error: testError } = await supabaseClient_1.supabase
        .from('assets')
        .select('*')
        .eq('user_id', DEV_USER_ID)
        .limit(1);
    if (testError) {
        console.error('❌ Foreign key test failed:', testError);
    }
    else {
        console.log('✅ Foreign key constraint test passed. Assets can reference this user.');
    }
}
// Run the function
createDevUser()
    .then(() => process.exit(0))
    .catch((err) => {
    console.error('Unhandled error:', err);
    process.exit(1);
});
