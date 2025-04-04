// server/src/routes/v2/__tests__/assetRoutes.test.ts
import { Request, Response } from 'express';
import assetRoutes from '../assetRoutes';
import { supabase } from '../../../db/supabaseClient';
import { logger } from '../../../utils/logger';

// Mock dependencies
jest.mock('../../../db/supabaseClient', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: { id: 'client-1', client_slug: 'test-client' },
            error: null
          }))
        })),
        order: jest.fn(() => ({
          range: jest.fn(() => Promise.resolve({
            data: [
              {
                id: 'asset-1',
                name: 'Test Asset 1',
                type: 'image',
                url: 'https://example.com/asset1.jpg',
                thumbnail_url: 'https://example.com/asset1-thumb.jpg',
                client_id: 'client-1',
                client_slug: 'test-client',
                is_favourite: false,
                created_at: '2025-04-01T00:00:00Z',
                updated_at: '2025-04-01T00:00:00Z',
                clients: { client_slug: 'test-client' }
              }
            ],
            error: null,
            count: 1
          }))
        }))
      }))
    })
  }
}));

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../../../middleware/auth.middleware', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'user-1', email: 'test@example.com', role: 'admin' };
    next();
  }
}));

describe('Asset Routes', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      user: { id: 'user-1', email: 'test@example.com', role: 'admin' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('GET /v2/assets', () => {
    it('should return assets with proper transformation', async () => {
      // Setup route handler
      const router = assetRoutes;
      
      // Mock Express route execution
      const route = router.stack.find(layer => 
        layer.route && layer.route.path === '/' && layer.route.methods.get
      );
      
      if (!route) {
        throw new Error('Route not found');
      }
      
      // Execute the route handler
      await route.route.stack[1].handle(req as Request, res as Response, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        assets: expect.any(Array),
        total: expect.any(Number)
      });
      
      // Verify Supabase was called correctly
      expect(supabase.from).toHaveBeenCalledWith('assets');
    });

    it('should handle authentication failure', async () => {
      // Setup for unauthenticated request
      req.user = undefined;
      
      // Mock Express route execution
      const router = assetRoutes;
      const route = router.stack.find(layer => 
        layer.route && layer.route.path === '/' && layer.route.methods.get
      );
      
      if (!route) {
        throw new Error('Route not found');
      }
      
      // Execute the route handler
      await route.route.stack[1].handle(req as Request, res as Response, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not properly authenticated'
      });
    });
  });

  describe('GET /v2/assets/by-client/:slug', () => {
    it('should return assets for a specific client', async () => {
      // Setup request with client slug
      req.params = { slug: 'test-client' };
      
      // Mock Express route execution
      const router = assetRoutes;
      const route = router.stack.find(layer => 
        layer.route && layer.route.path === '/by-client/:slug' && layer.route.methods.get
      );
      
      if (!route) {
        throw new Error('Route not found');
      }
      
      // Execute the route handler
      await route.route.stack[1].handle(req as Request, res as Response, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        assets: expect.any(Array),
        total: expect.any(Number)
      });
      
      // Verify Supabase was called correctly
      expect(supabase.from).toHaveBeenCalledWith('clients');
    });

    it('should handle client not found', async () => {
      // Setup for client not found
      req.params = { slug: 'non-existent-client' };
      
      // Mock Supabase to return error for client lookup
      jest.spyOn(supabase, 'from').mockImplementationOnce(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: null,
              error: { code: 'PGRST116', message: 'Not found' }
            }))
          }))
        }))
      }));
      
      // Mock Express route execution
      const router = assetRoutes;
      const route = router.stack.find(layer => 
        layer.route && layer.route.path === '/by-client/:slug' && layer.route.methods.get
      );
      
      if (!route) {
        throw new Error('Route not found');
      }
      
      // Execute the route handler
      await route.route.stack[1].handle(req as Request, res as Response, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('not found')
      });
    });
  });
});
