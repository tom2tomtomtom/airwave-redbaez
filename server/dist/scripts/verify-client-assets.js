"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
// Load environment variables
dotenv_1.default.config();
// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials. Please check your .env file.');
    process.exit(1);
}
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
// The client ID we're checking
const CORRECT_CLIENT_ID = 'fd790d19-6610-4cd5-b90f-214808e94a19';
async function verifyClientAssets() {
    console.log('Starting client assets verification...');
    try {
        // 1. Get the client details
        const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('id, name')
            .eq('id', CORRECT_CLIENT_ID)
            .single();
        if (clientError) {
            throw clientError;
        }
        if (!client) {
            console.error(`No client found with ID: ${CORRECT_CLIENT_ID}`);
            return;
        }
        console.log(`Found client: ${client.name} (${client.id})`);
        // 2. Get all assets for this client
        const { data: assets, error: assetsError } = await supabase
            .from('assets')
            .select('id, name, client_id')
            .eq('client_id', CORRECT_CLIENT_ID);
        if (assetsError) {
            throw assetsError;
        }
        console.log(`Found ${assets?.length || 0} assets associated with this client.`);
        // 3. Generate output for frontend debugging
        const clientInfo = {
            clientId: client.id,
            clientName: client.name,
            assetsCount: assets?.length || 0,
            assetSamples: assets?.slice(0, 5).map(asset => ({
                id: asset.id,
                name: asset.name,
                client_id: asset.client_id
            }))
        };
        // Save to a JSON file for easy access
        fs_1.default.writeFileSync('./client-assets-info.json', JSON.stringify(clientInfo, null, 2));
        console.log('Client information saved to client-assets-info.json');
        console.log('Use this information for debugging in the frontend.');
        console.log('\nCopy this client ID for testing:');
        console.log(client.id);
        // Provide instructions for manual testing
        console.log('\n=== TESTING INSTRUCTIONS ===');
        console.log('1. Open the application in your browser');
        console.log('2. Login using development credentials');
        console.log('3. Navigate to the Clients page');
        console.log(`4. Select the client "${client.name}"`);
        console.log('5. Check the browser console for debugging logs');
        console.log('6. If assets are not showing up, try this in the console:');
        console.log(`   localStorage.setItem('selectedClientId', '${client.id}');`);
        console.log('   window.location.reload();');
    }
    catch (error) {
        console.error('Error verifying client assets:', error);
    }
}
// Run the function
verifyClientAssets().catch(console.error);
