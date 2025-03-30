// server/src/middleware/reviewAuth.ts
import { Response, NextFunction } from 'express';
import { getSupabaseClient } from '@/utils/supabaseClient';
import { ReviewRequestContext, ReviewAuthenticatedRequest } from '@/types/review.types';
import { logger } from '@/utils/logger';

/**
 * Middleware to authenticate requests using a review token.
 * Attaches review context to the request object if successful.
 */
export const reviewAuth = async (
  req: ReviewAuthenticatedRequest, // Use the extended request type
  res: Response,
  next: NextFunction
) => {
  const token = req.params.token;

  if (!token) {
    return res.status(401).json({ message: 'Authentication token missing.' });
  }

  try {
    const supabase = getSupabaseClient();

    // Find the token details, including participant and related review version
    // IMPORTANT: Select the LATEST review_version for the review associated with the participant
    const { data: tokenData, error: tokenError } = await supabase
      .from('review_tokens')
      .select(`
        *, 
        review_participants(
          id, 
          reviewer_email,
          reviews(
            id,
            review_versions ( id, version_number )
          )
        )
      `)
      .eq('token', token)
      .maybeSingle();

    if (tokenError) {
      logger.error('Error fetching review token:', tokenError);
      return res.status(500).json({ message: 'Error validating token.' });
    }

    if (!tokenData) {
      logger.warn(`Invalid review token presented: ${token}`);
      return res.status(403).json({ message: 'Invalid or expired token.' }); // 403 Forbidden
    }

    // Check expiry
    if (new Date(tokenData.expires_at) < new Date()) {
      logger.warn(`Expired review token presented: ${token}`);
      return res.status(403).json({ message: 'Invalid or expired token.' });
    }

    // Check if used (if single-use for submission - might need adjustment)
    // For viewing/commenting, allow multiple uses before expiry.
    // For submission (approval), mark as used *after* successful submission in the service.
    // if (tokenData.used_at) {
    //   logger.warn(`Already used review token presented: ${token}`);
    //   return res.status(403).json({ message: 'Token has already been used.' });
    // }

    // Extract necessary context
    const participant = tokenData.review_participants;
    if (!participant || !participant.reviews) {
        logger.error(`Inconsistent data for token ${token}: missing participant or review details.`);
        return res.status(500).json({ message: 'Error retrieving review context.' });
    }

    // Find the latest review version associated with this review
    // Define type for review version within the fetched structure
    type FetchedReviewVersion = { id: string; version_number: number };

    const latestVersion = (participant.reviews.review_versions as FetchedReviewVersion[])
        ?.sort((a: FetchedReviewVersion, b: FetchedReviewVersion) => b.version_number - a.version_number)[0];
    if (!latestVersion) {
        logger.error(`No review versions found for review associated with token ${token}`);
        return res.status(500).json({ message: 'Error retrieving review version.' });
    }

    const reviewContext: ReviewRequestContext = {
      reviewId: participant.reviews.id,
      reviewParticipantId: participant.id,
      reviewVersionId: latestVersion.id,
      reviewerEmail: participant.reviewer_email,
    };

    // Attach context to request object for downstream controllers/services
    req.reviewContext = reviewContext; // Assign directly
    logger.info(
      `Review token validated for participant ${reviewContext.reviewParticipantId} on review ${reviewContext.reviewId}`,
    );

    next(); // Proceed to the next middleware or route handler

  } catch (error: any) {
    logger.error('Unexpected error during review token authentication:', error);
    return res.status(500).json({ message: 'Internal server error during authentication.' });
  }
};
