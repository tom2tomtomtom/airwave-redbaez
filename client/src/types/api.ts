import { AnalysisResults } from './supabase';

export interface BriefAnalysisRequest {
  content: string;
  fileType?: 'pdf' | 'doc' | 'docx' | 'txt';
  targetAudience?: string;
  campaignObjectives?: string;
}

export interface BriefAnalysisResponse {
  motivations: Motivation[];
  analysis: AnalysisResults;
}

export interface Motivation {
  id: string;
  title: string;
  description: string;
  reasoning: string;
  targetAudience: string;
  campaignObjective: string;
}

export interface CopyGenerationRequest {
  motivationIds: string[];
  tone: string;
  style: string;
  frameCount: number;
  includeCta: boolean;
  ctaText?: string;
  length?: 'short' | 'medium' | 'long';
}

export interface CopyVariation {
  id: string;
  content: string[];
  tone: string;
  style: string;
  motivation: string;
  metrics: {
    readabilityScore: number;
    emotionalImpact: number;
    persuasionScore: number;
  };
}

export interface CopyGenerationResponse {
  variations: CopyVariation[];
  analysis: {
    targetAudienceAlignment: number;
    objectiveAlignment: number;
    brandVoiceConsistency: number;
  };
}
