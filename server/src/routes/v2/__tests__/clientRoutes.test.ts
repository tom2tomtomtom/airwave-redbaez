// server/src/routes/v2/__tests__/clientRoutes.test.ts
import { Request, Response } from 'express';
import clientRoutes from '../clientRoutes';
import { supabase } from '../../../db/supabaseClient';
import { logger } from '../../../utils/logger';

// Mock dependencies
jest.mock('../../../db/supabaseClient', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: { 
              id: 'client-1', 
              client_slug: 'test-client',
              name: 'Test Client',
              logo_url: 'https://example.com/logo.png',
              primary_color: '#ff0000',
              secondary_color: '#0000ff',
              description: 'A test client',
              is_active: true,
              created_at: '2025-04-01T00:00:00Z',
              updated_at: '2025-04-01T00:00:00Z'
            },
            error: null
          }))
        })),
        order: jest.fn(() => Promise.resolve({
          data: [
            { 
              id: 'client-1', 
              client_slug: 'test-client',
              name: 'Test Client',
              logo_url: 'https://example.com/logo.png',
              primary_color: '#ff0000',
              secondary_color: '#0000ff',
              description: 'A test client',
              is_active: true,
              created_at: '2025-04-01T00:00:00Z',
              updated_at: '2025-04-01T00:00:00Z'
            }
          ],
          error: null
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

describe('Client Routes', () => {
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

  describe('GET /v2/clients', () => {
    it('should return clients with proper transformation', async () => {
      // Setup route handler
      const router = clientRoutes;
      
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
        clients: expect.arrayContaining([
          expect.objectContaining({
            slug: 'test-client',
            name: 'Test Client',
            logoUrl: 'https://example.com/logo.png',
            brandColour: '#ff0000',
            secondaryColour: '#0000ff',
            id: 'client-1'
          })
        ])
      });
      
      // Verify Supabase was called correctly
      expect(supabase.from).toHaveBeenCalledWith('clients');
    });

    it('should handle database errors', async () => {
      // Mock Supabase to return error
      jest.spyOn(supabase, 'from').mockImplementationOnce(() => ({
        select: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({
            data: null,
            error: { message: 'Database error' }
          }))
        }))
      }));
      
      // Mock Express route execution
      const router = clientRoutes;
      const route = router.stack.find(layer => 
        layer.route && layer.route.path === '/' && layer.route.methods.get
      );
      
      if (!route) {
        throw new Error('Route not found');
      }
      
      // Execute the route handler
      await route.route.stack[1].handle(req as Request, res as Response, next);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch clients',
        error: 'Database error'
      });
      
      // Verify logger was called with error
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('GET /v2/clients/by-slug/:slug', () => {
    it('should return client by slug with proper transformation', async () => {
      // Setup request with client slug
      req.params = { slug: 'test-client' };
      
      // Mock Express route execution
      const router = clientRoutes;
      const route = router.stack.find(layer => 
        layer.route && layer.route.path === '/by-slug/:slug' && layer.route.methods.get
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
        client: expect.objectContaining({
          slug: 'test-client',
          name: 'Test Client',
          logoUrl: 'https://example.com/logo.png',
          brandColour: '#ff0000',
          secondaryColour: '#0000ff',
          id: 'client-1'
        })
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
      const router = clientRoutes;
      const route = router.stack.find(layer => 
        layer.route && layer.route.path === '/by-slug/:slug' && layer.route.methods.get
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
