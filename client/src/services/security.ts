import { supabase } from '../supabaseClient';
import { monitoring } from './monitoring';
import { textContent } from '../utils/textContent';

interface SecurityContext {
  organisationId: string;
  userId: string;
  roles: string[];
}

interface AssetValidation {
  size: number;
  type: string;
  name: string;
}

class SecurityService {
  private static instance: SecurityService;
  private context: SecurityContext | null = null;

  // Asset validation constants
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly ALLOWED_FILE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'video/mp4',
    'video/quicktime'
  ];

  private constructor() {}

  public static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  public setContext(context: SecurityContext) {
    this.context = context;
    monitoring.setOrganisationContext(context.organisationId);
  }

  public clearContext() {
    this.context = null;
    monitoring.clearOrganisationContext();
  }

  private validateContext() {
    if (!this.context) {
      throw new Error(textContent.errors.auth.sessionExpired);
    }
    return this.context;
  }
  
  public getOrganisationId(): string {
    const context = this.validateContext();
    return context.organisationId;
  }

  public async validateAsset({ size, type, name }: AssetValidation): Promise<void> {
    const context = this.validateContext();

    // Validate file size
    if (size > this.MAX_FILE_SIZE) {
      throw new Error(textContent.errors.assets.upload.sizeLimitExceeded);
    }

    // Validate file type
    if (!this.ALLOWED_FILE_TYPES.includes(type)) {
      throw new Error(textContent.errors.assets.upload.invalidType);
    }

    // Check for malicious file extensions
    const dangerousExtensions = ['.exe', '.bat', '.sh', '.js', '.php', '.py'];
    if (dangerousExtensions.some(ext => name.toLowerCase().endsWith(ext))) {
      throw new Error(textContent.errors.assets.upload.invalidType);
    }

    // Check rate limit
    const isWithinLimit = await this.enforceRateLimit('asset_upload', 100, 3600);
    if (!isWithinLimit) {
      throw new Error(textContent.errors.assets.upload.rateLimitExceeded);
    }

    // Log validation with sanitised inputs
    monitoring.logInfo('Asset validation passed', {
      action: 'validateAsset',
      context: {
        fileName: this.sanitiseInput(name),
        fileType: this.sanitiseInput(type),
        fileSize: size,
        organisationId: context.organisationId
      }
    });
  }

  public async validateOrganisationAccess(resourceId: string, table: string): Promise<boolean> {
    const context = this.validateContext();

    try {
      // First check if user has active organisation membership
      const { data: membership, error: membershipError } = await supabase
        .from('user_organisations')
        .select('is_active')
        .eq('user_id', context.userId)
        .eq('organisation_id', context.organisationId)
        .single();

      if (membershipError || !membership?.is_active) {
        throw new Error(textContent.errors.auth.organisationRequired);
      }

      // Then check resource ownership
      const { data, error } = await supabase
        .from(table)
        .select('organisation_id')
        .eq('id', resourceId)
        .single();

      if (error) throw error;

      const hasAccess = data.organisation_id === context.organisationId;

      if (!hasAccess) {
        monitoring.logWarning('Unauthorised organisation access attempt', {
          action: 'validateOrganisationAccess',
          context: {
            resourceId,
            table,
            attemptedOrganisationId: context.organisationId,
            userId: context.userId
          }
        });

        throw new Error(textContent.errors.assets.access.organisationMismatch);
      }

      return true;
    } catch (error) {
      monitoring.logError(error as Error, {
        action: 'validateOrganisationAccess',
        context: {
          resourceId,
          table,
          organisationId: context.organisationId,
          userId: context.userId
        }
      });
      return false;
    }
  }

  public async validateRole(requiredRole: string): Promise<boolean> {
    const context = this.validateContext();

    const hasRole = context.roles.includes(requiredRole);

    if (!hasRole) {
      monitoring.logWarning('Unauthorised role access attempt', {
        action: 'validateRole',
        context: {
          requiredRole,
          userRoles: context.roles
        }
      });
    }

    return hasRole;
  }

  public async validateCampaignAccess(campaignId: string): Promise<boolean> {
    return this.validateOrganisationAccess(campaignId, 'campaigns');
  }

  public async validateAssetAccess(assetId: string): Promise<boolean> {
    return this.validateOrganisationAccess(assetId, 'assets');
  }

  public async validateApprovalAccess(approvalId: string): Promise<boolean> {
    return this.validateOrganisationAccess(approvalId, 'approval_requests');
  }

  /**
   * Sanitises user input to prevent XSS attacks
   * @param input String to sanitise
   * @returns Sanitised string safe for rendering
   */
  public sanitiseInput(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    // Create a temporary element to use the browser's built-in sanitisation
    const doc = new DOMParser().parseFromString(input, 'text/html');
    
    // Extract text content only, removing all HTML tags and attributes
    return doc.body.textContent || '';
  }

  /**
   * Recursively sanitises all string values in an object or array
   * @param obj Object or array to sanitise
   * @returns Sanitised object with the same structure
   */
  public sanitiseObject<T extends object>(obj: T): T {
    if (!obj || typeof obj !== 'object') return {} as T;
    
    // Handle both arrays and objects correctly
    const sanitised: any = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitised[key] = this.sanitiseInput(value);
      } else if (value !== null && typeof value === 'object') {
        sanitised[key] = this.sanitiseObject(value);
      } else {
        // Keep non-string primitives unchanged
        sanitised[key] = value;
      }
    }

    return sanitised as T;
  }

  public async enforceRateLimit(
    action: string,
    limit: number,
    timeWindow: number
  ): Promise<boolean> {
    const context = this.validateContext();

    const key = `ratelimit:${action}:${context.organisationId}:${context.userId}`;
    
    try {
      // Check current count
      const { data: currentCount, error } = await supabase
        .from('rate_limits')
        .select('count')
        .eq('key', key)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        throw error;
      }

      if (currentCount && currentCount.count >= limit) {
        monitoring.logWarning('Rate limit exceeded', {
          action: 'enforceRateLimit',
          context: { action, limit, timeWindow }
        });
        return false;
      }

      // Increment or create counter
      await supabase.rpc('increment_rate_limit', {
        p_key: key,
        p_window: timeWindow
      });

      return true;
    } catch (error) {
      monitoring.logError(error as Error, {
        action: 'enforceRateLimit',
        context: { action, limit, timeWindow }
      });
      return false;
    }
  }

  public async validateExportPermissions(
    campaignId: string,
    platform: string
  ): Promise<boolean> {
    const context = this.validateContext();

    try {
      // Check campaign access
      const hasCampaignAccess = await this.validateCampaignAccess(campaignId);
      if (!hasCampaignAccess) return false;

      // Check platform-specific permissions
      const { data, error } = await supabase
        .from('organisation_platforms')
        .select('permissions')
        .eq('organisation_id', context.organisationId)
        .eq('platform', platform)
        .single();

      if (error) throw error;

      return data.permissions.includes('export');
    } catch (error) {
      monitoring.logError(error as Error, {
        action: 'validateExportPermissions',
        context: { campaignId, platform }
      });
      return false;
    }
  }
}

export const security = SecurityService.getInstance();
