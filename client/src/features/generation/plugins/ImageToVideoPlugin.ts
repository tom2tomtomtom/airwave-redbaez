import { GeneratorPlugin, GenerationOptions, GenerationResult } from '../types/generators';
import ApiClient from '../../../services/ApiClient';

/**
 * Plugin interface for Image-to-Video generation
 */
export interface ImageToVideoOptions extends GenerationOptions {
  sourceImage: string;
  motionType: 'zoom' | 'pan' | 'rotation' | 'complex';
  motionStrength: number;
  motionDirection?: 'in' | 'out' | 'left' | 'right' | 'up' | 'down';
  duration: number;
  outputFormat: 'mp4' | 'mov' | 'gif';
  width: number;
  height: number;
}

/**
 * Result interface for Image-to-Video generation
 */
export interface ImageToVideoResult extends GenerationResult {
  id: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  error?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  assetId?: string; // ID of the saved asset in the asset library
}

/**
 * Plugin for converting static images to videos with motion effects
 */
export const imageToVideoPlugin: GeneratorPlugin<ImageToVideoOptions, ImageToVideoResult> = {
  id: 'image-to-video',
  name: 'Image to Video',
  description: 'Convert static images to dynamic videos with motion effects',
  type: 'video',
  icon: 'movie',
  supportedInputs: ['image'],
  supportedOutputs: ['video'],
  configFields: [
    {
      name: 'motionType',
      label: 'Motion Type',
      type: 'select',
      options: [
        { value: 'zoom', label: 'Zoom' },
        { value: 'pan', label: 'Pan' },
        { value: 'rotation', label: 'Rotation' },
        { value: 'complex', label: 'Complex Motion' }
      ],
      defaultValue: 'zoom',
      required: true
    },
    {
      name: 'motionStrength',
      label: 'Motion Strength',
      type: 'slider',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 50,
      required: true
    },
    {
      name: 'motionDirection',
      label: 'Motion Direction',
      type: 'select',
      options: [
        { value: 'in', label: 'Zoom In' },
        { value: 'out', label: 'Zoom Out' },
        { value: 'left', label: 'Pan Left' },
        { value: 'right', label: 'Pan Right' },
        { value: 'up', label: 'Pan Up' },
        { value: 'down', label: 'Pan Down' }
      ],
      defaultValue: 'in',
      required: false,
      conditionalDisplay: {
        field: 'motionType',
        values: ['zoom', 'pan']
      }
    },
    {
      name: 'duration',
      label: 'Duration (seconds)',
      type: 'number',
      min: 1,
      max: 30,
      step: 0.1,
      defaultValue: 3,
      required: true
    },
    {
      name: 'outputFormat',
      label: 'Output Format',
      type: 'select',
      options: [
        { value: 'mp4', label: 'MP4' },
        { value: 'mov', label: 'MOV' },
        { value: 'gif', label: 'GIF' }
      ],
      defaultValue: 'mp4',
      required: true
    },
    {
      name: 'width',
      label: 'Width (pixels)',
      type: 'number',
      min: 360,
      max: 3840,
      defaultValue: 1080,
      required: true
    },
    {
      name: 'height',
      label: 'Height (pixels)',
      type: 'number',
      min: 360,
      max: 2160,
      defaultValue: 1080,
      required: true
    }
  ],
  
  defaultOptions: {
    sourceImage: '',
    motionType: 'zoom',
    motionStrength: 50,
    motionDirection: 'in',
    duration: 3,
    outputFormat: 'mp4',
    width: 1080,
    height: 1080,
    client_id: '',
    user_id: '',
  },
  
  /**
   * Generate a video from a static image
   * 
   * @param options Generation options
   * @returns Promise with generation result
   */
  async generate(options: ImageToVideoOptions): Promise<ImageToVideoResult> {
    try {
      // Make API call to the backend service
      const response = await ApiClient.post('/api/image-to-video/generate', options);
      
      if (!response.data?.success || !response.data?.job) {
        throw new Error(response.data?.message || 'Failed to generate video');
      }
      
      // Return job information
      return {
        id: response.data.job.id,
        status: response.data.job.status,
        progress: response.data.job.progress || 0,
        createdAt: new Date(response.data.job.createdAt),
        updatedAt: new Date(response.data.job.updatedAt),
        videoUrl: response.data.job.videoUrl,
        thumbnailUrl: response.data.job.thumbnailUrl,
        error: response.data.job.error
      };
    } catch (error: any) {
      console.error('Error in image-to-video generation:', error);
      
      return {
        id: 'error',
        status: 'failed',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        error: error.message || 'Failed to generate video'
      };
    }
  },
  
  /**
   * Check the status of a running job
   * 
   * @param jobId Job ID to check
   * @returns Promise with updated job status
   */
  async checkStatus(jobId: string): Promise<ImageToVideoResult> {
    try {
      // Make API call to check job status
      const response = await ApiClient.get(`/api/image-to-video/status/${jobId}`);
      
      if (!response.data?.success || !response.data?.job) {
        throw new Error(response.data?.message || 'Failed to get job status');
      }
      
      // Return updated job information
      return {
        id: response.data.job.id,
        status: response.data.job.status,
        progress: response.data.job.progress || 0,
        createdAt: new Date(response.data.job.createdAt),
        updatedAt: new Date(response.data.job.updatedAt),
        videoUrl: response.data.job.videoUrl,
        thumbnailUrl: response.data.job.thumbnailUrl,
        assetId: response.data.job.assetId, // Include the assetId from the server response
        error: response.data.job.error
      };
    } catch (error: any) {
      console.error('Error checking image-to-video job status:', error);
      
      return {
        id: jobId,
        status: 'failed',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        error: error.message || 'Failed to check job status'
      };
    }
  },
  
  /**
   * Get the URL to view the generation page
   */
  getPageUrl(): string {
    return '/generate/image-to-video';
  }
};
