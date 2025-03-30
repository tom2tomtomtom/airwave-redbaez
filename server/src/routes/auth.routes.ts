import express from 'express';
import { authenticateToken as checkAuth, AUTH_MODE } from '../middleware/auth';
import bcrypt from 'bcrypt';
import { AuthenticatedRequest } from '../types/AuthenticatedRequest';
import { Response, NextFunction } from 'express';
import { supabase } from '../db/supabaseClient';
import { ApiError } from '@/utils/ApiError'; // Corrected import path
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

    console.log(`Completing registration for user: ${user.id} (${user.email})`);
    
    // Check if we're in prototype mode
    if (process.env.PROTOTYPE_MODE === 'true') {
      console.log('PROTOTYPE MODE: Bypassing database registration completion');
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
      console.error('Error checking user:', checkError);
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
        console.error('Error inserting user into database:', insertError);
        return next(new ApiError(ErrorCode.DATABASE_ERROR, 'Error creating user in database', undefined, { originalError: insertError.message }));
      }
      
      console.log('User record created in database');
    } else {
      console.log('User already exists in database');
    }

    // Return success
    res.status(201).json({
      success: true,
      message: 'Registration completed successfully'
    });
  } catch (error: any) {
    console.error('Registration completion error:', error);
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

    console.log(`Session sync for user: ${user.id} (${user.email})`);
    
    // Check if we're in prototype mode
    if (process.env.PROTOTYPE_MODE === 'true') {
      console.log('PROTOTYPE MODE: Bypassing database session sync');
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
      console.error('Error checking user:', userError);
    }
    
    // Create user if doesn't exist
    if (!existingUser) {
      console.log('Creating user record in database for:', user.id);
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || 'User',
          role: user.user_metadata?.role || 'user'
        });
        
      if (insertError) {
        console.error('Error creating user record:', insertError);
      }
    }

    // Return success
    res.json({
      success: true,
      message: 'Session synchronized successfully'
    });
  } catch (error: any) {
    console.error('Session sync error:', error);
    next(error); // Pass to error handler
  }
}); // Correct closing for the route handler

// GET - Get current user info
router.get('/me', checkAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Check if we're in prototype or development mode with auth bypass
    if ((AUTH_MODE.CURRENT === 'prototype' || AUTH_MODE.CURRENT === 'development') && AUTH_MODE.BYPASS_AUTH) {
      console.log('PROTOTYPE MODE with auth bypass: Returning mock user data');
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
      console.error('Invalid Supabase token:', tokenError?.message || 'User not found');
      return next(new ApiError(ErrorCode.AUTHENTICATION_REQUIRED, tokenError?.message || 'Invalid or expired token', undefined, { originalError: tokenError }));
    }
    
    const authUser = tokenData.user;
    console.log('GET /me - User from Supabase token:', authUser.id);

    // Get additional user data from our database
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();
    
    if (dbError && dbError.code !== 'PGRST116') { // PGRST116 is 'not found'
      console.error('Error fetching user from database:', dbError.message);
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
  } catch (error: any) {
    console.error('Error fetching user:', error);
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
       console.error('Invalid Supabase token for admin check:', tokenError?.message || 'User not found');
      return next(new ApiError(ErrorCode.AUTHENTICATION_REQUIRED, tokenError?.message || 'Invalid or expired token for admin check', undefined, { originalError: tokenError }));
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
      console.error('Error creating user with Supabase Auth:', signUpError);
      return next(new ApiError(ErrorCode.EXTERNAL_SERVICE_ERROR, 'Registration failed via Supabase Auth', undefined, { originalError: signUpError.message, service: 'Supabase Auth' }));
    }

    if (!authData.user) {
      return next(new ApiError(ErrorCode.INTERNAL_ERROR, 'User creation failed - no user returned from Supabase Auth', undefined, undefined));
    }

    // Create user record in our users table
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: authData.user.email || '',
        name,
        role
      });
      
    if (insertError) {
      console.error('Error creating user record in database:', insertError);
    }

    // Return success
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name,
          role
        }
      }
    });
  } catch (error: any) {
    console.error('Error registering user:', error);
    next(error); // Pass to error handler
  }
});

// Helper middleware for admin check
const checkAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') {
    return next(new ApiError(ErrorCode.INSUFFICIENT_PERMISSIONS, 'Access denied. Admin privileges required.'));
  }
  next();
};

// GET - Get all users (admin only)
router.get('/users', checkAuth, checkAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Fetch all users from the database (excluding passwords)
    const { data: userList, error } = await supabase
      .from('users')
      .select('id, email, name, role, created_at, last_login')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching users:', error);
      return next(new ApiError(ErrorCode.DATABASE_ERROR, 'Failed to retrieve users from database.', undefined, { originalError: error.message }));
    }
    
    res.json({
      success: true,
      data: userList
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    next(error); // Pass to error handler
  }
});

// POST - Create new user (admin only)
router.post('/users', checkAuth, checkAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password, name, role = 'user' } = req.body;

    // Validate inputs
    if (!email || !password || !name) {
      return next(new ApiError(ErrorCode.INVALID_INPUT, 'Email, password, and name are required for user creation.'));
    }

    // Check if email already exists in the database
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .maybeSingle();
      
    if (userCheckError) {
      console.error('Error checking existing user:', userCheckError);
      return next(new ApiError(ErrorCode.DATABASE_ERROR, 'Database error checking for existing user email.', undefined, { email, originalError: userCheckError.message }));
    }
    
    if (existingUser) {
      return next(new ApiError(ErrorCode.RESOURCE_ALREADY_EXISTS, 'Email already in use.'));
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user in database
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          email,
          password: hashedPassword,
          name,
          role
        }
      ])
      .select('*')
      .single();
    
    if (insertError || !newUser) {
      console.error('Error creating user:', insertError?.message || 'Unknown error');
      return next(new ApiError(ErrorCode.DATABASE_ERROR, 'Failed to create user account.', undefined, { email, originalError: insertError?.message }));
    }

    // Return success
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      }
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    next(error); // Pass to error handler
  }
});

