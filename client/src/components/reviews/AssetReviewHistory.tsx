// client/src/components/reviews/AssetReviewHistory.tsx
import React, { useState, useEffect, useCallback } from 'react';
// import apiClient from '@/lib/apiClient'; 
import {
  ReviewHistoryItem,
  ParticipantHistoryInfo,
} from '../../../../server/src/types/review.types'; // Adjust path

interface AssetReviewHistoryProps {
  assetId: string;
  // Potentially add clientId if needed for the API call, though internalAuth should handle it
}

/**
 * Displays the review history for a specific asset for internal users.
 */
export const AssetReviewHistory: React.FC<AssetReviewHistoryProps> = ({ assetId }) => {
  const [history, setHistory] = useState<ReviewHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Replace with actual API call to GET /api/assets/:assetId/reviews
      // const response = await apiClient.get<ReviewHistoryItem[]>(`/api/assets/${assetId}/reviews`);
      // setHistory(response.data);
      console.log(`Fetching review history for asset: ${assetId}`);
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API call
      // Mock data - replace with actual data structure
      const mockHistory: ReviewHistoryItem[] = [
        {
          reviewId: 'rev-1',
          reviewTitle: 'Q3 Campaign Images',
          status: 'approved', // Use string literal
          initiatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          initiatedBy: 'Alice Manager', // Or user ID/email
          participants: [
            {
              email: 'bob@client.com',
              status: 'approved', // Use string literal
              actionAt: new Date(
                Date.now() - 86400000 * 1.5
              ).toISOString(),
            },
            {
              email: 'carol@client.com',
              status: 'approved', // Use string literal
              actionAt: new Date(
                Date.now() - 86400000 * 1.6
              ).toISOString(),
            },
          ],
          commentsCount: 3,
        },
        {
          reviewId: 'rev-2',
          reviewTitle: 'Website Banner Video',
          status: 'pending', // Use string literal
          initiatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          initiatedBy: 'Alice Manager',
          participants: [
            { email: 'dave@client.com', status: 'invited', actionAt: null }, // Use string literal & add actionAt
            {
              email: 'eve@client.com',
              status: 'commented', // Use string literal
              actionAt: new Date(Date.now() - 3600000 * 1).toISOString(), // ActionAt might be last comment time
            },
          ],
          commentsCount: 1,
        },
      ];
      setHistory(mockHistory);
    } catch (err: any) {
      console.error(`Failed to fetch review history for asset ${assetId}:`, err); // Use console.error
      setError(err.response?.data?.message || 'Failed to load review history.');
    } finally {
      setIsLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    fetchHistory();
    // TODO: Setup WebSocket listener for updates to this asset's reviews
  }, [fetchHistory]);

  // --- Render Logic ---

  if (isLoading) {
    return <div>Loading review history...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  if (history.length === 0) {
    return <p>No review history found for this asset.</p>;
  }

  // Basic JSX - Replace/enhance with your UI library components (Table, List, etc.)
  return (
    <div>
      <h3>Review History</h3>
      {history.map((review) => (
        <div key={review.reviewId} style={{ border: '1px solid #ccc', marginBottom: '15px', padding: '10px' }}>
          <h4>{review.reviewTitle} (Status: {review.status})</h4>
          <p>Initiated By: {review.initiatedBy} on {new Date(review.initiatedAt).toLocaleDateString()}</p>
          <p>Participants ({review.participants.length}):</p>
          <ul>
            {review.participants.map(
              (p: ParticipantHistoryInfo, index: number) => ( // Add types here
                <li key={index}>
                  {p.email}: {p.status}
                  {p.actionAt &&
                    ` (at ${new Date(p.actionAt).toLocaleString()})`}
                </li>
              )
            )}
          </ul>
          <p>Comments: {review.commentsCount}</p>
          {/* Optional: Add a link/button to view full review details if needed */}
        </div>
      ))}
      {/* TODO: Add WebSocket integration logic */}
    </div>
  );
};
