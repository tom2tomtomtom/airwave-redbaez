# AIrWAVE by Redbaez

A digital ad execution platform for generating multiple ad formats at scale using Creatomate integration.

## 🌟 Overview

AIrWAVE is a powerful tool that streamlines the process of creating multiple ad versions for different platforms. It allows users to:

- Upload and manage creative assets (videos, images, voiceovers, copy)
- Select from a matrix of brand templates for different platforms
- Generate multiple ad executions via Creatomate API
- Organize executions by campaign and platform
- Export finalized ads in formats optimized for various ad platforms
- Receive real-time updates on video generation progress

## 🛠️ Tech Stack

### Frontend
- React with TypeScript
- Material UI for UI components
- Redux Toolkit for state management
- React Router for navigation
- Formik & Yup for form handling
- WebSocket client for real-time updates

### Backend
- Node.js with Express
- TypeScript
- Supabase for database and authentication
- WebSocket server for real-time communication
- Multer for file uploads
- AWS S3 for asset storage (production)

### Integration
- Creatomate API for video generation
- Platform-specific export formats (Meta, YouTube, TikTok)
- Real-time rendering status updates

### Deployment
- Netlify for frontend hosting
- Supabase for backend services
- Docker for containerization

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- npm or yarn
- Supabase account
- Creatomate API key

### Installation

```bash
# Clone the repository
git clone https://github.com/tom2tomtomtom/airwave-redbaez.git
cd airwave-redbaez

# Install all dependencies (client, server, and root)
npm run install:all

# Set up environment variables
cp server/.env.example server/.env
# Edit .env with your Supabase and Creatomate credentials

# Start development servers
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3002
- Backend API: http://localhost:3001
- WebSocket: ws://localhost:3001/ws

### Troubleshooting

If you encounter issues with nested server directories or duplicate files:

1. Check that you don't have server directories inside other server directories
2. Ensure routes have consistent naming (e.g., not both assetRoutes.ts and assets.routes.ts)
3. For port conflicts, modify the PORT variable in .env files

## 📊 Project Structure

```
airwave-redbaez/
├── client/                  # React frontend
│   ├── public/              # Static assets
│   └── src/
│       ├── components/      # Reusable UI components
│       │   ├── assets/      # Asset-related components
│       │   ├── campaigns/   # Campaign-related components
│       │   ├── common/      # Shared UI components
│       │   ├── exports/     # Export-related components
│       │   ├── layout/      # Layout components
│       │   └── templates/   # Template components
│       ├── pages/           # Page components
│       │   ├── assets/      # Asset management pages
│       │   ├── auth/        # Authentication pages
│       │   ├── campaigns/   # Campaign management pages
│       │   ├── dashboard/   # Dashboard pages
│       │   ├── exports/     # Export pages
│       │   ├── generate/    # Generation pages
│       │   └── templates/   # Template pages
│       ├── store/           # Redux store and slices
│       ├── types/           # TypeScript type definitions
│       ├── utils/           # Utility functions and services
│       │   ├── api.ts       # API client
│       │   ├── auth.ts      # Authentication utilities
│       │   ├── websocketClient.ts # WebSocket client
│       │   └── socketMonitor.js  # WebSocket monitoring
│       └── App.tsx          # Main app component
├── server/                  # Node.js backend
│   ├── src/
│   │   ├── db/              # Database models and schema
│   │   │   ├── schema.sql   # SQL schema definitions
│   │   │   └── supabaseClient.ts # Supabase connection
│   │   ├── middleware/      # Express middleware
│   │   │   └── auth.middleware.ts # Authentication middleware
│   │   ├── routes/          # API routes
│   │   │   ├── assetRoutes.ts      # Asset management
│   │   │   ├── auth.routes.ts      # Authentication
│   │   │   ├── campaignRoutes.ts   # Campaign management
│   │   │   ├── creatomate.routes.ts # Creatomate integration
│   │   │   ├── exports.routes.ts   # Export management
│   │   │   ├── templateRoutes.ts   # Template management
│   │   │   └── webhooks.routes.ts  # Webhook handlers
│   │   ├── services/        # Service layer
│   │   │   ├── creatomateService.ts # Creatomate API integration
│   │   │   └── websocket.ts # WebSocket server
│   │   └── index.ts         # Server entry point
│   ├── uploads/             # Local file storage (development)
│   └── .env.example         # Environment variables template
├── shared/                  # Shared types and utilities
│   └── types/               # Shared TypeScript types
├── .env                     # Root environment variables
├── docker-compose.yml       # Docker configuration
└── netlify.toml            # Netlify deployment config
```

## 🔄 Workflow

1. **Asset Management**: Upload videos, images, voiceovers, and copy to build your asset library
2. **Template Selection**: Browse templates created for your brand and different platforms
3. **Campaign Organization**: Group related ad executions by campaign, client, and platform
4. **Execution Generation**: Pass selected assets to templates via Creatomate to generate videos
   - Real-time updates show generation progress via WebSocket
5. **Export & Distribution**: Export finalized ads in platform-specific formats

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `GET /api/auth/users` - List all users (admin only)
- `POST /api/auth/users` - Create new user (admin only)

### Assets
- `GET /api/assets` - List assets
- `POST /api/assets/upload` - Upload new asset
- `GET /api/assets/:id` - Get asset details
- `PUT /api/assets/:id` - Update asset
- `DELETE /api/assets/:id` - Delete asset
- `PUT /api/assets/:id/favorite` - Toggle favorite status
- `GET /api/assets/file/:filename` - Retrieve asset file

### Templates
- `GET /api/templates` - List templates
- `GET /api/templates/:id` - Get template details
- `POST /api/templates` - Create template (admin only)
- `PUT /api/templates/:id` - Update template (admin only)
- `DELETE /api/templates/:id` - Delete template (admin only)
- `PUT /api/templates/:id/favorite` - Toggle favorite status
- `POST /api/templates/import-from-creatomate` - Import templates from Creatomate

### Campaigns
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns/:id` - Get campaign details
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign
- `POST /api/campaigns/:id/executions` - Add execution to campaign
- `POST /api/campaigns/:id/render` - Start rendering all executions in campaign

