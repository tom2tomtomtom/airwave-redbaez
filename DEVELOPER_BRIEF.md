# Developer Brief: Strategy, Copy Generation & Campaign Matrix Enhancements

This document outlines the new functionality for the AIrWAVE platform to enhance ad creation workflows. It covers the strategy and copy generation flow (including client brief ingestion, LLM integration, and client sign-off) as well as the campaign matrix for assembling ad variations. This brief should be read in conjunction with the existing project structure.

## Overview

The new functionality focuses on three core areas:

### 1. Strategy & Copy Generation Flow:
- **Brief Ingestion**: Users can upload a client brief or manually fill in standard creative brief details.
- **LLM Integration**: A Supabase Edge function forwards brief details to an LLM API, which returns alternative motivations with explanations.
- **User Interaction**: Users select at least six motivations (with options to regenerate or refine responses based on follow-up questions).
- **Copy Generation**: Once the required motivations are selected, the user moves to a copy generation page where they choose tone, style, and frame count. The LLM then generates copy variations.
- **Client Sign-Off**: Generated copy and motivations are sent to a dedicated client sign-off portal that tracks approvals, versions, and sends email notifications.

### 2. Client Sign-Off Portal:
- A secure, dedicated portal for client review and approval.
- Built-in versioning and change tracking.
- Automated email notifications alert both the client and creative team when actions occur.

### 3. Campaign Matrix:
- A grid-based interface that integrates assets from multiple repositories: videos, stills, graphics, copy (including body copies, call-to-action, and terms), music, and voice overs.
- Supports manual selection and automated combination generation.
- Features interactive elements such as dropdowns, drag-and-drop functionality, and inline previews.
- Final asset combinations are sent to the Creatomate API for video rendering.

## Detailed Flow & Architecture

### Flow Diagrams
- **User Interaction Flow**:
  Create visual diagrams illustrating the complete journey—from brief submission to LLM response, motivation selection, copy generation, client sign-off, and finally assembling assets in the campaign matrix. These diagrams should include decision points (e.g., "Regenerate Motivations" or "Send for Client Sign-Off") and transitions between states.
- **Data Flow Diagram**:
  Outline how asset data moves between the repositories, the campaign matrix, and the Creatomate integration. Diagrams should detail interactions among the frontend, backend (via API endpoints), and third-party services.

Note: Flow diagrams should be added as separate image files in the /docs folder. See the [FLOW_DIAGRAMS.md](./docs/FLOW_DIAGRAMS.md) file for placeholders and detailed requirements.

### Combination Logic Details
- **Permutation Algorithm**:
  Define how the system generates asset combinations:
  - **Asset Locking**: Allow users to "lock" specific assets in their slot to prevent them from changing during automated generation.
  - **Filtering & Variations**: Provide filtering options so that users can choose to vary only certain asset categories (e.g., swap out images while keeping the copy constant).
  - **Combination Generation**: A "Generate Combinations" action will create a matrix of potential combinations based on the available selections. The logic should support a dynamic number of rows based on permutation rules and user-defined constraints.

### Error Handling & Edge Cases
- **Missing Assets**:
  The system must gracefully handle cases where a selected asset is missing or fails to load. Fallbacks and alerts should be in place.
- **API Failures**:
  For external calls (LLM or Creatomate), implement retries and clear error messages. If an API call fails, the user should receive actionable feedback to resolve the issue.
- **User Interruptions**:
  If a user abandons or navigates away from a partially filled matrix, prompt to save progress or restore previous states.
- **Validation**:
  Validate that all required fields (e.g., asset selections in each matrix cell) are completed before triggering the Creatomate job.

### Redux State Management
- **State Slices**:
  Update Redux slices to include:
  - **LLM and Strategy Flow**: Track brief submission, LLM responses, selected motivations, and generated copy.
  - **Campaign Matrix State**: Maintain the current asset combinations, locked selections, and preview states.
  - **Client Sign-Off**: Store sign-off statuses, version history, and notification flags.
- **Data Persistence**:
  Ensure that state persists during navigation (e.g., using middleware or local storage) so that progress is not lost if a user reloads the page.

### Performance Considerations
- **Large-Scale Data Handling**:
  Optimize the campaign matrix to efficiently handle a high number of asset combinations without degrading UI responsiveness. Techniques such as lazy loading and pagination within the matrix view may be used.
