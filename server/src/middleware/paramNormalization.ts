/**
 * Middleware for normalizing request parameters to consistent formats
 * This centralizes parameter handling logic across all routes
 */
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { isValidUuid } from '../utils/uuidUtils';

/**
 * Normalizes client ID parameters from various formats
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export function normalizeClientParams(req: Request, res: Response, next: NextFunction) {
  // Log incoming parameters for debugging
  console.log('Normalizing parameters:', {
    query: req.query,
    params: req.params,
    body: req.body && typeof req.body === 'object' ? 
      Object.keys(req.body).filter(k => k.toLowerCase().includes('client')) : 
      'No relevant body params'
  });
  
  // Collect all possible clientId variants from query, params, and body
  // Create a priority-ordered list of parameter names to check
  const possibleClientIdParams = [
    req.query.clientId, 
    req.query.client_id,
    req.query.selectedClientId,
    req.query.selected_client_id,
    req.params.clientId,
    req.params.client_id,
    req.body?.clientId,
    req.body?.client_id
  ];
  
  // Find the first non-empty client ID value
  const clientIdValue = possibleClientIdParams.find(id => 
    id !== undefined && id !== null && String(id).trim() !== ''
  );
  
  if (clientIdValue) {
    const normalizedClientId = String(clientIdValue).trim();
    
    // Standardize the client ID on the request object for routes to use
    // Store in both query and a custom property for flexibility
    req.query.clientId = normalizedClientId;
    (req as any).normalizedClientId = normalizedClientId;
    
    logger.info(`✅ Normalized client ID: ${normalizedClientId}`);
    
    // Check if it's a UUID or a slug
    if (isValidUuid(normalizedClientId)) {
      logger.info('Client ID is a valid UUID');
    } else {
      logger.info('Client ID appears to be a slug or other format');
    }
  } else {
    logger.info('⚠️ No client ID parameter found');
  }
  
  // Similar handling for other common parameters can be added here
  // For example, normalizing user IDs, asset types, etc.
  
  // Continue to the next middleware or route handler
  next();
}

/**
 * Normalizes pagination parameters
 * @param req Express request object
 * @param res Express response object 
 * @param next Express next function
 */
export function normalizePaginationParams(req: Request, res: Response, next: NextFunction) {
  // Handle limit parameter
  if (req.query.limit) {
    // Ensure limit is a positive integer
    const limit = parseInt(String(req.query.limit), 10);
    req.query.limit = isNaN(limit) || limit <= 0 ? '20' : String(limit);
  }
  
  // Handle offset/page parameters
  if (req.query.offset) {
    // Ensure offset is a non-negative integer
    const offset = parseInt(String(req.query.offset), 10);
    req.query.offset = isNaN(offset) || offset < 0 ? '0' : String(offset);
  } else if (req.query.page) {
    // Convert page to offset if limit exists
    const page = parseInt(String(req.query.page), 10);
    const limit = parseInt(String(req.query.limit || '20'), 10);
    
    if (!isNaN(page) && page > 0) {
      req.query.offset = String((page - 1) * limit);
    }
  }
  
  next();
}

/**
 * Combines all parameter normalization middleware into one
 */
export function normalizeAllParams(req: Request, res: Response, next: NextFunction) {
  // Apply all normalization middleware in sequence
  normalizeClientParams(req, res, () => {
    normalizePaginationParams(req, res, next);
    // Add more normalizers here as needed
  });
}
