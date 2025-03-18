import { supabase } from '../db/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

// Initialize OpenAI with API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

// Validate OpenAI configuration
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️ WARNING: OPENAI_API_KEY environment variable is missing or empty.');
  console.warn('The Strategic Content Development module requires an OpenAI API key to function properly.');
  console.warn('Please add the OPENAI_API_KEY to your .env file.');
}

// Brief interface that matches the database schema
interface DbBrief {
  id: string;
  title: string;
  content: string;
  user_id: string;
  organisation_id?: string;
  status: string;
  meta?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Application-level Brief interface
export interface Brief {
  id: string;
  title: string;
  content: string;
  userId: string;
  organisationId?: string;
  status: string;
  analysis?: BriefAnalysis;
  tags?: string[];
  insights?: string[];
  createdAt: string;
  updatedAt: string;
}

// Brief analysis interface - represents AI-generated analysis
export interface BriefAnalysis {
  targetAudience: string[];
  keyMessages: string[];
  toneOfVoice: string[];
  campaignObjectives: string[];
  insightsAndRecommendations: string;
  suggestedVisualDirection: string;
}

// Service result
export interface ServiceResult<T = any> {
  success: boolean;
  message?: string;
  code?: number;
  data?: T;
}

// Brief filters for querying
export interface BriefFilters {
  userId?: string;
  organisationId?: string;
  status?: string[];
  searchTerm?: string;
  sortBy?: 'title' | 'createdAt' | 'updatedAt';
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// Brief creation data
export interface BriefCreationData {
  title: string;
  content: string;
  userId: string;
  organisationId?: string;
  tags?: string[];
}

class BriefService {
  /**
   * Create a new brief
   * @param briefData Brief creation data
   */
  async createBrief(briefData: BriefCreationData): Promise<ServiceResult<Brief>> {
    try {
      const briefId = uuidv4();
      const now = new Date().toISOString();
      
      // Prepare the brief object with meta data
      const brief: DbBrief = {
        id: briefId,
        title: briefData.title,
        content: briefData.content,
        user_id: briefData.userId,
        organisation_id: briefData.organisationId,
        status: 'draft', // Initial status
        meta: {
          tags: briefData.tags || [],
          analysisStatus: 'pending'
        },
        created_at: now,
        updated_at: now
      };
      
      // Insert into database
      const { data, error } = await supabase
        .from('briefs')
        .insert(brief)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating brief:', error);
        return {
          success: false,
          message: `Failed to create brief: ${error.message}`,
          code: 500
        };
      }
      
      // Queue the brief for analysis (could be done asynchronously)
      this.queueBriefForAnalysis(briefId).catch(err => {
        console.error(`Error queueing brief ${briefId} for analysis:`, err);
      });
      
      // Transform and return the created brief
      const createdBrief = this.transformBriefFromDb(data);
      return {
        success: true,
        message: 'Brief created successfully',
        data: createdBrief
      };
    } catch (error: any) {
      console.error('Error in createBrief:', error);
      return {
        success: false,
        message: `Failed to create brief: ${error.message || 'Unknown error'}`,
        code: 500
      };
    }
  }
  
