# Supabase Edge Functions for AIrWAVE

This directory contains the Supabase Edge Functions used for LLM integration in the AIrWAVE platform. These serverless functions handle processing client briefs, generating strategic motivations, and creating ad copy.

## Functions Overview

1. **process-brief**: Processes a client brief and generates strategic advertising motivations.
   - Input: Client brief details (client name, product description, target audience, etc.)
   - Output: Array of motivations with titles, descriptions, and explanations

2. **regenerate-motivations**: Regenerates motivations based on user feedback.
   - Input: Original brief data and user feedback
   - Output: New array of motivations that address the feedback

3. **generate-copy**: Creates ad copy variations based on selected motivations.
   - Input: Brief data, selected motivations, and copy settings (tone, style, frame count, etc.)
   - Output: Array of copy variations with frames and optional call-to-action

## Deployment Instructions

### Prerequisites
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Supabase project with relevant API keys
- OpenAI API key or other LLM provider keys

### Setup

1. Log in to Supabase CLI:
```bash
supabase login
```

2. Link to your Supabase project:
```bash
supabase link --project-ref your-project-ref
```

3. Set the required secrets:
```bash
supabase secrets set LLM_API_KEY=your_openai_api_key
supabase secrets set LLM_API_URL=https://api.openai.com/v1/chat/completions
supabase secrets set LLM_MODEL=gpt-4
```

### Deploy

Deploy all functions at once:
```bash
supabase functions deploy
```

Or deploy individual functions:
```bash
supabase functions deploy process-brief
supabase functions deploy regenerate-motivations
supabase functions deploy generate-copy
```

## Testing

You can test the functions locally:

```bash
supabase functions serve
```

Then use curl or Postman to send requests to `http://localhost:54321/functions/v1/process-brief` (or other function endpoints).

## Database Tables

These functions use the following Supabase database tables:

1. **brief_logs**: Stores processed briefs and generated motivations
   - brief_data: JSON object with client brief details
   - generated_motivations: JSON array of generated motivations
   - user_feedback (optional): User feedback for regeneration
   - created_at: Timestamp

2. **copy_logs**: Stores generated copy
   - brief_data: JSON object with client brief details
   - selected_motivations: JSON array of selected motivations
   - copy_settings: JSON object with copy generation settings
   - generated_copy: JSON array of generated copy variations
   - created_at: Timestamp

## Environment Variables

The following environment variables should be set in Supabase:

- `LLM_API_KEY`: API key for the LLM provider (e.g., OpenAI)
- `LLM_API_URL`: Endpoint URL for the LLM API
- `LLM_MODEL`: Model name to use (e.g., gpt-4)

## Versioning and Updates

When updating these functions, make sure to:
1. Test thoroughly locally before deploying
2. Keep the function interfaces consistent to avoid breaking changes
3. Update this README if function inputs/outputs change