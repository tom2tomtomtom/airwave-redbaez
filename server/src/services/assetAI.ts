import axios from 'axios';
import sharp from 'sharp';
import { ApiError } from '@/utils/ApiError';
import { ErrorCode } from '@/types/errorTypes';
import { Logger } from '@/utils/logger';

/**
 * Service to provide AI-powered asset analysis, tagging and categorisation
 */
export class AssetAIService {
  private static instance: AssetAIService;
  private readonly visionApiKey: string;
  private readonly textAnalysisApiKey: string;
  private readonly logger = new Logger('AssetAIService');

  private constructor() {
    this.visionApiKey = process.env.VISION_API_KEY || '';
    this.textAnalysisApiKey = process.env.TEXT_ANALYSIS_API_KEY || '';
    
    if (!this.visionApiKey || !this.textAnalysisApiKey) {
      this.logger.warn('AI services not fully configured. Some AI features may be unavailable.');
    }
  }

  public static getInstance(): AssetAIService {
    if (!AssetAIService.instance) {
      AssetAIService.instance = new AssetAIService();
    }
    return AssetAIService.instance;
  }

  /**
   * Analyses an image file and extracts tags, categories, and content description
   * @param imagePath Path to image file
   * @returns Object containing analysis results
   */
  public async analyseImage(imagePath: string): Promise<{
    tags: string[];
    categories: string[];
    contentDescription: string;
    dominantColours: string[];
    safetyLabels: Record<string, number>;
  }> {
    try {
      if (!this.visionApiKey) {
        return this.fallbackImageAnalysis(imagePath);
      }

      // Resize image for API if needed
      const imageBuffer = await this.prepareImageForAnalysis(imagePath);
      
      // Convert to base64
      const base64Image = imageBuffer.toString('base64');
      
      // Make API request
      const response = await axios.post(
        'https://vision.googleapis.com/v1/images:annotate',
        {
          requests: [
            {
              image: { content: base64Image },
              features: [
                { type: 'LABEL_DETECTION', maxResults: 15 },
                { type: 'IMAGE_PROPERTIES', maxResults: 5 },
                { type: 'SAFE_SEARCH_DETECTION' },
                { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
              ],
            },
          ],
        },
        {
          headers: { Authorization: `Bearer ${this.visionApiKey}` }
        }
      );

      const data = response.data.responses[0];
      
      // Extract tags from label annotations
      const tags = data.labelAnnotations 
        ? data.labelAnnotations.map(label => label.description.toLowerCase())
        : [];
      
      // Extract dominant colours from image properties
      const dominantColours = data.imagePropertiesAnnotation?.dominantColors?.colors
        ? data.imagePropertiesAnnotation.dominantColors.colors.map(color => 
            this.rgbToHex(color.color.red, color.color.green, color.color.blue)
          )
        : [];
      
      // Detect objects
      const objects = data.localizedObjectAnnotations
        ? data.localizedObjectAnnotations.map(obj => obj.name.toLowerCase())
        : [];
      
      // Add unique objects to tags
      objects.forEach(obj => {
        if (!tags.includes(obj)) {
          tags.push(obj);
        }
      });
      
      // Determine categories based on tags
      const categories = this.categoriseFromTags(tags);
      
      // Extract safety labels
      const safetyLabels = data.safeSearchAnnotation || {};
      
      // Generate content description from tags
      const contentDescription = this.generateDescription(tags, objects);
      
      return {
        tags,
        categories,
        contentDescription,
        dominantColours,
        safetyLabels
      };
    } catch (error) {
      this.logger.error('Error analysing image', error);
      return this.fallbackImageAnalysis(imagePath);
    }
  }
  
  /**
   * Analyses a text document and extracts tags, categories, and content summary
   * @param text Text content to analyse
   * @returns Object containing analysis results
   */
  public async analyseText(text: string): Promise<{
    tags: string[];
    categories: string[];
    summary: string;
    sentimentScore?: number;
    keyPhrases: string[];
  }> {
    try {
      if (!this.textAnalysisApiKey || text.length < 10) {
        return this.fallbackTextAnalysis(text);
      }
      
      // Truncate text if too long
      const truncatedText = text.length > 5000 ? text.substring(0, 5000) : text;
      
      // Make API request to text analysis service
      const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          input: truncatedText,
          model: "text-embedding-3-small"
        },
        {
          headers: {
            'Authorization': `Bearer ${this.textAnalysisApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Extract key phrases using keywords extraction
      const summaryResponse = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that extracts key information from text."
            },
            {
              role: "user",
              content: `Extract the key topics, keywords, and create a short summary of the following text. Also provide a category from the following list: [Marketing, Business, Creative, Technical, Finance, Legal, Other]. Format your response as JSON with the following fields: "keyPhrases", "tags", "categories", "summary". Text to analyse: ${truncatedText}`
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${this.textAnalysisApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Parse the JSON response
      let analysisResult;
      try {
        analysisResult = JSON.parse(summaryResponse.data.choices[0].message.content);
      } catch (e) {
        this.logger.error('Error parsing AI response', e);
        return this.fallbackTextAnalysis(text);
      }
      
      return {
        tags: analysisResult.tags || [],
        categories: analysisResult.categories || [],
        summary: analysisResult.summary || '',
        keyPhrases: analysisResult.keyPhrases || [],
        sentimentScore: 0 // Default neutral sentiment
      };
    } catch (error) {
      this.logger.error('Error analysing text', error);
      return this.fallbackTextAnalysis(text);
    }
  }
  
  /**
   * Analyses an audio file and extracts relevant metadata
   * @param audioPath Path to audio file
   * @returns Object containing analysis results
   */
  public async analyseAudio(audioPath: string): Promise<{
    tags: string[];
    categories: string[];
    transcription?: string;
  }> {
    // Audio analysis would be implemented here with a service like Assembly AI
    // For now, return basic tags based on file analysis
    return {
      tags: ['audio'],
      categories: ['audio']
    };
  }
  
  /**
   * Prepares an image for analysis by resizing if needed
   * @param imagePath Path to image file
   * @returns Buffer containing the processed image
   */
  private async prepareImageForAnalysis(imagePath: string): Promise<Buffer> {
    try {
      // Get image metadata
      const metadata = await sharp(imagePath).metadata();
      
      // If image is very large, resize to reduce API costs and improve performance
      if ((metadata.width && metadata.width > 1000) || 
          (metadata.height && metadata.height > 1000)) {
        return await sharp(imagePath)
          .resize(1000, 1000, { fit: 'inside' })
          .toBuffer();
      }
      
      // Otherwise return original image as buffer
      return await sharp(imagePath).toBuffer();
    } catch (error) {
      this.logger.error('Error preparing image for analysis', error);
      throw new ApiError(
        ErrorCode.PROCESSING_ERROR,
        'Error preparing image for analysis'
      );
    }
  }
  
  /**
   * Converts RGB values to hex colour code
   */
  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b]
      .map(x => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('');
  }
  
  /**
   * Determines categories based on tags
   */
  private categoriseFromTags(tags: string[]): string[] {
    const categoryMap: Record<string, string[]> = {
      'people': ['person', 'face', 'portrait', 'man', 'woman', 'child', 'group'],
      'nature': ['landscape', 'tree', 'flower', 'mountain', 'sky', 'water', 'beach'],
      'food': ['food', 'meal', 'fruit', 'vegetable', 'drink', 'breakfast', 'lunch', 'dinner'],
      'buildings': ['building', 'architecture', 'house', 'city', 'skyline', 'office'],
      'animals': ['animal', 'dog', 'cat', 'bird', 'wildlife', 'pet'],
      'transport': ['car', 'vehicle', 'transport', 'bus', 'train', 'plane', 'bike'],
      'technology': ['computer', 'phone', 'technology', 'device', 'screen'],
      'lifestyle': ['fashion', 'clothing', 'style', 'shopping', 'beauty'],
      'business': ['business', 'office', 'meeting', 'professional', 'corporate'],
      'abstract': ['abstract', 'pattern', 'texture', 'background'],
    };
    
    // Map tags to categories
    const categories = new Set<string>();
    
    tags.forEach(tag => {
      for (const [category, keywords] of Object.entries(categoryMap)) {
        if (keywords.some(keyword => tag.includes(keyword))) {
          categories.add(category);
        }
      }
    });
    
    return Array.from(categories);
  }
  
  /**
   * Generates a natural language description from tags and objects
   */
  private generateDescription(tags: string[], objects: string[]): string {
    if (tags.length === 0) {
      return 'Image without identifiable content';
    }
    
    // Generate a description based on top tags
    const topTags = tags.slice(0, 5);
    
    // If we have detected objects, prioritise those in the description
    if (objects.length > 0) {
      const primaryObjects = objects.slice(0, 3);
      return `Image containing ${primaryObjects.join(', ')}, with elements of ${topTags.join(', ')}`;
    }
    
    return `Image featuring ${topTags.join(', ')}`;
  }
  
  /**
   * Fallback method when API is not available
   */
  private async fallbackImageAnalysis(imagePath: string): Promise<{
    tags: string[];
    categories: string[];
    contentDescription: string;
    dominantColours: string[];
    safetyLabels: Record<string, number>;
  }> {
    try {
      // Use sharp to extract basic image information
      const metadata = await sharp(imagePath).metadata();
      
      const tags = [
        metadata.format || 'image',
        metadata.width && metadata.height ? 
          (metadata.width > metadata.height ? 'landscape' : 'portrait') : 'image'
      ];
      
      // Extract dominant colour
      const { dominant } = await sharp(imagePath)
        .resize(100, 100, { fit: 'inside' })
        .stats();
      
      const dominantColour = this.rgbToHex(dominant.r, dominant.g, dominant.b);
      
      return {
        tags,
        categories: ['images'],
        contentDescription: 'Image content (AI analysis unavailable)',
        dominantColours: [dominantColour],
        safetyLabels: {}
      };
    } catch (error) {
      this.logger.error('Error in fallback image analysis', error);
      return {
        tags: ['image'],
        categories: ['images'],
        contentDescription: 'Image content',
        dominantColours: [],
        safetyLabels: {}
      };
    }
  }
  
  /**
   * Fallback text analysis
   */
  private fallbackTextAnalysis(text: string): Promise<{
    tags: string[];
    categories: string[];
    summary: string;
    keyPhrases: string[];
  }> {
    // Simple keyword extraction based on frequency
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    // Count word frequency
    const wordCount: Record<string, number> = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // Get top frequent words as tags
    const tags = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
    
    // Create a simple summary (first 100 characters)
    const summary = text.length > 150 
      ? text.substring(0, 150) + '...'
      : text;
    
    return Promise.resolve({
      tags,
      categories: ['document'],
      summary,
      keyPhrases: tags.slice(0, 5),
    });
  }
}

export const assetAI = AssetAIService.getInstance();
