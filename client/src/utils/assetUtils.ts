/**
 * Utility functions for handling assets
 */

/**
 * Returns a complete URL for an asset, ensuring the URL is absolute
 * @param url The asset URL from the API
 * @returns The complete URL that can be used in src attributes
 */
export const getAssetUrl = (url?: string): string => {
  // Return placeholder if URL is undefined
  if (!url) {
    return '/placeholder-image.png'; // You may want to create this placeholder image
  }
  
  // Return if already absolute URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Check if it's a relative URL starting with '/'
  if (url.startsWith('/')) {
    const baseURL = process.env.REACT_APP_SERVER_URL || 'http://localhost:3002';
    return `${baseURL}${url}`;
  }
  
  // If it doesn't start with '/', assume it's a relative path and add '/'
  const baseURL = process.env.REACT_APP_SERVER_URL || 'http://localhost:3002';
  return `${baseURL}/${url}`;
};
