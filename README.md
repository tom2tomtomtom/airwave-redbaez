# AIrWAVE by Redbaez

A digital ad execution platform for generating multiple ad formats at scale using Creatomate integration.

## 🌟 Overview

AIrWAVE is a powerful tool that streamlines the process of creating multiple ad versions for different platforms. It allows users to:

- Upload and manage creative assets (videos, images, voiceovers, copy)
- Select from a matrix of brand templates for different platforms
- Generate multiple ad executions via Creatomate API
- Organize executions by campaign and platform
- Export finalized ads in formats optimized for various ad platforms

## 🛠️ Tech Stack

### Frontend
- React with TypeScript
- Material UI for UI components
- Redux Toolkit for state management
- React Router for navigation
- Formik & Yup for form handling

### Backend
- Node.js with Express
- TypeScript
- Supabase for database and authentication
- Multer for file uploads
- AWS S3 for asset storage

### Integration
- Creatomate API for video generation
- Platform-specific export formats (Meta, YouTube, TikTok)

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

# Install dependencies
npm install

# Set up environment variables
cp server/.env.example server/.env
# Edit .env with your Supabase and Creatomate credentials

# Start development servers
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

## 📊 Project Structure

```
airwave-redbaez/
├── client/                  # React frontend
│   ├── public/              # Static assets
│   └── src/
│       ├── components/      # Reusable UI components
│       ├── pages/           # Page components
│       ├── store/           # Redux store and slices
│       ├── utils/           # Utility functions
│       └── App.tsx          # Main app component
├── server/                  # Node.js backend
│   ├── src/
│   │   ├── db/              # Database models and schema
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Express middleware
│   │   └── index.ts         # Server entry point
│   └── .env.example         # Environment variables template
├── shared/                  # Shared types and utilities
├── docker-compose.yml       # Docker configuration
└── netlify.toml            # Netlify deployment config
```

## 🔄 Workflow

1. **Asset Management**: Upload videos, images, voiceovers, and copy to build your asset library
2. **Template Selection**: Browse templates created for your brand and different platforms
3. **Campaign Organization**: Group related ad executions by campaign, client, and platform
4. **Execution Generation**: Pass selected assets to templates via Creatomate to generate videos
5. **Export & Distribution**: Export finalized ads in platform-specific formats

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Assets
- `GET /api/assets` - List assets
- `POST /api/assets/upload` - Upload new asset
- `GET /api/assets/:id` - Get asset details

### Templates
- `GET /api/templates` - List templates
- `GET /api/templates/:id` - Get template details

### Campaigns
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns/:id` - Get campaign details
- `POST /api/campaigns/:id/executions` - Add execution to campaign

### Creatomate Integration
- `POST /api/creatomate/generate` - Generate video
- `POST /api/creatomate/preview` - Generate preview
- `GET /api/creatomate/render/:id` - Check render status

### Exports
- `GET /api/exports/platform-specs` - Get platform specifications
- `POST /api/exports/campaign/:id` - Export campaign for platforms
- `GET /api/exports/campaign/:id/download` - Download exported files

## 📝 Development Notes

During prototype development:
- Authentication is simplified with the PROTOTYPE_MODE flag
- All users are granted admin privileges
- Creatomate API calls are simulated for testing
- Asset storage uses local file system instead of S3

## 🔒 Security Considerations

For production:
- Enable proper authentication with Supabase
- Implement role-based access control
- Use secure storage for assets
- Set up proper API key management

## 📱 Supported Platforms

AIrWAVE supports generating ads for:
- Meta (Facebook, Instagram)
- YouTube
- TikTok

Each platform has specific format requirements which are handled automatically.

## 🔮 Future Enhancements

- Direct platform publishing
- AI-powered asset tagging
- Performance analytics
- A/B testing capabilities

## 📄 License

All rights reserved - Redbaez © 2025