import axios from 'axios';
import { supabase } from '../db/supabaseClient';

// Types for LLM requests and responses
export interface BriefData {
  clientName: string;
  projectName: string;
  productDescription: string;
  targetAudience: string;
  competitiveContext: string;
  campaignObjectives: string;
  keyMessages: string;
  mandatories: string;
  additionalInfo?: string;
  tonePreference?: string;
}

export interface Motivation {
  id: string;
  title: string;
  description: string;
  explanation: string;
  selected: boolean;
}

export interface CopyGenerationRequest {
  motivationIds: string[];
  tone: string;
  style: string;
  frameCount: number;
  length: 'short' | 'medium' | 'long';
  includeCallToAction: boolean;
  callToActionText?: string;
}

export interface CopyVariation {
  id: string;
  frames: string[];
  callToAction?: string;
  tone: string;
  style: string;
  selected: boolean;
}

class LLMService {
  private apiUrl: string;
  private apiKey: string;
  private mockMode: boolean;

  constructor() {
    this.apiUrl = process.env.LLM_API_URL || 'https://api.openai.com/v1/completions';
    this.apiKey = process.env.LLM_API_KEY || '';
    this.mockMode = process.env.PROTOTYPE_MODE === 'true';
  }

  /**
   * Process a client brief to generate motivations
   */
  async processBrief(briefData: BriefData): Promise<Motivation[]> {
    try {
      if (this.mockMode) {
        return this.getMockMotivations();
      }

      // Call Supabase Edge function to process the brief with LLM
      const { data, error } = await supabase.functions.invoke('process-brief', {
        body: briefData
      });

      if (error) {
        console.error('Error calling Supabase Edge function:', error);
        throw new Error(`Failed to process brief: ${error.message}`);
      }

      return data.motivations.map((motivation: any, index: number) => ({
        id: `motivation-${index + 1}`,
        title: motivation.title,
        description: motivation.description,
        explanation: motivation.explanation,
        selected: false
      }));
    } catch (error: any) {
      console.error('Error in processBrief:', error);
      throw new Error(`Failed to process brief: ${error.message}`);
    }
  }

  /**
   * Generate follow-up motivations based on user feedback
   */
  async regenerateMotivations(briefData: BriefData, feedback: string): Promise<Motivation[]> {
    try {
      if (this.mockMode) {
        return this.getMockMotivations(true);
      }

      // Call Supabase Edge function with feedback
      const { data, error } = await supabase.functions.invoke('regenerate-motivations', {
        body: { brief: briefData, feedback }
      });

      if (error) {
        console.error('Error calling Supabase Edge function:', error);
        throw new Error(`Failed to regenerate motivations: ${error.message}`);
      }

      return data.motivations.map((motivation: any, index: number) => ({
        id: `motivation-${Date.now()}-${index + 1}`,
        title: motivation.title,
        description: motivation.description,
        explanation: motivation.explanation,
        selected: false
      }));
    } catch (error: any) {
      console.error('Error in regenerateMotivations:', error);
      throw new Error(`Failed to regenerate motivations: ${error.message}`);
    }
  }

  /**
   * Generate copy variations based on selected motivations
   */
  async generateCopy(request: CopyGenerationRequest, briefData: BriefData, motivations: Motivation[]): Promise<CopyVariation[]> {
    try {
      if (this.mockMode) {
        return this.getMockCopyVariations(request);
      }

      // Get selected motivations
      const selectedMotivations = motivations.filter(m => 
        request.motivationIds.includes(m.id)
      );

      // Call Supabase Edge function to generate copy
      const { data, error } = await supabase.functions.invoke('generate-copy', {
        body: {
          brief: briefData,
          motivations: selectedMotivations,
          tone: request.tone,
          style: request.style,
          frameCount: request.frameCount,
          length: request.length,
          includeCallToAction: request.includeCallToAction,
          callToActionText: request.callToActionText
        }
      });

      if (error) {
        console.error('Error calling Supabase Edge function:', error);
        throw new Error(`Failed to generate copy: ${error.message}`);
      }

      return data.copyVariations.map((variation: any, index: number) => ({
        id: `copy-${Date.now()}-${index + 1}`,
        frames: variation.frames,
        callToAction: variation.callToAction,
        tone: request.tone,
        style: request.style,
        selected: false
      }));
    } catch (error: any) {
      console.error('Error in generateCopy:', error);
      throw new Error(`Failed to generate copy: ${error.message}`);
    }
  }

