# AIrWAVE Setup Guide

Follow these steps to set up the AIrWAVE platform for development and testing.

## Prerequisites

- Node.js v18+ 
- npm or yarn
- Supabase account
- Creatomate account (for video generation)
- OpenAI API key (for LLM integration)
- Docker and Docker Compose (optional, for containerized setup)

## Setup Steps

### 1. Clone the repository

```bash
git clone <repository-url>
cd airwave-redbaez
```

### 2. Install dependencies

```bash
npm run install:all
```

This will install dependencies for the root project, client, and server.

### 3. Set up environment variables

#### Server

```bash
cp server/.env.example server/.env
```

Edit `server/.env` to add your API keys and configuration:

**Essential Keys:**
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase service role key (or anon key for development)
- `JWT_SECRET`: A secret key for JWT token generation

**For Full Functionality:**
- `CREATOMATE_API_KEY`: Your Creatomate API key for video generation
- `LLM_API_KEY`: Your OpenAI API key for motivation/copy generation

#### Client

```bash
cp client/.env.example client/.env
```

The default configuration should work for local development.

### 4. Supabase Setup

1. Create a new Supabase project
2. Set up the database schema:
   - Go to the SQL Editor in Supabase dashboard
   - Copy the SQL from `server/src/db/schema.sql` and `server/src/db/schema_extension.sql`
   - Run the SQL to create all required tables

3. Create a Supabase Edge Function for LLM integration:
   - Navigate to Edge Functions in your Supabase dashboard
   - Create new Edge Functions:
     - `process-brief`: For processing client briefs using LLM
     - `regenerate-motivations`: For regenerating motivations with feedback
     - `generate-copy`: For generating copy based on motivations

4. Configure secrets in your Supabase project:
   ```bash
   supabase secrets set LLM_API_KEY=your_openai_api_key
   ```

### 5. Development Mode

For testing without external API dependencies, use Prototype Mode:

```
PROTOTYPE_MODE=true
```

This will use mock data instead of calling external APIs.

### 6. Start the application

#### Using Node.js locally

```bash
npm run dev
```

This will start both the client (port 3002) and server (port 3001).

- Frontend: http://localhost:3002
- Backend API: http://localhost:3001
- WebSocket: ws://localhost:3001/ws

#### Using Docker

```bash
# Copy the Docker environment file
cp .env.docker .env

# Edit .env with your API keys and credentials
nano .env  # or use any text editor

# Start the containers
docker-compose up -d

# To view logs
docker-compose logs -f
```

The application will be available at:
- Frontend: http://localhost:3002
- Backend API: http://localhost:3001

## Testing

To test the application with real API integration:

1. Disable prototype mode in `.env`:
   ```
   PROTOTYPE_MODE=false
   ```

2. Ensure all required API keys are set up
3. Restart the application

## Troubleshooting

- **Port conflicts**: Change the PORT variable in .env files
- **Connection issues**: Check that client and server URLs match in your environment files
- **Database errors**: Ensure your Supabase tables are correctly set up with the schema
- **API call failures**: Verify your API keys in the .env file

## Deployment

### Netlify (Frontend)

1. Connect your GitHub repository to Netlify
2. Configure build settings:
   - Build command: `cd client && npm run build`
   - Publish directory: `client/build`
3. Set environment variables in Netlify dashboard

### Supabase (Backend)

The backend leverages Supabase for most of its functionality:
- Database
- Authentication
- Edge Functions for LLM integration
- Storage

You only need to deploy the Express server for handling:
- WebSockets
- Creatomate integration
- File uploads processing