"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables from parent directory's .env file
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
if (!supabaseUrl || !supabaseKey) {
    console.error('Missing required environment variables: SUPABASE_URL and SUPABASE_KEY');
    process.exit(1);
}
// Create Supabase client
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
async function deleteAppUsers() {
    try {
        console.log('Deleting users from the application database...');
        // Delete from users table (this is your application's users table)
        const { error: deleteUsersError } = await supabase
            .from('users')
            .delete()
            .not('id', 'eq', '00000000-0000-0000-0000-000000000000'); // Protect any system users
        if (deleteUsersError) {
            console.error('Error deleting app users:', deleteUsersError.message);
        }
        else {
            console.log('Successfully deleted users from application database');
        }
        // You can add deletion from related tables here if needed
        // For example, delete related assets, preferences, etc.
        console.log('Application database cleanup complete!');
    }
    catch (error) {
        console.error('Unexpected error during user deletion:', error);
    }
}
// Run the deletion function
deleteAppUsers();
