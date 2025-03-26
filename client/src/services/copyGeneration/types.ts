// Copy Generation Types
export interface MarketingStrategy {
  targetAudience: {
    demographics: string;
    psychographics: string;
    painPoints: string[];
    goals: string[];
  };
  brandVoice: {
    tone: string;
    values: string[];
    personality: string;
    uniqueSellingProposition: string;
  };
  campaignGoals: {
    primary: string;
    secondary: string[];
    kpis: string[];
    conversionAction: string;
  };
  competitiveContext: {
    mainCompetitors: string[];
    differentiators: string[];
    marketPositioning: string;
  };
  contentParameters: {
    maxLength: number;
    requiredKeywords: string[];
    forbiddenWords: string[];
    mustIncludePhrases: string[];
  };
}

export type ToneOption = 
  | 'Professional' 
  | 'Casual' 
  | 'Friendly' 
  | 'Authoritative'
  | 'Humorous' 
  | 'Inspirational' 
  | 'Conversational' 
  | 'Urgent'
  | 'Informative' 
  | 'Enthusiastic' 
  | 'Compassionate' 
  | 'Bold';

export type StyleOption = 
  | 'Storytelling' 
  | 'Direct' 
  | 'Question-based' 
  | 'Problem-solution'
  | 'Testimonial' 
  | 'Fact-based' 
  | 'Emotional' 
  | 'Feature-focused'
  | 'Benefit-focused' 
  | 'Comparison' 
  | 'How-to' 
  | 'Provocative';

export type CopyLength = 'short' | 'medium' | 'long';
export type CopyType = 'headline' | 'body' | 'cta' | 'social' | 'email';
export type CopyStatus = 'draft' | 'review' | 'approved' | 'rejected';
export type QualityScore = 1 | 2 | 3 | 4 | 5;

export interface CopyGenerationConfig {
  tone: ToneOption;
  style: StyleOption;
  length: CopyLength;
  type: CopyType;
  includeCallToAction: boolean;
  callToActionText?: string;
  frameCount?: number; // For multi-frame content like carousel
}

export interface CopyVariation {
  id: string;
  version: number;
  text: string;
  type: CopyType;
  frames?: string[]; // For multi-frame content
  status: CopyStatus;
  createdAt: Date;
  modifiedAt: Date;
  qualityScore?: QualityScore;
  feedback?: string[];
  scoreBreakdown?: {
    clarity: number;
    engagement: number;
    relevance: number;
    persuasiveness: number;
    brandAlignment: number;
  };
}

export interface CopyGenerationRequest {
  strategy: MarketingStrategy;
  config: CopyGenerationConfig;
}

export interface CopyGenerationResponse {
  variations: CopyVariation[];
  prompt?: string; // Optional, for debugging/refinement
}

export interface CopyRefinementRequest {
  variation: CopyVariation;
  refinementInstructions: string;
  preserveElements?: string[];
  emphasize?: string[];
  toneAdjustment?: Partial<Record<ToneOption, number>>; // Strength 0-1
  styleAdjustment?: Partial<Record<StyleOption, number>>; // Strength 0-1
}

// Events for pub/sub pattern
export enum CopyGenerationEvent {
  STRATEGY_UPDATED = 'strategy_updated',
  GENERATION_STARTED = 'generation_started',
  GENERATION_COMPLETED = 'generation_completed',
  GENERATION_FAILED = 'generation_failed',
  VARIATION_SELECTED = 'variation_selected',
  VARIATION_UPDATED = 'variation_updated',
  REFINEMENT_REQUESTED = 'refinement_requested',
  REFINEMENT_COMPLETED = 'refinement_completed'
}

// Strategy analysis result
export interface StrategyAnalysis {
  completeness: number; // 0-1
  qualityScore: number; // 0-1
  missingElements: string[];
  improvementSuggestions: {
    element: string;
    suggestion: string;
    importance: 'high' | 'medium' | 'low';
  }[];
  bestPractices: {
    followed: string[];
    notFollowed: string[];
  };
}

// State interfaces for immutable state
export interface CopyGenerationState {
  strategy: MarketingStrategy | null;
  strategyAnalysis: StrategyAnalysis | null;
  generationConfig: CopyGenerationConfig | null;
  variations: CopyVariation[];
  selectedVariationId: string | null;
  versionHistory: Record<string, CopyVariation[]>;
  status: 'idle' | 'analyzing' | 'generating' | 'refining' | 'complete' | 'error';
  error: string | null;
  activeStep: number;
}
