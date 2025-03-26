# AIrWAVE Prototype Mode

This document explains how to use the Prototype Mode feature which allows the application to run without requiring a fully configured Supabase database.

## What is Prototype Mode?

Prototype Mode is a development feature that bypasses database dependencies and instead uses the local filesystem for storing uploaded assets. This allows developers to work on the application without needing to set up a database or worry about foreign key constraints.

## How to Enable Prototype Mode

### Option 1: Use the Script

The easiest way to enable Prototype Mode is to run the `enable-prototype-mode.sh` script:

```bash
# Make the script executable (if not already)
chmod +x enable-prototype-mode.sh

# Run the script
./enable-prototype-mode.sh
```

This script will:
1. Stop any running server and client processes
2. Update the environment files to enable Prototype Mode
3. Create necessary directories
4. Set appropriate permissions
5. Build and start the server with Prototype Mode enabled
6. Start the client

### Option 2: Manual Configuration

If you prefer to enable Prototype Mode manually:

1. Set `PROTOTYPE_MODE=true` in `server/.env`
2. Ensure your server is using port 3002 by setting `PORT=3002` in `server/.env`
3. Make sure your client is configured to connect to `http://localhost:3002` by setting `REACT_APP_SERVER_URL=http://localhost:3002` in `client/.env`
4. Create the uploads directory: `mkdir -p server/uploads server/temp`
5. Start the server: `cd server && npm run start:dev`
6. Start the client: `cd client && npm start`

## Features in Prototype Mode

When Prototype Mode is enabled:

- Asset uploads will be stored in the `server/uploads` directory instead of in the database
- User authentication is bypassed (DEV_BYPASS_AUTH is also set to true)
- Foreign key constraints are ignored
- Thumbnails are generated automatically for uploaded assets
- Database operations are mocked to return success responses

## Troubleshooting

### Asset Upload Issues

If you encounter issues with asset uploads:

1. Check the browser's developer console for any errors
2. Look at the server logs for detailed information about the upload process
3. Verify that the directories `server/uploads` and `server/temp` exist and have write permissions
4. Make sure your client is configured to connect to the correct server URL

### Server Connection Issues

If the client can't connect to the server:

1. Make sure the server is running on port 3002
2. Check that the client's environment variable `REACT_APP_SERVER_URL` is set to `http://localhost:3002`
3. Verify that no other processes are using port 3002

## Limitations

Prototype Mode has the following limitations:

- Assets are only stored locally and won't be synced with any database
- Some advanced features like user permissions may not work fully
- File processing (like video thumbnail generation) is simplified

## Returning to Normal Mode

To disable Prototype Mode and return to normal database operation:

1. Set `PROTOTYPE_MODE=false` in `server/.env`
2. Ensure your Supabase connection is properly configured
3. Restart the server

## Implementation Details

Prototype Mode works by intercepting database operations in the asset service and routes. When enabled:

1. The file upload endpoint checks for Prototype Mode
2. If enabled, files are saved directly to the filesystem
3. A mock response is generated with the appropriate asset data
4. The client receives this response as if it came from a real database