// server/src/services/ReviewService.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../utils/supabaseClient'; // Corrected import path
import { logger } from '../utils/logger'; // Corrected import path
import { ServiceResult } from '../types/serviceResult';
import { 
  InitiateReviewPayload, 
  ReviewApprovalPayload, 
  AddCommentPayload, 
  ApprovalAction, 
  ParticipantStatus, 
  ReviewPortalData, 
  ReviewStatus, 
  ReviewComment, 
} from '../types/review.types';
import * as crypto from 'crypto';

// Define expected database record structures (replace with actual schema if possible)
interface DbReview {
  id: string;
  asset_id: string;
  client_id: string;
  title: string;
  description?: string;
  status: string; // e.g., 'pending', 'in_progress', 'approved', 'rejected'
  initiated_by_user_id?: string;
  created_at: string;
  updated_at: string;
}

interface DbReviewVersion {
  id: string;
  review_id: string;
  version_number: number;
  // Potentially add fields like snapshot_details if versioning includes asset state
  created_at: string;
}

interface DbReviewParticipant {
  id: string;
  review_id: string;
  user_id?: string; // For internal users
  email?: string; // For external reviewers
  name?: string;
  status: string; // e.g., 'pending', 'viewed', 'commented', 'approved', 'rejected'
  added_at: string;
}

interface DbReviewToken {
  id: string;
  review_participant_id: string;
  token: string;
  expires_at: Date;
  created_at: string;
  used_at?: string;
}

// Define the structure of the data returned by initiateReview
interface InitiateReviewResult {
  reviewId: string;
  participantTokens: { participantId: string; token: string }[];
}

// Explicit type for the complex data structure returned by the getReviewData Supabase query
interface SupabaseReviewData {
  id: string; // review_version_id
  version_number: number;
  created_at: string; // review_version created_at
  review: {
    id: string; // review_id
    title: string;
    description: string | null;
    status: ReviewStatus;
    created_at: string; // review created_at
    asset: {
      id: string;
      name: string;
      type: string; // Consider a stricter AssetType enum if available
      file_url: string;
    } | null;
    participants: Array<{ // Should be exactly one due to the .eq filter
      id: string; // participant_id
      user_id: string | null;
      email: string;
      name: string | null;
      status: ParticipantStatus;
      // Comments might belong to other participants on the same review, need filtering later if required
      comments: Array<{ 
        id: string;
        review_participant_id: string; // Keep participant ID for mapping
        comment_text: string;
        metadata: { ts?: number; region?: Record<string, any> } | null; // JSONB with optional fields
        created_at: string;
      }>;
      approvals: Array<{ // Similar to comments, might need filtering
        id: string;
        review_participant_id: string;
        action: ApprovalAction;
        comment: string | null;
        created_at: string;
      }>;
    }> | null; 
  } | null; 
}

/**
 * Represents the structure of review history data for internal viewing.
 */
export interface ReviewHistoryItem {
  reviewId: string;
  title: string;
  status: ReviewStatus; // Assuming ReviewStatus enum/type exists
  createdAt: string;
  initiatedBy?: string; // Email or name of initiator
  participants: { email: string; status: ParticipantStatus }[]; // Assuming ParticipantStatus enum/type exists
  latestVersionNumber: number;
}