- **Real-Time Updates**:
  Use efficient WebSocket communication to deliver real-time updates from the backend (e.g., rendering status or sign-off notifications). Ensure that WebSocket messages are succinct and only trigger necessary UI updates.
- **Caching**:
  Implement caching strategies (both on the client and server) for frequently used asset data to reduce load times, particularly for assets that are reused across multiple campaigns.

## Technical Details

### Frontend (React with TypeScript)

#### New Pages & Components
- **Strategy & Copy Generation**:
  - **pages/generate/StrategyPage.tsx**:
    - Handles client brief upload/input.
    - Triggers the Supabase Edge function to query the LLM.
    - Displays returned motivations with detailed explanations.
    - Allows for selection, regeneration, and clarifying follow-up questions.
  - **pages/generate/CopyGenerationPage.tsx**:
    - Provides UI for tone, style, and frame count selection.
    - Displays generated copy variations.
    - Offers controls to select or regenerate copy.
    - Enables sending approved content to the client sign-off portal.
- **Client Sign-Off Portal**:
  - **components/signoff/ClientSignOffPortal.tsx**:
    - Secure, client-facing interface for reviewing and approving copy/motivations.
    - Implements version tracking and in-app notifications.
    - Integrates email notifications for approval updates.
- **Campaign Matrix**:
  - **components/campaign/CampaignMatrix.tsx**:
    - Implements a grid layout with columns for each asset type (videos, stills, graphics, copy, music, voice overs).
    - Each row represents a complete ad variant.
    - Features dropdowns, drag-and-drop asset selection, and inline previews.
    - Provides a "Generate Combinations" button and locking/filtering mechanisms.
    - Finalizes asset combinations and triggers a Creatomate API call.

#### State Management & Utilities
- **Redux Toolkit**:
  - Update Redux slices in client/src/store/ to manage the state for strategy flow, campaign matrix configurations, and sign-off statuses.
- **Utility Functions**:
  - Enhance API client utilities (client/src/utils/api.ts) to incorporate new endpoints for LLM, matrix submission, and client sign-off.

### Backend (Node.js with Express & Supabase)

#### API Routes & Services
- **LLM Integration**:
  - Endpoint: /api/llm/parse-brief to accept brief details and forward them to the LLM via a Supabase Edge function.
  - Service: Create/update server/src/services/llmService.ts to handle API calls, process responses, and manage errors.
- **Campaign Matrix Updates**:
  - Update server/src/routes/campaignRoutes.ts to include endpoints for saving matrix configurations and receiving asset combinations.
  - Extend creatomate.routes.ts if additional parameters are needed for batch processing.
- **Client Sign-Off**:
  - Create or extend an endpoint (e.g., /api/signoff) to handle client review, versioning, and status updates.
  - Implement email notification logic using an SMTP service or similar.

#### Real-Time Communication
- **WebSockets**:
  - Use the existing WebSocket server (server/src/services/websocket.ts) to send real-time status updates for video rendering progress, asset combination updates, and client sign-off notifications.

## Testing & Deployment
- **Unit & Integration Testing**:
  - Write unit tests for new React components using Jest and React Testing Library.
  - Use integration tests (e.g., with Supertest) to verify new API endpoints.
  - Test real-time communication to ensure WebSocket messages are correctly handled.
- **Environment Configuration**:
  - Update .env files to include keys for LLM, Supabase, and Creatomate integrations.
  - Verify Docker configurations in docker-compose.yml to support any new services or dependencies.
- **Documentation**:
  - Maintain detailed API documentation, inline comments, and update the /docs folder with flow diagrams and architecture overviews.
  - Ensure that both developers and end-users have access to comprehensive instructions and troubleshooting guides.

## Future Enhancements
- **Collaboration**:
  - Expand the campaign matrix for multi-user editing and in-app commenting.
- **Advanced Analytics**:
  - Integrate performance tracking for asset usage, client sign-off efficiency, and overall campaign effectiveness.
- **Optimization**:
  - Enhance caching and lazy loading techniques to improve performance with large datasets.
- **Integration Expansion**:
  - Explore additional third-party integrations for a more robust digital ad ecosystem.

This updated brief includes detailed flow diagrams, combination logic, error handling, state management, and performance considerations, ensuring a comprehensive guide for the development of the complex matrix asset variation system. Please review and reach out with any questions or further adjustments before proceeding with implementation.