// client/src/components/reviews/InitiateReviewForm.tsx
import React, { useState } from 'react';
// Assuming you have an API utility configured
// import apiClient from '@/lib/apiClient'; 
import { InitiateReviewPayload } from '../../../../server/src/types/review.types'; // Adjust path as needed

interface InitiateReviewFormProps {
  assetId: string; // Passed in when the form is opened for a specific asset
  onClose: () => void; // Function to close the form/modal
  onSuccess?: (data: any) => void; // Optional: Callback on successful initiation
}

/**
 * A form component for internal users to initiate a new asset review.
 */
export const InitiateReviewForm: React.FC<InitiateReviewFormProps> = ({
  assetId,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [participantEmails, setParticipantEmails] = useState<string[]>(['']); // Start with one empty email input
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailChange = (index: number, value: string): void => {
    const updatedEmails = [...participantEmails];
    updatedEmails[index] = value;
    setParticipantEmails(updatedEmails);
  };

  const addEmailInput = (): void => {
    setParticipantEmails([...participantEmails, '']);
  };

  const removeEmailInput = (index: number): void => {
    if (participantEmails.length > 1) {
      const updatedEmails = participantEmails.filter((_, i) => i !== index);
      setParticipantEmails(updatedEmails);
    }
  };

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const validEmails = participantEmails.filter(email => email.trim() !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));

    if (!title.trim()) {
        setError('Review title is required.');
        setIsLoading(false);
        return;
    }

    if (validEmails.length === 0) {
      setError('At least one valid participant email is required.');
      setIsLoading(false);
      return;
    }

    const payload: InitiateReviewPayload = {
      assetId,
      reviewerEmails: validEmails, // Send emails as a string array
    };

    try {
      // Replace with your actual API call logic
      // const response = await apiClient.post('/api/reviews', payload);
      console.log('Submitting review initiation payload:', payload);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      const mockResponseData = { reviewId: 'mock-review-123', participants: validEmails.map(email => ({ email, status: 'invited' }))}; // Mock response

      if (onSuccess) {
        onSuccess(mockResponseData); // Pass mock data for now
      }
      onClose(); // Close the form on success

    } catch (err: any) {
      console.error('Failed to initiate review:', err); // Use console.error
      setError(err.response?.data?.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // Basic JSX structure - Replace with your UI library components
  return (
    <form onSubmit={handleSubmit}>
      <h2>Initiate Review for Asset {assetId}</h2> 
      
      <div>
        <label htmlFor="review-title">Title:</label>
        <input
          id="review-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="review-description">Description (Optional):</label>
        <textarea
          id="review-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div>
        <label>Participant Emails:</label>
        {participantEmails.map((email, index) => (
          <div key={index} style={{ display: 'flex', marginBottom: '5px' }}>
            <input
              type="email"
              placeholder="participant@example.com"
              value={email}
              onChange={(e) => handleEmailChange(index, e.target.value)}
              disabled={isLoading}
              style={{ marginRight: '5px' }}
            />
            {participantEmails.length > 1 && (
              <button 
                type="button" 
                onClick={() => removeEmailInput(index)} 
                disabled={isLoading}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addEmailInput} disabled={isLoading}>
          Add Another Participant
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      <div>
        <button type="button" onClick={onClose} disabled={isLoading}>
          Cancel
        </button>
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Initiating...' : 'Initiate Review'}
        </button>
      </div>
    </form>
  );
};
