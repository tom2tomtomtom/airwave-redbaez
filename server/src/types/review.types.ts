// server/src/types/review.types.ts

/**
 * Represents the overall status of a review.
 */
export type ReviewStatus = 'pending' | 'in_progress' | 'changes_requested' | 'approved' | 'rejected';

/**
 * Represents the status of a participant within a review.
 */
export type ParticipantStatus = 'invited' | 'viewed' | 'commented' | 'changes_requested' | 'approved' | 'rejected';

/**
 * Represents the final action taken by a participant.
 */
export type ApprovalAction = 'approved' | 'changes_requested' | 'rejected';

/**
 * Data required to initiate a new review.
 */
export interface InitiateReviewPayload {
  assetId: string;
  reviewerEmails: string[];
  // Potentially add a message or deadline here
}

/**
 * Represents a comment made during a review.
 */
export interface ReviewComment {
  id: string;
  reviewId: string;
  reviewParticipantId: string; // Who made the comment
  content: string; // The actual comment text
  createdAt: string; // ISO timestamp
  authorName?: string; // Optional: Denormalized for easier display (needs population)
  // Add other fields like timestampSeconds or regionData if needed
}

/**
 * Represents an approval action taken during a review.
 */
export interface ReviewApprovalPayload {
  reviewVersionId: string;
  action: ApprovalAction;
  comment?: string;
}

/**
 * Data returned to the external reviewer portal.
 */
export interface ReviewPortalData {
  reviewId: string;
  reviewVersionId: string;
  assetSnapshot: any; // Or details fetched based on asset_version_id
  versionNumber: number;
  status: ReviewStatus;
  comments: ReviewComment[];
  // potentially participant info if needed
}

/**
 * Represents a participant in a review process.
 */
export interface ReviewParticipant {
  id: string;
  reviewId: string;
  email: string;
  status: ParticipantStatus; // e.g., PENDING, COMMENTED, APPROVED
  actionAt: string | null; // ISO timestamp of the last significant action (comment, approval)
  // Consider adding participant name if available/needed
}

/**
 * Context attached to the request object after successful token authentication.
 */
export interface ReviewRequestContext {
  reviewId: string;
  reviewParticipantId: string;
  reviewVersionId: string;
  reviewerEmail: string;
}

import { Request } from 'express';
import { AuthenticatedRequest } from './AuthenticatedRequest';

/**
 * Extends AuthenticatedRequest to include reviewContext populated by reviewAuth middleware.
 */
export interface ReviewAuthenticatedRequest extends AuthenticatedRequest {
  reviewContext?: ReviewRequestContext;
}

/**
 * Payload for adding a comment (used by external reviewer)
 */
export interface AddCommentPayload {
  content: string;
  // Add optional fields like timestampSeconds or regionData if needed
  regionData?: Record<string, any>;
}

/**
 * Information about a participant's history within a specific review summary.
 */
export interface ParticipantHistoryInfo {
  email: string;
  status: ParticipantStatus; // Use existing enum
  actionAt: string | null;
}

/**
 * Represents a summary item for display in the asset's review history list.
 */
export interface ReviewHistoryItem {
  reviewId: string;
  reviewTitle: string; // Note: This seems specific to history view, may not exist on core Review object
  status: ReviewStatus; // Use existing enum
  initiatedAt: string;
  initiatedBy: string; // Consider if this should be user ID/object representation
  participants: ParticipantHistoryInfo[];
  commentsCount: number;
}
