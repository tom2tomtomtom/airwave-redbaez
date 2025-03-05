import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { initializeDatabase } from './db/supabaseClient';

// Import route handlers
import authRoutes from './routes/authRoutes';
import assetRoutes from './routes/assetRoutes';
import templateRoutes from './routes/templateRoutes';
import campaignRoutes from './routes/campaignRoutes';
import creatomateRoutes from './routes/creatomateRoutes';
import exportRoutes from './routes/exportRoutes';

// Load environment variables
dotenv.config();

// Set up Express app
const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
}

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/creatomate', creatomateRoutes);
app.use('/api/exports', exportRoutes);

// Initialize database
initializeDatabase()
  .then(() => {
    console.log('Database initialized successfully');
  })
  .catch(error => {
    console.error('Error initializing database:', error);
  });

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.PROTOTYPE_MODE === 'true') {
    console.log('Running in PROTOTYPE MODE');
  }
});