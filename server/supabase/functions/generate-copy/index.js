// generate-copy Supabase Edge Function
// This function generates ad copy based on selected motivations and settings

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
    const requestData = await req.json()
    const { brief, motivations, tone, style, frameCount, length, includeCallToAction, callToActionText } = requestData
    
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
    
    // Construct the prompt
    const prompt = constructPrompt(brief, motivations, tone, style, frameCount, length, includeCallToAction, callToActionText)
    
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
            content: 'You are a copywriting AI that generates ad copy based on selected motivations and client briefs. Create compelling copy that is concise, engaging, and formatted properly. Format your response as a JSON object with copy variations.'
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
    
    // Extract and parse the copy variations from the LLM response
    const copyData = JSON.parse(llmResponse.choices[0].message.content)
    
    // Log the generated copy to Supabase (optional)
    const { error: logError } = await supabaseClient
      .from('copy_logs')
      .insert({
        brief_data: brief,
        selected_motivations: motivations,
        copy_settings: {
          tone,
          style,
          frameCount,
          length,
          includeCallToAction,
          callToActionText
        },
        generated_copy: copyData.copyVariations,
        created_at: new Date().toISOString()
      })
    
    if (logError) {
      console.error('Error logging copy generation:', logError)
    }
    
    // Return the copy variations
    return new Response(
      JSON.stringify({ copyVariations: copyData.copyVariations }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('Error generating copy:', error)
    
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

// Helper function to construct the prompt
function constructPrompt(brief, motivations, tone, style, frameCount, length, includeCallToAction, callToActionText) {
  // Convert the length parameter to a word count range
  const wordCountByLength = {
    'short': '5-10',
    'medium': '10-15',
    'long': '15-25'
  }
  
  const wordCount = wordCountByLength[length] || '10-15'
  
  // Create a summary of the selected motivations
  const motivationSummary = motivations.map(motivation => 
    `- ${motivation.title}: ${motivation.description}`
  ).join('\n')
  
  return `
Generate ${frameCount > 1 ? frameCount + ' frames of' : ''} ad copy based on the following brief and motivations:

CLIENT BRIEF:
Client: ${brief.clientName}
Project: ${brief.projectName}
Product: ${brief.productDescription}
Target Audience: ${brief.targetAudience}
Objectives: ${brief.campaignObjectives}

SELECTED MOTIVATIONS:
${motivationSummary}

COPY REQUIREMENTS:
- Tone: ${tone}
- Style: ${style}
- Number of frames: ${frameCount}
- Words per frame: ${wordCount}
${includeCallToAction ? `- Include call to action: ${callToActionText || 'Create a compelling CTA'}` : '- No call to action needed'}

Please generate 3 different copy variations. Each variation should have ${frameCount} frames of copy text${includeCallToAction ? ' and a call to action' : ''}.

The copy should be designed to work well in an advertisement, with an emphasis on brevity, memorability, and emotional impact. Each frame should flow naturally to the next.

Format your response as a JSON object with a 'copyVariations' array containing objects. Each object should have a 'frames' array with the copy text for each frame${includeCallToAction ? ' and a callToAction field' : ''}.
`
}