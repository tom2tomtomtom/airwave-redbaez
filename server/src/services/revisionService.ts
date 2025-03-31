// server/src/services/revisionService.ts
import { supabase } from '@/config/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { notificationService } from './notificationService';

export interface Revision {
  id: string;
  assetId: string;
  versionNumber: number;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  description: string;
  changeLog: string[];
  previousVersionId: string | null;
  metadata: any;
  reviewStatus: 'pending' | 'approved' | 'rejected';
}

export interface RevisionComparison {
  fromRevision: Revision;
  toRevision: Revision;
  differences: {
    added: string[];
    removed: string[];
    modified: string[];
  };
}

class RevisionService {
  private static instance: RevisionService;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): RevisionService {
    if (!RevisionService.instance) {
      RevisionService.instance = new RevisionService();
    }
    return RevisionService.instance;
  }

  /**
   * Create a new revision
   */
  public async createRevision(
    assetId: string,
    createdBy: { id: string; name: string; email: string },
    description: string,
    changeLog: string[],
    previousVersionId: string | null,
    metadata: any
  ): Promise<Revision> {
    // Get the highest version number for this asset
    const { data: latestRevision, error: versionError } = await supabase
      .from('revisions')
      .select('versionNumber')
      .eq('assetId', assetId)
      .order('versionNumber', { ascending: false })
      .limit(1);

    if (versionError) {
      console.error('Error fetching latest revision:', versionError);
      throw new Error(`Failed to fetch latest revision: ${versionError.message}`);
    }

    const versionNumber = latestRevision && latestRevision.length > 0
      ? latestRevision[0].versionNumber + 1
      : 1;

    const revision: Revision = {
      id: uuidv4(),
      assetId,
      versionNumber,
      createdAt: new Date().toISOString(),
      createdBy,
      description,
      changeLog,
      previousVersionId,
      metadata,
      reviewStatus: 'pending',
    };

    // Save to database
    const { data, error } = await supabase
      .from('revisions')
      .insert(revision);

    if (error) {
      console.error('Error creating revision:', error);
      throw new Error(`Failed to create revision: ${error.message}`);
    }

    // Get stakeholders who should be notified
    const { data: stakeholders, error: stakeholdersError } = await supabase
      .from('asset_stakeholders')
      .select('userId, role')
      .eq('assetId', assetId);

    if (stakeholdersError) {
      console.error('Error fetching stakeholders:', stakeholdersError);
    } else if (stakeholders) {
      // Notify stakeholders
      const assetTitle = metadata.title || 'Untitled Asset';
      
      for (const stakeholder of stakeholders) {
        await notificationService.sendRevisionNotification(
          stakeholder.userId,
          revision.id,
          assetTitle,
          createdBy.name
        );
      }
    }

    return revision;
  }

  /**
   * Get all revisions for an asset
   */
  public async getAssetRevisions(assetId: string): Promise<Revision[]> {
    const { data, error } = await supabase
      .from('revisions')
      .select('*')
      .eq('assetId', assetId)
      .order('versionNumber', { ascending: false });

    if (error) {
      console.error('Error fetching revisions:', error);
      throw new Error(`Failed to fetch revisions: ${error.message}`);
    }

    return data as Revision[];
  }

  /**
   * Get a specific revision
   */
  public async getRevision(revisionId: string): Promise<Revision> {
    const { data, error } = await supabase
      .from('revisions')
      .select('*')
      .eq('id', revisionId)
      .single();

    if (error) {
      console.error('Error fetching revision:', error);
      throw new Error(`Failed to fetch revision: ${error.message}`);
    }

    return data as Revision;
  }

  /**
   * Update the review status of a revision
   */
  public async updateRevisionStatus(
    revisionId: string,
    status: 'pending' | 'approved' | 'rejected',
    reviewerId: string,
    reviewerName: string,
    comments?: string
  ): Promise<Revision> {
    // Get the revision first
    const revision = await this.getRevision(revisionId);

    // Update the status
    const { data, error } = await supabase
      .from('revisions')
      .update({ reviewStatus: status })
      .eq('id', revisionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating revision status:', error);
      throw new Error(`Failed to update revision status: ${error.message}`);
    }

    // Record the review
    const { error: reviewError } = await supabase
      .from('revision_reviews')
      .insert({
        id: uuidv4(),
        revisionId,
        reviewerId,
        reviewerName,
        status,
        comments,
        timestamp: new Date().toISOString(),
      });

    if (reviewError) {
      console.error('Error recording revision review:', reviewError);
    }

    // Get asset owner to notify
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('createdBy, title')
      .eq('id', revision.assetId)
      .single();

    if (!assetError && asset) {
      // Notify asset owner
      if (status === 'approved') {
        await notificationService.sendApprovalNotification(
          asset.createdBy,
          revisionId,
          asset.title || 'Untitled Asset',
          reviewerName
        );
      } else if (status === 'rejected') {
        await notificationService.sendRejectionNotification(
          asset.createdBy,
          revisionId,
          asset.title || 'Untitled Asset',
          reviewerName,
          comments || 'No comments provided'
        );
      }
    }

    return data as Revision;
  }

  /**
   * Compare two revisions
   */
  public async compareRevisions(revisionId1: string, revisionId2: string): Promise<RevisionComparison> {
    const revision1 = await this.getRevision(revisionId1);
    const revision2 = await this.getRevision(revisionId2);

    // Ensure both revisions belong to the same asset
    if (revision1.assetId !== revision2.assetId) {
      throw new Error('Cannot compare revisions from different assets');
    }

    // Determine which is the earlier and later version
    const [fromRevision, toRevision] = revision1.versionNumber < revision2.versionNumber
      ? [revision1, revision2]
      : [revision2, revision1];

    // Compare metadata to find differences
    const differences = {
      added: [] as string[],
      removed: [] as string[],
      modified: [] as string[],
    };

    // Simple comparison logic (to be enhanced for more complex metadata structures)
    this.compareObjects(fromRevision.metadata, toRevision.metadata, '', differences);

    return {
      fromRevision,
      toRevision,
      differences,
    };
  }

  /**
   * Helper method to recursively compare objects
   */
  private compareObjects(obj1: any, obj2: any, path: string, differences: any): void {
    // Check keys in obj1
    for (const key in obj1) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (!(key in obj2)) {
        // Key exists in obj1 but not in obj2
        differences.removed.push(currentPath);
      } else if (typeof obj1[key] === 'object' && obj1[key] !== null && 
                 typeof obj2[key] === 'object' && obj2[key] !== null) {
        // Both values are objects, recursively compare
        this.compareObjects(obj1[key], obj2[key], currentPath, differences);
      } else if (obj1[key] !== obj2[key]) {
        // Values are different
        differences.modified.push(currentPath);
      }
    }

    // Check for keys in obj2 that don't exist in obj1
    for (const key in obj2) {
      const currentPath = path ? `${path}.${key}` : key;
      if (!(key in obj1)) {
        differences.added.push(currentPath);
      }
    }
  }
}

export const revisionService = RevisionService.getInstance();