### Creatomate Integration
- `POST /api/creatomate/generate` - Generate video
- `POST /api/creatomate/preview` - Generate preview (faster, lower quality)
- `GET /api/creatomate/render/:jobId` - Check render status
- `GET /api/creatomate/templates` - List Creatomate templates
- `POST /api/creatomate/batch` - Batch generate multiple videos
- `POST /api/creatomate/platform-formats` - Generate videos for multiple platforms
- `POST /api/creatomate/webhook` - Webhook for Creatomate render status updates

### Exports
- `GET /api/exports/platform-specs` - Get platform specifications
- `POST /api/exports/campaign/:id` - Export campaign for platforms
- `GET /api/exports/campaign/:id/download` - Download exported files

## 🔄 WebSocket Events

The application uses WebSockets for real-time updates:

### Server to Client
- `renderStatus` - Updates on video render status
- `connection` - Initial connection message
- `identified` - User identification confirmation
- `subscribed` - Channel subscription confirmation
- `pong` - Response to ping messages

### Client to Server
- `ping` - Keep-alive message
- `identify` - Identify user to the server
- `subscribe` - Subscribe to specific update channels

## 📝 Development Notes

During prototype development:
- Authentication is simplified with the PROTOTYPE_MODE flag
- All users are granted admin privileges
- Creatomate API calls are simulated for testing
- Asset storage uses local file system instead of S3
- Database commands use in-memory fallbacks when Supabase operations fail

### Running in Prototype Mode

To enable prototype mode, set in server/.env:
```
PROTOTYPE_MODE=true
```

This will:
1. Skip authentication verification
2. Generate mock responses for Creatomate API calls
3. Use local file storage instead of S3
4. Provide useful sample data for templates and campaigns

### Local Development Tips

- For consistent frontend-backend connections, keep both running simultaneously
- WebSocket debugging is available through the browser console with `window._socketDebug.getStatus()`
- Check the WebSocket connection in the browser console for real-time updates
- The server keeps the WebSocket connection alive with ping messages every 30 seconds

## 🔒 Security Considerations

For production:
- Disable PROTOTYPE_MODE in environment variables
- Enable proper authentication with Supabase
- Implement role-based access control
- Use secure storage for assets (AWS S3)
- Set up proper API key management
- Store all sensitive keys in environment variables only
- Implement rate limiting for API requests (already configured but needs proper settings)

## 📱 Supported Platforms

AIrWAVE supports generating ads for:
- Meta (Facebook, Instagram)
  - Square (1:1)
  - Vertical (4:5, 9:16)
  - Horizontal (16:9)
- YouTube
  - Standard (16:9)
  - Shorts (9:16)
- TikTok
  - Vertical (9:16)

Each platform has specific format requirements which are handled automatically through the `platform-formats` API.

## 🔧 System Requirements

### Development
- Node.js v18 or higher
- 4GB RAM minimum
- 500MB disk space for dependencies
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Production
- Node.js v18 or higher
- 8GB RAM recommended for video processing
- SSD storage for faster file operations
- Docker for containerization
- Supabase account
- Creatomate account with API key

## 🔮 Future Enhancements

- Direct platform publishing to social media
- AI-powered asset tagging and categorization
- Performance analytics for ad campaigns
- A/B testing capabilities
- Advanced video editing features
- Collaboration tools for teams
- Scheduled publishing
- Integration with Adobe Creative Cloud

## 📄 License

All rights reserved - Redbaez © 2025