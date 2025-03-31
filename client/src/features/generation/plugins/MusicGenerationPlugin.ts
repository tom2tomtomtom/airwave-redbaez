import React from 'react';
import { GeneratorPlugin, GenerationOptions, GenerationResult } from '../types/generators';
import ApiClient from '../../../services/ApiClient';
const MusicGenerationForm = React.lazy(() => import('../../../components/generation/MusicGenerationForm'));

/**
 * Plugin interface for Music generation
 */
export interface MusicGenerationOptions extends GenerationOptions {
  prompt: string;
  genre?: 'pop' | 'rock' | 'electronic' | 'ambient' | 'classical' | 'jazz' | 'hip-hop' | 'folk';
  mood?: 'happy' | 'sad' | 'energetic' | 'relaxed' | 'tense' | 'mysterious';
  tempo: number; // BPM
  duration: number; // In seconds
  structure?: string; // e.g., "AABA", "verse-chorus-verse-chorus-bridge-chorus"
  outputFormat: 'mp3' | 'wav' | 'midi';
  includeLayeredTracks: boolean; // Whether to provide individual instrument tracks
}

/**
 * Result interface for Music generation
 */
export interface MusicGenerationResult extends GenerationResult {
  id: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  error?: string;
  audioUrl?: string;
  waveformUrl?: string;
  duration?: number;
  individualTracks?: {
    name: string;
    url: string;
  }[];
  assetId?: string; // ID of the saved asset in the asset library
}

/**
 * Plugin for generating music from text prompts
 */
export const musicGenerationPlugin: GeneratorPlugin<MusicGenerationOptions, MusicGenerationResult> = {
  getId: () => 'music-generation',
  getName: () => 'Music Generation',
  getDescription: () => 'Generate original music tracks from text descriptions',
  getIcon: () => 'music_note',
  getFormComponent: () => MusicGenerationForm,
  id: 'music-generation',
  name: 'Music Generation',
  description: 'Generate original music tracks from text descriptions',
  type: 'audio',
  icon: 'music_note',
  supportedInputs: ['text'],
  supportedOutputs: ['audio'],
  configFields: [
    {
      name: 'genre',
      label: 'Genre',
      type: 'select',
      options: [
        { value: 'pop', label: 'Pop' },
        { value: 'rock', label: 'Rock' },
        { value: 'electronic', label: 'Electronic' },
        { value: 'ambient', label: 'Ambient' },
        { value: 'classical', label: 'Classical' },
        { value: 'jazz', label: 'Jazz' },
        { value: 'hip-hop', label: 'Hip-Hop' },
        { value: 'folk', label: 'Folk' }
      ]
    },
    {
      name: 'mood',
      label: 'Mood',
      type: 'select',
      options: [
        { value: 'happy', label: 'Happy' },
        { value: 'sad', label: 'Sad' },
        { value: 'energetic', label: 'Energetic' },
        { value: 'relaxed', label: 'Relaxed' },
        { value: 'tense', label: 'Tense' },
        { value: 'mysterious', label: 'Mysterious' }
      ]
    },
    {
      name: 'tempo',
      label: 'Tempo (BPM)',
      type: 'slider',
      min: 60,
      max: 180,
      step: 1,
      defaultValue: 120
    },
    {
      name: 'duration',
      label: 'Duration (seconds)',
      type: 'slider',
      min: 10,
      max: 300,
      step: 5,
      defaultValue: 60
    },
    {
      name: 'outputFormat',
      label: 'Output Format',
      type: 'select',
      options: [
        { value: 'mp3', label: 'MP3' },
        { value: 'wav', label: 'WAV' },
        { value: 'midi', label: 'MIDI' }
      ]
    },
    {
      name: 'includeLayeredTracks',
      label: 'Include Individual Tracks',
      type: 'checkbox',
      defaultValue: false
    }
  ],
  
  getFormComponent: () => MusicGenerationForm,
  
  /**
   * Generate music from a text prompt
   * 
   * @param options Generation options
   * @returns Promise with generation result
   */
  async generate(options: MusicGenerationOptions): Promise<MusicGenerationResult> {
    try {
      const response = await ApiClient.post('/api/generation/music', options);
      
      return {
        id: response.data.jobId,
        status: 'pending',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Music generation error:', error);
      throw new Error('Failed to start music generation');
    }
  },
  
  /**
   * Check the status of a running job
   * 
   * @param jobId Job ID to check
   * @returns Promise with updated job status
   */
  async checkStatus(jobId: string): Promise<MusicGenerationResult> {
    try {
      const response = await ApiClient.get(`/api/generation/music/${jobId}`);
      
      return {
        ...response.data,
        createdAt: new Date(response.data.createdAt),
        updatedAt: new Date(response.data.updatedAt)
      };
    } catch (error) {
      console.error('Failed to check music generation status:', error);
      throw new Error('Failed to check generation status');
    }
  },
  
  /**
   * Get the URL to view the generation page
   */
  getPageUrl(): string {
    return '/generate/music';
  }
};
