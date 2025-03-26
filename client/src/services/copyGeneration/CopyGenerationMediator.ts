import { v4 as uuidv4 } from 'uuid';
import { 
  MarketingStrategy, 
  CopyGenerationConfig, 
  CopyVariation, 
  CopyGenerationRequest,
  CopyGenerationResponse,
  CopyRefinementRequest,
  StrategyAnalysis,
  CopyGenerationEvent
} from './types';
import { PromptEngineeringService } from './PromptEngineeringService';
import EventBus from '../EventBus';

/**
 * Copy Generation Mediator
 * 
 * This service coordinates the entire copy generation pipeline,
 * mediating between strategy input, prompt engineering, and copy refinement.
 * It follows the mediator pattern to reduce dependencies between components.
 */
export class CopyGenerationMediator {
  private promptService: PromptEngineeringService;
  private eventBus: EventBus;
  
  constructor() {
    this.promptService = new PromptEngineeringService();
    this.eventBus = EventBus.getInstance();
  }
  
  /**
   * Analyzes a marketing strategy for completeness and quality
   */
  public async analyzeStrategy(strategy: MarketingStrategy): Promise<StrategyAnalysis> {
    try {
      // Notify subscribers that analysis has begun
      this.eventBus.publish(CopyGenerationEvent.STRATEGY_UPDATED, { strategy });
      
      const missingElements: string[] = [];
      const improvementSuggestions: StrategyAnalysis['improvementSuggestions'] = [];
      
      // Check target audience completeness
      if (!strategy.targetAudience.demographics) {
        missingElements.push('Target audience demographics');
      }
      
      if (!strategy.targetAudience.psychographics) {
        missingElements.push('Target audience psychographics');
      }
      
      if (strategy.targetAudience.painPoints.length === 0) {
        missingElements.push('Target audience pain points');
      }
      
      // Check brand voice
      if (!strategy.brandVoice.tone) {
        missingElements.push('Brand voice tone');
      }
      
      if (strategy.brandVoice.values.length === 0) {
        missingElements.push('Brand values');
      }
      
      if (!strategy.brandVoice.uniqueSellingProposition) {
        missingElements.push('Unique selling proposition');
      }
      
      // Check campaign goals
      if (!strategy.campaignGoals.primary) {
        missingElements.push('Primary campaign goal');
      }
      
      if (!strategy.campaignGoals.conversionAction) {
        missingElements.push('Conversion action');
      }
      
      // Add improvement suggestions based on best practices
      if (strategy.targetAudience.painPoints.length < 2) {
        improvementSuggestions.push({
          element: 'Pain points',
          suggestion: 'Add more specific pain points to better address audience needs',
          importance: 'high'
        });
      }
      
      if (strategy.brandVoice.uniqueSellingProposition && 
          strategy.brandVoice.uniqueSellingProposition.length > 100) {
        improvementSuggestions.push({
          element: 'Unique selling proposition',
          suggestion: 'Shorten your USP to be more memorable and impactful',
          importance: 'medium'
        });
      }
      
      // Calculate completeness score (0-1)
      const totalRequiredElements = 10; // Adjust based on required elements
      const completeness = 1 - (missingElements.length / totalRequiredElements);
      
      // Quality score calculation
      let qualityScore = completeness;
      
      // Reduce quality score based on improvement suggestions
      const highImportanceSuggestions = improvementSuggestions.filter(s => s.importance === 'high').length;
      const mediumImportanceSuggestions = improvementSuggestions.filter(s => s.importance === 'medium').length;
      
      qualityScore -= (highImportanceSuggestions * 0.1) + (mediumImportanceSuggestions * 0.05);
      qualityScore = Math.max(0, Math.min(1, qualityScore)); // Clamp between 0-1
      
      // Best practices analysis
      const bestPractices = {
        followed: [] as string[],
        notFollowed: [] as string[]
      };
      
      // Check if specific best practices are followed
      if (strategy.targetAudience.demographics && strategy.targetAudience.psychographics) {
        bestPractices.followed.push('Comprehensive audience definition');
      } else {
        bestPractices.notFollowed.push('Comprehensive audience definition');
      }
      
      if (strategy.competitiveContext.differentiators.length > 0) {
        bestPractices.followed.push('Clear competitive differentiation');
      } else {
        bestPractices.notFollowed.push('Clear competitive differentiation');
      }
      
      if (strategy.contentParameters.requiredKeywords.length > 0) {
        bestPractices.followed.push('SEO optimization with keywords');
      } else {
        bestPractices.notFollowed.push('SEO optimization with keywords');
      }
      
      return {
        completeness,
        qualityScore,
        missingElements,
        improvementSuggestions,
        bestPractices
      };
    } catch (error) {
      console.error('Error analyzing strategy:', error);
      throw new Error('Failed to analyze marketing strategy');
    }
  }
  
