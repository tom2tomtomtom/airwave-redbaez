import { supabase } from '../db/supabaseClient';
import { ApiError } from '../middleware/errorHandler';
import { ErrorCode } from '../types/errorTypes';
import { redis } from '../db/redisClient';

// Types
export type Permission = string;

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
}

interface CachedPermissions {
  permissions: Permission[];
  timestamp: number;
}

/**
 * Permission service for role-based access control
 */
class PermissionService {
  private static instance: PermissionService;
  private readonly permissionCacheTtl: number = 15 * 60 * 1000; // 15 minutes

  // Define all possible permissions in the system
  public readonly PERMISSIONS = {
    // User management
    USER_VIEW: 'user:view',
    USER_CREATE: 'user:create',
    USER_UPDATE: 'user:update',
    USER_DELETE: 'user:delete',
    
    // Client management
    CLIENT_VIEW: 'client:view',
    CLIENT_CREATE: 'client:create',
    CLIENT_UPDATE: 'client:update',
    CLIENT_DELETE: 'client:delete',
    
    // Asset management
    ASSET_VIEW: 'asset:view', 
    ASSET_CREATE: 'asset:create',
    ASSET_UPDATE: 'asset:update',
    ASSET_DELETE: 'asset:delete',
    
    // Campaign management
    CAMPAIGN_VIEW: 'campaign:view',
    CAMPAIGN_CREATE: 'campaign:create',
    CAMPAIGN_UPDATE: 'campaign:update',
    CAMPAIGN_DELETE: 'campaign:delete',
    
    // System administration
    SYSTEM_SETTINGS: 'system:settings',
    SYSTEM_LOGS: 'system:logs',
    
    // Copy generation
    COPY_GENERATE: 'copy:generate',
    COPY_APPROVE: 'copy:approve'
  } as const;