  /**
   * Queue a brief for AI analysis
   * @param briefId ID of the brief to analyze
   */
  async queueBriefForAnalysis(briefId: string): Promise<void> {
    try {
      // Update the brief status to show it's being analyzed
      await supabase
        .from('briefs')
        .update({
          meta: {
            analysisStatus: 'processing'
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', briefId);
      
      // Start the analysis process
      this.analyzeBrief(briefId).catch(async (err) => {
        console.error(`Error analyzing brief ${briefId}:`, err);
        
        // Update status to failed
        try {
          const { error } = await supabase
            .from('briefs')
            .update({
              meta: {
                analysisStatus: 'failed',
                analysisError: err.message
              },
              updated_at: new Date().toISOString()
            })
            .eq('id', briefId);
            
          if (error) {
            console.error(`Error updating brief ${briefId} status:`, error);
          } else {
            console.log(`Updated brief ${briefId} status to failed`);
          }
        } catch (updateErr) {
          console.error(`Error updating brief ${briefId} status:`, updateErr);
        }
      });
    } catch (error) {
      console.error(`Error queueing brief ${briefId} for analysis:`, error);
      throw error;
    }
  }
  
  /**
   * Analyze a brief using OpenAI
   * @param briefId ID of the brief to analyze
   */
  async analyzeBrief(briefId: string): Promise<ServiceResult<BriefAnalysis>> {
    try {
      // Get the brief from the database
      const { data: brief, error: fetchError } = await supabase
        .from('briefs')
        .select('*')
        .eq('id', briefId)
        .single();
      
      if (fetchError || !brief) {
        throw new Error(`Failed to fetch brief: ${fetchError?.message || 'Brief not found'}`);
      }
      
      // Extract the brief content
      const { title, content } = brief;
      
      // Prepare the prompt for OpenAI
      const prompt = `
        Analyze the following client brief for an advertising campaign:
        
        Title: ${title}
        
        Content:
        ${content}
        
        Please provide a comprehensive analysis with the following components:
        1. Target Audience: Identify the primary and secondary target audiences
        2. Key Messages: Extract the 3-5 main messages to be communicated
        3. Tone of Voice: Suggest 3-5 tone of voice options that would suit this campaign
        4. Campaign Objectives: Identify the main objectives of this campaign
        5. Insights and Recommendations: Provide strategic insights and recommendations based on the brief
        6. Suggested Visual Direction: Recommend a visual direction for the campaign assets
        
        Format your response in JSON with the following structure:
        {
          "targetAudience": ["Primary audience", "Secondary audience"],
          "keyMessages": ["Message 1", "Message 2", "Message 3"],
          "toneOfVoice": ["Option 1", "Option 2", "Option 3"],
          "campaignObjectives": ["Objective 1", "Objective 2"],
          "insightsAndRecommendations": "Detailed insights and recommendations paragraph",
          "suggestedVisualDirection": "Detailed visual direction paragraph"
        }
      `;
      
      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // Using latest model
        messages: [
          {
            role: "system",
            content: "You are an expert advertising strategist specializing in campaign analysis. You extract key insights from client briefs and provide strategic recommendations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      });
      
      // Get the response content
      const responseContent = completion.choices[0].message.content;
      
      if (!responseContent) {
        throw new Error('Empty response from OpenAI');
      }
      
      // Parse the JSON response
      let analysis: BriefAnalysis;
      try {
        analysis = JSON.parse(responseContent) as BriefAnalysis;
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        throw new Error('Invalid response format from OpenAI');
      }
      
      // Update the brief with the analysis
      const currentMeta = brief.meta || {};
      const updatedMeta = {
        ...currentMeta,
        analysis,
        analysisStatus: 'completed',
        analyzedAt: new Date().toISOString()
      };
      
      // Save to database
      const { error: updateError } = await supabase
        .from('briefs')
        .update({
          meta: updatedMeta,
          status: 'analyzed', // Update status to indicate analysis is complete
          updated_at: new Date().toISOString()
        })
        .eq('id', briefId);
      
      if (updateError) {
        throw new Error(`Failed to update brief with analysis: ${updateError.message}`);
      }
      
      return {
        success: true,
        message: 'Brief analysis completed successfully',
        data: analysis
      };
    } catch (error: any) {
      console.error(`Error analyzing brief ${briefId}:`, error);
      
      // Update the brief status to failed
      try {
        const { data: brief } = await supabase
          .from('briefs')
          .select('meta')
          .eq('id', briefId)
          .single();
        
        const currentMeta = brief?.meta || {};
        const updatedMeta = {
          ...currentMeta,
          analysisStatus: 'failed',
          analysisError: error.message || 'Unknown error'
        };
        
        await supabase
          .from('briefs')
          .update({
            meta: updatedMeta,
            updated_at: new Date().toISOString()
          })
          .eq('id', briefId);
      } catch (updateError) {
        console.error(`Error updating brief ${briefId} status:`, updateError);
      }
      
      return {
        success: false,
        message: `Failed to analyze brief: ${error.message || 'Unknown error'}`,
        code: 500
      };
    }
  }
  
  /**
   * Get a brief by ID
   * @param id Brief ID
   * @param userId User ID making the request (for security)
   */
  async getBriefById(id: string, userId: string): Promise<ServiceResult<Brief>> {
    try {
      // Get the brief with security check
      const { data, error } = await supabase
        .from('briefs')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        return {
          success: false,
          message: `Failed to fetch brief: ${error.message}`,
          code: error.code === 'PGRST116' ? 404 : 500
        };
      }
      
      // Security check in production
      const isDevelopment = process.env.NODE_ENV !== 'production';
      if (!isDevelopment && data.user_id !== userId) {
        return {
          success: false,
          message: 'You do not have permission to access this brief',
          code: 403
        };
      }
      
      const brief = this.transformBriefFromDb(data);
      return {
        success: true,
        data: brief
      };
    } catch (error: any) {
      console.error(`Error fetching brief with ID ${id}:`, error);
      return {
        success: false,
        message: `Failed to fetch brief: ${error.message || 'Unknown error'}`,
        code: 500
      };
    }
  }
  
  /**
   * Get briefs with optional filtering and pagination
   * @param filters Filters to apply
   */
  async getBriefs(filters: BriefFilters = {}): Promise<ServiceResult<{ briefs: Brief[]; total: number }>> {
    try {
      // Start building the query
      let query = supabase
        .from('briefs')
        .select('*', { count: 'exact' });
      
      // Apply security filter - user_id must match
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      
      // Apply organisation filter if provided
      if (filters.organisationId) {
        query = query.eq('organisation_id', filters.organisationId);
      }
      
      // Apply status filter if provided
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      
      // Apply search term filter if provided
      if (filters.searchTerm) {
        const searchTerm = filters.searchTerm.trim();
        
        // For short or simple searches, use pattern matching
        if (searchTerm.length < 3 || !searchTerm.includes(' ')) {
          query = query.or(
            `title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`
          );
        } else {
          // For more complex searches, use full-text search
          const formattedSearchTerm = searchTerm
            .split(' ')
            .filter(word => word.length > 0)
            .map(word => word + ':*')
            .join(' & ');
          
          query = query.or(
            `title.wfts.${formattedSearchTerm},content.wfts.${formattedSearchTerm}`
          );
        }
      }
      
      // Apply sorting
      const sortBy = filters.sortBy || 'createdAt';
      const sortDirection = filters.sortDirection || 'desc';
      const dbSortBy = this.getDbFieldName(sortBy);
      query = query.order(dbSortBy, { ascending: sortDirection === 'asc' });
      
      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      
      if (filters.offset) {
        query = query.range(
          filters.offset, 
          filters.offset + (filters.limit || 20) - 1
        );
      }
      
      // Execute the query
      const { data, error, count } = await query;
      
      if (error) {
        return {
          success: false,
          message: `Failed to fetch briefs: ${error.message}`,
          code: 500,
          data: { briefs: [], total: 0 }
        };
      }
      
      // Transform the briefs
      const briefs = data.map(brief => this.transformBriefFromDb(brief));
      
      return {
        success: true,
        data: {
          briefs,
          total: count || 0
        }
      };
    } catch (error: any) {
      console.error('Error fetching briefs:', error);
      return {
        success: false,
        message: `Failed to fetch briefs: ${error.message || 'Unknown error'}`,
        code: 500,
        data: { briefs: [], total: 0 }
      };
    }
  }
  
  /**
   * Update a brief
   * @param id Brief ID
   * @param userId User ID making the request (for security)
   * @param updates Updates to apply
   */
  async updateBrief(
    id: string, 
    userId: string, 
    updates: Partial<Brief>
  ): Promise<ServiceResult<Brief>> {
    try {
      // Get the current brief for security check
      const { data: existingBrief, error: fetchError } = await supabase
        .from('briefs')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        return {
          success: false,
          message: `Failed to fetch brief: ${fetchError.message}`,
          code: fetchError.code === 'PGRST116' ? 404 : 500
        };
      }
      
      // Security check in production
      const isDevelopment = process.env.NODE_ENV !== 'production';
      if (!isDevelopment && existingBrief.user_id !== userId) {
        return {
          success: false,
          message: 'You do not have permission to update this brief',
          code: 403
        };
      }
      
      // Prepare updates
      const dbUpdates: Partial<DbBrief> = {
        updated_at: new Date().toISOString()
      };
      
      // Map fields from the update object to the DB fields
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.content !== undefined) dbUpdates.content = updates.content;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      
      // Handle meta updates (tags, insights, etc.)
      if (updates.tags || updates.insights || updates.analysis) {
        const currentMeta = existingBrief.meta || {};
        
        const updatedMeta = { ...currentMeta };
        
        if (updates.tags) updatedMeta.tags = updates.tags;
        if (updates.insights) updatedMeta.insights = updates.insights;
        if (updates.analysis) updatedMeta.analysis = updates.analysis;
        
        dbUpdates.meta = updatedMeta;
      }
      
      // Apply updates
      const { data, error } = await supabase
        .from('briefs')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        return {
          success: false,
          message: `Failed to update brief: ${error.message}`,
          code: 500
        };
      }
      
      // If we updated the content and the brief was already analyzed,
      // we should queue it for re-analysis
      if (updates.content && existingBrief.status === 'analyzed') {
        // Update status to indicate it needs re-analysis
        await supabase
          .from('briefs')
          .update({
            status: 'draft',
            meta: {
              ...data.meta,
              analysisStatus: 'pending'
            }
          })
          .eq('id', id);
        
        // Queue for re-analysis
        this.queueBriefForAnalysis(id).catch(err => {
          console.error(`Error queueing brief ${id} for re-analysis:`, err);
        });
      }
      
      const updatedBrief = this.transformBriefFromDb(data);
      return {
        success: true,
        message: 'Brief updated successfully',
        data: updatedBrief
      };
    } catch (error: any) {
      console.error(`Error updating brief with ID ${id}:`, error);
      return {
        success: false,
        message: `Failed to update brief: ${error.message || 'Unknown error'}`,
        code: 500
      };
    }
  }
  
  /**
   * Delete a brief
   * @param id Brief ID
   * @param userId User ID making the request (for security)
   */
  async deleteBrief(id: string, userId: string): Promise<ServiceResult<boolean>> {
    try {
      // Get the brief for security check
      const { data: brief, error: fetchError } = await supabase
        .from('briefs')
        .select('user_id')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        return {
          success: false,
          message: `Failed to fetch brief: ${fetchError.message}`,
          code: fetchError.code === 'PGRST116' ? 404 : 500
        };
      }
      
      // Security check in production
      const isDevelopment = process.env.NODE_ENV !== 'production';
      if (!isDevelopment && brief.user_id !== userId) {
        return {
          success: false,
          message: 'You do not have permission to delete this brief',
          code: 403
        };
      }
      
      // Delete the brief
      const { error } = await supabase
        .from('briefs')
        .delete()
        .eq('id', id);
      
      if (error) {
        return {
          success: false,
          message: `Failed to delete brief: ${error.message}`,
          code: 500
        };
      }
      
      return {
        success: true,
        message: 'Brief deleted successfully',
        data: true
      };
    } catch (error: any) {
      console.error(`Error deleting brief with ID ${id}:`, error);
      return {
        success: false,
        message: `Failed to delete brief: ${error.message || 'Unknown error'}`,
        code: 500
      };
    }
  }
  
