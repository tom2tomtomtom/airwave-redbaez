import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { authenticateToken as checkAuth, generateToken } from '../middleware/auth';

const router = express.Router();

import { supabase } from '../db/supabaseClient';

// We'll now use the Supabase users table instead of in-memory storage

// POST - Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Use Supabase Auth for authentication
    console.log(`Attempting to sign in user with email: ${email}`);
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (signInError || !authData.user) {
      console.error('Login error:', signInError?.message || 'Authentication failed');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Get user metadata from Supabase Auth user
    const user = {
      id: authData.user.id,
      email: authData.user.email,
      name: authData.user.user_metadata.name || 'User',
      role: authData.user.user_metadata.role || 'user'
    };

    // Use the centralized token generation function
    console.log('Generating token for user:', { id: user.id, email: user.email, role: user.role });
    const token = generateToken(user);

    // Return user and token
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

// GET - Get current user info
router.get('/me', checkAuth, async (req, res) => {
  console.log('GET /me - User from token:', req.user);
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get current Supabase Auth user
    const { data: authUser, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser.user) {
      console.error('Error fetching Supabase auth user:', authError?.message || 'User not found');
      
      // Fall back to token information if no active Supabase session
      const user = {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        avatar_url: null,
        settings: {}
      };
      
      return res.json({
        success: true,
        data: user
      });
    }
    
    // Construct user object from Supabase Auth data
    const user = {
      id: authUser.user.id,
      email: authUser.user.email,
      name: authUser.user.user_metadata?.name || req.user.name || 'User',
      role: authUser.user.user_metadata?.role || req.user.role || 'user',
      avatar_url: authUser.user.user_metadata?.avatar_url || null,
      settings: authUser.user.user_metadata?.settings || {}
    };

    // Return user info (excluding password)
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user info',
      error: error.message
    });
  }
});

// POST - Register new user (admin only in production)
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role = 'user' } = req.body;

    // Validate inputs
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      });
    }

    // Use Supabase Auth to create the user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role
        }
      }
    });
    
    if (signUpError) {
      console.error('Error creating user with Supabase Auth:', signUpError);
      return res.status(500).json({
        success: false,
        message: signUpError.message || 'Registration failed'
      });
    }

    if (!authData.user) {
      return res.status(500).json({
        success: false,
        message: 'User creation failed - no user returned'
      });
    }

    // Create user record in our users table with a reference to the auth user
    const newUser = {
      id: authData.user.id,  // Use the Supabase Auth user ID
      email: authData.user.email,
      name,
      role
    };

    // Generate JWT token for our own authentication system
    console.log('Generating token for new user:', { id: newUser.id, email: newUser.email, role: newUser.role });
    const token = generateToken(newUser);

    // Return user and token
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

// PUT - Update user profile
router.put('/profile', checkAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const userId = req.user.id;
    const { name, currentPassword, newPassword, settings, avatar_url } = req.body;
    
    // Prepare update data
    const updateData: Record<string, any> = {
      updated_at: new Date()
    };
    
    if (name) updateData.name = name;
    if (settings) updateData.settings = settings;
    if (avatar_url) updateData.avatar_url = avatar_url;
    
    // If password change requested, verify current password first
    if (newPassword && currentPassword) {
      // Get current user data with password
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (userError || !user) {
        console.error('Error fetching user:', userError?.message || 'User not found');
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
      
      // Hash new password and add to update data
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(newPassword, salt);
      updateData.last_login = new Date();
    }
    
    // Update user in database
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, email, name, role, avatar_url, settings')
      .single();
    
    if (updateError) {
      console.error('Error updating user profile:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
});

// Helper middleware for admin check
const checkAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
};

// GET - Get all users (admin only)
router.get('/users', checkAuth, checkAdmin, async (req, res) => {
  try {
    // Fetch all users from the database (excluding passwords)
    const { data: userList, error } = await supabase
      .from('users')
      .select('id, email, name, role, created_at, last_login')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve users'
      });
    }
    
    res.json({
      success: true,
      data: userList
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error.message
    });
  }
});

// POST - Create new user (admin only)
router.post('/users', checkAuth, checkAdmin, async (req, res) => {
  try {
    const { email, password, name, role = 'user' } = req.body;

    // Validate inputs
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      });
    }

    // Check if email already exists in the database
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .maybeSingle();
      
    if (userCheckError) {
      console.error('Error checking existing user:', userCheckError);
      return res.status(500).json({
        success: false,
        message: 'User creation failed'
      });
    }
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use'
      });
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
      return res.status(500).json({
        success: false,
        message: 'Failed to create user account'
      });
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
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
});

// Debug endpoint to create a test user (DEV ONLY)
router.post('/debug-create-user', async (req, res) => {
  // Only allow in development mode
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      message: 'This endpoint is only available in development mode'
    });
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
      return res.status(500).json({
        success: false,
        message: 'Failed to create test user',
        error: signUpError
      });
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
    return res.status(500).json({
      success: false,
      message: 'Failed to create test user',
      error: err.message
    });
  }
});

export default router;