export class ReviewService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = getSupabaseClient();
  }

  /**
   * Initiates a new review process for an asset.
   *
   * @param payload - Details for the new review.
   * @param clientId - The ID of the client initiating the review.
   * @param initiatedByUserId - Optional ID of the internal user initiating the review.
   * @returns ServiceResult containing the review ID and participant tokens, or an error.
   */
  async initiateReview(
    payload: InitiateReviewPayload,
    clientId: string,
    initiatedByUserId?: string
  ): Promise<ServiceResult<InitiateReviewResult>> {
    const { assetId, reviewerEmails } = payload;

    // Basic validation (consider more robust validation)
    if (!assetId || !reviewerEmails || reviewerEmails.length === 0) {
      return {
        success: false,
        error: "Missing required fields: assetId and at least one reviewerEmail are required.",
      };
    }

    try {
      // RPC Approach (Recommended for atomicity)
      // Assumes a Supabase SQL function `initiate_review_transaction` exists.
      // This function needs to:
      // 1. Create the `reviews` record (potentially fetching asset title as default).
      // 2. Create the initial `review_versions` record (version 1).
      // 3. For each email in p_participants:
      //    a. Find existing user by email OR prepare for external participant.
      //    b. Create `review_participants` record (status: 'invited').
      //    c. Create `review_tokens` record with the generated token & expiry.
      // 4. Return review_id and an array [{ participant_id, token }].

      // Prepare participant data for RPC based on emails
      const participantsData = reviewerEmails.map((email: string) => ({
        // The RPC will handle finding user_id based on email if possible
        email: email,
        // Generate a secure, unique token (e.g., UUID or crypto)
        token: crypto.randomBytes(32).toString("hex"),
        // Set token expiry (e.g., 7 days from now)
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }));

      // Default title if not provided - RPC could also fetch from assetId
      const defaultTitle = `Review for Asset ${assetId}`;

      const { data, error } = await this.supabase.rpc("initiate_review_transaction", {
        p_asset_id: assetId,
        p_client_id: clientId,
        p_title: defaultTitle, // Using default, RPC could override
        p_description: null, // Description not in payload
        p_initiated_by_user_id: initiatedByUserId,
        p_participants: participantsData,
      });

      if (error) {
        logger.error("Error calling initiate_review_transaction RPC:", error);
        throw new Error(`Database error initiating review: ${error.message}`);
      }

      // Assuming the RPC function returns the review_id and the generated tokens/participant IDs
      // Example structure: { review_id: 'uuid', participant_tokens: [{ participant_id: 'uuid', token: 'hex' }, ...] }
      if (!data || !data.review_id || !data.participant_tokens) {
        logger.error("Invalid response from initiate_review_transaction RPC:", data);
        throw new Error("Failed to initiate review: Invalid response from database function.");
      }

      logger.info(`Review initiated successfully: ID ${data.review_id} for asset ${assetId}`);

      return {
        success: true,
        data: {
          reviewId: data.review_id,
          // Ensure the mapping uses the correct fields returned by the RPC
          participantTokens: data.participant_tokens.map((pt: { participant_id: string; token: string }) => ({
            participantId: pt.participant_id,
            token: pt.token,
          })),
        },
      };
    } catch (error: any) {
      logger.error(`Failed to initiate review for asset ${assetId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred while initiating the review.",
      };
    }
  }

  /**
   * Fetches the details of a specific review version for a participant.
   *
   * @param reviewVersionId - The ID of the review version.
   * @param reviewParticipantId - The ID of the participant accessing the review.
   * @returns ServiceResult containing the review data, or an error.
   */
  async getReviewData(reviewVersionId: string, reviewParticipantId: string): Promise<ServiceResult<ReviewPortalData>> {
    try {
      // Fetch review, version, asset, participants, comments, approvals
      // Corrected Select Statement Structure:
      // - Use aliases for clarity if needed.
      // - Ensure joins (`!inner`) are correctly specified based on foreign key relationships.
      // - Select specific columns instead of `*` where possible for performance.
      const { data, error } = await this.supabase
        .from("review_versions")
        .select(`
          id,
          version_number,
          created_at,
          review:reviews (
            id,
            title,
            description,
            status,
            created_at,
            asset:assets (id, name, type, file_url), -- Select specific asset fields
            participants:review_participants!inner (
              id,
              user_id,
              email,
              name,
              status,
              comments:review_comments (id, comment_text, metadata, created_at),
              approvals:review_approvals (id, action, comment, created_at)
            )
          )
        `)
        .eq("id", reviewVersionId)
        // Apply participant filter on the joined participants table
        .eq("review.participants.id", reviewParticipantId)
        .maybeSingle(); // Use maybeSingle as we expect one version matching the participant context

      if (error) {
        logger.error(`Error fetching review data for version ${reviewVersionId}, participant ${reviewParticipantId}:`, error);
        throw new Error(`Database error fetching review data: ${error.message}`);
      }

      // Cast the raw Supabase data to our specific interface
      const typedData = data as SupabaseReviewData | null;

      if (!typedData || !typedData.review) { // Check review first
        return {
          success: false,
          error: "Review not found or participant does not have access.", // Adjusted error message
        };
      }
      const reviewData = typedData.review; // Assign reviewData after review check

      // Check participants separately after confirming reviewData exists
      if (!reviewData.participants || reviewData.participants.length === 0) {
        return {
          success: false,
          error: "Participant data missing or empty for this review.",
        };
      }
      // Now participant access should be safe
      const participant = reviewData.participants[0];

      // Mark participant as 'viewed' if their status is currently 'invited'
      if (participant.status === 'invited') {
        const { error: updateError } = await this.supabase
          .from("review_participants")
          .update({ status: "viewed" as ParticipantStatus })
          .eq("id", reviewParticipantId);

        if (updateError) {
          logger.warn(`Failed to update participant ${reviewParticipantId} status to viewed:`, updateError);
          // Continue returning data even if status update fails
        } else {
          // Update status in the local data optimistically if DB update succeeds
          participant.status = "viewed";
        }
      }

      // Transform the fetched data into the ReviewPortalData structure
      if (!reviewData.asset) {
        // This shouldn't happen if the asset link is mandatory, but handle defensively
        logger.error(`Asset data missing for review ${reviewData.id}`);
        return { success: false, error: 'Associated asset data is missing.' };
      }

      const reviewPortalData: ReviewPortalData = {
        reviewId: reviewData.id,
        reviewVersionId: typedData.id,
        versionNumber: typedData.version_number,
        status: reviewData.status,
        assetSnapshot: { // Create a snapshot based on fetched asset fields
          id: reviewData.asset.id,
          name: reviewData.asset.name,
          type: reviewData.asset.type,
          url: reviewData.asset.file_url, // Assuming file_url holds the primary URL
        },
        // Map comments, potentially filtering only those by the current participant if needed
        // For now, mapping all comments associated with the review version
        comments: participant.comments.map((comment): ReviewComment => ({
          id: comment.id,
          reviewId: reviewData.id, // Use the non-null variable
          reviewParticipantId: participant.id, // Use the participant ID from the outer scope
          content: comment.comment_text, // Map comment_text to content
          // metadata handling - adjust as needed based on final structure
          // timestampSeconds: comment.metadata?.ts,
          // regionData: comment.metadata?.region,
          createdAt: comment.created_at,
        })),
        // We could also include participant details or approval status here if needed
      };

      logger.info(`Successfully fetched review data for version ${reviewVersionId}, participant ${reviewParticipantId}`);
      return { success: true, data: reviewPortalData };
    } catch (error: any) {
      logger.error(`Failed to get review data for version ${reviewVersionId}:`, error);
      return {
        success: false,
        error: error.message || "An unexpected error occurred while fetching review data.",
      };
    }
  }

  /**
   * Adds a comment to a review version.
   *
   * @param payload - Details of the comment.
   * @param reviewVersionId - The ID of the review version being commented on.
   * @param reviewParticipantId - The ID of the participant adding the comment.
   * @returns ServiceResult containing the new comment ID, or an error.
   */
  async addComment(
    payload: AddCommentPayload,
    reviewVersionId: string,
    reviewParticipantId: string
  ): Promise<ServiceResult<{ commentId: string }>> {
    const { content, regionData } = payload; // Use content from AddCommentPayload, removed timestampSeconds

    if (!content) {
      return { success: false, error: "Comment content cannot be empty." }; // Changed from commentText
    }

    try {
      // Combine timestamp and region data into a single JSONB metadata object
      // Simplified metadata - adjust if timestamp needs to be included separately
      const commentMetadata = { ...(regionData && { region: regionData }) };

      const { data, error } = await this.supabase
        .from("review_comments")
        .insert({
          review_version_id: reviewVersionId, // Use argument, not payload.reviewVersionId
          review_participant_id: reviewParticipantId,
          comment_text: content, // Use correct column name and payload field
          metadata: Object.keys(commentMetadata).length > 0 ? commentMetadata : null, // Store annotation data, position, etc.
        })
        .select("id")
        .single();

      if (error) {
        logger.error(`Error adding comment for participant ${reviewParticipantId} on version ${reviewVersionId}:`, error);
        throw new Error(`Database error adding comment: ${error.message}`);
      }

      // Update participant status to 'commented' if not already approved/rejected
      const { error: statusUpdateError } = await this.supabase
        .from("review_participants")
        .update({ status: "commented" as ParticipantStatus })
        .eq("id", reviewParticipantId)
        // Only update if status is pending or viewed
        .in("status", ["invited", "viewed"]); // Check against 'invited' or 'viewed'

      if (statusUpdateError) {
        logger.warn(`Failed to update participant ${reviewParticipantId} status to commented:`, statusUpdateError);
      }

      logger.info(`Comment added successfully by participant ${reviewParticipantId} on version ${reviewVersionId}`);
      return { success: true, data: { commentId: data.id } };
    } catch (error: any) {
      logger.error(`Failed to add comment for participant ${reviewParticipantId} on version ${reviewVersionId}:`, error);
      return {
        success: false,
        error: error.message || "An unexpected error occurred while adding the comment.",
      };
    }
  }

  /**
   * Records an approval action (approve/reject) for a review version.
   *
   * @param payload - The approval action and optional comment.
   * @param reviewVersionId - The ID of the review version being approved/rejected.
   * @param reviewParticipantId - The ID of the participant performing the action.
   * @returns ServiceResult indicating success or failure.
   */
  async recordApproval(
    payload: ReviewApprovalPayload,
    reviewVersionId: string,
    reviewParticipantId: string
  ): Promise<ServiceResult<void>> {
    const { action, comment } = payload;

    if (!action) {
      return { success: false, error: "Approval action is required." };
    }

    try {
      // First, record the approval action
      const { error } = await this.supabase.rpc("record_review_approval", {
        p_review_version_id: payload.reviewVersionId, // Use ID from payload
        p_review_participant_id: reviewParticipantId,
        p_action: action as ApprovalAction, // Cast to ensure type safety
        p_comment: comment,
      });

      if (error) {
        logger.error(`Error recording approval for participant ${reviewParticipantId} on version ${reviewVersionId}:`, error);
        throw new Error(`Database error recording approval: ${error.message}`);
      }

      // Implement logic to update the overall review status based on participant actions
      // 1. Get the review ID from the version ID
      const { data: versionData, error: versionError } = await this.supabase
        .from("review_versions")
        .select("review_id")
        .eq("id", reviewVersionId)
        .single();

      if (versionError) {
        logger.error(`Error fetching review ID for version ${reviewVersionId}:`, versionError);
        throw new Error(`Database error fetching review ID: ${versionError.message}`);
      }

      const reviewId = versionData.review_id;

      // 2. Get all participants for this review
      const { data: participantsData, error: participantsError } = await this.supabase
        .from("review_participants")
        .select("id, status")
        .eq("review_id", reviewId);

      if (participantsError) {
        logger.error(`Error fetching participants for review ${reviewId}:`, participantsError);
        throw new Error(`Database error fetching participants: ${participantsError.message}`);
      }

      // 3. Determine the new review status based on participant statuses
      let newStatus: ReviewStatus = 'in_progress'; // Default status

      // Count participants by status
      const statusCounts = {
        approved: 0,
        rejected: 0,
        changes_requested: 0,
        other: 0
      };

      participantsData.forEach((participant: any) => {
        if (participant.status === 'approved') {
          statusCounts.approved++;
        } else if (participant.status === 'rejected') {
          statusCounts.rejected++;
        } else if (participant.status === 'changes_requested') {
          statusCounts.changes_requested++;
        } else {
          statusCounts.other++;
        }
      });

      // Logic to determine overall review status:
      // - If all participants approved, mark as approved
      // - If any participant rejected, mark as rejected
      // - If any participant requested changes (and none rejected), mark as changes_requested
      // - Otherwise, keep as in_progress
      if (statusCounts.approved === participantsData.length) {
        newStatus = 'approved';
      } else if (statusCounts.rejected > 0) {
        newStatus = 'rejected';
      } else if (statusCounts.changes_requested > 0) {
        newStatus = 'changes_requested';
      }

      // 4. Update the review status
      const { error: updateError } = await this.supabase
        .from("reviews")
        .update({ status: newStatus })
        .eq("id", reviewId);

      if (updateError) {
        logger.error(`Error updating review status for review ${reviewId}:`, updateError);
        throw new Error(`Database error updating review status: ${updateError.message}`);
      }

      logger.info(`Approval action '${action}' recorded successfully by participant ${reviewParticipantId} on version ${reviewVersionId}`);
      logger.info(`Review status updated to '${newStatus}' for review ${reviewId}`);
      
      return { success: true, data: undefined };
    } catch (error: any) {
      logger.error(`Failed to record approval for participant ${reviewParticipantId} on version ${reviewVersionId}:`, error);
      return {
        success: false,
        error: error.message || "An unexpected error occurred while recording the approval.",
      };
    }
  }

  /**
   * Fetches the review history for a specific asset, intended for internal use.
   * @param assetId - The UUID of the asset.
   * @param clientId - The UUID of the client owning the asset.
   * @returns ServiceResult containing an array of ReviewHistoryItem or an error.
   */
  async getAssetReviewHistory(assetId: string, clientId: string): Promise<ServiceResult<ReviewHistoryItem[]>> {
    logger.info(`Fetching review history for asset ${assetId} and client ${clientId}`);
    try {
      const { data, error } = await this.supabase
        .from('reviews')
        .select(`
          reviewId:id,
          title,
          status,
          createdAt:created_at,
          initiatedByUser:users(email),
          latestVersionNumber:review_versions(version_number),
          participants:review_participants!inner(email, status)
        `)
        .eq('asset_id', assetId)
        .eq('client_id', clientId)
        // Ensure we only get participants linked to the *latest* version if necessary (complex join)
        // Simplified for now: Gets all participants linked to the review.
        // Order by creation date, newest first
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching asset review history from Supabase:', error);
        return { success: false, error: 'Database error fetching review history.' };
      }

      // Manually map the raw Supabase data to the ReviewHistoryItem structure
      const mappedData: ReviewHistoryItem[] = data.map((item: any) => {
        // Find the highest version number from the versions array
        const latestVersion = item.latestVersionNumber?.length > 0 
          ? Math.max(...item.latestVersionNumber.map((v: { version_number: number }) => v.version_number)) 
          : 0; // Default to 0 if no versions found (shouldn't happen with inner join?)

        return {
          reviewId: item.reviewId,
          title: item.title,
          status: item.status,
          createdAt: item.createdAt,
          // Supabase returns related user as an object, extract email if exists
          initiatedBy: item.initiatedByUser?.email || 'Unknown',
          participants: item.participants.map((p: { email: string; status: ParticipantStatus }) => ({
            email: p.email,
            status: p.status
          })),
          latestVersionNumber: latestVersion
        };
      });

      logger.info(`Found ${mappedData.length} review history items for asset ${assetId}`);
      return { success: true, data: mappedData };
    } catch (error: any) {
      logger.error(`Failed to fetch review history for asset ${assetId}:`, error);
      return {
        success: false,
        error: error.message || "An unexpected error occurred while fetching review history.",
      };
    }
  }
}
