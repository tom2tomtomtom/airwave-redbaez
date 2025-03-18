import express from 'express';
import { checkAuth } from '../middleware/auth.middleware';
import { signoffService } from '../services/signoffService';

const router = express.Router();

// Create a new signoff session
router.post('/create', checkAuth, async (req, res) => {
  try {
    const { campaignId, title, description, clientEmail, clientName, expiresAt, matrixId, assetIds } = req.body;
    
    if (!campaignId || !clientEmail || !clientName || !assetIds || !assetIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: campaignId, clientEmail, clientName, assetIds'
      });
    }

    // Create a new signoff session
    const session = await signoffService.createSignoffSession({
      campaignId,
      title,
      description,
      clientEmail,
      clientName,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      matrixId
    }, req.user.id);

    // Add assets to the session
    await signoffService.addAssetsToSession(session.id, assetIds);

    res.json({
      success: true,
      message: 'Signoff session created successfully',
      data: { sessionId: session.id }
    });
  } catch (error: any) {
    console.error('Error creating signoff session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create signoff session',
      error: error.message
    });
  }
});

// Send a signoff session to client
router.post('/:id/send', checkAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Send the signoff session
    const session = await signoffService.sendSignoffSession(id);
    
    res.json({
      success: true,
      message: 'Signoff session sent to client successfully',
      data: { 
        sessionId: session.id,
        reviewUrl: session.reviewUrl
      }
    });
  } catch (error: any) {
    console.error('Error sending signoff session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send signoff session',
      error: error.message
    });
  }
});

// Get all signoff sessions for a campaign
router.get('/campaign/:campaignId', checkAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const sessions = await signoffService.listCampaignSignoffSessions(campaignId);
    
    res.json({
      success: true,
      data: sessions
    });
  } catch (error: any) {
    console.error('Error fetching signoff sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch signoff sessions',
      error: error.message
    });
  }
});

// Get a specific signoff session
router.get('/:id', checkAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const session = await signoffService.getSignoffSessionById(id);
    
    res.json({
      success: true,
      data: session
    });
  } catch (error: any) {
    console.error('Error fetching signoff session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch signoff session',
      error: error.message
    });
  }
});

// Client view of signoff session (no auth required, uses access token)
router.get('/client/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.query;
    
    if (!token || typeof token !== 'string') {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }
    
    // Get client view of session
    const sessionView = await signoffService.getClientView(id, token);
    
    if (!sessionView) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired access token'
      });
    }
    
    res.json({
      success: true,
      data: sessionView
    });
  } catch (error: any) {
    console.error('Error fetching client view:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch client view',
      error: error.message
    });
  }
});

// Process client feedback
router.post('/client/:id/feedback', async (req, res) => {
  try {
    const { id } = req.params;
    const { token, feedback, assetStatuses } = req.body;
    
    if (!token || !assetStatuses || !Array.isArray(assetStatuses)) {
      return res.status(400).json({
        success: false,
        message: 'Token and asset statuses are required'
      });
    }
    
    // Process client feedback
    const response = await signoffService.processClientFeedback(
      id,
      token,
      feedback || '',
      assetStatuses
    );
    
    if (!response) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired access token'
      });
    }
    
    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      data: response
    });
  } catch (error: any) {
    console.error('Error processing client feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process feedback',
      error: error.message
    });
  }
});

export default router;