  /**
   * Generate mock data for prototype mode
   */
  private getMockMotivations(isRegeneration = false): Motivation[] {
    const baseTitle = isRegeneration ? 'Regenerated Motivation' : 'Motivation';
    return [
      {
        id: `motivation-${Date.now()}-1`,
        title: `${baseTitle}: Empowerment through Innovation`,
        description: 'The product helps users take control of their lives through innovative features.',
        explanation: 'This motivation appeals to the desire for autonomy and cutting-edge solutions. Research shows that 78% of your target demographic values innovation as a key purchasing factor.',
        selected: false
      },
      {
        id: `motivation-${Date.now()}-2`,
        title: `${baseTitle}: Community Connection`,
        description: 'The product helps users feel part of a like-minded community.',
        explanation: 'This motivation addresses the basic human need for belonging. Your target audience shows high engagement with community-focused messaging across social platforms.',
        selected: false
      },
      {
        id: `motivation-${Date.now()}-3`,
        title: `${baseTitle}: Effortless Simplicity`,
        description: 'The product makes complex tasks simple and effortless.',
        explanation: 'This motivation aligns with the desire for efficiency and simplicity. Market research indicates that your audience values time-saving features highly.',
        selected: false
      },
      {
        id: `motivation-${Date.now()}-4`,
        title: `${baseTitle}: Sustainable Living`,
        description: 'The product helps users live more sustainably without compromise.',
        explanation: 'This motivation connects with growing environmental concerns. 85% of your target audience has indicated that sustainability factors into their purchasing decisions.',
        selected: false
      },
      {
        id: `motivation-${Date.now()}-5`,
        title: `${baseTitle}: Personal Achievement`,
        description: 'The product helps users achieve personal goals and celebrate success.',
        explanation: 'This motivation taps into the desire for self-improvement and accomplishment. Your target audience shows high engagement with achievement-oriented content.',
        selected: false
      },
      {
        id: `motivation-${Date.now()}-6`,
        title: `${baseTitle}: Trusted Security`,
        description: 'The product provides peace of mind through reliable security features.',
        explanation: 'This motivation addresses concerns about digital safety. Your audience consistently rates security as a top consideration when adopting new products.',
        selected: false
      },
      {
        id: `motivation-${Date.now()}-7`,
        title: `${baseTitle}: Status Enhancement`,
        description: 'The product enhances the user's social standing and image.',
        explanation: 'This motivation connects with aspirational desires. Your target demographic shows engagement with luxury and premium positioning in similar products.',
        selected: false
      },
      {
        id: `motivation-${Date.now()}-8`,
        title: `${baseTitle}: Financial Wisdom`,
        description: 'The product represents smart financial decision-making and value.',
        explanation: 'This motivation appeals to practical considerations. Your audience responds positively to value-focused messaging that emphasizes return on investment.',
        selected: false
      }
    ];
  }

  /**
   * Generate mock copy variations for prototype mode
   */
  private getMockCopyVariations(request: CopyGenerationRequest): CopyVariation[] {
    const variations: CopyVariation[] = [];
    
    // Generate 3 variations
    for (let i = 1; i <= 3; i++) {
      const frames: string[] = [];
      
      // Generate requested number of frames
      for (let j = 1; j <= request.frameCount; j++) {
        frames.push(`Frame ${j} copy: This is ${request.tone} copy in ${request.style} style for variation ${i}.`);
      }
      
      variations.push({
        id: `copy-${Date.now()}-${i}`,
        frames,
        callToAction: request.includeCallToAction ? (request.callToActionText || 'Shop Now') : undefined,
        tone: request.tone,
        style: request.style,
        selected: false
      });
    }
    
    return variations;
  }
}

// Export singleton instance
export const llmService = new LLMService();