// regenerate-motivations Supabase Edge Function
// This function regenerates motivations based on user feedback

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the request data
    const { brief, feedback } = await req.json()
    
    // Create a Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_ANON_KEY')
    )
    
    // Get the LLM API key from environment variables
    const llmApiKey = Deno.env.get('LLM_API_KEY')
    const llmApiUrl = Deno.env.get('LLM_API_URL')
    const llmModel = Deno.env.get('LLM_MODEL') || 'gpt-4'
    
    if (!llmApiKey) {
      throw new Error('LLM API key not configured')
    }
    
    // Construct the prompt including the feedback
    const prompt = constructPrompt(brief, feedback)
    
    // Call the LLM API
    const response = await fetch(llmApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llmApiKey}`,
      },
      body: JSON.stringify({
        model: llmModel,
        messages: [
          {
            role: 'system',
            content: 'You are a strategic marketing AI that generates advertising motivations based on client briefs and user feedback. For each motivation, provide a title, a concise description, and a detailed explanation that includes relevant market research or psychological insights. Format your response as a JSON array of motivation objects.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        response_format: { type: 'json_object' }
      }),
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`LLM API Error: ${errorData.error?.message || 'Unknown error'}`)
    }
    
    const llmResponse = await response.json()
    
    // Extract and parse the motivations from the LLM response
    const motivationsData = JSON.parse(llmResponse.choices[0].message.content)
    
    // Log the feedback and regenerated motivations
    const { error: logError } = await supabaseClient
      .from('brief_logs')
      .insert({
        brief_data: brief,
        user_feedback: feedback,
        generated_motivations: motivationsData.motivations,
        created_at: new Date().toISOString()
      })
    
    if (logError) {
      console.error('Error logging feedback:', logError)
    }
    
    // Return the motivations
    return new Response(
      JSON.stringify({ motivations: motivationsData.motivations }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('Error regenerating motivations:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

// Helper function to construct the prompt with feedback
function constructPrompt(briefData, feedback) {
  return `
I need to regenerate strategic advertising motivations based on a client brief and user feedback.

CLIENT BRIEF:
CLIENT: ${briefData.clientName}
PROJECT: ${briefData.projectName}
PRODUCT DESCRIPTION: ${briefData.productDescription}
TARGET AUDIENCE: ${briefData.targetAudience}
COMPETITIVE CONTEXT: ${briefData.competitiveContext || 'Not specified'}
CAMPAIGN OBJECTIVES: ${briefData.campaignObjectives}
KEY MESSAGES: ${briefData.keyMessages || 'Not specified'}
MANDATORIES: ${briefData.mandatories || 'Not specified'}
ADDITIONAL INFO: ${briefData.additionalInfo || 'Not specified'}
TONE PREFERENCE: ${briefData.tonePreference || 'Not specified'}

USER FEEDBACK:
${feedback}

Please generate 8 new strategic advertising motivations that address the feedback provided by the user. 

For each motivation, provide:
1. A clear, concise title (5-7 words)
2. A brief description (1-2 sentences explaining the core motivation)
3. A detailed explanation with market insights or psychological reasoning (3-5 sentences)

The motivations should be diverse and cover different psychological drivers. Format your response as a JSON object with a "motivations" array containing objects with "title", "description", and "explanation" fields.
`
}