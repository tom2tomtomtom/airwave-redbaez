import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// The correct client ID from the clients table
const CORRECT_CLIENT_ID = 'fd790d19-6610-4cd5-b90f-214808e94a19';

/**
 * List all unique client IDs in the assets table and check for similar IDs
 */
async function listClientIds() {
  console.log('Listing all client IDs in the assets table...');

  try {
    // Get all distinct client_id values from the assets table
    const { data, error } = await supabase
      .from('assets')
      .select('client_id')
      .not('client_id', 'is', null);

    if (error) {
      throw error;
    }

    // Extract unique client IDs
    const uniqueClientIds = [...new Set(data.map(item => item.client_id))];

    console.log(`Found ${uniqueClientIds.length} unique client IDs:`);
    uniqueClientIds.forEach(id => {
      const isSimilarToCorrect = id.includes('790d19') && id.includes('6610-4cd5-b90f');
      console.log(`- ${id}${isSimilarToCorrect ? ' (SIMILAR TO CORRECT ID)' : ''}`);
    });

    // Look for client IDs similar to the one in the screenshot
    console.log('\nLooking for client IDs similar to f4790d19-6610-4cd5-b90f-214808e94a80:');
    const similarIds = uniqueClientIds.filter(id => 
      id.includes('790d19') && id.includes('6610-4cd5-b90f')
    );
    
    if (similarIds.length > 0) {
      console.log('Found similar client IDs:');
      similarIds.forEach(id => console.log(`- ${id}`));
    } else {
      console.log('No similar client IDs found.');
    }

    // Check if the correct client ID already exists in assets
    const hasCorrectId = uniqueClientIds.includes(CORRECT_CLIENT_ID);
    console.log(`\nCorrect client ID '${CORRECT_CLIENT_ID}' ${hasCorrectId ? 'EXISTS' : 'DOES NOT EXIST'} in assets table.`);
  } catch (error) {
    console.error('Error listing client IDs:', error);
  }
}

// Run the function
listClientIds().catch(console.error);
