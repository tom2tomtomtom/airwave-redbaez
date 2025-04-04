import { logger } from '../utils/logger';
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'

// Constants for development user - UPDATED to match actual DB values
const DEV_USER = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'dev-user-00000000-0000-0000-0000-000000000000@example.com', // Updated from dev@example.com
  role: 'user', // Updated from admin
  name: 'Development User'
};

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// In-memory asset storage for development mode
const inMemoryAssets = new Map();

// Directory for file uploads in development mode
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Verify user exists in the public.users table
export async function verifyUserExists(userId: string): Promise<boolean> {
  try {
    // Special case for dev user in development mode
    if (process.env.NODE_ENV === 'development' && userId === DEV_USER.id) {
      logger.info('Verifying development user...');
      const { data, error } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('id', DEV_USER.id)
        .single();
        
      if (error) {
        logger.error('Error verifying development user:', error);
        return false;
      }
      
      logger.info('Development user found in database:', data);
      return !!data;
    }
    
    // Regular user verification
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();
      
    return !error && !!data;
  } catch (error) {
    logger.error('Error verifying user:', error);
    return false;
  }
}

// Save file to filesystem for development mode
async function saveFileToFilesystem(file: any, metadata: any, userId: string) {
  try {
    const fileId = uuidv4();
    const fileName = `${fileId}-${file.originalname}`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    
    // Save file content
    await fs.promises.writeFile(filePath, file.buffer);
    
    // Store metadata in memory
    const asset = {
      id: fileId,
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
      path: filePath,
      user_id: userId,
      metadata: metadata,
      created_at: new Date().toISOString(),
    };
    
    inMemoryAssets.set(fileId, asset);
    logger.info(`Asset saved to filesystem: ${filePath}`);
    
    return { success: true, asset };
  } catch (error) {
    logger.error('Error saving to filesystem:', error);
    return { success: false, error };
  }
}

// Upload asset to Supabase
export async function uploadAsset(file: any, metadata: any, userId: string) {
  logger.info(`Uploading asset for user ${userId}...`);
  
  try {
    // If no user ID provided, use development user ID
    if (!userId && process.env.NODE_ENV === 'development') {
      logger.info('No user ID provided, using development user ID');
      userId = DEV_USER.id;
    }
    
    // Development mode with prototype flag - use filesystem approach
    if (process.env.NODE_ENV === 'development' && process.env.PROTOTYPE_MODE === 'true') {
      logger.info('Using filesystem approach (PROTOTYPE_MODE=true)');
      return await saveFileToFilesystem(file, metadata, userId);
    }
    
    // Verify user exists before attempting upload
    const userExists = await verifyUserExists(userId);
    if (!userExists) {
      logger.error(`User ${userId} not found in database`);
      
      // Fall back to filesystem in development
      if (process.env.NODE_ENV === 'development') {
        logger.info('Falling back to filesystem approach due to user verification failure');
        return await saveFileToFilesystem(file, metadata, userId);
      }
      
      return { success: false, error: 'User does not exist' };
    }
    
    // Prepare asset data for database insertion
    const assetData = {
      user_id: userId,
      owner_id: userId, // Ensure owner_id is also set
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
      meta: metadata, // Using 'meta' instead of 'metadata' to match DB schema
      created_at: new Date().toISOString(),
    };
    
    logger.info('Inserting asset data:', assetData);
    
    // Insert asset record
    const { data, error } = await supabase
      .from('assets')
      .insert(assetData)
      .select()
      .single();
      
    if (error) {
      logger.error('Database insertion error:', error);
      
      // Special handling for development environment
      if (process.env.NODE_ENV === 'development') {
        logger.info('Database insertion failed, falling back to filesystem approach');
        return await saveFileToFilesystem(file, metadata, userId);
      }
      
      return { success: false, error };
    }
    
    logger.info('Asset record created successfully:', data);
    
    // Upload file content to storage
    const { error: storageError } = await supabase.storage
      .from('assets')
      .upload(`${data.id}/${file.originalname}`, file.buffer);
      
    if (storageError) {
      logger.error('Storage upload error:', storageError);
      return { success: false, error: storageError };
    }
    
    return { success: true, asset: data };
  } catch (error) {
    logger.error('Unexpected error during asset upload:', error);
    return { success: false, error };
  }
}

// Get assets by user ID
export async function getAssetsByUserId(userId: string) {
  logger.info(`Getting assets for user ${userId}...`);
  
  try {
    // Development mode with filesystem storage
    if (process.env.NODE_ENV === 'development' && process.env.PROTOTYPE_MODE === 'true') {
      logger.info('Using in-memory assets (PROTOTYPE_MODE=true)');
      const userAssets = Array.from(inMemoryAssets.values())
        .filter(asset => asset.user_id === userId);
      return { success: true, assets: userAssets };
    }
    
    // Query database for assets
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', userId);
      
    if (error) {
      logger.error('Error fetching assets:', error);
      return { success: false, error };
    }
    
    return { success: true, assets: data };
  } catch (error) {
    logger.error('Unexpected error getting assets:', error);
    return { success: false, error };
  }
}
