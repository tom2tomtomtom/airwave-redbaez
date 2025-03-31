import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { WebSocketService } from '../WebSocketService';
import { ApiError } from '../../utils/ApiError';
import { ErrorCode } from '../../types/errorTypes';
import { JobProgressPayload } from '../../types/websocket.types';

// Mock Supabase before importing any modules that use it
jest.mock('@supabase/supabase-js', () => {
  return {
    createClient: jest.fn().mockReturnValue({
      storage: {
        from: jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue({ data: { path: 'mock-path' } }),
          getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/mock-asset' } })
        })
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { id: 'mock-asset-id' } })
          }),
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({ data: [], count: 0 })
          })
        }),
        insert: jest.fn().mockResolvedValue({ data: { id: 'mock-asset-id' } }),
        update: jest.fn().mockResolvedValue({ data: { id: 'mock-asset-id' } }),
        delete: jest.fn().mockResolvedValue({})
      })
    })
  };
});

// Set mock environment variables before importing the service
process.env.RUNWAY_API_KEY = 'mock-api-key';
process.env.SUPABASE_URL = 'mock-supabase-url';
process.env.SUPABASE_KEY = 'mock-supabase-key';
process.env.UPLOAD_DIR = '/tmp/test-uploads';

// Import after setting environment variables
import { imageToVideoService, ImageToVideoOptions, ImageToVideoJob } from '../imageToVideoService';
import { assetService } from '../assetService.new';

// Mock dependencies
jest.mock('axios');
jest.mock('uuid');
jest.mock('fs');
jest.mock('fs/promises');
jest.mock('path');
// Properly mock assetService directly
jest.mock('../assetService.new', () => ({
  assetService: {
    uploadAsset: jest.fn().mockResolvedValue({
      success: true,
      data: {
        id: 'mock-asset-id',
        name: 'Generated Video',
        type: 'video',
        url: 'https://example.com/video.mp4'
      }
    })
  }
}));

const mockAxios = axios as jest.Mocked<typeof axios>;
const mockUuidv4 = uuidv4 as jest.Mock;

// Mock WebSocketService
jest.mock('../WebSocketService', () => {
  return {
    WebSocketService: jest.fn().mockImplementation(() => {
      return {
        broadcast: jest.fn(),
        broadcastToClient: jest.fn(),
        broadcastToUser: jest.fn(),
      };
    }),
  };
});