// Debug endpoint to create a test user (DEV ONLY)
router.post('/debug-create-user', async (req: express.Request, res: Response, next: NextFunction) => {
  // Only allow in development mode
  if (process.env.NODE_ENV === 'production') {
    return next(new ApiError(ErrorCode.INSUFFICIENT_PERMISSIONS, 'Debug endpoint only available in non-production environments.'));
  }

  try {
    console.log('Creating debug test user...');
    
    // Create a test user with Supabase Auth
    const timestamp = Date.now();
    // Using gmail.com which should be well-formed and acceptable
    const email = `test.user.${timestamp}@gmail.com`; 
    const password = 'Test123!@#';
    const name = 'Test User';
    
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: 'user'
        }
      }
    });
    
    if (signUpError) {
      console.error('Error creating test user:', signUpError);
      return next(new ApiError(ErrorCode.EXTERNAL_SERVICE_ERROR, 'Failed to create test user via Supabase Auth.', undefined, { originalError: signUpError.message, service: 'Supabase Auth' }));
    }
    
    // Return the user data including the ID needed for asset creation
    return res.status(201).json({
      success: true,
      message: 'Test user created successfully',
      data: {
        id: authData.user?.id,
        email,
        name,
        note: 'Use this ID as userId for the assets/debug-create endpoint'
      }
    });
  } catch (err: any) {
    console.error('Error in debug-create-user:', err);
    next(err); // Pass to error handler
  }
});

// Development login endpoint - only available when USE_DEV_LOGIN is true
router.post('/dev-login', async (req: express.Request, res: Response, next: NextFunction) => {
  // Allow in development and prototype modes
  // In prototype mode, we want to bypass auth completely
  if ((AUTH_MODE.CURRENT !== 'development' && AUTH_MODE.CURRENT !== 'prototype') || 
      (!process.env.USE_DEV_LOGIN && !AUTH_MODE.BYPASS_AUTH)) {
    return next(new ApiError(ErrorCode.INSUFFICIENT_PERMISSIONS, 'Dev login endpoint not available in current mode/configuration.'));
  }

  try {
    console.log('Development login - using Supabase directly...');
    
    // Use Supabase to sign in with a development user
    // First, see if we already have a development user
    const devEmail = 'dev@example.com';
    const devPassword = 'devPassword123!';
    
    // Try to sign in with the development credentials
    let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: devEmail,
      password: devPassword
    });
    
    // If the user doesn't exist, create it
    if (signInError && signInError.message.includes('Invalid login credentials')) {
      console.log('Development user does not exist, creating...');
      
      // Create a new development user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: devEmail,
        password: devPassword,
        options: {
          data: {
            name: 'Development User',
            role: 'admin'
          }
        }
      });
      
      if (signUpError) {
        console.error('Error creating development user:', signUpError);
        return next(new ApiError(ErrorCode.EXTERNAL_SERVICE_ERROR, 'Failed to create development user via Supabase Auth.', undefined, { originalError: signUpError.message, service: 'Supabase Auth' }));
      }
      
      // Now sign in with the newly created user
      ({ data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: devEmail,
        password: devPassword
      }));
    }
    
    // Check for any sign-in errors
    if (signInError) {
      console.error('Error signing in development user:', signInError);
      return next(new ApiError(ErrorCode.EXTERNAL_SERVICE_ERROR, 'Failed to sign in development user via Supabase Auth.', undefined, { originalError: signInError.message, service: 'Supabase Auth' }));
    }
    
    // Ensure we have valid session data
    if (!signInData || !signInData.session) {
      console.error('No session data returned from Supabase');
      return next(new ApiError(ErrorCode.EXTERNAL_SERVICE_ERROR, 'No session data returned from Supabase after sign-in.', undefined, { service: 'Supabase Auth' }));
    }
    
    console.log('Development login successful, returning valid Supabase tokens');
    
    // Add user to our database if not already there
    const user = signInData.user;
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();
    
    if (!existingUser && (!checkError || checkError.code === 'PGRST116')) {
      // Insert user into our database
      await supabase.from('users').insert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || 'Development User',
        role: user.user_metadata?.role || 'admin'
      });
    }
    
    // Return user data with valid Supabase tokens
    return res.status(200).json({
      success: true,
      message: 'Development login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || 'Development User',
          role: user.user_metadata?.role || 'admin'
        },
        session: signInData.session
      }
    });
  } catch (err: any) {
    console.error('Error in dev-login:', err);
    next(err); // Pass to error handler
  }
});

// Status check endpoint for health monitoring
router.get('/check', async (req: express.Request, res: Response, next: NextFunction) => {
  try {
    // Simple database query to verify connection
    const { data, error } = await supabase
      .from('assets')
      .select('count')
      .limit(1);
      
    if (error) {
      return next(new ApiError(ErrorCode.DATABASE_ERROR, 'Health check failed: Cannot connect to the database.', undefined, { originalError: error.message }));
    }
    
    return res.status(200).json({
      connected: true,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error checking status:', error);
    next(error); // Pass to error handler
  }
});

// Supabase status check endpoint
router.get('/supabase-status', async (req: express.Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    return res.status(200).json({
      connected: !error,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error checking Supabase status:', error);
    next(error); // Pass to error handler
  }
});

export default router;