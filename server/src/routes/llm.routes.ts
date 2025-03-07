import express from 'express';
import { checkAuth } from '../middleware/auth.middleware';
import { llmService, BriefData, CopyGenerationRequest } from '../services/llmService';

const router = express.Router();

// Process a client brief to generate motivations
router.post('/parse-brief', checkAuth, async (req, res) => {
  try {
    const briefData: BriefData = req.body;
    
    // Validate required brief fields
    if (!briefData.clientName || !briefData.projectName || !briefData.productDescription || 
        !briefData.targetAudience || !briefData.campaignObjectives) {
      return res.status(400).json({
        success: false,
        message: 'Missing required brief fields'
      });
    }
    
    // Process brief and generate motivations
    const motivations = await llmService.processBrief(briefData);
    
    res.json({
      success: true,
      data: {
        motivations
      }
    });
  } catch (error: any) {
    console.error('Error processing brief:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process brief',
      error: error.message
    });
  }
});

// Regenerate motivations based on feedback
router.post('/regenerate-motivations', checkAuth, async (req, res) => {
  try {
    const { briefData, feedback } = req.body;
    
    if (!briefData || !feedback) {
      return res.status(400).json({
        success: false,
        message: 'Both brief data and feedback are required'
      });
    }
    
    // Regenerate motivations with feedback
    const motivations = await llmService.regenerateMotivations(briefData, feedback);
    
    res.json({
      success: true,
      data: {
        motivations
      }
    });
  } catch (error: any) {
    console.error('Error regenerating motivations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate motivations',
      error: error.message
    });
  }
});

// Generate copy based on selected motivations
router.post('/generate-copy', checkAuth, async (req, res) => {
  try {
    const { copyRequest, briefData, motivations } = req.body;
    
    if (!copyRequest || !briefData || !motivations || !copyRequest.motivationIds || 
        copyRequest.motivationIds.length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters for copy generation'
      });
    }
    
    // Generate copy variations
    const copyVariations = await llmService.generateCopy(
      copyRequest as CopyGenerationRequest,
      briefData as BriefData,
      motivations
    );
    
    res.json({
      success: true,
      data: {
        copyVariations
      }
    });
  } catch (error: any) {
    console.error('Error generating copy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate copy',
      error: error.message
    });
  }
});

export default router;