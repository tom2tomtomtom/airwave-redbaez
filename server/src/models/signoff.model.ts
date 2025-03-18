export interface SignoffSession {
  id: string;
  campaignId: string;
  title: string;
  description?: string;
  status: 'draft' | 'sent' | 'in_review' | 'approved' | 'rejected' | 'completed';
  clientEmail: string;
  clientName: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  accessToken: string;
  createdBy: string;
  feedback?: string;
  matrixId?: string;
  reviewUrl?: string;
}

export interface SignoffAsset {
  id: string;
  sessionId: string;
  assetId: string;
  status: 'pending' | 'approved' | 'rejected';
  feedback?: string;
  createdAt: string;
  updatedAt: string;
  versionNumber: number;
}

export interface SignoffResponse {
  id: string;
  sessionId: string;
  clientName: string;
  clientEmail: string;
  feedback?: string;
  status: 'approved' | 'rejected' | 'partial';
  createdAt: string;
  approvedAssets?: string[];
  rejectedAssets?: string[];
}

export interface ClientViewSession extends Omit<SignoffSession, 'accessToken' | 'createdBy'> {
  assets: Array<{
    id: string;
    name: string;
    description?: string;
    type: string;
    previewUrl: string;
    status: 'pending' | 'approved' | 'rejected';
    feedback?: string;
  }>;
}
