import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import BriefForm from '../BriefForm';
import briefsReducer from '../../../store/slices/briefsSlice';
import authReducer from '../../../store/slices/authSlice';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Strategic Content Development - Brief Form', () => {
  const mockStore = configureStore({
    reducer: {
      briefs: briefsReducer,
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        isAuthenticated: true,
        user: {
          id: 'test-user-id',
          organisationId: 'test-org-id',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user'
        },
        token: 'mock-jwt-token',
        loading: false,
        error: null
      },
    },
  });

  const renderComponent = () => {
    return render(
      <Provider store={mockStore}>
        <BrowserRouter>
          <BriefForm />
        </BrowserRouter>
      </Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all form fields with correct UK English labels and helper text', () => {
    renderComponent();

    // Check for field labels using UK English spelling
    expect(screen.getByLabelText(/campaign overview/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/campaign objectives/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/target audience/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/key messages/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/visual preferences/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/organisation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/add tags/i)).toBeInTheDocument();

    // Check for helper text with UK English spelling
    expect(screen.getByText(/provide a general overview/i)).toBeInTheDocument();
    expect(screen.getByText(/what are the key objectives/i)).toBeInTheDocument();
    expect(screen.getByText(/describe your target audience/i)).toBeInTheDocument();
    expect(screen.getByText(/what are the main messages/i)).toBeInTheDocument();
    expect(screen.getByText(/customise your visual style/i)).toBeInTheDocument();
    expect(screen.getByText(/categorise your brief/i)).toBeInTheDocument();
  });

  it('displays validation errors when submitting empty form', async () => {
    renderComponent();
    
    const submitButton = screen.getByText(/save as draft/i);
    fireEvent.click(submitButton);

    // Wait for the first validation message to appear
    await screen.findByText(/please enter a brief title/i);

    // Now assert that all other expected validation messages are present
    expect(screen.getByText(/please enter a brief title/i)).toBeInTheDocument();
    expect(screen.getByText(/please provide brief content/i)).toBeInTheDocument();
    expect(screen.getByText(/please specify campaign objectives/i)).toBeInTheDocument();
    expect(screen.getByText(/please specify target audience/i)).toBeInTheDocument();
    expect(screen.getByText(/please specify key messages/i)).toBeInTheDocument();
    expect(screen.getByText(/please add at least one tag/i)).toBeInTheDocument();
  });

  it('handles tag addition and deletion', async () => {
    renderComponent();
    
    const tagInput = screen.getByLabelText(/add tags/i);
    
    // Add a tag
    await userEvent.type(tagInput, 'social media{enter}');
    expect(screen.getByText(/social media/i)).toBeInTheDocument();
    
    // Add another tag
    await userEvent.type(tagInput, 'marketing{enter}');
    expect(screen.getByText(/marketing/i)).toBeInTheDocument();
    
    // Delete a tag
    const deleteButton = screen.getAllByRole('button')[0];
    fireEvent.click(deleteButton);
    expect(screen.queryByText(/social media/i)).not.toBeInTheDocument();
  });

  it('successfully submits form with valid data and proper UK English content', async () => {
    renderComponent();
    
    // Fill in required fields with UK English content
    await userEvent.type(screen.getByLabelText(/brief title/i), 'Sustainable Fashion Campaign');
    await userEvent.type(screen.getByLabelText(/campaign overview/i), 'A strategic campaign to showcase our sustainable fashion collection whilst emphasising our commitment to environmental responsibility.');
    await userEvent.type(screen.getByLabelText(/campaign objectives/i), 'Increase brand awareness and drive engagement across social media platforms, focusing on our sustainable practices and ethical manufacturing.');
    await userEvent.type(screen.getByLabelText(/target audience/i), 'Fashion-conscious young professionals aged 25-35, particularly interested in sustainable lifestyle choices and environmental responsibility.');
    await userEvent.type(screen.getByLabelText(/key messages/i), 'Sustainable fashion is stylish and accessible. Make a positive impact through conscious choices. Our ethical manufacturing ensures quality and responsibility.');
    
    // Add tags with UK English spelling where applicable
    const tagInput = screen.getByLabelText(/add tags/i);
    await userEvent.type(tagInput, 'sustainability{enter}');
    await userEvent.type(tagInput, 'fashion{enter}');
    await userEvent.type(tagInput, 'organisation{enter}');
    await userEvent.type(tagInput, 'behaviour{enter}');
    
    // Submit form
    const submitButton = screen.getByText(/save as draft/i);
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/briefs');
    });
  });
});
