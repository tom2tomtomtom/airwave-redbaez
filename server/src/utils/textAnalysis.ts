/**
 * Text analysis utilities for extracting insights from text content
 */

import logger from './logger';

/**
 * Extract keywords from text using basic natural language processing techniques
 * 
 * @param text The text to analyze
 * @returns Array of keywords extracted from the text
 */
export async function extractKeywordsFromText(text: string): Promise<string[]> {
  // Simple implementation to extract keywords
  try {
    // Remove special characters and convert to lowercase
    const cleanText = text.toLowerCase().replace(/[^\w\s]/gi, ' ');
    
    // Split into words
    const words = cleanText.split(/\s+/).filter(word => word.length > 2);
    
    // Define stopwords (common words to exclude)
    const stopwords = new Set([
      'the', 'and', 'for', 'with', 'from', 'this', 'that', 'these', 'those',
      'there', 'their', 'they', 'what', 'when', 'who', 'how', 'why', 'where',
      'which', 'will', 'would', 'could', 'should', 'into', 'more', 'some',
      'such', 'than', 'then', 'them', 'very', 'just', 'about', 'over'
    ]);
    
    // Filter out stopwords and get unique keywords
    const keywords = Array.from(new Set(
      words.filter(word => !stopwords.has(word))
    ));
    
    // Limit to top 10 keywords
    return keywords.slice(0, 10);
  } catch (error) {
    logger.error(`Error extracting keywords: ${error.message}`);
    return [];
  }
}

/**
 * Analyze sentiment of text (positive, negative, neutral)
 * 
 * @param text Text to analyze
 * @returns Sentiment score (-1 to 1) and label
 */
export function analyzeSentiment(text: string): { score: number; label: 'positive' | 'negative' | 'neutral' } {
  // This is a placeholder for a more sophisticated sentiment analysis
  // In a production environment, consider using a dedicated NLP library or API
  
  // Simple word-based sentiment dictionary
  const positiveWords = new Set([
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'beautiful', 'happy',
    'cheerful', 'joy', 'love', 'perfect', 'awesome', 'fantastic', 'impressive'
  ]);
  
  const negativeWords = new Set([
    'bad', 'terrible', 'awful', 'horrible', 'poor', 'sad', 'angry', 'upset',
    'hate', 'dislike', 'disappointing', 'worst', 'ugly', 'failure'
  ]);
  
  // Clean and tokenize text
  const words = text.toLowerCase().replace(/[^\w\s]/gi, ' ').split(/\s+/);
  
  // Count positive and negative words
  let positiveCount = 0;
  let negativeCount = 0;
  
  words.forEach(word => {
    if (positiveWords.has(word)) positiveCount++;
    if (negativeWords.has(word)) negativeCount++;
  });
  
  // Calculate sentiment score (-1 to 1)
  const totalSentimentWords = positiveCount + negativeCount;
  if (totalSentimentWords === 0) return { score: 0, label: 'neutral' };
  
  const score = (positiveCount - negativeCount) / totalSentimentWords;
  
  // Determine sentiment label
  let label: 'positive' | 'negative' | 'neutral';
  if (score > 0.2) label = 'positive';
  else if (score < -0.2) label = 'negative';
  else label = 'neutral';
  
  return { score, label };
}
