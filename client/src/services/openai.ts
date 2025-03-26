import OpenAI from 'openai';
import type { Brief } from '../store/slices/briefsSlice';

const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Only for development, handle API calls through backend in production
});

export interface AnalysisResults {
  tone_recommendations: string[];
  key_themes: string[];
  content_suggestions: string[];
  improvement_areas: string[];
}

export async function analyseBrief(brief: Brief): Promise<AnalysisResults> {
  const systemPrompt = `You are a strategic content analyst specialising in digital advertising campaigns.
Your task is to analyse the provided campaign brief and provide structured recommendations.
Use UK English spelling in your responses.
Focus on actionable insights that will help create effective ad content.`;

  // Use type assertion to avoid TypeScript errors with properties that might exist at runtime
  const briefData = brief as any;
  
  const userPrompt = `Please analyse this campaign brief:

Title: ${briefData.title}
Campaign Overview: ${briefData.content}
Campaign Objectives: ${briefData.campaignObjectives || briefData.campaign_objectives || ''}
Target Audience: ${briefData.targetAudience || briefData.target_audience || ''}
Key Messages: ${briefData.keyMessages || briefData.key_messages || ''}
${(briefData.visualPreferences || briefData.visual_preferences) ? `Visual Preferences: ${briefData.visualPreferences || briefData.visual_preferences}` : ''}

Provide analysis in the following format:
1. Tone Recommendations: List of 3-5 appropriate tones for the campaign
2. Key Themes: List of 3-5 main themes to emphasise
3. Content Suggestions: List of 3-5 specific content ideas
4. Areas for Improvement: List of 3-5 aspects that could be enhanced`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const response = completion.choices[0].message.content;
    if (!response) throw new Error('No response from OpenAI');

    // Parse the response into structured format
    const sections = response.split('\n\n');
    const results: AnalysisResults = {
      tone_recommendations: [],
      key_themes: [],
      content_suggestions: [],
      improvement_areas: []
    };

    sections.forEach(section => {
      if (section.includes('Tone Recommendations:')) {
        results.tone_recommendations = extractListItems(section);
      } else if (section.includes('Key Themes:')) {
        results.key_themes = extractListItems(section);
      } else if (section.includes('Content Suggestions:')) {
        results.content_suggestions = extractListItems(section);
      } else if (section.includes('Areas for Improvement:')) {
        results.improvement_areas = extractListItems(section);
      }
    });

    return results;
  } catch (error) {
    console.error('Error analysing brief:', error);
    throw error;
  }
}

export async function generateContent(
  brief: Brief,
  type: 'copy' | 'headline' | 'strapline' | 'call-to-action',
  tone: string,
  length: 'short' | 'medium' | 'long',
  additionalInstructions?: string
): Promise<string> {
  const systemPrompt = `You are a professional copywriter specialising in digital advertising.
Use UK English spelling in your responses.
Create engaging content that aligns with the campaign brief and specified parameters.`;

  const contentTypeInstructions = {
    copy: 'Write compelling ad copy that tells a story and drives engagement.',
    headline: 'Create attention-grabbing headlines that capture the essence of the campaign.',
    strapline: 'Develop memorable straplines that reinforce the brand message.',
    'call-to-action': 'Craft persuasive calls-to-action that drive desired user behaviour.'
  };

  const lengthGuidelines = {
    short: 'Keep the content concise and impactful (25-50 words).',
    medium: 'Provide moderate-length content (50-100 words).',
    long: 'Create detailed content (100-200 words).'
  };

  // Use type assertion to avoid TypeScript errors with properties that might exist at runtime
  const briefData = brief as any;
  
  const userPrompt = `Generate ${type} content for this campaign:

Brief Title: ${briefData.title}
Campaign Overview: ${briefData.content}
Campaign Objectives: ${briefData.campaignObjectives || briefData.campaign_objectives || ''}
Target Audience: ${briefData.targetAudience || briefData.target_audience || ''}
Key Messages: ${briefData.keyMessages || briefData.key_messages || ''}
${(briefData.visualPreferences || briefData.visual_preferences) ? `Visual Preferences: ${briefData.visualPreferences || briefData.visual_preferences}` : ''}

Content Requirements:
- Type: ${contentTypeInstructions[type]}
- Tone: ${tone}
- Length: ${lengthGuidelines[length]}
${additionalInstructions ? `Additional Instructions: ${additionalInstructions}` : ''}

Analysis Insights:
${(briefData.analysis_results || briefData.analysis) ? `
- Key Themes: ${(briefData.analysis_results || briefData.analysis)?.key_themes?.join(', ') || ''}
- Tone Recommendations: ${(briefData.analysis_results || briefData.analysis)?.tone_recommendations?.join(', ') || ''}` : ''}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 1000
    });

    const response = completion.choices[0].message.content;
    if (!response) throw new Error('No response from OpenAI');

    return response.trim();
  } catch (error) {
    console.error('Error generating content:', error);
    throw error;
  }
}

function extractListItems(section: string): string[] {
  return section
    .split('\n')
    .slice(1) // Skip the section title
    .map(line => line.replace(/^[0-9-.\s]+/, '').trim())
    .filter(Boolean);
}
