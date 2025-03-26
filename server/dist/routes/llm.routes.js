"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const llmService_1 = require("../services/llmService");
const documentService_1 = require("../services/documentService");
const router = express_1.default.Router();
// Configure multer for memory storage (files will be in buffer)
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB file size limit
    },
});
// Process a client brief to generate motivations
router.post('/parse-brief', auth_middleware_1.checkAuth, async (req, res) => {
    try {
        const partialBriefData = req.body;
        let briefData = partialBriefData;
        // Log received data for debugging
        console.log('Received brief data:', JSON.stringify(partialBriefData, null, 2));
        // Check if there are missing required fields
        const missingFields = [];
        if (!briefData.clientName)
            missingFields.push('clientName');
        if (!briefData.projectName)
            missingFields.push('projectName');
        if (!briefData.productDescription)
            missingFields.push('productDescription');
        if (!briefData.targetAudience)
            missingFields.push('targetAudience');
        if (!briefData.campaignObjectives)
            missingFields.push('campaignObjectives');
        const hasMissingFields = missingFields.length > 0;
        // Log missing fields for debugging
        if (hasMissingFields) {
            console.log('Missing fields:', missingFields.join(', '));
        }
        // If any fields are missing, try to use analyzeBriefText to fill them
        if (hasMissingFields && briefData.fullText) {
            console.log('Brief has missing fields but contains fullText. Attempting to extract missing fields...');
            try {
                briefData = await llmService_1.llmService.analyzeBriefText(briefData.fullText, partialBriefData);
                console.log('Fields extracted successfully. Updated brief data:', JSON.stringify(briefData, null, 2));
            }
            catch (extractionError) {
                console.error('Error extracting fields from text:', extractionError);
                // Continue with whatever we have, the main processBrief will fail if critical fields are still missing
            }
        }
        else if (hasMissingFields) {
            return res.status(400).json({
                success: false,
                message: `Missing required brief fields: ${missingFields.join(', ')}. Please provide these fields or upload a document with this information.`
            });
        }
        // Process brief and generate motivations
        const motivations = await llmService_1.llmService.processBrief(briefData);
        res.json({
            success: true,
            data: {
                motivations
            }
        });
    }
    catch (error) {
        console.error('Error processing brief:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process brief',
            error: error.message
        });
    }
});
// Regenerate motivations based on feedback
router.post('/regenerate-motivations', auth_middleware_1.checkAuth, async (req, res) => {
    try {
        const { briefData, feedback } = req.body;
        if (!briefData || !feedback) {
            return res.status(400).json({
                success: false,
                message: 'Both brief data and feedback are required'
            });
        }
        // Regenerate motivations with feedback
        const motivations = await llmService_1.llmService.regenerateMotivations(briefData, feedback);
        res.json({
            success: true,
            data: {
                motivations
            }
        });
    }
    catch (error) {
        console.error('Error regenerating motivations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to regenerate motivations',
            error: error.message
        });
    }
});
// Process uploaded brief document and directly generate motivations
router.post('/process-brief-document', auth_middleware_1.checkAuth, upload.single('brief'), async (req, res) => {
    try {
        // Check if a file was uploaded
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
        console.log(`Processing ${req.file.originalname} for motivation generation...`);
        // Extract text from the document
        let extractedText = '';
        try {
            const fileBuffer = req.file.buffer;
            extractedText = await documentService_1.documentService.extractTextFromDocument(fileBuffer, fileExt);
            console.log('Extracted text length:', extractedText.length, 'characters');
            if (!extractedText || extractedText.length < 50) { // Arbitrary minimum length
                return res.status(400).json({
                    success: false,
                    message: 'Could not extract enough text from the document. Please check the file and try again.'
                });
            }
        }
        catch (extractionError) {
            console.error('Document text extraction error:', extractionError);
            return res.status(400).json({
                success: false,
                message: 'Failed to extract text from the document. Please try a different format.'
            });
        }
        // Create a minimal brief data object from the extracted text
        let briefData = {
            clientName: '',
            projectName: '',
            productDescription: extractedText.substring(0, 500), // Use the beginning of the text as product description
            fullText: extractedText // Pass the full text for context
        };
        // Try to extract client and project names if possible
        const clientMatch = extractedText.match(/client[\s:]+([^\n\r]+)/i);
        if (clientMatch && clientMatch[1]) {
            briefData.clientName = clientMatch[1].trim();
        }
        const projectMatch = extractedText.match(/project[\s:]+([^\n\r]+)/i);
        if (projectMatch && projectMatch[1]) {
            briefData.projectName = projectMatch[1].trim();
        }
        console.log('Extracted minimal brief data, using LLM to fill in missing fields...');
        try {
            // Use LLM to fill in missing required fields from the extracted text
            const completeBriefData = await llmService_1.llmService.analyzeBriefText(extractedText, {
                ...briefData,
                // Provide empty strings for required fields to ensure they're filled
                targetAudience: '',
                competitiveContext: '',
                campaignObjectives: '',
                keyMessages: '',
                mandatories: ''
            });
            console.log('Generated complete brief data, now generating motivations...');
            // Process the complete brief data to generate motivations
            const motivations = await llmService_1.llmService.processBrief(completeBriefData);
            // Return both the enhanced brief data and the generated motivations
            return res.json({
                success: true,
                data: {
                    briefData: completeBriefData, // Send enhanced brief data
                    motivations // Send generated motivations
                }
            });
        }
        catch (err) {
            console.error('Error generating motivations:', err);
            return res.status(500).json({
                success: false,
                message: `Failed to generate motivations: ${err.message || 'Unknown error'}`
            });
        }
    }
    catch (error) {
        console.error('Error processing brief document:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process document',
            error: error.message
        });
    }
});
router.post('/generate-copy', auth_middleware_1.checkAuth, async (req, res) => {
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
        const copyVariations = await llmService_1.llmService.generateCopy(copyRequest, briefData, motivations);
        res.json({
            success: true,
            data: {
                copyVariations
            }
        });
    }
    catch (error) {
        console.error('Error generating copy:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate copy',
            error: error.message
        });
    }
});
// Status check endpoint
router.get('/status', async (req, res) => {
    try {
        // Check if OpenAI API key is configured
        const apiKey = process.env.OPENAI_API_KEY;
        return res.status(200).json({
            connected: !!apiKey && apiKey.length > 10,
            apiKey: apiKey ? 'configured' : 'missing',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        return res.status(500).json({
            connected: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
exports.default = router;