  /**
   * Generates copy based on marketing strategy and configuration
   */
  public async generateCopy(request: CopyGenerationRequest): Promise<CopyGenerationResponse> {
    try {
      this.eventBus.publish(CopyGenerationEvent.GENERATION_STARTED, { request });
      
      // Generate prompt using PromptEngineeringService
      const prompt = this.promptService.createCopyGenerationPrompt(
        request.strategy,
        request.config
      );
      
      // In a real implementation, this would call an LLM API
      // For now, we'll simulate the response with mock data
      const variations: CopyVariation[] = this.generateMockVariations(
        request.config,
        3 // Generate 3 variations
      );
      
      this.eventBus.publish(CopyGenerationEvent.GENERATION_COMPLETED, { variations });
      
      return {
        variations,
        prompt
      };
    } catch (error) {
      console.error('Error generating copy:', error);
      this.eventBus.publish(CopyGenerationEvent.GENERATION_FAILED, { error });
      throw new Error('Failed to generate copy');
    }
  }
  
  /**
   * Refines existing copy based on feedback
   */
  public async refineCopy(request: CopyRefinementRequest): Promise<CopyVariation> {
    try {
      this.eventBus.publish(CopyGenerationEvent.REFINEMENT_REQUESTED, { request });
      
      // Create refinement prompt
      const refinementPrompt = this.promptService.createRefinementPrompt(
        request.variation,
        request.refinementInstructions,
        request.preserveElements,
        request.emphasize,
        request.toneAdjustment,
        request.styleAdjustment
      );
      
      // In a real implementation, this would call an LLM API
      // For now, we'll simulate the response
      const refinedVariation: CopyVariation = {
        ...request.variation,
        id: uuidv4(),
        version: request.variation.version + 1,
        text: `Refined: ${request.variation.text}`,
        modifiedAt: new Date(),
        feedback: [...(request.variation.feedback || []), request.refinementInstructions]
      };
      
      this.eventBus.publish(CopyGenerationEvent.REFINEMENT_COMPLETED, { refinedVariation });
      
      return refinedVariation;
    } catch (error) {
      console.error('Error refining copy:', error);
      throw new Error('Failed to refine copy');
    }
  }
  
  /**
   * Scores copy based on best practices and strategy alignment
   */
  public scoreCopy(variation: CopyVariation, strategy: MarketingStrategy): CopyVariation {
    // Calculate different aspects of the copy quality
    const clarity = Math.random() * 5;
    const engagement = Math.random() * 5;
    const relevance = Math.random() * 5;
    const persuasiveness = Math.random() * 5;
    const brandAlignment = Math.random() * 5;
    
    // Calculate overall score (1-5)
    const overallScore = Math.ceil(
      (clarity + engagement + relevance + persuasiveness + brandAlignment) / 5
    ) as QualityScore;
    
    return {
      ...variation,
      qualityScore: overallScore,
      scoreBreakdown: {
        clarity,
        engagement,
        relevance,
        persuasiveness,
        brandAlignment
      }
    };
  }
  
  /**
   * Mock function to generate variations for demonstration
   * In a real implementation, this would be replaced with actual API calls
   */
  private generateMockVariations(
    config: CopyGenerationConfig,
    count: number
  ): CopyVariation[] {
    const variations: CopyVariation[] = [];
    
    for (let i = 0; i < count; i++) {
      const now = new Date();
      
      const variation: CopyVariation = {
        id: uuidv4(),
        version: 1,
        text: this.getMockCopyText(config.type, i),
        type: config.type,
        status: 'draft',
        createdAt: now,
        modifiedAt: now
      };
      
      // Add frames for multi-frame content
      if (config.frameCount && config.frameCount > 1) {
        variation.frames = [];
        for (let j = 0; j < config.frameCount; j++) {
          variation.frames.push(`Frame ${j + 1} content for variation ${i + 1}`);
        }
      }
      
      variations.push(variation);
    }
    
    return variations;
  }
  
  private getMockCopyText(type: CopyType, index: number): string {
    switch (type) {
      case 'headline':
        const headlines = [
          "Transform Your Strategy with AI-Powered Insights",
          "Unleash Your Brand's Potential with Data-Driven Copy",
          "Revolutionise Your Marketing with Copy That Converts"
        ];
        return headlines[index % headlines.length];
        
      case 'body':
        return "Our innovative platform combines strategic insights with AI-powered content generation to deliver copy that resonates with your audience and drives results. With our comprehensive pipeline approach, you'll move seamlessly from strategy development to polished, high-converting copy in minutes, not days.";
        
      case 'cta':
        const ctas = [
          "Start Creating Powerful Copy Today",
          "Transform Your Marketing Now",
          "Elevate Your Brand Voice"
        ];
        return ctas[index % ctas.length];
        
      case 'social':
        return "🚀 Ready to transform your marketing? Our AI-powered copy generation tool creates compelling content aligned with your strategy in minutes. #MarketingInnovation #AIContent";
        
      case 'email':
        return "Dear valued customer,\n\nDiscover how our revolutionary platform can transform your marketing strategy with AI-generated copy that converts. Our data-driven approach ensures your message resonates with your target audience while maintaining your unique brand voice.\n\nReady to see the difference? Book a demo today.\n\nBest regards,\nThe Marketing Team";
        
      default:
        return "Sample copy text for demonstration purposes.";
    }
  }
}

// Quality score type
type QualityScore = 1 | 2 | 3 | 4 | 5;

// Export singleton instance
export default new CopyGenerationMediator();
