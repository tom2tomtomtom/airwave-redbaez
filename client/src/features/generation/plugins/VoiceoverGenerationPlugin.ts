import React from 'react';
import { GeneratorPlugin, GenerationOptions, GenerationResult } from '../types/generators';
import ApiClient from '../../../services/ApiClient';
const VoiceoverGenerationForm = React.lazy(() => import('../../../components/generation/VoiceoverGenerationForm'));

/**
 * Plugin interface for Voiceover generation
 */
export interface VoiceoverGenerationOptions extends GenerationOptions {
  text: string;
  voice: string; // Voice ID or name
  speed: number; // Speech rate (0.5 to 2.0)
  pitch: number; // Voice pitch adjustment (-10 to 10)
  emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'excited';
  enhanceAudio: boolean; // Apply audio enhancement
  outputFormat: 'mp3' | 'wav' | 'ogg';
  preservePunctuation: boolean; // Control pause timing with punctuation
}

/**
 * Result interface for Voiceover generation
 */
export interface VoiceoverGenerationResult extends GenerationResult {
  id: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  error?: string;
  audioUrl?: string;
  waveformUrl?: string;
  duration?: number;
  transcript?: string;
  assetId?: string; // ID of the saved asset in the asset library
}

/**
 * Plugin for generating voiceovers from text
 */
export const voiceoverGenerationPlugin: GeneratorPlugin<VoiceoverGenerationOptions, VoiceoverGenerationResult> = {
  getId: () => 'voiceover-generation',
  getName: () => 'Voiceover Generation',
  getDescription: () => 'Generate realistic voiceovers from text with customizable voices',
  getIcon: () => 'mic',
  getFormComponent: () => VoiceoverGenerationForm,
  id: 'voiceover-generation',
  name: 'Voiceover Generation',
  description: 'Generate realistic voiceovers from text with customizable voices',
  type: 'audio',
  icon: 'mic',
  supportedInputs: ['text'],
  supportedOutputs: ['audio'],
  configFields: [
    {
      name: 'voice',
      label: 'Voice',
      type: 'select',
      options: [
        { value: 'en-GB-male-1', label: 'British Male' },
        { value: 'en-GB-female-1', label: 'British Female' },
        { value: 'en-US-male-1', label: 'American Male' },
        { value: 'en-US-female-1', label: 'American Female' },
        { value: 'en-AU-male-1', label: 'Australian Male' },
        { value: 'en-AU-female-1', label: 'Australian Female' }
      ]
    },
    {
      name: 'speed',
      label: 'Speed',
      type: 'slider',
      min: 0.5,
      max: 2.0,
      step: 0.1,
      defaultValue: 1.0
    },
    {
      name: 'pitch',
      label: 'Pitch',
      type: 'slider',
      min: -10,
      max: 10,
      step: 1,
      defaultValue: 0
    },
    {
      name: 'emotion',
      label: 'Emotion',
      type: 'select',
      options: [
        { value: 'neutral', label: 'Neutral' },
        { value: 'happy', label: 'Happy' },
        { value: 'sad', label: 'Sad' },
        { value: 'angry', label: 'Angry' },
        { value: 'excited', label: 'Excited' }
      ]
    },
    {
      name: 'enhanceAudio',
      label: 'Enhance Audio',
      type: 'checkbox',
      defaultValue: true
    },
    {
      name: 'outputFormat',
      label: 'Output Format',
      type: 'select',
      options: [
        { value: 'mp3', label: 'MP3' },
        { value: 'wav', label: 'WAV' },
        { value: 'ogg', label: 'OGG' }
      ]
    }
  ],
  
  getFormComponent: () => VoiceoverGenerationForm,
  
  /**
   * Generate a voiceover from text
   * 
   * @param options Generation options
   * @returns Promise with generation result
   */
  async generate(options: VoiceoverGenerationOptions): Promise<VoiceoverGenerationResult> {
    try {
      const response = await ApiClient.post('/api/generation/voiceover', options);
      
      return {
        id: response.data.jobId,
        status: 'pending',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Voiceover generation error:', error);
      throw new Error('Failed to start voiceover generation');
    }
  },
  
  /**
   * Check the status of a running job
   * 
   * @param jobId Job ID to check
   * @returns Promise with updated job status
   */
  async checkStatus(jobId: string): Promise<VoiceoverGenerationResult> {
    try {
      const response = await ApiClient.get(`/api/generation/voiceover/${jobId}`);
      
      return {
        ...response.data,
        createdAt: new Date(response.data.createdAt),
        updatedAt: new Date(response.data.updatedAt)
      };
    } catch (error) {
      console.error('Failed to check voiceover generation status:', error);
      throw new Error('Failed to check generation status');
    }
  },
  
  /**
   * Get the URL to view the generation page
   */
  getPageUrl(): string {
    return '/generate/voiceover';
  }
};
