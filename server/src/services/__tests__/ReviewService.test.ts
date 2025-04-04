// server/src/services/__tests__/ReviewService.test.ts
import { ReviewService } from '../ReviewService';
import { ApprovalAction, ParticipantStatus, ReviewStatus } from '../../types/review.types';

// Mock the Supabase client
jest.mock('../../utils/supabaseClient', () => ({
  getSupabaseClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: { review_id: 'mock-review-id' }, error: null })),
          maybeSingle: jest.fn(() => Promise.resolve({
            data: {
              id: 'mock-version-id',
              version_number: 1,
              created_at: '2025-04-04T00:00:00Z',
              review: {
                id: 'mock-review-id',
                title: 'Mock Review',
                description: null,
                status: 'in_progress',
                created_at: '2025-04-04T00:00:00Z',
                asset: {
                  id: 'mock-asset-id',
                  name: 'Mock Asset',
                  type: 'image',
                  file_url: 'https://example.com/mock-asset.jpg'
                },
                participants: [{
                  id: 'mock-participant-id',
                  user_id: null,
                  email: 'reviewer@example.com',
                  name: null,
                  status: 'invited',
                  comments: [],
                  approvals: []
                }]
              }
            },
            error: null
          }))
        })),
        in: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ error: null }))
        })),
        order: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: { id: 'mock-comment-id' }, error: null }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null })),
        in: jest.fn(() => Promise.resolve({ error: null }))
      }))
    })),
    rpc: jest.fn((functionName) => {
      if (functionName === 'initiate_review_transaction') {
        return Promise.resolve({
          data: {
            review_id: 'mock-review-id',
            participant_tokens: [
              { participant_id: 'mock-participant-id', token: 'mock-token' }
            ]
          },
          error: null
        });
      } else if (functionName === 'record_review_approval') {
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    })
  }))
}));

// Mock the logger to prevent console output during tests
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('ReviewService', () => {
  let reviewService: ReviewService;

  beforeEach(() => {
    reviewService = new ReviewService();
    jest.clearAllMocks();
  });

  describe('initiateReview', () => {
    it('should successfully initiate a review', async () => {
      const payload = {
        assetId: 'mock-asset-id',
        reviewerEmails: ['reviewer@example.com']
      };
      const clientId = 'mock-client-id';
      const initiatedByUserId = 'mock-user-id';

      const result = await reviewService.initiateReview(payload, clientId, initiatedByUserId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.reviewId).toBe('mock-review-id');
      expect(result.data?.participantTokens).toHaveLength(1);
      expect(result.data?.participantTokens[0].participantId).toBe('mock-participant-id');
      expect(result.data?.participantTokens[0].token).toBe('mock-token');
    });

    it('should return error for missing required fields', async () => {
      const payload = {
        assetId: '',
        reviewerEmails: []
      };
      const clientId = 'mock-client-id';

      const result = await reviewService.initiateReview(payload, clientId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required fields: assetId and at least one reviewerEmail are required.');
    });
  });

  describe('getReviewData', () => {
    it('should successfully fetch review data', async () => {
      const reviewVersionId = 'mock-version-id';
      const reviewParticipantId = 'mock-participant-id';

      const result = await reviewService.getReviewData(reviewVersionId, reviewParticipantId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.reviewId).toBe('mock-review-id');
      expect(result.data?.reviewVersionId).toBe('mock-version-id');
      expect(result.data?.versionNumber).toBe(1);
      expect(result.data?.status).toBe('in_progress');
      expect(result.data?.assetSnapshot).toBeDefined();
      expect(result.data?.assetSnapshot.id).toBe('mock-asset-id');
      expect(result.data?.comments).toHaveLength(0);
    });
  });

  describe('addComment', () => {
    it('should successfully add a comment', async () => {
      const payload = {
        content: 'This is a test comment',
        regionData: { x: 100, y: 100, width: 200, height: 200 }
      };
      const reviewVersionId = 'mock-version-id';
      const reviewParticipantId = 'mock-participant-id';

      const result = await reviewService.addComment(payload, reviewVersionId, reviewParticipantId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.commentId).toBe('mock-comment-id');
    });

    it('should return error for empty comment content', async () => {
      const payload = {
        content: '',
        regionData: { x: 100, y: 100, width: 200, height: 200 }
      };
      const reviewVersionId = 'mock-version-id';
      const reviewParticipantId = 'mock-participant-id';

      const result = await reviewService.addComment(payload, reviewVersionId, reviewParticipantId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Comment content cannot be empty.');
    });
  });

  describe('recordApproval', () => {
    // Mock the Supabase client for the recordApproval test
    beforeEach(() => {
      const mockSupabase = {
        rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
        from: jest.fn((table) => {
          if (table === 'review_versions') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn(() => Promise.resolve({ data: { review_id: 'mock-review-id' }, error: null }))
                }))
              }))
            };
          } else if (table === 'review_participants') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => Promise.resolve({
                  data: [
                    { id: 'participant-1', status: 'approved' },
                    { id: 'participant-2', status: 'approved' }
                  ],
                  error: null
                }))
              }))
            };
          } else if (table === 'reviews') {
            return {
              update: jest.fn(() => ({
                eq: jest.fn(() => Promise.resolve({ error: null }))
              }))
            };
          }
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          };
        })
      };
      
      jest.spyOn(require('../../utils/supabaseClient'), 'getSupabaseClient').mockReturnValue(mockSupabase);
    });

    it('should successfully record an approval and update review status', async () => {
      const payload = {
        reviewVersionId: 'mock-version-id',
        action: 'approved' as ApprovalAction,
        comment: 'Looks good!'
      };
      const reviewVersionId = 'mock-version-id';
      const reviewParticipantId = 'mock-participant-id';

      const result = await reviewService.recordApproval(payload, reviewVersionId, reviewParticipantId);

      expect(result.success).toBe(true);
    });

    it('should return error for missing approval action', async () => {
      const payload = {
        reviewVersionId: 'mock-version-id',
        action: '' as ApprovalAction,
        comment: 'Looks good!'
      };
      const reviewVersionId = 'mock-version-id';
      const reviewParticipantId = 'mock-participant-id';

      const result = await reviewService.recordApproval(payload, reviewVersionId, reviewParticipantId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Approval action is required.');
    });
  });

  describe('getAssetReviewHistory', () => {
    it('should successfully fetch review history', async () => {
      // Mock implementation for this specific test
      const mockFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => Promise.resolve({
                data: [
                  {
                    reviewId: 'mock-review-id',
                    title: 'Mock Review',
                    status: 'approved',
                    createdAt: '2025-04-04T00:00:00Z',
                    initiatedByUser: { email: 'initiator@example.com' },
                    latestVersionNumber: [{ version_number: 1 }],
                    participants: [
                      { email: 'reviewer@example.com', status: 'approved' }
                    ]
                  }
                ],
                error: null
              }))
            }))
          }))
        }))
      }));
      
      jest.spyOn(require('../../utils/supabaseClient'), 'getSupabaseClient').mockReturnValue({
        from: mockFrom
      });

      const assetId = 'mock-asset-id';
      const clientId = 'mock-client-id';

      const result = await reviewService.getAssetReviewHistory(assetId, clientId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockFrom).toHaveBeenCalledWith('reviews');
    });
  });
});
