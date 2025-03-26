import { 
  MarketingStrategy, 
  CopyGenerationConfig, 
  CopyVariation,
  ToneOption,
  StyleOption
} from './types';

/**
 * Prompt Engineering Service
 * 
 * This service is responsible for creating structured prompts
 * for LLM-based copy generation and refinement.
 * It keeps prompt engineering logic separate from UI components.
 */
export class PromptEngineeringService {
  
  /**
   * Creates a prompt for generating marketing copy based on strategy and config
   */
  public createCopyGenerationPrompt(
    strategy: MarketingStrategy,
    config: CopyGenerationConfig
  ): string {
    // Base prompt structure
    let prompt = `Generate ${config.length} ${config.type} copy for a marketing campaign with the following specifications:\n\n`;
    
    // Add target audience information
    prompt += `TARGET AUDIENCE:\n`;
    prompt += `- Demographics: ${strategy.targetAudience.demographics}\n`;
    prompt += `- Psychographics: ${strategy.targetAudience.psychographics}\n`;
    
    if (strategy.targetAudience.painPoints.length > 0) {
      prompt += `- Pain Points: ${strategy.targetAudience.painPoints.join(', ')}\n`;
    }
    
    if (strategy.targetAudience.goals.length > 0) {
      prompt += `- Goals: ${strategy.targetAudience.goals.join(', ')}\n`;
    }
    
    // Add brand voice information
    prompt += `\nBRAND VOICE:\n`;
    prompt += `- Tone: ${strategy.brandVoice.tone}\n`;
    
    if (strategy.brandVoice.values.length > 0) {
      prompt += `- Values: ${strategy.brandVoice.values.join(', ')}\n`;
    }
    
    prompt += `- Personality: ${strategy.brandVoice.personality}\n`;
    prompt += `- Unique Selling Proposition: ${strategy.brandVoice.uniqueSellingProposition}\n`;
    
    // Add campaign goals
    prompt += `\nCAMPAIGN GOALS:\n`;
    prompt += `- Primary Goal: ${strategy.campaignGoals.primary}\n`;
    
    if (strategy.campaignGoals.secondary.length > 0) {
      prompt += `- Secondary Goals: ${strategy.campaignGoals.secondary.join(', ')}\n`;
    }
    
    prompt += `- Conversion Action: ${strategy.campaignGoals.conversionAction}\n`;
    
    // Add competitive context
    prompt += `\nCOMPETITIVE CONTEXT:\n`;
    
    if (strategy.competitiveContext.mainCompetitors.length > 0) {
      prompt += `- Main Competitors: ${strategy.competitiveContext.mainCompetitors.join(', ')}\n`;
    }
    
    if (strategy.competitiveContext.differentiators.length > 0) {
      prompt += `- Differentiators: ${strategy.competitiveContext.differentiators.join(', ')}\n`;
    }
    
    prompt += `- Market Positioning: ${strategy.competitiveContext.marketPositioning}\n`;
    
    // Add content parameters
    prompt += `\nCONTENT PARAMETERS:\n`;
    prompt += `- Tone: ${config.tone}\n`;
    prompt += `- Style: ${config.style}\n`;
    prompt += `- Length: ${config.length}\n`;
    
    if (strategy.contentParameters.requiredKeywords.length > 0) {
      prompt += `- Required Keywords: ${strategy.contentParameters.requiredKeywords.join(', ')}\n`;
    }
    
    if (strategy.contentParameters.forbiddenWords.length > 0) {
      prompt += `- Forbidden Words: ${strategy.contentParameters.forbiddenWords.join(', ')}\n`;
    }
    
    if (strategy.contentParameters.mustIncludePhrases.length > 0) {
      prompt += `- Must Include Phrases: ${strategy.contentParameters.mustIncludePhrases.join(', ')}\n`;
    }
    
    // Add CTA if required
    if (config.includeCallToAction) {
      prompt += `\nInclude a call to action`;
      if (config.callToActionText) {
        prompt += ` related to: ${config.callToActionText}`;
      }
      prompt += `.\n`;
    }
    
    // Add specific format instructions based on copy type
    prompt += this.getCopyTypeSpecificInstructions(config.type);
    
    // Add multi-frame instructions if applicable
    if (config.frameCount && config.frameCount > 1) {
      prompt += `\nCreate ${config.frameCount} sequential frames of content that work together as a series.`;
      prompt += ` Clearly separate each frame with [FRAME X] markers.\n`;
    }
    
    // Final output format instructions
    prompt += `\nOUTPUT FORMAT:\n`;
    prompt += `Return only the copy text without explanations or additional notes.`;
    
    return prompt;
  }
  