  /**
   * Generate content for a brief using OpenAI
   * @param briefId Brief ID
   * @param options Content generation options
   */
  async generateContent(
    briefId: string,
    userId: string,
    options: {
      contentType: 'copy' | 'headline' | 'tagline' | 'cta';
      count: number;
      toneOfVoice?: string;
      targetLength?: 'short' | 'medium' | 'long';
      additionalInstructions?: string;
    }
  ): Promise<ServiceResult<string[]>> {
    try {
      // Get the brief from the database
      const briefResult = await this.getBriefById(briefId, userId);
      
      if (!briefResult.success || !briefResult.data) {
        return {
          success: false,
          message: briefResult.message || 'Brief not found',
          code: briefResult.code || 404
        };
      }
      
      const brief = briefResult.data;
      
      // Check if the brief has been analyzed
      if (!brief.analysis) {
        return {
          success: false,
          message: 'Brief has not been analyzed yet. Analysis is required before generating content.',
          code: 400
        };
      }
      
      // Map content type to a descriptive name for the prompt
      const contentTypeMap = {
        copy: 'Ad Copy',
        headline: 'Headline',
        tagline: 'Tagline',
        cta: 'Call to Action'
      };
      
      // Map target length to word count guidance
      const lengthGuidance = {
        short: options.contentType === 'copy' ? '30-50 words' : '3-5 words',
        medium: options.contentType === 'copy' ? '75-100 words' : '5-10 words',
        long: options.contentType === 'copy' ? '150-200 words' : '10-15 words'
      };
      
      const targetLength = options.targetLength || 'medium';
      
      // Extract key elements from the brief analysis
      const { 
        targetAudience, 
        keyMessages, 
        toneOfVoice,
        campaignObjectives 
      } = brief.analysis;
      
      // Prepare the prompt for OpenAI
      const prompt = `
        Generate ${options.count} unique and creative ${contentTypeMap[options.contentType]} options for the following advertising campaign brief:
        
        TITLE: ${brief.title}
        
        BRIEF SUMMARY: ${brief.content.substring(0, 300)}...
        
        TARGET AUDIENCE: ${targetAudience.join(', ')}
        
        KEY MESSAGES: ${keyMessages.join(', ')}
        
        CAMPAIGN OBJECTIVES: ${campaignObjectives.join(', ')}
        
        TONE OF VOICE: ${options.toneOfVoice || toneOfVoice[0]}
        
        LENGTH GUIDANCE: ${lengthGuidance[targetLength as keyof typeof lengthGuidance]}
        
        ${options.additionalInstructions ? `ADDITIONAL INSTRUCTIONS: ${options.additionalInstructions}` : ''}
        
        Format your response as a JSON array of strings, with each element being one ${contentTypeMap[options.contentType].toLowerCase()} option.
        Example: ["Option 1", "Option 2", "Option 3"]
        
        Make each option unique and distinctive. Aim for variety in approach while staying on-brief.
      `;
      
      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // Using latest model
        messages: [
          {
            role: "system",
            content: "You are an expert advertising copywriter specializing in creating compelling and effective ad content. You craft content that resonates with the target audience and achieves campaign objectives."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      });
      
      // Get the response content
      const responseContent = completion.choices[0].message.content;
      
      if (!responseContent) {
        throw new Error('Empty response from OpenAI');
      }
      
      // Parse the JSON response
      let generatedContent: string[];
      try {
        // The API should return a JSON object with a property containing the array
        // Try to parse it directly as an array first
        const parsed = JSON.parse(responseContent);
        
        // If it's already an array, use it
        if (Array.isArray(parsed)) {
          generatedContent = parsed;
        } 
        // If it's an object with a single property that is an array, use that
        else if (typeof parsed === 'object' && parsed !== null) {
          // Find the first property that is an array
          const arrayProp = Object.values(parsed).find(Array.isArray);
          if (arrayProp && Array.isArray(arrayProp)) {
            generatedContent = arrayProp;
          } else {
            // Fallback - convert all string values to an array
            generatedContent = Object.values(parsed)
              .filter(val => typeof val === 'string')
              .map(val => val.toString());
          }
        } else {
          throw new Error('Response format is not a valid array or object');
        }
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError, responseContent);
        throw new Error('Invalid response format from OpenAI');
      }
      
      // Ensure we have the requested number of options
      if (generatedContent.length < options.count) {
        console.warn(`OpenAI returned fewer options (${generatedContent.length}) than requested (${options.count})`);
      }
      
      // Save the generated content to the brief's metadata
      try {
        const { data: briefData } = await supabase
          .from('briefs')
          .select('meta')
          .eq('id', briefId)
          .single();
        
        const currentMeta = briefData?.meta || {};
        const contentType = options.contentType;
        
        // Create the generated content history structure if it doesn't exist
        if (!currentMeta.generatedContent) {
          currentMeta.generatedContent = {};
        }
        
        if (!currentMeta.generatedContent[contentType]) {
          currentMeta.generatedContent[contentType] = [];
        }
        
        // Add the new generated content with timestamp
        currentMeta.generatedContent[contentType].push({
          content: generatedContent,
          timestamp: new Date().toISOString(),
          options: {
            toneOfVoice: options.toneOfVoice,
            targetLength,
            additionalInstructions: options.additionalInstructions
          }
        });
        
        // Update the brief with the new metadata
        await supabase
          .from('briefs')
          .update({
            meta: currentMeta,
            updated_at: new Date().toISOString()
          })
          .eq('id', briefId);
      } catch (updateError) {
        console.error(`Error updating brief ${briefId} with generated content:`, updateError);
        // Continue anyway - we'll return the generated content even if we couldn't save it
      }
      
      return {
        success: true,
        message: `Generated ${generatedContent.length} ${contentTypeMap[options.contentType].toLowerCase()} options successfully`,
        data: generatedContent
      };
    } catch (error: any) {
      console.error(`Error generating content for brief ${briefId}:`, error);
      return {
        success: false,
        message: `Failed to generate content: ${error.message || 'Unknown error'}`,
        code: 500
      };
    }
  }
  
  /**
   * Helper to transform database field names to API field names
   * @param apiFieldName API field name
   * @returns Database field name
   */
  private getDbFieldName(apiFieldName: string): string {
    const fieldMap: Record<string, string> = {
      'userId': 'user_id',
      'organisationId': 'organisation_id',
      'createdAt': 'created_at',
      'updatedAt': 'updated_at'
    };
    
    return fieldMap[apiFieldName] || apiFieldName;
  }
  
  /**
   * Transform a brief from database format to API format
   * @param dbBrief Brief from database
   * @returns Transformed brief
   */
  private transformBriefFromDb(dbBrief: DbBrief): Brief {
    const meta = dbBrief.meta || {};
    
    return {
      id: dbBrief.id,
      title: dbBrief.title,
      content: dbBrief.content,
      userId: dbBrief.user_id,
      organisationId: dbBrief.organisation_id,
      status: dbBrief.status,
      analysis: meta.analysis,
      tags: meta.tags || [],
      insights: meta.insights || [],
      createdAt: dbBrief.created_at,
      updatedAt: dbBrief.updated_at
    };
  }
}

export const briefService = new BriefService();
