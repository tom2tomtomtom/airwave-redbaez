import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv'
dotenv.config()

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Development user ID constant
const DEV_USER_ID = '00000000-0000-0000-0000-000000000000';

async function testDatabaseDirectly() {
  console.log('=== Direct Database Test ===');
  
  try {
    // Check if development user exists
    console.log('\nChecking if development user exists...');
    const { data: devUser, error: devUserError } = await supabase
      .from('users')
      .select('*')
      .eq('id', DEV_USER_ID)
      .single();
      
    if (devUserError) {
      console.error('Error checking dev user:', devUserError);
      console.log('Creating development user...');
      
      // Create development user if it doesn't exist
      const { error: createError } = await supabase
        .from('users')
        .upsert({
          id: DEV_USER_ID,
          email: 'dev-user-00000000-0000-0000-0000-000000000000@example.com',
          name: 'Development User',
          role: 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (createError) {
        console.error('Failed to create dev user:', createError);
        return;
      }
      console.log('Dev user created successfully');
    } else {
      console.log('Dev user exists:', devUser);
    }
    
    // Check available tables in the database
    console.log('\nChecking for available tables...');
    const { data: tables, error: tablesError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
      
    if (tablesError) {
      console.error('Error checking tables:', tablesError);
    } else {
      console.log('Available tables:', tables);
    }
    
    // Try to get the exact assets table schema
    console.log('\nTrying to get assets table schema...');
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .limit(1);
        
      if (error) {
        console.error('Error accessing assets table:', error);
      } else {
        const columnsInfo = data && data.length > 0 
          ? Object.keys(data[0]) 
          : 'No rows found, but table exists';
        console.log('Assets table columns:', columnsInfo);
      }
    } catch (error) {
      console.error('Error accessing assets table:', error);
    }
    
    // Try to get available client IDs
    console.log('\nFinding a valid client_id...');
    let clientId: string | null = null;
    
    // Try clients table first
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .limit(1);
      
    if (clientError) {
      console.log('Cannot access clients table:', clientError);
    } else if (clientData && clientData.length > 0) {
      clientId = clientData[0].id;
      console.log('Found client ID from clients table:', clientId);
    }
    
    // If no client ID yet, try finding one from existing assets
    if (!clientId) {
      const { data: assetWithClient, error: assetClientError } = await supabase
        .from('assets')
        .select('client_id')
        .not('client_id', 'is', null)
        .limit(1);
        
      if (!assetClientError && assetWithClient && assetWithClient.length > 0) {
        clientId = assetWithClient[0].client_id;
        console.log('Found client ID from existing asset:', clientId);
      }
    }
    
    // If still no client ID, generate a new UUID
    if (!clientId) {
      clientId = uuidv4();
      console.log('Generated new client ID:', clientId);
    }
    
    // Try a direct minimal insert with proper UUID values
    console.log('\nAttempting direct minimal insert with proper UUIDs...');
    const assetId = uuidv4();
    const assetUrl = `/uploads/${assetId}.txt`;
    console.log('Asset ID:', assetId);
    console.log('Client ID:', clientId);
    
    const assetData = {
      id: assetId,
      name: 'Direct Test Asset',
      type: 'text/plain',
      url: assetUrl,
      user_id: DEV_USER_ID,
      client_id: clientId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('assets')
      .insert(assetData)
      .select();
      
    if (insertError) {
      console.error('Insert error:', insertError);
      
      // Try variations to detect schema issues
      console.log('\nTrying variations to detect schema issues...');
      
      // Try without client_id
      console.log('\nTrying without client_id...');
      const { client_id, ...withoutClientId } = assetData;
      const { data: noClientData, error: noClientError } = await supabase
        .from('assets')
        .insert(withoutClientId)
        .select();
        
      if (noClientError) {
        console.error('Error without client_id:', noClientError);
      } else {
        console.log('Success without client_id:', noClientData);
      }
      
      // Try with minimal fields
      console.log('\nTrying with absolute minimal fields...');
      const minimalAsset = {
        id: uuidv4(),
        name: 'Minimal Asset',
        url: `/uploads/minimal-${Date.now()}.txt`,
        user_id: DEV_USER_ID
      };
      
      const { data: minData, error: minError } = await supabase
        .from('assets')
        .insert(minimalAsset)
        .select();
        
      if (minError) {
        console.error('Error with minimal fields:', minError);
      } else {
        console.log('Success with minimal fields:', minData);
      }
      
      // Try direct SQL approach as last resort
      console.log('\nTrying with direct SQL as a last resort...');
      const sqlAssetId = uuidv4();
      const sqlInsert = `
        INSERT INTO assets (id, name, url, user_id) 
        VALUES ('${sqlAssetId}', 'SQL Insert Asset', '/uploads/sql-${Date.now()}.txt', '${DEV_USER_ID}')
        RETURNING id, name, url;
      `;
      
      try {
        const { data: sqlData, error: sqlError } = await supabase.rpc('exec_sql', { sql: sqlInsert });
        
        if (sqlError) {
          console.error('SQL insert error:', sqlError);
        } else {
          console.log('SQL insert result:', sqlData);
        }
      } catch (error) {
        console.error('exec_sql function not available:', error);
        
        // Last attempt: Try finding all required fields in assets table
        console.log('\nFinal attempt: Retrieving required columns from information_schema...');
        
        try {
          const columnsQuery = `
            SELECT column_name, is_nullable, data_type
            FROM information_schema.columns
            WHERE table_schema = 'public' 
            AND table_name = 'assets'
            ORDER BY ordinal_position;
          `;
          
          const { data: columns, error: columnsError } = await supabase.rpc('exec_sql', { sql: columnsQuery });
          
          if (columnsError) {
            console.error('Cannot get columns info:', columnsError);
          } else {
            console.log('Assets table columns from information_schema:', columns);
            
            // Extract required columns (is_nullable = 'NO')
            const requiredColumns = columns
              .filter((col: any) => col.is_nullable === 'NO')
              .map((col: any) => col.column_name);
              
            console.log('Required columns (NOT NULL):', requiredColumns);
          }
        } catch (error) {
          console.error('Cannot access information_schema:', error);
        }
      }
    } else {
      console.log('Insert successful:', insertData);
    }
    
    // Verify what's in the assets table
    console.log('\nVerifying assets in database...');
    const { data: allAssets, error: allError } = await supabase
      .from('assets')
      .select('*');
      
    if (allError) {
      console.error('Error retrieving assets:', allError);
    } else {
      console.log(`Found ${allAssets?.length || 0} assets in database:`);
      if (allAssets && allAssets.length > 0) {
        allAssets.forEach((asset: any) => {
          console.log(`- ${asset.id}: ${asset.name} (${asset.url})`);
        });
      }
    }
    
  } catch (error) {
    console.error('Unexpected error during test:', error);
  }
  
  console.log('=== Direct Database Test Complete ===');
}

// Run the test
testDatabaseDirectly().catch(console.error);
