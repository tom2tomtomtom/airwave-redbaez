// client/src/pages/review/ExternalReviewPortal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';

// Import necessary types
import {
  ReviewPortalData,
  ReviewComment,
  AddCommentPayload,
  ReviewParticipant,
  ReviewApprovalPayload,
  ReviewStatus,
  ParticipantStatus,
  ApprovalAction,
} from '../../../../server/src/types/review.types'; // Types and Enums are in the same file

// Define a minimal AssetSnapshot type matching expected structure
// This might differ based on the actual snapshot data
interface AssetSnapshot {
  id: string;
  filename: string;
  assetType: 'image' | 'video' | 'audio' | 'document' | 'unknown';
  url: string;
  metadata?: any; // e.g., { width: number, height: number } or { duration: number }
}

// --- Sub Components ---
// Asset Preview Component (accepts AssetSnapshot)
const AssetPreview: React.FC<{ assetSnapshot: AssetSnapshot | null }> = ({ assetSnapshot }) => {
  if (!assetSnapshot) return <div>Loading asset preview...</div>;

  const { url: assetUrl, assetType, filename } = assetSnapshot;

  switch (assetType) {
    case 'image':
      return <img src={assetUrl} alt={filename} style={{ maxWidth: '100%', maxHeight: '500px' }} />;
    case 'video':
      return <video controls src={assetUrl} style={{ maxWidth: '100%', maxHeight: '500px' }} />;
    case 'audio':
      return <audio controls src={assetUrl} />;
    case 'document':
      return <div>Document Preview not available: <a href={assetUrl} target="_blank" rel="noopener noreferrer">{filename}</a></div>;
    default:
      return <div>Preview not available for {assetType}: {filename}</div>;
  }
};

// Comment List Component
const CommentList: React.FC<{ comments: ReviewComment[] }> = ({ comments }) => {
  if (!comments || comments.length === 0) {
    return <p>No comments yet.</p>;
  }
  return (
    <div>
      <h3>Comments</h3>
      <ul>
        {comments.map((comment) => (
          <li key={comment.id}>
            <p>{comment.content}</p>
            <small>By {comment.authorName || 'Reviewer'} at {new Date(comment.createdAt).toLocaleString()}</small>
          </li>
        ))}
      </ul>
    </div>
  );
};

