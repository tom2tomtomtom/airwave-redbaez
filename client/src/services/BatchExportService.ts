import { AssetCombination } from '../components/matrix/MatrixCombinationGrid';
import apiClient from '../api/apiClient';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

/**
 * Service for batch exporting matrix combinations to different platforms and formats
 */
class BatchExportService {
  private static instance: BatchExportService;
  
  // Export targets
  private readonly EXPORT_TARGETS = {
    DOWNLOAD: 'download',
    FACEBOOK: 'facebook',
    INSTAGRAM: 'instagram',
    TWITTER: 'twitter',
    TIKTOK: 'tiktok',
    LINKEDIN: 'linkedin'
  };
  
  private constructor() {}
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): BatchExportService {
    if (!BatchExportService.instance) {
      BatchExportService.instance = new BatchExportService();
    }
    return BatchExportService.instance;
  }
  
  /**
   * Export a single combination to a specified target
   * 
   * @param combination The combination to export
   * @param target Optional target platform (defaults to download)
   * @returns Promise resolving when export is complete
   */
  public async exportCombination(
    combination: AssetCombination,
    target: string = this.EXPORT_TARGETS.DOWNLOAD
  ): Promise<boolean> {
    try {
      if (combination.status !== 'completed' || !combination.previewUrl) {
        console.error('Cannot export incomplete combination');
        return false;
      }
      
      // If download, fetch the media and save it
      if (target === this.EXPORT_TARGETS.DOWNLOAD) {
        return this.downloadCombination(combination);
      }
      
      // For social media platforms, use the API to schedule a post
      return await this.exportToSocialMedia(combination, target);
    } catch (error) {
      console.error('Error exporting combination:', error);
      return false;
    }
  }
  
  /**
   * Export multiple combinations at once
   * 
   * @param combinations Array of combinations to export
   * @param target Optional target platform (defaults to download)
   * @returns Promise resolving to array of results
   */
  public async exportMultipleCombinations(
    combinations: AssetCombination[],
    target: string = this.EXPORT_TARGETS.DOWNLOAD
  ): Promise<{ success: boolean; combinationId: string }[]> {
    // Filter to only completed combinations
    const completedCombinations = combinations.filter(
      c => c.status === 'completed' && c.previewUrl
    );
    
    if (completedCombinations.length === 0) {
      console.warn('No completed combinations to export');
      return [];
    }
    
    // If downloading, create a zip file with all combinations
    if (target === this.EXPORT_TARGETS.DOWNLOAD) {
      const zipResult = await this.downloadAsZip(completedCombinations);
      return completedCombinations.map(c => ({
        success: zipResult,
        combinationId: c.id
      }));
    }
    
    // For social media, export each one individually
    const results = await Promise.all(
      completedCombinations.map(async (combination) => {
        const success = await this.exportCombination(combination, target);
        return { success, combinationId: combination.id };
      })
    );
    
    return results;
  }
  
  /**
   * Download a single combination
   * 
   * @param combination The combination to download
   * @returns Promise resolving to success status
   */
  private async downloadCombination(combination: AssetCombination): Promise<boolean> {
    try {
      if (!combination.previewUrl) return false;
      
      // Extract file extension from URL or default to mp4 for video
      const hasVideo = Object.values(combination.assets).some(a => a?.type === 'video');
      const extension = hasVideo ? 'mp4' : 'jpg';
      
      // Use proxy to avoid CORS issues when fetching preview URL
      const response = await apiClient.get(`/api/proxy-media?url=${encodeURIComponent(combination.previewUrl)}`, {
        responseType: 'blob'
      });
      
      // Create a good filename based on combination ID and contents
      const filename = `matrix_${combination.id.slice(0, 8)}.${extension}`;
      
      // Save the blob using file-saver
      saveAs(new Blob([response.data]), filename);
      
      return true;
    } catch (error) {
      console.error('Error downloading combination:', error);
      return false;
    }
  }
  
  /**
   * Download multiple combinations as a zip file
   * 
   * @param combinations The combinations to download
   * @returns Promise resolving to success status
   */
  private async downloadAsZip(combinations: AssetCombination[]): Promise<boolean> {
    try {
      const zip = new JSZip();
      const folder = zip.folder('matrix_exports');
      
      if (!folder) {
        console.error('Failed to create zip folder');
        return false;
      }
      
      // Process each combination
      for (const combination of combinations) {
        if (!combination.previewUrl) continue;
        
        // Use proxy to avoid CORS issues
        const response = await apiClient.get(`/api/proxy-media?url=${encodeURIComponent(combination.previewUrl)}`, {
          responseType: 'blob'
        });
        
        // Determine file extension
        const hasVideo = Object.values(combination.assets).some(a => a?.type === 'video');
        const extension = hasVideo ? 'mp4' : 'jpg';
        
        // Add to zip with a descriptive filename
        folder.file(`matrix_${combination.id.slice(0, 8)}.${extension}`, response.data);
      }
      
      // Generate the zip file
      const content = await zip.generateAsync({ type: 'blob' });
      
      // Save the zip file with a timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      saveAs(content, `matrix_export_${timestamp}.zip`);
      
      return true;
    } catch (error) {
      console.error('Error creating zip export:', error);
      return false;
    }
  }
  
  /**
   * Export a combination to social media
   * 
   * @param combination The combination to export
   * @param platform The social media platform to export to
   * @returns Promise resolving to success status
   */
  private async exportToSocialMedia(
    combination: AssetCombination,
    platform: string
  ): Promise<boolean> {
    try {
      // Make API call to export to social media platform
      const response = await apiClient.post('/api/social/export', {
        combinationId: combination.id,
        platform,
        assetIds: Object.values(combination.assets)
          .filter(asset => asset !== null)
          .map(asset => asset!.id)
      });
      
      return response.data.success;
    } catch (error) {
      console.error(`Error exporting to ${platform}:`, error);
      return false;
    }
  }
  
  /**
   * Get available export targets
   * 
   * @returns Object containing export target constants
   */
  public getExportTargets(): Record<string, string> {
    return { ...this.EXPORT_TARGETS };
  }
}

// Export the singleton instance
export const batchExportService = BatchExportService.getInstance();
