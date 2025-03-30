/**
 * Request validation middleware using Joi
 * Provides a consistent approach to validating requests across all routes
 */
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Creates middleware that validates request data against the provided schema
 * 
 * @param schema - Joi schema to validate against
 * @param source - Request property to validate ('body', 'query', 'params')
 * @returns Express middleware function
 */
export const validateRequest = (
  schema: Joi.Schema,
  source: 'body' | 'query' | 'params' = 'body'
): ((req: Request, res: Response, next: NextFunction) => void) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        message: detail.message,
        path: detail.path,
        type: detail.type
      }));

      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errorDetails
      });
    }

    // Replace request data with validated data
    req[source] = value;
    next();
  };
};

/**
 * Common validation schemas that can be reused across routes
 */
export const validationSchemas = {
  // ID validation (UUID format)
  id: Joi.string().uuid().required(),

  // Pagination parameters
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().optional(),
    sortDirection: Joi.string().valid('asc', 'desc').optional().default('asc')
  }),

  // Client ID parameter
  clientId: Joi.string().uuid().required().messages({
    'string.empty': 'Client ID is required',
    'string.uuid': 'Client ID must be a valid UUID'
  }),

  // Asset filters
  assetFilters: Joi.object({
    clientId: Joi.string().uuid().required(),
    search: Joi.string().allow('').optional(),
    type: Joi.string().allow('').optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'name').optional(),
    sortDirection: Joi.string().valid('asc', 'desc').optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    isFavourite: Joi.boolean().optional()
  })
};
