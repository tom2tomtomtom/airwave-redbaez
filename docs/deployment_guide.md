# AIrWAVE Deployment Guide

This guide walks through the complete setup and deployment process for the AIrWAVE platform.

## Prerequisites

1. Node.js (v16+) and npm installed
2. Supabase CLI installed (`npm install -g supabase`)
3. Access to the following services:
   - Supabase account
   - OpenAI API account (or alternative LLM provider)
   - Creatomate account
   - SMTP service (optional, for email notifications)

## API Keys Setup

You'll need the following API keys:

1. **Supabase**
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY (for admin operations)

2. **OpenAI API** (or alternative LLM provider)
   - LLM_API_KEY
   - LLM_API_URL (defaults to OpenAI's endpoint)
   - LLM_MODEL (defaults to 'gpt-4')

3. **Creatomate**
   - CREATOMATE_API_KEY

4. **SMTP Service** (optional)
   - SMTP_HOST
   - SMTP_PORT
   - SMTP_USERNAME
   - SMTP_PASSWORD
   - SMTP_FROM_EMAIL

## Client-Side Configuration

1. Create a `.env.local` file in the `client` directory:

```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Setup

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

## Edge Functions Deployment

1. **Initialize Supabase CLI** (if not already done):

```bash
supabase login
```

2. **Link your local project to Supabase**:

```bash
supabase link --project-ref your-project-id
```

3. **Set environment variables for edge functions**:

```bash
supabase secrets set LLM_API_KEY=your_openai_key
supabase secrets set LLM_API_URL=https://api.openai.com/v1/chat/completions
supabase secrets set LLM_MODEL=gpt-4
supabase secrets set CREATOMATE_API_KEY=your_creatomate_key
# Optional SMTP settings
supabase secrets set SMTP_HOST=your_smtp_host
supabase secrets set SMTP_PORT=your_smtp_port
supabase secrets set SMTP_USERNAME=your_smtp_username
supabase secrets set SMTP_PASSWORD=your_smtp_password
supabase secrets set SMTP_FROM_EMAIL=your_from_email
```

4. **Deploy the edge functions**:

```bash
cd server/supabase
supabase functions deploy process-brief
supabase functions deploy generate-copy
supabase functions deploy regenerate-motivations
```

5. **Verify Function Deployment**:

   - Go to the Functions tab in your Supabase dashboard
   - Ensure all three functions are listed and have a "Deployed" status
   - Check the logs for any errors

## Testing the Deployment

1. **Asset Management**:
   - Upload different types of assets (images, videos, audio, text)
   - Verify files appear in asset library
   - Test favouriting, sorting, and filtering

2. **Brief Submission**:
   - Fill out and submit a client brief
   - Verify the process-brief edge function is triggered
   - Check that motivations are generated

3. **End-to-End Flow**:
   - Submit a brief
   - Select motivations
   - Generate copy
   - Create campaign matrix
   - Verify video rendering

4. **Error Handling**:
   - Test with invalid inputs
   - Verify appropriate error messages
   - Check recovery paths

## Troubleshooting

### Edge Function Issues
- Check logs in Supabase dashboard (Functions → Logs)
- Verify environment variables are correctly set
- Ensure API keys have appropriate permissions

### Database Issues
- Check that all tables were created properly
- Verify RLS policies are enabling appropriate access
- Check for SQL errors in the database logs

### Rendering Issues
- Verify Creatomate API key is valid
- Check network requests to identify any API errors
- Verify asset URLs are accessible

## Regular Maintenance

- Monitor edge function usage and performance
- Back up database regularly
- Rotate API keys periodically for security
- Update dependencies to maintain security and performance
