import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4'

// Create a new OpenAI client
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

// Function interface for the request
interface RegenerateRequest {
  brief: BriefData
  feedback: string
}

serve(async (req) => {
  try {
    // Get request data
    const requestData = await req.json() as RegenerateRequest
    
    // Validate request data
    if (!requestData || !requestData.brief || !requestData.feedback) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { brief, feedback } = requestData

    // Call OpenAI to regenerate motivations based on feedback
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an advertising strategy expert. You will analyze client briefs to identify 
          compelling motivations (psychological drivers) that can be used for ad campaigns. 
          For each motivation, provide a title, brief description, and detailed explanation of why 
          it's effective for this target audience. You will incorporate user feedback to refine your suggestions.`
        },
        {
          role: 'user',
          content: `Please analyze this client brief:
          
          Client: ${brief.clientName}
          Project: ${brief.projectName}
          Product: ${brief.productDescription}
          Target Audience: ${brief.targetAudience}
          Competitive Context: ${brief.competitiveContext}
          Campaign Objectives: ${brief.campaignObjectives}
          Key Messages: ${brief.keyMessages}
          Mandatories: ${brief.mandatories}
          ${brief.additionalInfo ? `Additional Info: ${brief.additionalInfo}` : ''}
          ${brief.tonePreference ? `Tone Preference: ${brief.tonePreference}` : ''}
          
          I previously received some motivation suggestions, but I have this feedback:
          ${feedback}
          
          Please provide 8 NEW motivations that address my feedback.
          
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
          
          Ensure all 8 motivations are unique, relevant to the brief, and address my feedback.`
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
        brief_data: brief,
        user_feedback: feedback,
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
    console.error('Error in regenerate-motivations function:', error)
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})