import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  logger.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// The client ID we're checking
const CORRECT_CLIENT_ID = 'fd790d19-6610-4cd5-b90f-214808e94a19';

async function verifyClientAssets() {
  logger.info('Starting client assets verification...');

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
      logger.error(`No client found with ID: ${CORRECT_CLIENT_ID}`);
      return;
    }

    logger.info(`Found client: ${client.name} (${client.id})`);

    // 2. Get all assets for this client
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('id, name, client_id')
      .eq('client_id', CORRECT_CLIENT_ID);

    if (assetsError) {
      throw assetsError;
    }

    logger.info(`Found ${assets?.length || 0} assets associated with this client.`);

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
    fs.writeFileSync(
      './client-assets-info.json', 
      JSON.stringify(clientInfo, null, 2)
    );

    logger.info('Client information saved to client-assets-info.json');
    logger.info('Use this information for debugging in the frontend.');
    logger.info('\nCopy this client ID for testing:');
    logger.info(client.id);
    
    // Provide instructions for manual testing
    logger.info('\n=== TESTING INSTRUCTIONS ===');
    logger.info('1. Open the application in your browser');
    logger.info('2. Login using development credentials');
    logger.info('3. Navigate to the Clients page');
    logger.info(`4. Select the client "${client.name}"`);
    logger.info('5. Check the browser console for debugging logs');
    logger.info('6. If assets are not showing up, try this in the console:');
    logger.info(`   localStorage.setItem('selectedClientId', '${client.id}');`);
    logger.info('   window.location.reload();');
    
  } catch (error) {
    logger.error('Error verifying client assets:', error);
  }
}

// Run the function
verifyClientAssets().catch(console.error);
