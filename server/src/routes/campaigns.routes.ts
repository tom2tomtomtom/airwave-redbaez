import express from 'express';
import { checkAuth, checkAdmin } from '../middleware/auth.middleware';

const router = express.Router();

// GET - Get all campaigns (with filtering)
router.get('/', checkAuth, async (req, res) => {
  try {
    const { 
      clientId, 
      status, 
      fromDate, 
      toDate,
      platform
    } = req.query;
    
    // Mock campaigns data - In production this would come from Supabase
    const campaigns = [
      {
        id: '1',
        name: 'Summer Collection Launch',
        clientId: '101',
        clientName: 'Nike',
        startDate: '2025-05-01',
        endDate: '2025-06-30',
        status: 'active',
        platforms: ['instagram', 'facebook', 'tiktok'],
        budget: 50000,
        description: 'Launch campaign for the new summer collection',
        createdAt: '2025-04-01T10:00:00Z',
        createdBy: 'user123',
        executionCount: 12
      },
      {
        id: '2',
        name: 'Holiday Promotion',
        clientId: '102',
        clientName: 'Adidas',
        startDate: '2025-12-01',
        endDate: '2025-12-31',
        status: 'planning',
        platforms: ['instagram', 'youtube'],
        budget: 75000,
        description: 'End of year holiday promotions',
        createdAt: '2025-09-15T14:30:00Z',
        createdBy: 'user456',
        executionCount: 0
      },
      {
        id: '3',
        name: 'Brand Awareness',
        clientId: '103',
        clientName: 'Coca-Cola',
        startDate: '2025-07-15',
        endDate: '2025-09-30',
        status: 'active',
        platforms: ['facebook', 'youtube', 'tiktok'],
        budget: 120000,
        description: 'Increase brand awareness among Gen Z',
        createdAt: '2025-06-10T09:15:00Z',
        createdBy: 'user789',
        executionCount: 8
      }
    ];
    
    // Apply filters if provided
    let filteredCampaigns = [...campaigns];
    
    if (clientId) {
      filteredCampaigns = filteredCampaigns.filter(c => c.clientId === clientId);
    }
    
    if (status) {
      filteredCampaigns = filteredCampaigns.filter(c => c.status === status);
    }
    
    if (fromDate) {
      const fromDateObj = new Date(fromDate as string);
      filteredCampaigns = filteredCampaigns.filter(c => new Date(c.startDate) >= fromDateObj);
    }
    
    if (toDate) {
      const toDateObj = new Date(toDate as string);
      filteredCampaigns = filteredCampaigns.filter(c => new Date(c.endDate) <= toDateObj);
    }
    
    if (platform) {
      filteredCampaigns = filteredCampaigns.filter(c => 
        c.platforms.includes(platform as string)
      );
    }
    
    res.json({
      success: true,
      data: filteredCampaigns
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaigns',
      error: error.message
    });
  }
});

// GET - Get a specific campaign with all its executions
router.get('/:id', checkAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock campaigns data - In production this would come from Supabase
    const campaigns = [
      {
        id: '1',
        name: 'Summer Collection Launch',
        clientId: '101',
        clientName: 'Nike',
        startDate: '2025-05-01',
        endDate: '2025-06-30',
        status: 'active',
        platforms: ['instagram', 'facebook', 'tiktok'],
        budget: 50000,
        description: 'Launch campaign for the new summer collection',
        createdAt: '2025-04-01T10:00:00Z',
        createdBy: 'user123',
        executions: [
          {
            id: 'exec-1',
            name: 'Instagram Story - Shoes',
            templateId: '1',
            templateName: 'Product Showcase',
            platform: 'instagram',
            format: '9:16',
            status: 'completed',
            assets: {
              product_video: 'asset-123',
              product_name: 'Air Max 2025',
              tagline: 'Step Into the Future'
            },
            outputUrl: 'https://example.com/videos/output-1.mp4',
            createdAt: '2025-04-05T11:30:00Z'
          },
          {
            id: 'exec-2',
            name: 'Facebook Feed - Apparel',
            templateId: '1',
            templateName: 'Product Showcase',
            platform: 'facebook',
            format: '1:1',
            status: 'completed',
            assets: {
              product_video: 'asset-456',
              product_name: 'Tech Fleece Collection',
              tagline: 'Comfort Meets Performance'
            },
            outputUrl: 'https://example.com/videos/output-2.mp4',
            createdAt: '2025-04-06T09:45:00Z'
          }
        ]
      }
    ];
    
    const campaign = campaigns.find(c => c.id === id);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }
    
    res.json({
      success: true,
      data: campaign
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaign',
      error: error.message
    });
  }
});

// POST - Create a new campaign
router.post('/', checkAuth, async (req, res) => {
  try {
    const {
      name,
      clientId,
      clientName,
      startDate,
      endDate,
      platforms,
      description
    } = req.body;
    
    // Validate required fields
    if (!name || !clientId || !clientName || !startDate || !endDate || !platforms) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // In production, this would create a new campaign in your database
    const newCampaign = {
      id: Date.now().toString(),
      name,
      clientId,
      clientName,
      startDate,
      endDate,
      status: 'planning',
      platforms,
      description: description || '',
      budget: req.body.budget || 0,
      createdAt: new Date().toISOString(),
      createdBy: req.user?.id || 'system',
      executionCount: 0,
      executions: []
    };
    
    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      data: newCampaign
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to create campaign',
      error: error.message
    });
  }
});

// PUT - Update a campaign
router.put('/:id', checkAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // In production, this would update the campaign in your database
    // For the prototype, we just return the merged data
    
    res.json({
      success: true,
      message: 'Campaign updated successfully',
      data: {
        id,
        ...updates,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update campaign',
      error: error.message
    });
  }
});

// DELETE - Delete a campaign (admin only)
router.delete('/:id', checkAuth, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // In production, this would delete the campaign from your database
    res.json({
      success: true,
      message: 'Campaign deleted successfully',
      data: { id }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete campaign',
      error: error.message
    });
  }
});

// POST - Add execution to campaign
router.post('/:id/executions', checkAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      templateId,
      platform,
      format,
      assets
    } = req.body;
    
    // Validate required fields
    if (!name || !templateId || !platform || !format || !assets) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // In production, this would create a new execution in your database
    const newExecution = {
      id: `exec-${Date.now()}`,
      name,
      templateId,
      platform,
      format,
      assets,
      status: 'pending',
      createdAt: new Date().toISOString(),
      campaignId: id
    };
    
    res.status(201).json({
      success: true,
      message: 'Execution added to campaign',
      data: newExecution
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to add execution',
      error: error.message
    });
  }
});

export default router;