describe('ImageToVideoService', () => {
  // Mock data for testing
  const mockJobId = 'mock-job-id';
  const mockUserId = 'mock-user-id';
  const mockClientId = 'mock-client-id';
  const mockSourceImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...'; // Shortened for brevity
  
  const mockOptions: ImageToVideoOptions = {
    sourceImage: mockSourceImage,
    motionType: 'zoom',
    motionStrength: 50,
    motionDirection: 'in',
    duration: 3,
    outputFormat: 'mp4',
    width: 1080,
    height: 1080,
    clientId: mockClientId,
    userId: mockUserId
  };
  
  const mockJob: ImageToVideoJob = {
    id: mockJobId,
    status: 'pending',
    progress: 0,
    sourceImage: mockSourceImage,
    clientId: mockClientId,
    userId: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const mockSuccessfulJob: ImageToVideoJob = {
    ...mockJob,
    status: 'succeeded',
    progress: 100,
    videoUrl: 'https://example.com/video.mp4',
    thumbnailUrl: 'https://example.com/thumbnail.jpg'
  };
  
  // Mock WebSocket service instance
  let mockWsService: jest.Mocked<WebSocketService>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up UUID mock
    mockUuidv4.mockReturnValue(mockJobId);
    
    // Initialize mock WebSocket service
    // Use the mock implementation defined earlier instead of directly instantiating
    mockWsService = new (WebSocketService as any)() as jest.Mocked<WebSocketService>;
    imageToVideoService.setWebSocketService(mockWsService);
    
    // Reset active jobs (accessing private property for test purposes)
    (imageToVideoService as any).activeJobs = new Map();
    (imageToVideoService as any).pollingIntervals = new Map();
    
    // Mock fs/path methods
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
    (path.extname as jest.Mock).mockReturnValue('.mp4');
  });
  
  describe('isConfigured', () => {
    it('should return true when API key is configured', () => {
      // The API key is already set in the environment variables
      expect(imageToVideoService.isConfigured()).toBe(true);
    });
    
    it('should return false when API key is not configured', () => {
      // Temporarily replace the API key with an empty string
      const originalApiKey = (imageToVideoService as any).apiKey;
      (imageToVideoService as any).apiKey = '';
      
      expect(imageToVideoService.isConfigured()).toBe(false);
      
      // Restore the original API key
      (imageToVideoService as any).apiKey = originalApiKey;
    });
  });
  
  describe('generateVideo', () => {
    it('should throw an error when service is not configured', async () => {
      // Temporarily replace the API key with an empty string
      const originalApiKey = (imageToVideoService as any).apiKey;
      (imageToVideoService as any).apiKey = '';
      
      await expect(imageToVideoService.generateVideo(mockOptions))
        .rejects.toThrow(new ApiError(ErrorCode.CONFIGURATION_ERROR, 'Image-to-video service is not properly configured'));
      
      // Restore the original API key
      (imageToVideoService as any).apiKey = originalApiKey;
    });
    
    it('should create a new job and make API request', async () => {
      // Mock successful API response
      mockAxios.post.mockResolvedValueOnce({
        data: {
          id: 'runway-job-id',
          status: 'processing'
        }
      });
      
      // Call the method
      const result = await imageToVideoService.generateVideo(mockOptions);
      
      // Verify job creation
      expect(result).toEqual(expect.objectContaining({
        id: mockJobId,
        status: 'pending',
        progress: 0,
        sourceImage: mockSourceImage,
        clientId: mockClientId,
        userId: mockUserId
      }));
      
      // Verify API call
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/image-to-video/generate'),
        expect.objectContaining({
          image: mockSourceImage,
          motion_type: 'zoom',
          motion_strength: 50,
          motion_direction: 'in',
          duration: 3,
          output_format: 'mp4',
          width: 1080,
          height: 1080
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer mock-api-key`
          })
        })
      );
      
      // Verify job storage
      expect((imageToVideoService as any).activeJobs.get(mockJobId)).toBeDefined();
    });
    
    it('should handle API errors', async () => {
      // Mock API error
      mockAxios.post.mockRejectedValueOnce(new Error('API error'));
      
      // Call the method and verify error handling
      await expect(imageToVideoService.generateVideo(mockOptions))
        .rejects.toThrow(new ApiError(ErrorCode.EXTERNAL_SERVICE_ERROR, 'Failed to start image-to-video conversion: API error'));
    });
  });
  
  describe('getJobStatus', () => {
    it('should return null for non-existent job', async () => {
      const result = await imageToVideoService.getJobStatus('non-existent-job');
      expect(result).toBeNull();
    });
    
    it('should return the job status for an existing job', async () => {
      // Add a mock job to active jobs
      (imageToVideoService as any).activeJobs.set(mockJobId, mockJob);
      
      const result = await imageToVideoService.getJobStatus(mockJobId);
      expect(result).toEqual(mockJob);
    });
  });
  
  describe('updateJobStatus', () => {
    it('should update the job status and send a WebSocket update', async () => {
      // Add a mock job to active jobs
      (imageToVideoService as any).activeJobs.set(mockJobId, { ...mockJob });
      
      // Call the method (accessing private method for test purposes)
      await (imageToVideoService as any).updateJobStatus(mockJobId, {
        status: 'succeeded',
        progress: 100,
        videoUrl: 'https://example.com/video.mp4',
        thumbnailUrl: 'https://example.com/thumbnail.jpg'
      });
      
      // Verify job update
      const updatedJob = (imageToVideoService as any).activeJobs.get(mockJobId);
      expect(updatedJob).toEqual(expect.objectContaining({
        status: 'succeeded',
        progress: 100,
        videoUrl: 'https://example.com/video.mp4',
        thumbnailUrl: 'https://example.com/thumbnail.jpg'
      }));
      
      // Verify WebSocket broadcast
      expect((mockWsService as any).broadcastToClient).toHaveBeenCalledWith(
        mockClientId,
        'job_progress',
        expect.objectContaining({
          jobId: mockJobId,
          status: 'succeeded',
          progress: 100,
          resultUrl: 'https://example.com/video.mp4',
          clientId: mockClientId,
          userId: mockUserId
        })
      );
    });
    
    it('should handle non-existent jobs', async () => {
      // Call the method with a non-existent job ID
      await (imageToVideoService as any).updateJobStatus('non-existent-job', {
        status: 'succeeded',
        progress: 100
      });
      
      // No throw = pass
      expect(true).toBe(true);
    });
  });
  
  describe('handleWebhook', () => {
    it('should update job status based on webhook data', async () => {
      // Add a mock job to active jobs
      (imageToVideoService as any).activeJobs.set(mockJobId, { ...mockJob });
      
      // Mock webhook data
      const webhookData = {
        job_id: mockJobId,
        status: 'completed',
        output: {
          video_url: 'https://example.com/video.mp4',
          thumbnail_url: 'https://example.com/thumbnail.jpg'
        }
      };
      
      // Call the method
      await imageToVideoService.handleWebhook(webhookData);
      
      // Verify job update
      const updatedJob = (imageToVideoService as any).activeJobs.get(mockJobId);
      expect(updatedJob).toEqual(expect.objectContaining({
        status: 'succeeded',
        progress: 100,
        videoUrl: 'https://example.com/video.mp4',
        thumbnailUrl: 'https://example.com/thumbnail.jpg'
      }));
    });
    
    it('should handle webhooks for failed jobs', async () => {
      // Add a mock job to active jobs
      (imageToVideoService as any).activeJobs.set(mockJobId, { ...mockJob });
      
      // Mock webhook data for failed job
      const webhookData = {
        job_id: mockJobId,
        status: 'failed',
        error: 'Job processing failed'
      };
      
      // Call the method
      await imageToVideoService.handleWebhook(webhookData);
      
      // Verify job update
      const updatedJob = (imageToVideoService as any).activeJobs.get(mockJobId);
      expect(updatedJob).toEqual(expect.objectContaining({
        status: 'failed',
        progress: 0,
        error: 'Job processing failed'
      }));
    });
    
    it('should handle webhooks for non-existent jobs', async () => {
      // Mock webhook data for non-existent job
      const webhookData = {
        job_id: 'non-existent-job',
        status: 'completed'
      };
      
      // Call the method
      await imageToVideoService.handleWebhook(webhookData);
      
      // No throw = pass
      expect(true).toBe(true);
    });
    
    it('should handle assetId in webhook data when provided', async () => {
      // Add a mock job to active jobs
      (imageToVideoService as any).activeJobs.set(mockJobId, { ...mockJob });
      
      // Mock webhook data with assetId in metadata
      const webhookData = {
        job_id: mockJobId,
        status: 'completed',
        output: {
          video_url: 'https://example.com/video.mp4',
          thumbnail_url: 'https://example.com/thumbnail.jpg'
        },
        metadata: {
          assetId: 'external-asset-id-123'
        }
      };
      
      // Call the method
      await imageToVideoService.handleWebhook(webhookData);
      
      // Verify job update includes the assetId from metadata
      const updatedJob = (imageToVideoService as any).activeJobs.get(mockJobId);
      expect(updatedJob).toEqual(expect.objectContaining({
        status: 'succeeded',
        progress: 100,
        videoUrl: 'https://example.com/video.mp4',
        thumbnailUrl: 'https://example.com/thumbnail.jpg',
        assetId: 'external-asset-id-123'
      }));
    });
  });
  
  describe('saveVideoToAssets', () => {
    it('should save a generated video to the asset library', async () => {
      // Mock axios get for video download
      mockAxios.get.mockResolvedValueOnce({
        data: Buffer.from('mock-video-data')
      });
      
      // Mock fsPromises methods
      (fsPromises.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fsPromises.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fsPromises.unlink as jest.Mock).mockResolvedValue(undefined);
      
      // Create a successful job with a video URL
      const successfulJob: ImageToVideoJob = {
        id: mockJobId,
        status: 'succeeded',
        progress: 100,
        videoUrl: 'https://example.com/video.mp4',
        thumbnailUrl: 'https://example.com/thumbnail.jpg',
        sourceImage: mockSourceImage,
        clientId: mockClientId,
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Add job to active jobs
      (imageToVideoService as any).activeJobs.set(mockJobId, successfulJob);
      
      // Call the method directly (accessing private method for test purposes)
      await (imageToVideoService as any).saveVideoToAssets(mockJobId, successfulJob);
      
      // Verify video was downloaded
      expect(mockAxios.get).toHaveBeenCalledWith(
        'https://example.com/video.mp4',
        { responseType: 'arraybuffer' }
      );
      
      // Verify temp directory was created if needed
      expect(fsPromises.mkdir).toHaveBeenCalled();
      
      // Verify video was written to temp file
      expect(fsPromises.writeFile).toHaveBeenCalled();
      
      // Verify asset was created
      expect(assetService.uploadAsset).toHaveBeenCalledWith(
        expect.objectContaining({
          originalname: expect.stringContaining('generated-video'),
          mimetype: 'video/mp4',
          buffer: expect.any(Buffer)
        }),
        mockUserId,
        expect.objectContaining({
          clientId: mockClientId,
          ownerId: mockUserId,
          name: expect.stringContaining('Generated Video'),
          tags: expect.arrayContaining(['generated', 'image-to-video']),
          categories: expect.arrayContaining(['videos', 'generated'])
        })
      );
      
      // Verify temp file was cleaned up
      expect(fsPromises.unlink).toHaveBeenCalled();
      
      // Verify job was updated with asset ID
      const updatedJob = (imageToVideoService as any).activeJobs.get(mockJobId);
      expect(updatedJob.assetId).toBe('mock-asset-id');
    });
    
    it('should handle errors when saving to asset library', async () => {
      // Mock axios get to throw an error
      mockAxios.get.mockRejectedValueOnce(new Error('Network error'));
      
      // Create a successful job with a video URL
      const successfulJob: ImageToVideoJob = {
        id: mockJobId,
        status: 'succeeded',
        progress: 100,
        videoUrl: 'https://example.com/video.mp4',
        clientId: mockClientId,
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Add job to active jobs
      (imageToVideoService as any).activeJobs.set(mockJobId, successfulJob);
      
      // Call the method and expect it to throw
      await expect((imageToVideoService as any).saveVideoToAssets(mockJobId, successfulJob))
        .rejects.toThrow('Network error');
    });
    
    it('should skip asset creation if required fields are missing', async () => {
      // Create a job missing required fields
      const incompleteJob: ImageToVideoJob = {
        id: mockJobId,
        status: 'succeeded',
        progress: 100,
        // Missing videoUrl
        clientId: mockClientId,
        // Missing userId
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Call the method
      await (imageToVideoService as any).saveVideoToAssets(mockJobId, incompleteJob);
      
      // Verify asset was not created
      expect(assetService.uploadAsset).not.toHaveBeenCalled();
    });
  });
  
  describe('integration with asset service', () => {
    it('should automatically save video to assets when video generation succeeds', async () => {
      // Mock successful job update that should trigger asset saving
      const job: ImageToVideoJob = {
        id: mockJobId,
        status: 'processing',
        progress: 50,
        clientId: mockClientId,
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Add job to active jobs
      (imageToVideoService as any).activeJobs.set(mockJobId, job);
      
      // Mock the saveVideoToAssets method
      const mockSaveVideoToAssets = jest.spyOn(imageToVideoService as any, 'saveVideoToAssets')
        .mockResolvedValue(undefined);
      
      // Update the job to succeeded status with a video URL
      await (imageToVideoService as any).updateJobStatus(mockJobId, {
        status: 'succeeded',
        progress: 100,
        videoUrl: 'https://example.com/video.mp4'
      });
      
      // Verify saveVideoToAssets was called
      expect(mockSaveVideoToAssets).toHaveBeenCalledWith(
        mockJobId,
        expect.objectContaining({
          id: mockJobId,
          status: 'succeeded',
          videoUrl: 'https://example.com/video.mp4'
        })
      );
    });
    
    it('should not save to assets if the job already has an assetId', async () => {
      // Create a job that already has an assetId
      const job: ImageToVideoJob = {
        id: mockJobId,
        status: 'succeeded',
        progress: 100,
        videoUrl: 'https://example.com/video.mp4',
        assetId: 'existing-asset-id',
        clientId: mockClientId,
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Add job to active jobs
      (imageToVideoService as any).activeJobs.set(mockJobId, job);
      
      // Mock the saveVideoToAssets method
      const mockSaveVideoToAssets = jest.spyOn(imageToVideoService as any, 'saveVideoToAssets')
        .mockResolvedValue(undefined);
      
      // Update the job (which should not trigger asset saving)
      await (imageToVideoService as any).updateJobStatus(mockJobId, {
        progress: 100
      });
      
      // Verify saveVideoToAssets was not called
      expect(mockSaveVideoToAssets).not.toHaveBeenCalled();
    });
  });
});
