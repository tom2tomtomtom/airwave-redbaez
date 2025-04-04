import express from 'express';
import { logger } from '../utils/logger';
import { authenticateToken as checkAuth, AUTH_MODE } from '../middleware/auth';
import bcrypt from 'bcrypt';
import { AuthenticatedRequest } from '../types/AuthenticatedRequest';
import { Response, NextFunction } from 'express';
import { supabase } from '../db/supabaseClient';
import { ApiError } from '../utils/ApiError'; // Fixed import path
import { ErrorCode } from '../types/errorTypes'; // Import ErrorCode

const router = express.Router();

// We'll use Supabase for both authentication and user data storage

// Add the register-complete endpoint
router.post('/register-complete', async (req: express.Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req.body;
    
    if (!user || !user.id || !user.email) {
      return next(new ApiError(ErrorCode.INVALID_INPUT, 'User data (id, email) is required'));
    }

    logger.info(`Completing registration for user: ${user.id} (${user.email})`);
    
    // Check if we're in prototype mode
    if (process.env.PROTOTYPE_MODE === 'true') {
      logger.info('PROTOTYPE MODE: Bypassing database registration completion');
      return res.status(201).json({
        success: true,
        message: 'Registration completed successfully in prototype mode'
      });
    }
    
    // Normal database registration flow
    // Check if user already exists in our table
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is the 'not found' error code
      logger.error('Error checking user:', checkError);
    }
    
    // If user doesn't exist in our table, create it
    if (!existingUser) {
      // Insert user data into our users table
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || 'User',
          role: user.user_metadata?.role || 'user'
        });
      
      if (insertError) {
        logger.error('Error inserting user into database:', insertError);
        return next(new ApiError(ErrorCode.OPERATION_FAILED, 'Error inserting user into database', { originalError: insertError.message }));
      }
      
      logger.info('User record created in database');
    } else {
      logger.info('User already exists in database');
    }

    // Return success
    res.status(201).json({
      success: true,
      message: 'Registration completed successfully'
    });
  } catch (error: unknown) {
    logger.error('Registration completion error:', error);
    next(error); // Pass to error handler
  }
});



// POST - Session sync
// This endpoint is called after client-side Supabase login to sync with our server
router.post('/session', async (req: express.Request, res: Response, next: NextFunction) => {
  try {
    const { session, user } = req.body;

    if (!session || !user) {
      return next(new ApiError(ErrorCode.INVALID_INPUT, 'Session and user data are required'));
    }

    logger.info(`Session sync for user: ${user.id} (${user.email})`);
    
    // Check if we're in prototype mode
    if (process.env.PROTOTYPE_MODE === 'true') {
      logger.info('PROTOTYPE MODE: Bypassing database session sync');
      return res.json({
        success: true,
        message: 'Session synchronized successfully in prototype mode'
      });
    }
    
    // Normal database flow
    // Check if user exists in our users table, create if not
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
      
    if (userError && userError.code !== 'PGRST116') { // PGRST116 is the 'not found' error code
      logger.error('Error checking user:', userError);
    }
    
    // Create user if doesn't exist
    if (!existingUser) {
      logger.info('Creating user record in database for:', user.id);
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || 'User',
          role: user.user_metadata?.role || 'user'
        });
        
      if (insertError) {
        logger.error('Error creating user record:', insertError);
      }
    }

    // Return success
    res.json({
      success: true,
      message: 'Session synchronized successfully'
    });
  } catch (error: unknown) {
    logger.error('Session sync error:', error);
    next(error); // Pass to error handler
  }
}); // Correct closing for the route handler

