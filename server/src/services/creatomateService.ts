import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const CREATOMATE_API_KEY = process.env.CREATOMATE_API_KEY;
const CREATOMATE_BASE_URL = 'https://api.creatomate.com/v1';

/**
 * Service class for interacting with the Creatomate API
 */
export class CreatomateService {
  private apiKey: string;
  private baseUrl: string;
  private isPrototypeMode: boolean;

  constructor() {
    this.apiKey = CREATOMATE_API_KEY || '';
    this.baseUrl = CREATOMATE_BASE_URL;
    this.isPrototypeMode = process.env.PROTOTYPE_MODE === 'true';

    if (!this.apiKey && !this.isPrototypeMode) {
      console.warn('No Creatomate API key provided. Set CREATOMATE_API_KEY environment variable.');
    }
  }

  /**
   * Get a list of templates from Creatomate
   */
  async listTemplates() {
    if (this.isPrototypeMode) {
      return this.getMockTemplates();
    }

    try {
      const response = await axios.get(`${this.baseUrl}/templates`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching templates from Creatomate:', error);
      throw error;
    }
  }

  /**
   * Get a specific template by ID
   */
  async getTemplate(templateId: string) {
    if (this.isPrototypeMode) {
      return this.getMockTemplates().find(t => t.id === templateId);
    }

    try {
      const response = await axios.get(`${this.baseUrl}/templates/${templateId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching template ${templateId} from Creatomate:`, error);
      throw error;
    }
  }

  /**
   * Create a video render from a template
   */
  async renderVideo(templateId: string, modifications: any) {
    if (this.isPrototypeMode) {
      // Simulate a render job
      const renderId = 'mock-render-' + Math.random().toString(36).substr(2, 9);
      
      // Store this in-memory for the prototype
      // In production, you'd save this to a database
      return {
        id: renderId,
        status: 'queued',
        url: null,
        thumbnailUrl: null,
        progress: 0,
        createdAt: new Date().toISOString()
      };
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/renders`,
        {
          source: { id: templateId },
          modifications
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error rendering video with Creatomate:', error);
      throw error;
    }
  }

  /**
   * Get the status of a render
   */
  async getRenderStatus(renderId: string) {
    if (this.isPrototypeMode) {
      // Simulate render progress for prototype
      const progress = Math.random() * 100;
      const status = progress < 100 ? 'processing' : 'completed';
      
      return {
        id: renderId,
        status,
        url: status === 'completed' ? 'https://example.com/mock-video.mp4' : null,
        thumbnailUrl: status === 'completed' ? 'https://example.com/mock-thumbnail.jpg' : null,
        progress: Math.min(100, Math.round(progress)),
        createdAt: new Date().toISOString()
      };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/renders/${renderId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching render status for ${renderId} from Creatomate:`, error);
      throw error;
    }
  }

