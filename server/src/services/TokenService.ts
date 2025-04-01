import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { Request } from 'express';
import { ApiError } from '../utils/ApiError';
import { ErrorCode } from '../types/errorTypes';
import { supabase } from '../db/supabaseClient';
import { redis } from '../db/redisClient';
import { logger } from '../utils/logger';
import { auditLogger, AuditEventType } from '../utils/auditLogger';

// Types
export interface TokenPayload {
  userId: string;
  role: string;
  email: string;
  sessionId: string;
  ipAddress?: string;     // IP address that the token was issued to
  fingerprint?: string;   // Browser fingerprint for additional validation
  issuedAt: number;       // When the token was issued (Unix timestamp)
  [key: string]: any;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

interface TokenOptions {
  expiresIn?: string | number;
  audience?: string | string[];
  issuer?: string;
}

/**
 * Service responsible for handling JWT token operations
 * Follows OAuth 2.0 best practices
 */
class TokenService {
  private static instance: TokenService;
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly defaultAccessExpiry: string;
  private readonly defaultRefreshExpiry: string;
  private readonly tokenIssuer: string;
  private readonly tokenAudience: string;

  private constructor() {
    // Read secrets from environment variables
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || 
      (process.env.NODE_ENV === 'production' 
        ? (() => { throw new Error('JWT_ACCESS_SECRET is required in production'); })() 
        : 'development_access_secret_do_not_use_in_production');
    
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 
      (process.env.NODE_ENV === 'production' 
        ? (() => { throw new Error('JWT_REFRESH_SECRET is required in production'); })() 
        : 'development_refresh_secret_do_not_use_in_production');
    
    // Token configuration
    this.defaultAccessExpiry = process.env.ACCESS_TOKEN_EXPIRY || '15m';
    this.defaultRefreshExpiry = process.env.REFRESH_TOKEN_EXPIRY || '7d';
    this.tokenIssuer = process.env.TOKEN_ISSUER || 'airwave-api';
    this.tokenAudience = process.env.TOKEN_AUDIENCE || 'airwave-client';
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }

  /**
   * Generate a new access token with security enhancements
   * @param payload Token payload with user information
   * @param options Optional token configuration
   * @returns JWT access token
   */
  public generateAccessToken(payload: TokenPayload, options: TokenOptions = {}): string {
    // Ensure payload has issuedAt for token freshness validation
    const enhancedPayload = {
      ...payload,
      issuedAt: payload.issuedAt || Math.floor(Date.now() / 1000)
    };
    
    // Force type to be compatible with jwt.SignOptions
    const expiryValue = options.expiresIn || this.defaultAccessExpiry;
    
    const tokenOptions: jwt.SignOptions = {
      expiresIn: expiryValue as jwt.SignOptions['expiresIn'],
      audience: options.audience || this.tokenAudience,
      issuer: options.issuer || this.tokenIssuer,
      jwtid: crypto.randomBytes(16).toString('hex'), // Unique token ID for revocation
      notBefore: 0 // Token is valid immediately
    };

    const token = jwt.sign(enhancedPayload, this.accessTokenSecret, tokenOptions);
    
    // Log token generation for security auditing
    logger.debug(`Access token generated for user ${payload.userId} with session ${payload.sessionId}`);
    
    return token;
  }

  /**
   * Generate a new refresh token
   */
  public generateRefreshToken(payload: { userId: string; sessionId: string; issuedAt?: number }, options: TokenOptions = {}): string {
    // Force type to be compatible with jwt.SignOptions
    const expiryValue = options.expiresIn || this.defaultRefreshExpiry;
    
    const tokenOptions: jwt.SignOptions = {
      expiresIn: expiryValue as jwt.SignOptions['expiresIn'],
      audience: options.audience || this.tokenAudience,
      issuer: options.issuer || this.tokenIssuer,
      jwtid: crypto.randomBytes(16).toString('hex')
    };

    const enhancedPayload = {
      ...payload,
      issuedAt: payload.issuedAt || Math.floor(Date.now() / 1000)
    };

    return jwt.sign(enhancedPayload, this.refreshTokenSecret, tokenOptions);
  }

