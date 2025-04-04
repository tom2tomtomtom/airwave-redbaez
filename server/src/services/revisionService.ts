import { supabase } from '../db/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

export interface Revision {
  id: string;
  assetId: string;
  version: number;
  createdAt: string;
  createdBy: string;
  changes: string;
  status: 'draft' | 'published' | 'archived';
  metadata?: any;
}

export interface RevisionComparison {
  current: Revision;
  previous?: Revision;
  differences?: string[];
}

class RevisionService {
  async createRevision(assetId: string, userId: string, changes: string, metadata?: any): Promise<Revision> {
    try {
      // Get the latest version number for this asset
      const { data: latestRevision, error: versionError } = await supabase
        .from('revisions')
        .select('version')
        .eq('asset_id', assetId)
        .order('version', { ascending: false })
        .limit(1)
        .single();
      
      if (versionError && versionError.code !== 'PGRST116') {
        logger.error('Error getting latest revision version:', versionError);
        throw versionError;
      }
      
      const nextVersion = latestRevision ? latestRevision.version + 1 : 1;
      
      const revision: Revision = {
        id: uuidv4(),
        assetId,
        version: nextVersion,
        createdAt: new Date().toISOString(),
        createdBy: userId,
        changes,
        status: 'draft',
        metadata
      };
      
      const { error: insertError } = await supabase
        .from('revisions')
        .insert({
          id: revision.id,
          asset_id: revision.assetId,
          version: revision.version,
          created_at: revision.createdAt,
          created_by: revision.createdBy,
          changes: revision.changes,
          status: revision.status,
          metadata: revision.metadata
        });
      
      if (insertError) {
        logger.error('Error creating revision:', insertError);
        throw insertError;
      }
      
      return revision;
    } catch (error) {
      logger.error('Error in createRevision:', error);
      throw error;
    }
  }
  
  async getRevisions(assetId: string): Promise<Revision[]> {
    try {
      const { data, error } = await supabase
        .from('revisions')
        .select('*')
        .eq('asset_id', assetId)
        .order('version', { ascending: false });
      
      if (error) {
        logger.error('Error getting revisions:', error);
        throw error;
      }
      
      return data.map(item => ({
        id: item.id,
        assetId: item.asset_id,
        version: item.version,
        createdAt: item.created_at,
        createdBy: item.created_by,
        changes: item.changes,
        status: item.status,
        metadata: item.metadata
      }));
    } catch (error) {
      logger.error('Error in getRevisions:', error);
      throw error;
    }
  }
  
  async getRevision(revisionId: string): Promise<Revision> {
    try {
      const { data, error } = await supabase
        .from('revisions')
        .select('*')
        .eq('id', revisionId)
        .single();
      
      if (error) {
        logger.error('Error getting revision:', error);
        throw error;
      }
      
      return {
        id: data.id,
        assetId: data.asset_id,
        version: data.version,
        createdAt: data.created_at,
        createdBy: data.created_by,
        changes: data.changes,
        status: data.status,
        metadata: data.metadata
      };
    } catch (error) {
      logger.error('Error in getRevision:', error);
      throw error;
    }
  }
  
  async compareRevisions(currentRevisionId: string, previousRevisionId?: string): Promise<RevisionComparison> {
    try {
      // Get the current revision
      const current = await this.getRevision(currentRevisionId);
      
      // If no previous revision ID is provided, find the previous version
      if (!previousRevisionId) {
        const { data, error } = await supabase
          .from('revisions')
          .select('*')
          .eq('asset_id', current.assetId)
          .lt('version', current.version)
          .order('version', { ascending: false })
          .limit(1)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          logger.error('Error finding previous revision:', error);
          throw error;
        }
        
        if (data) {
          previousRevisionId = data.id;
        }
      }
      
      // If we have a previous revision, get it and compare
      if (previousRevisionId) {
        const previous = await this.getRevision(previousRevisionId);
        
        // Simple string comparison for now - could be enhanced with diff algorithm
        const currentChanges = JSON.parse(current.changes);
        const previousChanges = JSON.parse(previous.changes);
        
        // Find differences (very basic implementation)
        const differences = Object.keys(currentChanges).filter(key => {
          return JSON.stringify(currentChanges[key]) !== JSON.stringify(previousChanges[key]);
        });
        
        return {
          current,
          previous,
          differences
        };
      }
      
      // If no previous revision, just return the current one
      return { current };
    } catch (error) {
      logger.error('Error in compareRevisions:', error);
      throw error;
    }
  }
  
  async updateRevisionStatus(revisionId: string, status: 'draft' | 'published' | 'archived'): Promise<Revision> {
    try {
      const { data, error } = await supabase
        .from('revisions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', revisionId)
        .select()
        .single();
      
      if (error) {
        logger.error('Error updating revision status:', error);
        throw error;
      }
      
      return {
        id: data.id,
        assetId: data.asset_id,
        version: data.version,
        createdAt: data.created_at,
        createdBy: data.created_by,
        changes: data.changes,
        status: data.status,
        metadata: data.metadata
      };
    } catch (error) {
      logger.error('Error in updateRevisionStatus:', error);
      throw error;
    }
  }
}

export const revisionService = new RevisionService();