  /**
   * Creates a prompt for refining existing copy based on feedback
   */
  public createRefinementPrompt(
    variation: CopyVariation,
    refinementInstructions: string,
    preserveElements?: string[],
    emphasize?: string[],
    toneAdjustment?: Partial<Record<ToneOption, number>>,
    styleAdjustment?: Partial<Record<StyleOption, number>>
  ): string {
    // Base refinement prompt
    let prompt = `Refine the following ${variation.type} copy based on these instructions:\n\n`;
    
    // Add original copy
    prompt += `ORIGINAL COPY:\n${variation.text}\n\n`;
    
    // Add refinement instructions
    prompt += `REFINEMENT INSTRUCTIONS:\n${refinementInstructions}\n\n`;
    
    // Add elements to preserve
    if (preserveElements && preserveElements.length > 0) {
      prompt += `ELEMENTS TO PRESERVE:\n`;
      preserveElements.forEach(element => {
        prompt += `- ${element}\n`;
      });
      prompt += `\n`;
    }
    
    // Add elements to emphasize
    if (emphasize && emphasize.length > 0) {
      prompt += `ELEMENTS TO EMPHASIZE:\n`;
      emphasize.forEach(element => {
        prompt += `- ${element}\n`;
      });
      prompt += `\n`;
    }
    
    // Add tone adjustments
    if (toneAdjustment && Object.keys(toneAdjustment).length > 0) {
      prompt += `TONE ADJUSTMENTS:\n`;
      Object.entries(toneAdjustment).forEach(([tone, strength]) => {
        prompt += `- ${tone}: ${this.strengthToDescription(strength)}\n`;
      });
      prompt += `\n`;
    }
    
    // Add style adjustments
    if (styleAdjustment && Object.keys(styleAdjustment).length > 0) {
      prompt += `STYLE ADJUSTMENTS:\n`;
      Object.entries(styleAdjustment).forEach(([style, strength]) => {
        prompt += `- ${style}: ${this.strengthToDescription(strength)}\n`;
      });
      prompt += `\n`;
    }
    
    // Handle multi-frame content
    if (variation.frames && variation.frames.length > 0) {
      prompt += `ORIGINAL FRAMES:\n`;
      variation.frames.forEach((frame, index) => {
        prompt += `[FRAME ${index + 1}]:\n${frame}\n\n`;
      });
      
      prompt += `Maintain the same number of frames in your refined version.\n`;
    }
    
    // Final output format instructions
    prompt += `\nOUTPUT FORMAT:\n`;
    prompt += `Return only the refined copy text without explanations or additional notes.`;
    
    return prompt;
  }
  
  /**
   * Gets specific instructions based on copy type
   */
  private getCopyTypeSpecificInstructions(type: string): string {
    switch (type) {
      case 'headline':
        return '\nFor headlines:\n- Be concise and attention-grabbing\n- Use action words\n- Highlight the main benefit\n- Aim for 5-12 words\n- Use headline capitalization\n';
        
      case 'body':
        return '\nFor body copy:\n- Expand on the headline promise\n- Use a clear structure (problem, solution, benefit)\n- Include evidence or social proof\n- Use paragraph breaks for readability\n- Address objections\n';
        
      case 'cta':
        return '\nFor call-to-action:\n- Use action verbs\n- Create urgency\n- Be specific about the next step\n- Keep it under 5-7 words\n- Make the value clear\n';
        
      case 'social':
        return '\nFor social media posts:\n- Include hashtags where appropriate\n- Keep it conversational\n- Use emojis sparingly for emphasis\n- Include a hook in the first line\n- End with a question or call to action\n';
        
      case 'email':
        return '\nFor email copy:\n- Write a compelling subject line\n- Use a personable greeting\n- Keep paragraphs short (3-4 lines maximum)\n- Use bullet points for key information\n- Include a clear sign-off\n- Add a P.S. for extra emphasis if appropriate\n';
        
      default:
        return '';
    }
  }
  
  /**
   * Converts a numeric strength value to a descriptive string
   */
  private strengthToDescription(strength: number): string {
    if (strength >= 0.8) return 'very strong emphasis';
    if (strength >= 0.6) return 'strong emphasis';
    if (strength >= 0.4) return 'moderate emphasis';
    if (strength >= 0.2) return 'slight emphasis';
    return 'minimal emphasis';
  }
  