  /**
   * Generate both access and refresh tokens with contextual security
   * @param userData User data for token generation
   * @param req Express request for IP validation
   * @returns TokenResponse with access and refresh tokens
   */
  public generateTokenPair(userData: { 
    userId: string; 
    role: string; 
    email: string;
    [key: string]: any;
  }, req?: Request): TokenResponse {
    // Create a unique session ID
    const sessionId = crypto.randomBytes(32).toString('hex');

    // Create token payload with enhanced security properties
    const tokenPayload: TokenPayload = {
      userId: userData.userId,
      role: userData.role,
      email: userData.email,
      sessionId,
      issuedAt: Math.floor(Date.now() / 1000),
      ...Object.fromEntries(
        Object.entries(userData).filter(([key]) => 
          !['userId', 'role', 'email'].includes(key)
        )
      )
    };
    
    // Add IP address binding if request is available
    if (req) {
      tokenPayload.ipAddress = req.ip;
      tokenPayload.fingerprint = req.headers['user-agent'] || 'unknown';
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(tokenPayload);
    const refreshToken = this.generateRefreshToken({ 
      userId: userData.userId, 
      sessionId,
      issuedAt: tokenPayload.issuedAt
    });

    // Store refresh token in Redis with expiry
    this.storeRefreshToken(refreshToken, userData.userId, sessionId);
    
    // Log to security audit
    auditLogger.logAuditEvent({
      eventType: AuditEventType.TOKEN_REFRESH,
      timestamp: new Date().toISOString(),
      userId: userData.userId,
      ipAddress: tokenPayload.ipAddress,
      userAgent: tokenPayload.fingerprint,
      sessionId,
      status: 'success',
      details: {
        tokenType: 'new_token_pair'
      }
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.getExpirySeconds(this.defaultAccessExpiry),
      tokenType: 'Bearer'
    };
  }

  /**
   * Store a refresh token in Redis
   */
  private async storeRefreshToken(token: string, userId: string, sessionId: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const expirySeconds = this.getExpirySeconds(this.defaultRefreshExpiry);
    
    try {
      // First, check for existing tokens for this user (limit to 5 sessions)
      const userTokensKey = `user:${userId}:refresh_tokens`;
      const activeTokens = await redis.sMembers(userTokensKey);
      
      if (activeTokens.length >= 5) {
        // Remove oldest token if limit reached
        const oldestToken = activeTokens[0];
        await redis.sRem(userTokensKey, oldestToken);
        await redis.del(`refresh_token:${oldestToken}`);
      }
      
      // Store token mapping details
      await redis.set(`refresh_token:${tokenHash}`, JSON.stringify({
        userId,
        sessionId,
        createdAt: Date.now()
      }), { EX: expirySeconds });
      
      // Add to user's tokens set
      await redis.sAdd(userTokensKey, tokenHash);
      await redis.expire(userTokensKey, expirySeconds);
    } catch (error) {
      console.error('Failed to store refresh token:', error);
      // Continue execution - token will still work but won't be in Redis
    }
  }

  /**
   * Verify an access token
   */
  public verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret) as TokenPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new ApiError(
          ErrorCode.INVALID_TOKEN,
          'Access token has expired'
        );
      }
      throw new ApiError(
        ErrorCode.INVALID_TOKEN,
        'Invalid access token'
      );
    }
  }

  /**
   * Verify a refresh token
   */
  public async verifyRefreshToken(token: string): Promise<{ 
    userId: string; 
    sessionId: string;
  }> {
    try {
      // Verify the token cryptographically
      const decoded = jwt.verify(token, this.refreshTokenSecret) as { 
        userId: string; 
        sessionId: string;
      };
      
      // Check if token is in Redis (not revoked)
      const tokenHash = this.hashToken(token);
      const storedToken = await redis.get(`refresh_token:${tokenHash}`);
      
      if (!storedToken) {
        throw new ApiError(
          ErrorCode.INVALID_TOKEN,
          'Refresh token has been revoked'
        );
      }
      
      return decoded;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      
      if (error instanceof jwt.TokenExpiredError) {
        throw new ApiError(
          ErrorCode.INVALID_TOKEN,
          'Refresh token has expired'
        );
      }
      
      throw new ApiError(
        ErrorCode.INVALID_TOKEN,
        'Invalid refresh token'
      );
    }
  }

  /**
   * Refresh an access token using a refresh token
   */
  public async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    try {
      // Verify the refresh token
      const { userId, sessionId } = await this.verifyRefreshToken(refreshToken);
      
      // Get user data from database
      const { data: userData, error } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('id', userId)
        .single();
      
      if (error || !userData) {
        throw new ApiError(
          ErrorCode.INVALID_TOKEN,
          'User not found'
        );
      }
      
      // Generate a new access token
      const tokenPayload: TokenPayload = {
        userId: userData.id,
        role: userData.role,
        email: userData.email,
        sessionId,
        issuedAt: Math.floor(Date.now() / 1000)
      };
      
      const accessToken = this.generateAccessToken(tokenPayload);
      
      return {
        accessToken,
        refreshToken, // Return the same refresh token
        expiresIn: this.getExpirySeconds(this.defaultAccessExpiry),
        tokenType: 'Bearer'
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      
      throw new ApiError(
        ErrorCode.INVALID_TOKEN,
        'Failed to refresh token'
      );
    }
  }

  /**
   * Revoke a refresh token
   */
  public async revokeRefreshToken(token: string): Promise<void> {
    try {
      // Verify the token first
      const decoded = jwt.verify(token, this.refreshTokenSecret) as { 
        userId: string;
      };
      
      const tokenHash = this.hashToken(token);
      
      // Remove token from Redis
      await redis.del(`refresh_token:${tokenHash}`);
      
      // Remove from user's tokens set
      await redis.sRem(`user:${decoded.userId}:refresh_tokens`, tokenHash);
    } catch (error) {
      // If token is invalid, we don't need to revoke it
      console.error('Error revoking token:', error);
    }
  }

  /**
   * Revoke all refresh tokens for a user
   */
  public async revokeAllUserTokens(userId: string): Promise<void> {
    try {
      // Get all tokens for user
      const userTokensKey = `user:${userId}:refresh_tokens`;
      const tokens = await redis.sMembers(userTokensKey);
      
      // Delete each token
      for (const tokenHash of tokens) {
        await redis.del(`refresh_token:${tokenHash}`);
      }
      
      // Delete the set itself
      await redis.del(userTokensKey);
    } catch (error) {
      console.error('Error revoking all user tokens:', error);
    }
  }

  /**
   * Generate a unique session ID
   * @returns A cryptographically secure random session ID
   */
  public generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate a CSRF token for a session
   * @param sessionId The session ID to generate a token for
   * @returns A CSRF token tied to the session ID
   */
  public generateCsrfToken(sessionId: string): string {
    return crypto
      .createHmac('sha256', this.accessTokenSecret)
      .update(sessionId)
      .digest('hex');
  }

  /**
   * Verify a CSRF token against a session ID
   * @param token The CSRF token to verify
   * @param sessionId The session ID to verify against
   * @returns True if the token is valid for the session ID
   */
  public validateCsrfToken(token: string, sessionId: string): boolean {
    const expectedToken = this.generateCsrfToken(sessionId);
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(expectedToken)
    );
  }

  /**
   * Hash a token for storage (one-way)
   */
  private hashToken(token: string): string {
    return crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
  }

  /**
   * Convert JWT expiry notation to seconds
   */
  private getExpirySeconds(expiry: string | number): number {
    if (typeof expiry === 'number') return expiry;
    
    const units = {
      s: 1,
      m: 60,
      h: 60 * 60,
      d: 24 * 60 * 60
    };
    
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (match) {
      const [, value, unit] = match;
      return parseInt(value) * units[unit as keyof typeof units];
    }
    
    // Default to 15 minutes if format is incorrect
    return 15 * 60;
  }
}

export const tokenService = TokenService.getInstance();
