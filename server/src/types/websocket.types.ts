// server/src/types/websocket.types.ts

/**
 * Defines the standard event names used by Socket.IO.
 */
export enum StandardSocketEvents {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  CONNECT_ERROR = 'connect_error',
}

/**
 * Defines custom event names emitted FROM the server TO the client.
 * Renamed from ServerToClientEvents for broader use.
 */
export enum WebSocketEvent { // Renamed from ServerToClientEvents
  // Example: Notify client about generation status
  GENERATION_UPDATE = 'generation:update',
  // Example: Notify client about a new notification
  NEW_NOTIFICATION = 'notification:new',
  // Example: Broadcast user presence update
  USER_PRESENCE_UPDATE = 'presence:update',
  // Example: Error message from server
  SERVER_ERROR = 'server:error',
  // Added for job progress across services
  JOB_PROGRESS = 'job:progress', 
  // Specific runway events (consider consolidating into JOB_PROGRESS if structure is same)
  IMAGE_GENERATION_COMPLETE = 'runway:image_complete', 
  VIDEO_GENERATION_COMPLETE = 'runway:video_complete',
  VIDEO_GENERATION_FAILED = 'runway:video_failed',
  // Specific creatomate events (consider consolidating)
  CREATOMATE_PROGRESS = 'creatomate:progress',
  ERROR = 'error',
  // --- Review System Events ---
  REVIEW_UPDATE = 'review:update',         // General update (status change, participant added/removed)
  REVIEW_COMMENT_NEW = 'review:comment:new', // A new comment was added
  REVIEW_APPROVAL_UPDATE = 'review:approval:update', // A participant approved/rejected
  // --- Matrix Batch Rendering Events ---
  BATCH_PROGRESS_UPDATE = 'matrix:batch:progress', // Update on batch rendering progress
}

import { ReviewComment, ReviewParticipant } from './review.types';

/**
 * Defines custom event names emitted FROM the client TO the server.
 */
export enum ClientToServerEvents {
  // Example: Client requests to join a specific room (e.g., based on client ID)
  JOIN_ROOM = 'room:join',
  // Example: Client leaves a room
  LEAVE_ROOM = 'room:leave',
  // Example: Client sends a collaborative action
  COLLABORATIVE_ACTION = 'collaboration:action',
}

// --- Payload Types ---

// Example payload for generation updates
export interface GenerationUpdatePayload {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number; // Optional progress percentage
  resultUrl?: string; // Optional URL to the result on completion
  error?: string; // Optional error message on failure
}

// Example payload for new notifications
export interface NewNotificationPayload {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: number;
  read?: boolean;
}

// Example payload for user presence
export interface UserPresencePayload {
  userId: string;
  clientId: string; // To scope presence
  status: 'online' | 'offline' | 'idle';
  lastSeen: number;
}

// Example payload for joining/leaving rooms
export interface RoomPayload {
  room: string; // e.g., `client_${clientId}`, `brief_${briefId}`
}

// Example payload for collaborative actions (highly dependent on feature)
export interface CollaborativeActionPayload {
  actionType: string; // e.g., 'asset_lock', 'text_edit'
  resourceId: string; // ID of the asset, brief, etc.
  payload: any; // Action-specific data
}

// Payload for job progress updates (used by Runway, Creatomate, etc.)
export interface JobProgressPayload {
  jobId: string;
  service: string; // e.g., 'runway', 'creatomate'
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
  progress?: number; // Optional progress percentage (0-100)
  message?: string; // Optional status message
  resultUrl?: string; // Optional URL on success
  error?: string; // Optional error message on failure
  clientId: string; // Client context
  userId: string; // User context
}

// Payload for general review updates (e.g., status change)
export interface ReviewUpdatePayload {
  reviewId: string;
  assetId: string;
  status?: string; // The new overall review status (e.g., PENDING, COMPLETED)
  // Add other relevant fields that might change, e.g., participant list update
}

// Payload for new comments
export interface ReviewCommentNewPayload {
  reviewId: string;
  assetId: string;
  comment: ReviewComment; // Use the standardized ReviewComment type
}

// Payload for approval updates
export interface ReviewApprovalUpdatePayload {
  reviewId: string;
  assetId: string;
  participant: ReviewParticipant; // Re-use the ReviewParticipant type
}

// Payload for error messages
export interface ErrorPayload {
  message: string;
}

/**
 * Payload for matrix batch rendering progress updates
 */
export interface BatchRenderProgressPayload {
  matrixId: string;
  progress: {
    matrixId: string;
    total: number;
    completed: number;
    failed: number;
    inProgress: number;
    queued: number;
    overallProgress: number;
    estimatedTimeRemaining?: number; // in seconds
  };
}

// --- Socket.IO Server Typing ---

// Describes the events the server listens for from the client
export interface ServerListenEvents {
  [ClientToServerEvents.JOIN_ROOM]: (payload: RoomPayload, ack?: (status: { success: boolean }) => void) => void;
  [ClientToServerEvents.LEAVE_ROOM]: (payload: RoomPayload, ack?: (status: { success: boolean }) => void) => void;
  [ClientToServerEvents.COLLABORATIVE_ACTION]: (payload: CollaborativeActionPayload) => void; // No ack needed usually
}

// Correctly define ServerEmitEvents mapping Event Name => Payload Type
export interface ServerEmitEvents {
  [WebSocketEvent.ERROR]: ErrorPayload;
  [WebSocketEvent.USER_PRESENCE_UPDATE]: UserPresencePayload;
  [WebSocketEvent.JOB_PROGRESS]: JobProgressPayload;
  [WebSocketEvent.GENERATION_UPDATE]: GenerationUpdatePayload;
  [WebSocketEvent.NEW_NOTIFICATION]: NewNotificationPayload;
  [WebSocketEvent.SERVER_ERROR]: { message: string };
  [WebSocketEvent.IMAGE_GENERATION_COMPLETE]: { jobId: string; status: string; url?: string };
  [WebSocketEvent.VIDEO_GENERATION_COMPLETE]: { jobId: string; status: string; url?: string };
  [WebSocketEvent.VIDEO_GENERATION_FAILED]: { jobId: string; status: string; error?: string };
  [WebSocketEvent.CREATOMATE_PROGRESS]: JobProgressPayload;
  [WebSocketEvent.REVIEW_UPDATE]: ReviewUpdatePayload;
  [WebSocketEvent.REVIEW_COMMENT_NEW]: ReviewCommentNewPayload; // Ensure this uses the updated payload interface
  [WebSocketEvent.REVIEW_APPROVAL_UPDATE]: ReviewApprovalUpdatePayload;
  [WebSocketEvent.BATCH_PROGRESS_UPDATE]: BatchRenderProgressPayload;
}

// Describes events applicable to inter-server communication (if using clustering/multiple instances)
// For now, we'll keep it simple.
export interface InterServerEvents {
  // ping: () => void;
}

// Describes the shape of the socket.data object, useful for storing session/user info
export interface SocketData {
  userId: string;
  clientId: string | null; // The client ID the user is currently associated with
  // Add other relevant session data
}