  /**
   * Checks copy quality and provides feedback
   */
  public async checkCopyQuality(copyText: string): Promise<any[]> {
    // In a real implementation, this would call an LLM API
    // Here we'll simulate with some sample quality checks
    
    // Mock quality checks based on simple heuristics
    const qualityChecks = [];
    
    // Check copy length
    const wordCount = copyText.split(/\s+/).length;
    if (wordCount < 50) {
      qualityChecks.push({
        category: 'Copy Length',
        severity: 'warning',
        description: 'Copy is relatively short, which may limit its effectiveness.',
        suggestion: 'Consider expanding the copy to cover more benefits or details.'
      });
    } else if (wordCount > 300) {
      qualityChecks.push({
        category: 'Copy Length',
        severity: 'warning',
        description: 'Copy is quite long, which may reduce readability.',
        suggestion: 'Consider condensing the copy to improve readability and focus.'
      });
    }
    
    // Check for passive voice (very simplistic check)
    if (/\b(is|are|was|were|be|been|being)\s+(\w+ed)\b/gi.test(copyText)) {
      qualityChecks.push({
        category: 'Writing Style',
        severity: 'warning',
        description: 'Possible passive voice detected, which can make copy less engaging.',
        suggestion: 'Rewrite sentences to use active voice for stronger, clearer messaging.'
      });
    }
    
    // Check for filler words
    const fillerWords = ['very', 'really', 'quite', 'basically', 'actually'];
    const fillerRegex = new RegExp(`\\b(${fillerWords.join('|')})\\b`, 'gi');
    if (fillerRegex.test(copyText)) {
      qualityChecks.push({
        category: 'Word Choice',
        severity: 'warning',
        description: 'Filler words detected that may weaken your copy.',
        suggestion: 'Remove filler words and use stronger, more specific language.'
      });
    }
    
    // Check for call to action
    if (!/(^|\s)(buy|sign up|register|download|learn more|call|visit|click|get started|try)(\s|$)/i.test(copyText)) {
      qualityChecks.push({
        category: 'Call to Action',
        severity: 'error',
        description: 'No clear call to action detected.',
        suggestion: 'Add a strong, clear call to action that tells the reader what to do next.'
      });
    }
    
    // Check for benefits vs. features
    if (/(^|\s)(we offer|we provide|our product|our service|features include)(\s|$)/i.test(copyText)) {
      qualityChecks.push({
        category: 'Customer Focus',
        severity: 'warning',
        description: 'Copy may be focusing too much on features rather than benefits.',
        suggestion: 'Reframe features in terms of benefits to the customer. Focus on "you" instead of "we".'
      });
    }
    
    // Add positive checks too
    if (/(^|\s)(you|your|yourself)(\s|$)/i.test(copyText)) {
      qualityChecks.push({
        category: 'Customer Focus',
        severity: 'success',
        description: 'Copy includes customer-focused language.',
        suggestion: 'Continue addressing the reader directly to maintain engagement.'
      });
    }
    
    return qualityChecks;
  }
  
  /**
   * Analyzes score feedback to provide strengths, weaknesses and suggestions
   */
  public async analyseScoreFeedback(copyText: string, scores: any): Promise<{ 
    strengths: string[], 
    weaknesses: string[], 
    suggestions: string[] 
  }> {
    // In a real implementation, this would call an LLM API
    // Here we'll simulate with feedback based on scores
    
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const suggestions: string[] = [];
    
    // Analyze clarity score
    if (scores.clarity >= 4) {
      strengths.push('The copy is clear and easy to understand.');
    } else if (scores.clarity <= 2) {
      weaknesses.push('The copy lacks clarity and may confuse readers.');
      suggestions.push('Simplify language and use shorter sentences to improve clarity.');
    }
    
    // Analyze persuasiveness score
    if (scores.persuasiveness >= 4) {
      strengths.push('The copy is convincing and makes a compelling case.');
    } else if (scores.persuasiveness <= 2) {
      weaknesses.push('The copy isn\'t sufficiently persuasive.');
      suggestions.push('Add more compelling reasons and evidence to strengthen your argument.');
    }
    
    // Analyze engagement score
    if (scores.engagement >= 4) {
      strengths.push('The copy is engaging and likely to capture attention.');
    } else if (scores.engagement <= 2) {
      weaknesses.push('The copy fails to engage the reader effectively.');
      suggestions.push('Use more conversational language, questions, or storytelling to increase engagement.');
    }
    
    // Analyze brand alignment score
    if (scores.brandAlignment >= 4) {
      strengths.push('The copy aligns well with the brand voice and values.');
    } else if (scores.brandAlignment <= 2) {
      weaknesses.push('The copy doesn\'t align well with the established brand voice.');
      suggestions.push('Adjust tone and messaging to better reflect brand personality and values.');
    }
    
    // Analyze actionability score
    if (scores.actionability >= 4) {
      strengths.push('The copy has a clear and compelling call to action.');
    } else if (scores.actionability <= 2) {
      weaknesses.push('The copy lacks a strong call to action.');
      suggestions.push('Add a clearer, more compelling call to action that tells readers exactly what to do next.');
    }
    
    // General analysis based on word count
    const wordCount = copyText.split(/\s+/).length;
    if (wordCount < 50) {
      weaknesses.push('The copy may be too brief to fully convey the message.');
      suggestions.push('Consider expanding the copy to provide more value and details.');
    } else if (wordCount > 300) {
      weaknesses.push('The copy may be too lengthy, risking reader drop-off.');
      suggestions.push('Consider condensing the copy to improve readability and focus.');
    }
    
    return {
      strengths,
      weaknesses,
      suggestions
    };
  }
}
