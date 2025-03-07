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

// Function interface for motivation
interface Motivation {
  id: string
  title: string
  description: string
  explanation: string
}

// Function interface for copy settings
interface CopySettings {
  brief: BriefData
  motivations: Motivation[]
  tone: string
  style: string
  frameCount: number
  length: 'short' | 'medium' | 'long'
  includeCallToAction: boolean
  callToActionText?: string
}

serve(async (req) => {
  try {
    // Get request data
    const requestData = await req.json() as CopySettings
    
    // Validate request data
    if (!requestData || !requestData.brief || !requestData.motivations || requestData.motivations.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { brief, motivations, tone, style, frameCount, length, includeCallToAction, callToActionText } = requestData

    // Determine word count range based on length preference
    let wordCountPerFrame = "15-30"
    switch (length) {
      case 'short':
        wordCountPerFrame = "10-20"
        break
      case 'medium':
        wordCountPerFrame = "20-35"
        break
      case 'long':
        wordCountPerFrame = "35-50"
        break
    }

    // Create prompt for copy generation
    const motivationsText = motivations.map(m => `${m.title}: ${m.description}`).join('\n')

    // Call OpenAI to generate copy variations
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an expert copywriter who specializes in digital advertising. You craft 
          engaging, persuasive copy that resonates with target audiences based on key motivations 
          and psychological drivers. You create copy for ads with multiple frames (scenes) that tell 
          a cohesive story and drive action.`
        },
        {
          role: 'user',
          content: `Create 3 variations of ad copy based on this brief and selected motivations:
          
          CLIENT BRIEF:
          Client: ${brief.clientName}
          Project: ${brief.projectName}
          Product: ${brief.productDescription}
          Target Audience: ${brief.targetAudience}
          Competitive Context: ${brief.competitiveContext}
          Campaign Objectives: ${brief.campaignObjectives}
          Key Messages: ${brief.keyMessages}
          Mandatories: ${brief.mandatories}
          ${brief.additionalInfo ? `Additional Info: ${brief.additionalInfo}` : ''}
          
          SELECTED MOTIVATIONS:
          ${motivationsText}
          
          COPY REQUIREMENTS:
          - Tone: ${tone}
          - Style: ${style}
          - Number of frames: ${frameCount}
          - Words per frame: ${wordCountPerFrame} words
          - Include call to action: ${includeCallToAction ? 'Yes' : 'No'}
          ${includeCallToAction && callToActionText ? `- Call to action text: ${callToActionText}` : ''}
          
          Create 3 distinct copy variations that leverage the selected motivations. 
          Each variation should have ${frameCount} frames of copy, with each frame having ${wordCountPerFrame} words.
          
          Return the results in valid JSON format with the structure:
          { "copyVariations": [
              {
                "frames": ["Frame 1 copy text", "Frame 2 copy text", ...],
                "callToAction": "Call to action text (if requested)"
              },
              ...
            ]
          }
          
          Ensure each variation tells a complete story across the frames and feels cohesive.`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    })

    // Parse the response to get copy variations
    const copyResponse = JSON.parse(response.choices[0].message.content)
    
    // Log the request to the database if needed
    const { data, error } = await supabaseClient
      .from('copy_logs')
      .insert([{
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
        generated_copy: copyResponse.copyVariations,
        created_at: new Date().toISOString()
      }])
    
    if (error) {
      console.error('Error logging to database:', error)
    }

    // Return the copy variations
    return new Response(
      JSON.stringify(copyResponse),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in generate-copy function:', error)
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})