import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { checkAuth, checkAdmin } from '../middleware/auth.middleware';

const router = express.Router();

// Temporary in-memory user storage for prototype
// In production, you'd use Supabase
const users = [
  {
    id: '1',
    email: 'admin@redbaez.com',
    password: '$2a$10$vThgHKPrcnkBJj5UdS1oA.1l/dC7FKHida7ROQlJYkEFYjzwrQKBu', // 'admin123'
    name: 'Admin User',
    role: 'admin'
  },
  {
    id: '2',
    email: 'user@redbaez.com',
    password: '$2a$10$vFQU9E7Z.pUgGzYvESAnLOh2xq3XfL7CIvBRvH1zPgzYIKfI6O26u', // 'user123'
    name: 'Standard User',
    role: 'user'
  }
];

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

    // For prototype mode, enable simplified login
    if (process.env.NODE_ENV === 'development' && process.env.PROTOTYPE_MODE === 'true') {
      // Accept any username/password, treat all as admin
      const token = jwt.sign(
        { 
          id: 'prototype-user', 
          email, 
          role: 'admin' 
        },
        process.env.JWT_SECRET || 'prototype-secret',
        { expiresIn: '7d' }
      );

      return res.json({
        success: true,
        message: 'Prototype login successful',
        data: {
          token,
          user: {
            id: 'prototype-user',
            email,
            name: 'Prototype User',
            role: 'admin'
          }
        }
      });
    }

    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    );

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
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // For prototype, return the user info from the token
    if (process.env.NODE_ENV === 'development' && process.env.PROTOTYPE_MODE === 'true') {
      return res.json({
        success: true,
        data: {
          id: req.user.id,
          email: req.user.email,
          name: 'Prototype User',
          role: req.user.role
        }
      });
    }

    // Find user by ID
    const user = users.find(u => u.id === req.user?.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

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

    // In production, this would check if email already exists in the database
    if (users.some(u => u.email === email)) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = {
      id: Date.now().toString(),
      email,
      password: hashedPassword,
      name,
      role
    };

    // In production, this would save the user to the database
    users.push(newUser);

    // Return success (without token - require login)
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
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

    const { name, currentPassword, newPassword } = req.body;

    // In production, this would update the user in the database
    // For the prototype, we'll just return success
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: req.user.id,
        email: req.user.email,
        name: name || 'Updated Name',
        role: req.user.role
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
});

// GET - Get all users (admin only)
router.get('/users', checkAuth, checkAdmin, async (req, res) => {
  try {
    // In production, this would fetch users from the database
    // For the prototype, return the mock users (excluding passwords)
    const userList = users.map(({ id, email, name, role }) => ({
      id,
      email,
      name,
      role
    }));
    
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

    // Check if email already exists
    if (users.some(u => u.email === email)) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = {
      id: Date.now().toString(),
      email,
      password: hashedPassword,
      name,
      role
    };

    // In production, this would save the user to the database
    users.push(newUser);

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

export default router;