// GET - Get current user info
router.get('/me', checkAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Check if we're in prototype or development mode with auth bypass
    if ((AUTH_MODE.CURRENT === 'prototype' || AUTH_MODE.CURRENT === 'development') && AUTH_MODE.BYPASS_AUTH) {
      logger.info('PROTOTYPE MODE with auth bypass: Returning mock user data');
      return res.json({
        success: true,
        data: {
          id: '00000000-0000-0000-0000-000000000000',
          email: 'prototype@example.com',
          name: 'Prototype User',
          role: 'admin',
          avatar_url: null,
          settings: {}
        }
      });
    }
    
    // Normal auth flow
    // Get the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) { 
      return next(new ApiError(ErrorCode.AUTHENTICATION_REQUIRED, 'Authentication required: Bearer token missing.'));
    }

    // Extract the token
    const token = authHeader.split(' ')[1];
    
    // Verify the token with Supabase
    const { data: tokenData, error: tokenError } = await supabase.auth.getUser(token);
    
    if (tokenError || !tokenData.user) {
      logger.error('Invalid Supabase token:', tokenError?.message || 'User not found');
      return next(new ApiError(ErrorCode.AUTHENTICATION_ERROR, 'Invalid Supabase token', { originalError: tokenError }));
    }
    
    const authUser = tokenData.user;
    logger.info('GET /me - User from Supabase token:', authUser.id);

    // Get additional user data from our database
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();
    
    if (dbError && dbError.code !== 'PGRST116') { // PGRST116 is 'not found'
      logger.error('Error fetching user from database:', dbError.message);
    }
    
    // Combine data from Auth and database
    const user = {
      id: authUser.id,
      email: authUser.email || '',
      name: dbUser?.name || authUser.user_metadata?.name || 'User',
      role: dbUser?.role || authUser.user_metadata?.role || 'user',
      avatar_url: authUser.user_metadata?.avatar_url || null,
      settings: dbUser?.settings || {}
    };
    
    res.json({
      success: true,
      data: user,
    });
  } catch (error: unknown) {
    logger.error('Error fetching user:', error);
    next(error); // Pass to error handler
  }
});

// This is now just a server-side admin endpoint for creating users
// Normal users will register through the client using Supabase directly
router.post('/register', checkAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password, name, role = 'user' } = req.body;

    // Validate inputs
    if (!email || !password || !name) {
      return next(new ApiError(ErrorCode.INVALID_INPUT, 'Email, password, and name are required'));
    }
    
    // Check if requesting user is admin (only admins can create users)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new ApiError(ErrorCode.AUTHENTICATION_REQUIRED, 'Authentication required: Bearer token missing for admin check.'));
    }
    
    const token = authHeader.split(' ')[1];
    const { data: tokenData, error: tokenError } = await supabase.auth.getUser(token);
    
    if (tokenError || !tokenData.user) {
       logger.error('Invalid Supabase token for admin check:', tokenError?.message || 'User not found');
      return next(new ApiError(ErrorCode.AUTHENTICATION_ERROR, 'Invalid Supabase token for admin check', { originalError: tokenError }));
    }
    
    // Check admin role
    const { data: adminCheck, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', tokenData.user.id)
      .single();
    
    if (adminError || !adminCheck || adminCheck.role !== 'admin') {
      return next(new ApiError(ErrorCode.INSUFFICIENT_PERMISSIONS, 'Admin privileges required to register new users.'));
    }

    // Use Supabase Admin API to create the user
    const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name,
        role
      }
    });
    
    if (signUpError) {
      logger.error('Error creating user with Supabase Auth:', signUpError);
      return next(new ApiError(ErrorCode.OPERATION_FAILED, 'Error creating user with Supabase Auth', { originalError: signUpError.message }));
    }
    
    if (!authData.user) {
      return next(new ApiError(ErrorCode.AUTHENTICATION_ERROR, 'User created but no user data returned'));
    }
    
    // Also create a record in our users table
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: authData.user.email || '',
        name,
        role
      });
      
    if (insertError) {
      logger.error('Error inserting user into database:', insertError);
      // We don't return an error here because the auth user was created successfully
      // This is a non-critical error that we'll log but not fail the request
    }
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: authData.user.id,
        email: authData.user.email,
        name,
        role
      }
    });
  } catch (error: unknown) {
    logger.error('Registration error:', error);
    next(error); // Pass to error handler
  }
});

// Development-only login endpoint
router.post('/dev-login', async (req: express.Request, res: Response, next: NextFunction) => {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV !== 'development' && process.env.PROTOTYPE_MODE !== 'true') {
      return next(new ApiError(ErrorCode.INSUFFICIENT_PERMISSIONS, 'Development login only available in development mode'));
    }
    
    logger.info('Development login requested');
    
    // Create a mock user and session
    const mockUser = {
      id: '00000000-0000-0000-0000-000000000000',
      email: 'dev@example.com',
      name: 'Development User',
      role: 'admin'
    };
    
    const mockSession = {
      access_token: 'dev-token-' + Date.now(),
      refresh_token: 'dev-refresh-' + Date.now(),
      expires_at: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };
    
    res.json({
      success: true,
      message: 'Development login successful',
      data: {
        user: mockUser,
        session: mockSession
      }
    });
  } catch (error: unknown) {
    logger.error('Development login error:', error);
    next(error); // Pass to error handler
  }
});

export default router;
