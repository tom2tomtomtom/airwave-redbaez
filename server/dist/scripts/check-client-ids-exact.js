"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
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
// Target client ID we're checking
const TARGET_CLIENT_ID = 'fd790d19-6610-4cd5-b90f-214808e94a19';
async function checkClientAndAssetIds() {
    console.log('Checking exact client ID format in both tables...');
    console.log(`Target client ID: "${TARGET_CLIENT_ID}"`);
    try {
        // Check if client exists in clients table
        const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .eq('id', TARGET_CLIENT_ID);
        if (clientError) {
            throw clientError;
        }
        console.log('\n=== CLIENT DATA ===');
        if (clientData && clientData.length > 0) {
            console.log(`Found client in clients table: "${clientData[0].id}"`);
            console.log(`Client name: ${clientData[0].name}`);
            console.log('Character by character check:');
            for (let i = 0; i < TARGET_CLIENT_ID.length; i++) {
                const char = TARGET_CLIENT_ID[i];
                const clientChar = clientData[0].id[i];
                console.log(`Position ${i}: "${char}" vs "${clientChar}" - ${char === clientChar ? 'Match' : 'MISMATCH!'}`);
            }
        }
        else {
            console.log(`No client found with ID: "${TARGET_CLIENT_ID}"`);
        }
        // Check for assets with the client ID
        const { data: assetData, error: assetError } = await supabase
            .from('assets')
            .select('id, name, client_id')
            .eq('client_id', TARGET_CLIENT_ID);
        if (assetError) {
            throw assetError;
        }
        console.log('\n=== ASSET DATA ===');
        if (assetData && assetData.length > 0) {
            console.log(`Found ${assetData.length} assets with client_id matching "${TARGET_CLIENT_ID}"`);
            // Show first 5 assets
            const sampleAssets = assetData.slice(0, 5);
            console.log('Sample assets:');
            sampleAssets.forEach(asset => {
                console.log(`- Asset ID: ${asset.id}, Name: ${asset.name}, Client ID: "${asset.client_id}"`);
                // Check character by character for first asset
                if (asset === sampleAssets[0]) {
                    console.log('Character by character check for first asset:');
                    for (let i = 0; i < TARGET_CLIENT_ID.length; i++) {
                        const char = TARGET_CLIENT_ID[i];
                        const assetChar = asset.client_id[i];
                        console.log(`Position ${i}: "${char}" vs "${assetChar}" - ${char === assetChar ? 'Match' : 'MISMATCH!'}`);
                    }
                }
            });
            // Check if there are more assets
            if (assetData.length > 5) {
                console.log(`...and ${assetData.length - 5} more assets`);
            }
        }
        else {
            console.log(`No assets found with client_id: "${TARGET_CLIENT_ID}"`);
            // Check if there are any assets with client_id that contains parts of our target ID
            const { data: similarAssets, error: similarError } = await supabase
                .from('assets')
                .select('id, name, client_id')
                .like('client_id', `%${TARGET_CLIENT_ID.substring(0, 8)}%`);
            if (similarError) {
                throw similarError;
            }
            if (similarAssets && similarAssets.length > 0) {
                console.log(`\nFound ${similarAssets.length} assets with similar client_id (containing "${TARGET_CLIENT_ID.substring(0, 8)}"):`);
                similarAssets.slice(0, 5).forEach(asset => {
                    console.log(`- Asset ID: ${asset.id}, Name: ${asset.name}, Client ID: "${asset.client_id}"`);
                });
                if (similarAssets.length > 5) {
                    console.log(`...and ${similarAssets.length - 5} more assets`);
                }
            }
            else {
                console.log(`\nNo assets found with client_id similar to: "${TARGET_CLIENT_ID}"`);
            }
        }
    }
    catch (error) {
        console.error('Error checking client IDs:', error);
    }
}
// Run the function
checkClientAndAssetIds().catch(console.error);
