import { AssetCombination } from '../components/matrix/MatrixCombinationGrid';
import apiClient from '../api/apiClient';

/**
 * Service for optimising and ranking asset combinations based on engagement metrics
 * and historical performance data.
 */
class CombinationOptimizer {
  private static instance: CombinationOptimizer;
  
  private constructor() {}
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): CombinationOptimizer {
    if (!CombinationOptimizer.instance) {
      CombinationOptimizer.instance = new CombinationOptimizer();
    }
    return CombinationOptimizer.instance;
  }
  
  /**
   * Optimise a set of combinations by calculating engagement scores
   * based on historical performance data and asset metadata
   * 
   * @param combinations Array of asset combinations to optimise
   * @param clientId Client ID for retrieving relevant performance data
   * @param campaignId Optional campaign ID to narrow down the performance data
   * @returns Promise resolving to the optimised combinations with engagement scores
   */
  public async optimiseCombinations(
    combinations: AssetCombination[],
    clientId: string,
    campaignId?: string
  ): Promise<AssetCombination[]> {
    try {
      // First, check if we have any completed combinations to analyse
      const completedCombinations = combinations.filter(
        c => c.status === 'completed' && c.previewUrl
      );
      
      if (completedCombinations.length === 0) {
        console.warn('No completed combinations to optimise');
        return combinations;
      }
      
      // Prepare combination data for the optimisation request
      const combinationData = completedCombinations.map(combination => ({
        combinationId: combination.id,
        assetIds: Object.values(combination.assets)
          .filter(asset => asset !== null)
          .map(asset => asset!.id)
      }));
      
      // Call the API to get optimisation recommendations
      const response = await apiClient.post('/api/analytics/optimise-combinations', {
        clientId,
        campaignId,
        combinations: combinationData
      });
      
      // Map the scores back to the combinations
      const scores = response.data.data.scores || {};
      
      // Update combinations with engagement scores
      return combinations.map(combination => {
        if (scores[combination.id]) {
          return {
            ...combination,
            engagementScore: scores[combination.id]
          };
        }
        return combination;
      });
      
    } catch (error) {
      console.error('Error optimising combinations:', error);
      
      // Fallback to simple heuristic optimisation if API fails
      return this.fallbackOptimise(combinations);
    }
  }
  
  /**
   * Fallback method for optimising combinations when the API is unavailable
   * Uses simple heuristics based on asset metadata
   * 
   * @param combinations Array of asset combinations to optimise
   * @returns The combinations with estimated engagement scores
   */
  private fallbackOptimise(combinations: AssetCombination[]): AssetCombination[] {
    console.log('Using fallback optimisation method with heuristics');
    
    return combinations.map(combination => {
      // Only process completed combinations
      if (combination.status !== 'completed') {
        return combination;
      }
      
      // Calculate a basic score based on asset diversity
      const assets = Object.values(combination.assets).filter(a => a !== null);
      const uniqueTypes = new Set(assets.map(asset => asset!.type));
      
      // Simple heuristic: more diverse asset types tend to perform better
      // Also prioritise combinations with videos as they typically have higher engagement
      const diversityFactor = uniqueTypes.size / Object.keys(combination.assets).length;
      const hasVideo = assets.some(asset => asset!.type === 'video');
      
      // Generate a score between 0-1
      // This is just a placeholder for the real algorithm that would use actual metrics
      const baseScore = 0.4 + (diversityFactor * 0.3) + (hasVideo ? 0.2 : 0);
      
      // Add some randomness to simulate varying performance data
      const randomFactor = Math.random() * 0.1;
      
      return {
        ...combination,
        engagementScore: Math.min(1, baseScore + randomFactor)
      };
    });
  }
  
  /**
   * Get detailed performance metrics for a specific combination
   * 
   * @param combinationId The ID of the combination to analyse
   * @returns Promise resolving to detailed performance metrics
   */
  public async getPerformanceMetrics(combinationId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/api/analytics/combination-metrics/${combinationId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      return {
        error: 'Failed to fetch performance metrics',
        metrics: {}
      };
    }
  }
  
  /**
   * Compare performance between multiple combinations
   * 
   * @param combinationIds Array of combination IDs to compare
   * @returns Promise resolving to comparative performance data
   */
  public async comparePerformance(combinationIds: string[]): Promise<any> {
    try {
      const response = await apiClient.post('/api/analytics/compare-combinations', {
        combinationIds
      });
      return response.data.data;
    } catch (error) {
      console.error('Error comparing combination performance:', error);
      return {
        error: 'Failed to compare combinations',
        compareData: {}
      };
    }
  }
}

// Export the singleton instance
export const combinationOptimizer = CombinationOptimizer.getInstance();