  /**
   * Generate a preview URL
   */
  async generatePreview(templateId: string, modifications: any) {
    if (this.isPrototypeMode) {
      // Return a mock preview URL
      return {
        url: 'https://example.com/mock-preview.mp4'
      };
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/previews`,
        {
          source: { id: templateId },
          modifications
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error generating preview with Creatomate:', error);
      throw error;
    }
  }

  /**
   * Get mock templates for prototype mode
   */
  private getMockTemplates() {
    return [
      {
        id: 'template-1',
        name: 'Product Showcase Square',
        description: 'A dynamic template for showcasing products with animated text overlays.',
        thumbnailUrl: 'https://via.placeholder.com/500x500?text=Product+Showcase',
        previewUrl: 'https://example.com/mock-preview-1.mp4',
        format: 'square',
        width: 1080,
        height: 1080,
        duration: '15s',
        createdAt: '2024-01-15T00:00:00Z',
        parameters: [
          {
            name: 'productImage',
            description: 'Main product image',
            type: 'image',
            required: true
          },
          {
            name: 'productName',
            description: 'Name of the product',
            type: 'text',
            required: true
          },
          {
            name: 'tagline',
            description: 'Short product tagline',
            type: 'text',
            required: false
          },
          {
            name: 'backgroundColor',
            description: 'Background color',
            type: 'color',
            default: '#ffffff',
            required: false
          }
        ]
      },
      {
        id: 'template-2',
        name: 'Brand Story Vertical',
        description: 'Vertical video template for telling your brand story with multiple scenes.',
        thumbnailUrl: 'https://via.placeholder.com/500x889?text=Brand+Story',
        previewUrl: 'https://example.com/mock-preview-2.mp4',
        format: 'portrait',
        width: 1080,
        height: 1920,
        duration: '30s',
        createdAt: '2024-01-20T00:00:00Z',
        parameters: [
          {
            name: 'logo',
            description: 'Brand logo image',
            type: 'image',
            required: true
          },
          {
            name: 'storyVideo',
            description: 'Main brand story video',
            type: 'video',
            required: true
          },
          {
            name: 'brandName',
            description: 'Your brand name',
            type: 'text',
            required: true
          },
          {
            name: 'voiceover',
            description: 'Voiceover narration',
            type: 'audio',
            required: false
          }
        ]
      },
      {
        id: 'template-3',
        name: 'Product Demo Landscape',
        description: 'Landscape video for detailed product demonstrations and features.',
        thumbnailUrl: 'https://via.placeholder.com/800x450?text=Product+Demo',
        previewUrl: 'https://example.com/mock-preview-3.mp4',
        format: 'landscape',
        width: 1920,
        height: 1080,
        duration: '45s',
        createdAt: '2024-02-05T00:00:00Z',
        parameters: [
          {
            name: 'demoVideo',
            description: 'Product demonstration video',
            type: 'video',
            required: true
          },
          {
            name: 'productImage',
            description: 'Product image for title card',
            type: 'image',
            required: true
          },
          {
            name: 'title',
            description: 'Video title',
            type: 'text',
            required: true
          },
          {
            name: 'features',
            description: 'List of features (comma separated)',
            type: 'text',
            required: false
          }
        ]
      },
      {
        id: 'template-4',
        name: 'Instagram Story',
        description: 'Vertical video designed for Instagram Stories with interactive elements.',
        thumbnailUrl: 'https://via.placeholder.com/500x889?text=IG+Story',
        previewUrl: 'https://example.com/mock-preview-4.mp4',
        format: 'story',
        width: 1080,
        height: 1920,
        duration: '15s',
        createdAt: '2024-02-15T00:00:00Z',
        parameters: [
          {
            name: 'backgroundImage',
            description: 'Story background image',
            type: 'image',
            required: true
          },
          {
            name: 'headline',
            description: 'Main headline text',
            type: 'text',
            required: true
          },
          {
            name: 'callToAction',
            description: 'Call to action text',
            type: 'text',
            required: true
          }
        ]
      },
      {
        id: 'template-5',
        name: 'YouTube Pre-roll',
        description: 'Attention-grabbing pre-roll video for YouTube advertising.',
        thumbnailUrl: 'https://via.placeholder.com/800x450?text=YouTube+Ad',
        previewUrl: 'https://example.com/mock-preview-5.mp4',
        format: 'landscape',
        width: 1920,
        height: 1080,
        duration: '6s',
        createdAt: '2024-03-01T00:00:00Z',
        parameters: [
          {
            name: 'adVideo',
            description: 'Main advertisement video',
            type: 'video',
            required: true
          },
          {
            name: 'logo',
            description: 'Brand logo',
            type: 'image',
            required: true
          },
          {
            name: 'skipText',
            description: 'Text to show during skip countdown',
            type: 'text',
            default: 'Your Ad Starts in...',
            required: false
          }
        ]
      }
    ];
  }
}

export default CreatomateService;