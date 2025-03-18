import express from 'express';
import multer from 'multer';
import { checkAuth } from '../middleware/auth.middleware';
import { llmService, BriefData, CopyGenerationRequest } from '../services/llmService';
import { documentService } from '../services/documentService';
import { supabase } from '../db/supabaseClient';

const router = express.Router();

// Configure multer for memory storage (files will be in buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
  },
});

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

// Process uploaded brief document
router.post('/process-brief-document', checkAuth, upload.single('brief'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Check file type
    const fileExt = req.file.originalname.split('.').pop()?.toLowerCase();
    if (!fileExt || !['pdf', 'doc', 'docx', 'txt'].includes(fileExt)) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported file type. Please upload PDF, DOC, DOCX, or TXT files.'
      });
    }

    // Process the document to extract text
    const extractedText = await documentService.processDocument(req.file);
    
    // Extract structured brief data from the text
    const briefData = documentService.extractBriefDataFromText(extractedText);
    
    // Attempt to get additional brief fields using LLM if needed
    let enhancedBriefData = briefData;
    
    if (process.env.USE_LLM_FOR_EXTRACTION === 'true' && extractedText.length > 0) {
      try {
        // Use Supabase Edge Function to analyze the document with LLM
        const { data, error } = await supabase.functions.invoke('analyze-brief-document', {
          body: { text: extractedText }
        });
        
        if (!error && data.briefData) {
          // Merge LLM-extracted data with regex-extracted data, preferring regex where available
          enhancedBriefData = {
            ...data.briefData,
            ...Object.fromEntries(
              Object.entries(briefData)
                .filter(([_, value]) => value !== undefined && value !== '')
            )
          };
        }
      } catch (err) {
        console.error('Error using LLM for document analysis:', err);
        // Continue with regex-only extracted data
      }
    }
    
    res.json({
      success: true,
      data: {
        briefData: enhancedBriefData,
        extractedText
      }
    });
  } catch (error: any) {
    console.error('Error processing brief document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process document',
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