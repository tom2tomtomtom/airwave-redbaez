import { assetService } from '../services/assetService.new';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Admin user ID from the database (dev@example.com) - from our user check script
const ADMIN_USER_ID = 'd53c7f82-42af-4ed0-a83b-2cbf505748db';

async function testAdminAssetUpload() {
  console.log('=== Admin User Asset Upload Test ===');
  
  try {
    // Step 1: Verify the admin user exists
    console.log('\nVerifying admin user exists:');
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('*')
      .eq('id', ADMIN_USER_ID)
      .single();
      
    if (adminError) {
      console.error('Error finding admin user:', adminError);
      return;
    }
    
    console.log('Admin user found:', adminUser);
    
    // Step 2: Find a valid client to use
    console.log('\nFinding a valid client:');
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('id, name')
      .limit(1);
      
    if (clientError || !clientData || clientData.length === 0) {
      console.error('Error finding a client:', clientError);
      return;
    }
    
    const clientId = clientData[0].id;
    console.log('Using client:', clientData[0]);
    
    // Step 3: Create a test file
    console.log('\nCreating test file:');
    const testDir = path.join(process.cwd(), 'test-files');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFilePath = path.join(testDir, 'admin-test-asset.txt');
    const testContent = 'This is a test asset file for admin user upload test';
    fs.writeFileSync(testFilePath, testContent);
    
    console.log('Test file created at:', testFilePath);
    
    // Step 4: Create a multer-like file object
    const testFile = {
      fieldname: 'file',
      originalname: 'admin-test-asset.txt',
      encoding: '7bit',
      mimetype: 'text/plain',
      destination: testDir,
      filename: 'admin-test-asset.txt',
      path: testFilePath,
      size: fs.statSync(testFilePath).size,
      buffer: fs.readFileSync(testFilePath)
    };
    
    // Step 5: Use the asset service to upload the file
    console.log('\nAttempting to upload asset with admin user ID:');
    const result = await assetService.uploadAsset(
      testFile as any,
      ADMIN_USER_ID,
      {
        name: 'Admin Test Asset',
        type: 'document',
        description: 'Testing upload with admin user ID',
        tags: ['test', 'admin'],
        categories: ['test'],
        clientId: clientId
      }
    );
    
    console.log('\nUpload result:', JSON.stringify(result, null, 2));
    
    // Step 6: Verify the asset was created in the database
    if (result.success && result.asset?.id) {
      console.log('\nVerifying asset in database:');
      const { data: assetCheck, error: assetError } = await supabase
        .from('assets')
        .select('*')
        .eq('id', result.asset.id)
        .single();
        
      if (assetError) {
        console.error('Error finding asset in database:', assetError);
      } else {
        console.log('Asset found in database:', assetCheck);
        console.log('\n✅ SUCCESS: Asset was properly uploaded and saved to database!');
      }
    }
    
    // Clean up
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      console.log('\nTest file cleaned up');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
  
  console.log('\n=== Test Complete ===');
}

// Run the test
testAdminAssetUpload().catch(console.error);