  // Define role permissions
  private readonly DEFAULT_ROLES: Record<string, Permission[]> = {
    admin: Object.values(this.PERMISSIONS),
    manager: [
      this.PERMISSIONS.USER_VIEW,
      this.PERMISSIONS.CLIENT_VIEW,
      this.PERMISSIONS.CLIENT_UPDATE,
      this.PERMISSIONS.ASSET_VIEW,
      this.PERMISSIONS.ASSET_CREATE,
      this.PERMISSIONS.ASSET_UPDATE,
      this.PERMISSIONS.CAMPAIGN_VIEW,
      this.PERMISSIONS.CAMPAIGN_CREATE,
      this.PERMISSIONS.CAMPAIGN_UPDATE,
      this.PERMISSIONS.COPY_GENERATE,
      this.PERMISSIONS.COPY_APPROVE
    ],
    editor: [
      this.PERMISSIONS.CLIENT_VIEW,
      this.PERMISSIONS.ASSET_VIEW,
      this.PERMISSIONS.ASSET_CREATE,
      this.PERMISSIONS.ASSET_UPDATE,
      this.PERMISSIONS.CAMPAIGN_VIEW,
      this.PERMISSIONS.CAMPAIGN_UPDATE,
      this.PERMISSIONS.COPY_GENERATE
    ],
    viewer: [
      this.PERMISSIONS.CLIENT_VIEW,
      this.PERMISSIONS.ASSET_VIEW,
      this.PERMISSIONS.CAMPAIGN_VIEW
    ]
  };

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): PermissionService {
    if (!PermissionService.instance) {
      PermissionService.instance = new PermissionService();
    }
    return PermissionService.instance;
  }

  /**
   * Get permissions for a specific role
   */
  public async getRolePermissions(role: string): Promise<Permission[]> {
    try {
      // First check if role permissions are in the database
      const { data: roleData, error } = await supabase
        .from('roles')
        .select('permissions')
        .eq('name', role)
        .single();

      if (roleData) {
        return roleData.permissions;
      }

      // Fall back to default roles if not in database
      if (this.DEFAULT_ROLES[role]) {
        return this.DEFAULT_ROLES[role];
      }

      // Default to empty permissions for unknown roles
      return [];
    } catch (error) {
      logger.error('Error fetching role permissions:', error);
      // Fall back to default roles in case of error
      return this.DEFAULT_ROLES[role] || [];
    }
  }

  /**
   * Get user permissions (with caching)
   */
  public async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      // Check cache first
      const cacheKey = `user:${userId}:permissions`;
      const cachedData = await redis.get(cacheKey);
      
      if (cachedData) {
        const parsed = JSON.parse(cachedData) as CachedPermissions;
        
        // If cache is still valid
        if (Date.now() - parsed.timestamp < this.permissionCacheTtl) {
          return parsed.permissions;
        }
      }
      
      // Get user role from the database
      const { data: userData, error } = await supabase
        .from('users')
        .select('role, custom_permissions')
        .eq('id', userId)
        .single();
      
      if (error) {
        throw new ApiError({
          statusCode: 404,
          message: 'User not found',
          code: ErrorCode.USER_NOT_FOUND
        });
      }
      
      // Get base permissions for the role
      const rolePermissions = await this.getRolePermissions(userData.role || 'viewer');
      
      // Combine with any custom permissions for the user
      const allPermissions = [
        ...rolePermissions,
        ...(userData.custom_permissions || [])
      ];
      
      // Remove duplicates
      const uniquePermissions = [...new Set(allPermissions)];
      
      // Cache the permissions
      await redis.set(
        cacheKey,
        JSON.stringify({
          permissions: uniquePermissions,
          timestamp: Date.now()
        }),
        'EX',
        Math.floor(this.permissionCacheTtl / 1000)
      );
      
      return uniquePermissions;
    } catch (error) {
      logger.error('Error getting user permissions:', error);
      if (error instanceof ApiError) throw error;
      
      throw new ApiError({
        statusCode: 500,
        message: 'Failed to retrieve user permissions',
        code: ErrorCode.INTERNAL_ERROR
      });
    }
  }

  /**
   * Check if a user has a specific permission
   */
  public async hasPermission(userId: string, permission: Permission): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(permission);
  }

  /**
   * Check if a user has all of the specified permissions
   */
  public async hasAllPermissions(userId: string, permissions: Permission[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return permissions.every(permission => userPermissions.includes(permission));
  }

  /**
   * Check if a user has any of the specified permissions
   */
  public async hasAnyPermission(userId: string, permissions: Permission[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return permissions.some(permission => userPermissions.includes(permission));
  }

  /**
   * Get user role from database
   */
  public async getUserRole(userId: string): Promise<{role: string} | null> {
    try {
      // Get user role from the database
      const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error || !userData) {
        return null;
      }
      
      return userData;
    } catch (error) {
      logger.error('Error getting user role:', error);
      return null;
    }
  }

  /**
   * Invalidate permissions cache for a user
   */
  public async invalidateUserPermissionsCache(userId: string): Promise<void> {
    const cacheKey = `user:${userId}:permissions`;
    await redis.del(cacheKey);
  }

  /**
   * Get all available roles
   */
  public async getAllRoles(): Promise<Role[]> {
    try {
      // First try to get roles from database
      const { data: roles, error } = await supabase
        .from('roles')
        .select('*');
      
      if (roles && roles.length > 0) {
        return roles;
      }
      
      // Fall back to default roles if none in database
      return Object.entries(this.DEFAULT_ROLES).map(([name, permissions]) => ({
        id: name,
        name,
        description: `${name.charAt(0).toUpperCase() + name.slice(1)} role`,
        permissions
      }));
    } catch (error) {
      logger.error('Error fetching roles:', error);
      
      // Fall back to default roles
      return Object.entries(this.DEFAULT_ROLES).map(([name, permissions]) => ({
        id: name,
        name,
        description: `${name.charAt(0).toUpperCase() + name.slice(1)} role`,
        permissions
      }));
    }
  }
}

export const permissionService = PermissionService.getInstance();
