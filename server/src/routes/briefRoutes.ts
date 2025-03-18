import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { briefService } from '../services/briefService';

const router = express.Router();

/**
 * Create a new brief
 * POST /api/briefs
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not properly authenticated'
      });
    }
    
    const { title, content, tags, organisationId } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }
    
    const result = await briefService.createBrief({
      title,
      content,
      userId: req.user.id,
      organisationId,
      tags
    });
    
    return res.status(result.success ? 201 : 500).json(result);
  } catch (error: any) {
    console.error('Error creating brief:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create brief',
      error: error.message
    });
  }
});

/**
 * Get all briefs with optional filtering
 * GET /api/briefs
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not properly authenticated'
      });
    }
    
    // Parse query parameters
    const filters: any = {
      userId: req.user.id // Security: only show briefs for the authenticated user
    };
    
    // Parse optional filters
    if (req.query.organisationId) {
      filters.organisationId = req.query.organisationId as string;
    }
    
    if (req.query.status) {
      filters.status = (req.query.status as string).split(',');
    }
    
    if (req.query.searchTerm) {
      filters.searchTerm = req.query.searchTerm as string;
    }
    
    if (req.query.sortBy) {
      filters.sortBy = req.query.sortBy as any;
    }
    
    if (req.query.sortDirection) {
      filters.sortDirection = req.query.sortDirection as 'asc' | 'desc';
    }
    
    // Pagination
    if (req.query.limit) {
      filters.limit = parseInt(req.query.limit as string, 10);
    }
    
    if (req.query.offset) {
      filters.offset = parseInt(req.query.offset as string, 10);
    }
    
    // Get briefs with filters
    const result = await briefService.getBriefs(filters);
    
    return res.status(result.success ? 200 : 500).json({
      success: result.success,
      message: result.message,
      data: result.data
    });
  } catch (error: any) {
    console.error('Error fetching briefs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch briefs',
      error: error.message
    });
  }
});

/**
 * Get a brief by ID
 * GET /api/briefs/:id
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not properly authenticated'
      });
    }
    
    const { id } = req.params;
    const result = await briefService.getBriefById(id, req.user.id);
    
    return res.status(result.success ? 200 : result.code || 404).json(result);
  } catch (error: any) {
    console.error('Error fetching brief:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch brief',
      error: error.message
    });
  }
});

/**
 * Update a brief
 * PUT /api/briefs/:id
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not properly authenticated'
      });
    }
    
    const { id } = req.params;
    const updates = req.body;
    
    // Validate updates
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No updates provided'
      });
    }
    
    const result = await briefService.updateBrief(id, req.user.id, updates);
    
    return res.status(result.success ? 200 : result.code || 500).json(result);
  } catch (error: any) {
    console.error('Error updating brief:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update brief',
      error: error.message
    });
  }
});

/**
 * Delete a brief
 * DELETE /api/briefs/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not properly authenticated'
      });
    }
    
    const { id } = req.params;
    const result = await briefService.deleteBrief(id, req.user.id);
    
    return res.status(result.success ? 200 : result.code || 500).json(result);
  } catch (error: any) {
    console.error('Error deleting brief:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete brief',
      error: error.message
    });
  }
});

/**
 * Manually trigger brief analysis
 * POST /api/briefs/:id/analyze
 */
router.post('/:id/analyze', authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not properly authenticated'
      });
    }
    
    const { id } = req.params;
    
    // First check if the user has access to this brief
    const briefResult = await briefService.getBriefById(id, req.user.id);
    if (!briefResult.success) {
      return res.status(briefResult.code || 404).json(briefResult);
    }
    
    // Trigger analysis
    const result = await briefService.analyzeBrief(id);
    
    return res.status(result.success ? 200 : result.code || 500).json(result);
  } catch (error: any) {
    console.error('Error analyzing brief:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to analyze brief',
      error: error.message
    });
  }
});

/**
 * Generate content for a brief
 * POST /api/briefs/:id/generate-content
 */
router.post('/:id/generate-content', authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not properly authenticated'
      });
    }
    
    const { id } = req.params;
    const { 
      contentType, 
      count, 
      toneOfVoice, 
      targetLength, 
      additionalInstructions 
    } = req.body;
    
    // Validate required parameters
    if (!contentType || !count) {
      return res.status(400).json({
        success: false,
        message: 'Content type and count are required'
      });
    }
    
    // Validate content type
    const validContentTypes = ['copy', 'headline', 'tagline', 'cta'];
    if (!validContentTypes.includes(contentType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid content type. Must be one of: ${validContentTypes.join(', ')}`
      });
    }
    
    // Validate count
    const countNum = parseInt(count, 10);
    if (isNaN(countNum) || countNum < 1 || countNum > 10) {
      return res.status(400).json({
        success: false,
        message: 'Count must be a number between 1 and 10'
      });
    }
    
    // Generate content
    const result = await briefService.generateContent(
      id,
      req.user.id,
      {
        contentType,
        count: countNum,
        toneOfVoice,
        targetLength,
        additionalInstructions
      }
    );
    
    return res.status(result.success ? 200 : result.code || 500).json(result);
  } catch (error: any) {
    console.error('Error generating content for brief:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate content',
      error: error.message
    });
  }
});

export default router;
