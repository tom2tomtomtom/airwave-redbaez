# AIrWAVE Implementation Guide: Strategy & Copy Generation Flow

This document provides a comprehensive guide for setting up and implementing the Strategy & Copy Generation Flow and Campaign Matrix features in the AIrWAVE platform.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation & Setup](#installation--setup)
4. [Supabase Configuration](#supabase-configuration)
5. [LLM Integration](#llm-integration)
6. [UI Components](#ui-components)
7. [Testing & Troubleshooting](#testing--troubleshooting)
8. [Production Deployment](#production-deployment)

## Overview

The Strategy & Copy Generation Flow and Campaign Matrix enhancements add three major new capabilities to AIrWAVE:

1. **Strategy Development**: AI-assisted creation of campaign motivations based on client briefs
2. **Copy Generation**: Creation of ad copy variations based on selected motivations
3. **Client Sign-Off**: A dedicated portal for client review and approval
4. **Campaign Matrix**: A visual grid for combining assets and generating multiple ad variations

## Prerequisites

- Node.js v18+ and npm/yarn
- Supabase account (for database, authentication, and edge functions)
- OpenAI API key or other LLM provider access
- Creatomate API key (for video rendering)
- SMTP credentials for email notifications (optional)

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/airwave-redbaez.git
   cd airwave-redbaez
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   
   Copy the example environment files:
   ```bash
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   ```
   
   Edit these files to include your API keys and configuration settings.

4. **Run the local development environment:**
   ```bash
   npm run dev
   ```

## Supabase Configuration

### Database Schema

1. Run the schema extension SQL script to add the necessary tables:
   ```bash
   cd server/src/db
   supabase db push schema_extension.sql
   ```
   
   This will create the following tables:
   - `briefs` - Stores client briefs
   - `motivations` - Stores generated motivations
   - `copy_variations` - Stores generated copy
   - `sign_offs` - Manages the client sign-off process
   - `sign_off_versions` - Tracks versions of client sign-offs
   - `notifications` - Manages email notifications
   - `campaign_matrices` - Stores the asset matrix configurations

### Edge Functions

1. Deploy the LLM integration Edge Functions:
   ```bash
   cd server/supabase/functions
   supabase functions deploy
   ```
   
   This will deploy three functions:
   - `process-brief`: Generates motivations from client briefs
   - `regenerate-motivations`: Refines motivations based on feedback
   - `generate-copy`: Creates copy variations from selected motivations

2. Set environment variables for the Edge Functions:
   ```bash
   supabase secrets set LLM_API_KEY=your_openai_api_key
   supabase secrets set LLM_API_URL=https://api.openai.com/v1/chat/completions
   supabase secrets set LLM_MODEL=gpt-4
   ```

## LLM Integration

The system uses LLMs (Large Language Models) for generating strategic motivations and ad copy. The integration has the following components:

1. **Client Brief Processing**: The `process-brief` Edge Function takes a client brief and generates 8 diverse motivations.

2. **Motivation Refinement**: The `regenerate-motivations` Edge Function takes user feedback and generates new motivations.

3. **Copy Generation**: The `generate-copy` Edge Function takes selected motivations and generates ad copy variations.

Configuration options in the `.env` file:
```
LLM_API_KEY=your_openai_api_key
LLM_API_URL=https://api.openai.com/v1/chat/completions
LLM_MODEL=gpt-4
```

## UI Components

The implementation includes the following UI components:

### Strategy Development Flow
- **StrategyPage.tsx**: Client brief upload/input and motivation selection
- **CopyGenerationPage.tsx**: Setting copy parameters and viewing generated variations

### Client Sign-off
- **ClientSignOffPortal.tsx**: Standalone portal for client review of copy and motivations

### Campaign Matrix
- **CampaignMatrix.tsx**: Grid-based interface for asset combinations

### Routes Configuration
The App.tsx file includes routes for these components:
```jsx
<Route path="/generate/strategy" element={<StrategyPage />} />
<Route path="/generate/copy" element={<CopyGenerationPage />} />
<Route path="/client-review/:token" element={<ClientSignOffPortal />} />
```

## Testing & Troubleshooting

### Testing

1. **Strategy Flow Testing**:
   - Upload a client brief or fill the brief form
   - Check if motivations are generated correctly
   - Test feedback and regeneration
   - Test copy generation with different parameters

2. **Client Sign-off Testing**:
   - Test the sign-off creation process
   - Visit the client portal using the generated token
   - Test approvals and rejections
   - Test email notifications

3. **Campaign Matrix Testing**:
   - Test adding and removing rows
   - Test asset selection and locking
   - Test combination generation
   - Test rendering through Creatomate

### Common Issues

1. **LLM API Issues**:
   - Check API key validity
   - Check rate limits
   - Verify proper prompt formatting
   
2. **Supabase Edge Function Issues**:
   - Check Edge Function logs in Supabase dashboard
   - Verify secret values are set correctly
   - Test functions locally using the Supabase CLI

3. **UI Issues**:
   - Check browser console for errors
   - Verify Redux state updates correctly
   - Check API calls in Network tab

## Production Deployment

### Checklist

1. **Environment Variables**:
   - Set all production environment variables
   - Disable `PROTOTYPE_MODE`
   - Use secure API keys

2. **Supabase Settings**:
   - Ensure RLS policies are properly configured
   - Set up database backups
   - Configure CORS settings for production domains

3. **Frontend Deployment**:
   - Build the frontend for production
   - Deploy to Netlify or other hosting platform
   - Set up proper redirects for React Router

4. **Security Considerations**:
   - Review token generation and validation for sign-offs
   - Implement rate limiting for API endpoints
   - Set appropriate caching headers

### Deployment Commands

```bash
# Build for production
npm run build

# Deploy to Netlify
netlify deploy --prod
```

## Conclusion

This implementation guide covers the essential steps for setting up the Strategy & Copy Generation Flow and Campaign Matrix features. For additional details, refer to the codebase documentation and comments.

For support or questions, contact the development team or open an issue in the project repository.