// --- Main Component ---
export const ExternalReviewPortal: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  // State for the main review data (excluding specific participant details)
  const [reviewData, setReviewData] = useState<ReviewPortalData | null>(null);
  // State for the current participant viewing the portal
  const [participant, setParticipant] = useState<ReviewParticipant | null>(null);
  const [newComment, setNewComment] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState<boolean>(false);

  // Fetch review data and participant data
  const fetchReviewData = useCallback(async () => {
    console.log("fetchReviewData called with token:", token);
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      // const response = await apiClient.get<ReviewPortalData>(`/api/review/${token}`);
      // setReviewData(response.data);
      console.log(`Fetching data for token: ${token}`);
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API call

      // Mock Portal Data
      const mockData: ReviewPortalData = {
        reviewId: 'mock-review-123',
        reviewVersionId: 'rv-abc-789', // Added mock version ID
        assetSnapshot: {
          id: 'mock-asset-456',
          filename: 'website_mockup.png',
          assetType: 'image',
          url: '/placeholder-image.jpg',
          metadata: { width: 1024, height: 768 },
        } as AssetSnapshot,
        versionNumber: 1,
        status: 'pending', // Use ReviewStatus type value
        comments: [
          {
            id: 'c1',
            reviewId: 'mock-review-123',
            reviewParticipantId: 'p1',
            content: 'Looks good overall!',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            authorName: 'Designer',
          },
          {
            id: 'c2',
            reviewId: 'mock-review-123',
            reviewParticipantId: 'p2',
            content: 'Can we change the button color?',
            createdAt: new Date(Date.now() - 1800000).toISOString(),
            authorName: 'Client',
          },
        ],
      };
      setReviewData(mockData);

      // Mock fetching the current participant's data (replace with actual API call)
      console.log(`Fetching participant data for token: ${token}`);
      await new Promise((resolve) => setTimeout(resolve, 200)); // Simulate API call
      const mockParticipant: ReviewParticipant = {
        id: 'p2',
        reviewId: 'mock-review-123',
        email: 'current_reviewer@example.com',
        status: 'invited', // Use ParticipantStatus type value
        actionAt: null,
      };
      setParticipant(mockParticipant);
    } catch (err: any) {
      console.error(`Failed to fetch review data for token ${token}:`, err);
      setError(err.response?.data?.message || 'Failed to load review data. The link might be invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchReviewData();
    // TODO: Setup WebSocket listener here
  }, [fetchReviewData]);

  // Handler for adding a comment
  const handleAddComment = async () => {
    // Ensure participant and participant.id exist before proceeding
    if (!newComment.trim() || !token || !reviewData || !participant || !participant.id) {
      setError('Cannot submit comment: Missing required data (participant details).');
      return;
    }
    setIsSubmittingComment(true);
    setError(null); // Clear previous errors
    try {
      const payload: AddCommentPayload = { content: newComment.trim() };
      // Replace with actual API call
      // const response = await apiClient.post<Comment>(`/api/review/${token}/comments`, payload);
      console.log(`Posting comment for token ${token}:`, payload);
      await new Promise((resolve) => setTimeout(resolve, 200)); // Simulate API call

      // Simulate API returning the newly created comment
      const mockNewComment: ReviewComment = {
        id: `c${Date.now()}`,
        reviewId: reviewData.reviewId,
        reviewParticipantId: participant.id, // participant.id is now guaranteed to be a string
        content: newComment.trim(),
        createdAt: new Date().toISOString(),
        authorName: 'You (Current Reviewer)',
      };

      // Update state optimistically or after success
      setReviewData((prevData) =>
        prevData
          ? {
              ...prevData,
              comments: [...prevData.comments, mockNewComment],
            }
          : null
      );
      setNewComment(''); // Clear input
    } catch (err: any) {
      console.error('Failed to add comment:', err);
      setError(err.response?.data?.message || 'Failed to submit comment.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Handler for approving or requesting changes
  const handleApprovalAction = useCallback(async (action: ApprovalAction) => {
    if (!reviewData || isSubmittingApproval || isSubmittingComment) return;
    if (!reviewData.reviewId || !participant?.id) {
      setError('Review or participant data is missing.');
      return;
    }

    setIsSubmittingApproval(true);
    setError(null);
    try {
      const payload: ReviewApprovalPayload = {
        action,
        reviewVersionId: reviewData.reviewVersionId,
      };
      // Replace with actual API call
      // const response = await apiClient.post(`/api/review/${token}/approve`, payload);
      console.log(`Posting approval action for token ${token}:`, payload);
      await new Promise((resolve) => setTimeout(resolve, 200)); // Simulate API call

      // Update local state optimistically
      // Determine the new participant status based on the action
      const newStatus =
        action === 'approved'
          ? 'approved'
          : 'changes_requested'; // Assuming action is 'approved' or 'changes_requested'

      // Update participant state
      setParticipant(prevParticipant =>
        prevParticipant
          ? {
              ...prevParticipant,
              status: newStatus,
              actionAt: new Date().toISOString(),
            }
          : null
      );
    } catch (err: any) {
      console.error(`Failed to record approval action ${action}:`, err);
      setError(err.response?.data?.message || 'Failed to submit approval action.');
    } finally {
      setIsSubmittingApproval(false);
    }
  }, [token, reviewData, isSubmittingApproval, isSubmittingComment]);

  // --- Render Logic ---
  if (isLoading) {
    return <div>Loading review details...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  if (!reviewData || !participant) { // Wait for both review data and participant data
    return <div>No review data found.</div>;
  }

  // Destructure relevant data
  const { reviewId, assetSnapshot, comments, status: reviewStatus } = reviewData;

  // Determine participant abilities based on their status
  const canPerformActions =
    participant.status === 'invited' || participant.status === 'viewed' || participant.status === 'commented';
  const isApproved = participant.status === 'approved';

  return (
    <div>
      {/* TODO: Display Review Title/Description - requires adding to ReviewPortalData or separate fetch */}
      <h2>Review Portal</h2>
      <p>Review ID: {reviewId}</p>
      <p>Status: {reviewStatus}</p>
      <hr />

      <AssetPreview assetSnapshot={assetSnapshot} />

      <hr />

      <CommentList comments={comments} />

      <hr />

      {/* Comment Input */}
      <div style={{ marginTop: '20px' }}>
        <h3>Add Comment</h3>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={4}
          placeholder="Type your feedback here..."
          disabled={isSubmittingComment || isSubmittingApproval}
          style={{ width: '90%', marginBottom: '10px' }}
        />
        <button
          onClick={handleAddComment}
          disabled={!canPerformActions || isSubmittingComment || isSubmittingApproval || !newComment.trim()}
        >
          {isSubmittingComment ? 'Submitting...' : 'Add Comment'}
        </button>
      </div>

      <hr />

      {canPerformActions && (
        <div>
          <h3>Actions</h3>
          <button
            onClick={() => handleApprovalAction('approved')} // Use ApprovalAction type value
            disabled={isSubmittingApproval || isSubmittingComment}
            style={{ marginRight: '10px', backgroundColor: 'lightgreen' }}
          >
            {isSubmittingApproval ? 'Submitting...' : 'Approve'}
          </button>
          <button
            onClick={() => handleApprovalAction('changes_requested')} // Use ApprovalAction type value
            disabled={isSubmittingApproval || isSubmittingComment}
            style={{ backgroundColor: 'lightcoral' }}
          >
            {isSubmittingApproval ? 'Submitting...' : 'Request Changes'}
          </button>
        </div>
      )}

      {!canPerformActions && (
        <p>
          <strong>Your decision ({participant.status}) has been recorded.</strong>
          {participant.actionAt && ` on ${new Date(participant.actionAt).toLocaleString()}`}
        </p>
      )}

      {/* Display error for submissions */}
      {error && <p style={{ color: 'red', marginTop: '15px' }}>Error: {error}</p>}

      {/* TODO: Add WebSocket integration logic */}
    </div>
  );
};

// Note: This component likely needs to be integrated into your routing system
// For Next.js, you might have a file like `pages/review/[token].tsx` that uses getServerSideProps
// or getStaticProps/Paths to pass the token to this component.
// For react-router-dom, you would render this component within a Route and use useParams to get the token.
