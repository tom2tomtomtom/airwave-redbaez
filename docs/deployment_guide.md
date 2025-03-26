# AIrWAVE Deployment Guide

This guide provides instructions for deploying the AIrWAVE application in a production environment.

## Prerequisites

- Node.js v18+ installed on the server
- Docker and Docker Compose installed (for containerized deployment)
- Supabase account set up with necessary tables and functions
- Creatomate API key
- OpenAI API key (for LLM functionality)
- Domain name with SSL certificates (for HTTPS support)

## Option 1: Docker Deployment (Recommended)

The easiest way to deploy AIrWAVE is using Docker Compose, which will set up both the client and server containers.

### Step 1: Clone the Repository

```bash
git clone https://github.com/tom2tomtomtom/airwave-redbaez.git
cd airwave-redbaez
```

### Step 2: Configure Environment Variables

All necessary environment variables are already set in the configuration files. However, you should review them to ensure they match your production environment:

1. Review `.env` in the root directory
2. Review `server/.env` for server-specific variables
3. Review `client/.env` for client-specific variables
4. Review `docker-compose.yml` to ensure the environment variables are correctly set

### Step 3: Build and Start the Containers

```bash
# Build the Docker images
npm run docker:build

# Start the containers in production mode
npm run docker:prod
```

This will start the application with the client accessible on port 3002 and the server on port 3001.

### Step 4: Setup Reverse Proxy (Optional but Recommended)

For a production environment, it's recommended to use a reverse proxy like Nginx or Traefik to handle SSL termination and route traffic to your Docker containers.

Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name airwave.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name airwave.yourdomain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # Client application
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API server
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket server
    location /ws/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

## Option 2: Netlify + Supabase Deployment

Another option is to use Netlify for the frontend and Supabase for the backend services.

### Step 1: Deploy to Netlify

1. Connect your repository to Netlify
2. Configure the build settings:
   - Build command: `npm run build`
   - Publish directory: `client/build`
3. Add the required environment variables in Netlify's dashboard:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`
   - `REACT_APP_CREATOMATE_PUBLIC_TOKEN`
   - `NODE_ENV=production`

### Step 2: Set Up Supabase Edge Functions

For the server functionality, you'll need to deploy the API logic to Supabase Edge Functions:

1. Create the necessary Edge Functions in Supabase:
   - `process-brief` - For LLM brief processing
   - `regenerate-motivations` - For LLM motivation regeneration
   - `generate-copy` - For LLM copy generation
   - `creatomatewebhook` - For Creatomate webhook handling

2. Configure the Supabase project with the required environment variables:
   - `OPENAI_API_KEY`
   - `CREATOMATE_API_KEY`

### Step 3: Update Redirects

The `netlify.toml` file includes redirect rules to route API requests to your API server:

```toml
[[redirects]]
  from = "/api/*"
  to = "https://api-airwave.redbaez.com/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/ws/*"
  to = "wss://api-airwave.redbaez.com/ws/:splat"
  status = 101
  force = true
```

Ensure that your API domain (`api-airwave.redbaez.com` in this example) is correctly configured.

## Option 3: Manual Deployment

You can also deploy the application manually on a VPS or dedicated server.

### Step 1: Clone and Build

```bash
# Clone the repository
git clone https://github.com/tom2tomtomtom/airwave-redbaez.git
cd airwave-redbaez

# Install dependencies and build
npm run install:all
npm run build
```

### Step 2: Start the Server

```bash
# Start the server in production mode
NODE_ENV=production npm run start

# Or using PM2 for process management (recommended)
pm2 start npm --name "airwave-server" -- start
```

### Step 3: Serve the Client

You can serve the client using a static file server like Nginx:

```bash
# Install Nginx
sudo apt-get install nginx

# Configure Nginx to serve the client files
sudo nano /etc/nginx/sites-available/airwave
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name airwave.yourdomain.com;
    root /path/to/airwave-redbaez/client/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /ws/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

Enable the site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/airwave /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Database Setup

### Setting Up Supabase Tables

1. Connect to your Supabase project via the web console

2. Run the schema extension SQL script to create required tables:
   - Navigate to the SQL Editor in the Supabase Dashboard
   - Open `/server/src/db/schema_extension.sql`
   - Run the script to create all necessary tables and RLS policies

3. Verify that the following tables were created:
   - briefs
   - motivations
   - copy_variations
   - sign_offs
   - sign_off_versions
   - notifications
   - brief_logs
   - copy_logs

4. Verify that Row Level Security (RLS) policies are properly enabled for each table

## Verifying the Deployment

After deployment, verify that the application is working correctly:

1. Navigate to your domain in a web browser
2. Attempt to log in and access the dashboard
3. Check that API requests are successful
4. Test the WebSocket connection for real-time updates
5. Test the LLM functionality for brief processing and copy generation

## Troubleshooting

If you encounter issues with your deployment, check the following:

1. **Server Logs**: Check the server logs for any errors
2. **Client Console**: Check the browser console for any client-side errors
3. **CORS Issues**: Ensure that CORS is correctly configured to allow requests from your client domain
4. **WebSocket Connection**: Verify that WebSocket connections are properly forwarded
5. **API Keys**: Ensure that all API keys are valid and not expired
6. **Environment Variables**: Verify that all required environment variables are set correctly

## Backup and Recovery

It's important to regularly backup your data:

1. **Supabase Data**: Use Supabase's backup functionality
2. **Uploaded Files**: Backup your `uploads` directory regularly
3. **Environment Files**: Keep secure copies of your environment files

## Security Considerations

For production deployments, ensure:

1. **HTTPS**: Always use HTTPS for all traffic
2. **API Keys**: Keep API keys secure and never expose them in client-side code
3. **Rate Limiting**: Implement rate limiting for API endpoints
4. **Authentication**: Ensure proper authentication for all endpoints
5. **Input Validation**: Validate all user inputs to prevent injection attacks
6. **Regular Updates**: Keep all dependencies updated to patch security vulnerabilities