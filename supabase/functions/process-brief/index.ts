import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4'

// Create a new client
const openai = new OpenAI({
  apiKey: Deno.env.get('LLM_API_KEY')
})

// Supabase client
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Function interface for brief data
interface BriefData {
  clientName: string
  projectName: string
  productDescription: string
  targetAudience: string
  competitiveContext: string
  campaignObjectives: string
  keyMessages: string
  mandatories: string
  additionalInfo?: string
  tonePreference?: string
}

// Function interface for generated motivations
interface Motivation {
  title: string
  description: string
  explanation: string
}

serve(async (req) => {
  try {
    // Get brief data from request
    const briefData = await req.json() as BriefData
    
    // Validate brief data
    if (!briefData || !briefData.productDescription || !briefData.targetAudience || !briefData.campaignObjectives) {
      return new Response(
        JSON.stringify({ error: 'Missing required brief fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Call OpenAI to generate motivations
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an advertising strategy expert. You will analyze client briefs to identify 
          8 compelling motivations (psychological drivers) that can be used for ad campaigns. 
          For each motivation, provide a title, brief description, and detailed explanation of why 
          it's effective for this target audience.`
        },
        {
          role: 'user',
          content: `Please analyze this client brief and provide 8 motivations:
          
          Client: ${briefData.clientName}
          Project: ${briefData.projectName}
          Product: ${briefData.productDescription}
          Target Audience: ${briefData.targetAudience}
          Competitive Context: ${briefData.competitiveContext}
          Campaign Objectives: ${briefData.campaignObjectives}
          Key Messages: ${briefData.keyMessages}
          Mandatories: ${briefData.mandatories}
          ${briefData.additionalInfo ? `Additional Info: ${briefData.additionalInfo}` : ''}
          ${briefData.tonePreference ? `Tone Preference: ${briefData.tonePreference}` : ''}
          
          Format each motivation with:
          - Title: A compelling, concise name for the motivation
          - Description: A brief one-line description of how the product addresses this motivation
          - Explanation: A detailed paragraph explaining why this motivation will resonate with the target audience, including relevant research or insights if applicable
          
          Return the results in valid JSON format with the structure:
          { "motivations": [
              {"title": "...", "description": "...", "explanation": "..."},
              ...
            ]
          }
          
          Ensure all 8 motivations are unique and relevant to the brief.`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    // Parse the response to get motivations
    const motivationsResponse = JSON.parse(response.choices[0].message.content)
    
    // Log the request to the database if needed
    const { data, error } = await supabaseClient
      .from('brief_logs')
      .insert([{
        brief_data: briefData,
        generated_motivations: motivationsResponse.motivations,
        created_at: new Date().toISOString()
      }])
    
    if (error) {
      console.error('Error logging to database:', error)
    }

    // Return the motivations
    return new Response(
      JSON.stringify(motivationsResponse),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in process-brief function:', error)
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})