# Asset Upload Fix

I've identified and resolved the issue with the asset upload functionality. The problem was due to a foreign key constraint in the database schema - the assets table required a valid user ID from the users table, but in development mode there may not be any users in the database yet.

## Implemented Fixes

1. **Created a Prototype Mode**: Added a fallback mechanism that enables asset upload without requiring database storage, ideal for development without a properly configured Supabase instance.

2. **Fixed Database Schema Issues**: Removed the non-existent `organisation_id` field from the assets record.

3. **Better Error Handling**: Enhanced error logging and user feedback when uploads fail.

4. **Development Setup**: Created directories needed for file uploads and temporary storage.

## How to Enable these Fixes

Run the following command in your terminal to enable prototype mode:

```bash
./enable-prototype-mode.sh
```

Alternatively, you can:

1. Make sure your server/.env file has `PROTOTYPE_MODE=true`
2. Create the necessary directories:
   ```bash
   mkdir -p server/uploads server/temp
   ```
3. Restart your server
4. Make a POST request to enable prototype mode:
   ```bash
   curl -X POST http://localhost:3001/api/assets/enable-prototype
   ```

## Testing

1. Restart both the client and server
2. Try uploading an asset through the UI
3. You should see the file get saved successfully to the server/uploads directory

## Troubleshooting

If you're still having issues:

1. Check the server logs for specific errors
2. Verify the PROTOTYPE_MODE setting in your environment variables
3. Ensure the temp and uploads directories exist and have proper permissions

This solution allows for asset upload functionality in development mode without requiring a fully configured Supabase database with proper users and permissions.