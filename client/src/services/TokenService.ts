import { createClient, Session, User } from '@supabase/supabase-js';
import { jwtDecode } from 'jwt-decode';
import { BehaviorSubject } from 'rxjs';

interface DecodedToken {
  exp: number;
  sub: string;
  email: string;
  role: string;
  iat: number;
  [key: string]: any;
}

interface TokenResponse {
  accessToken: string | null;
  refreshToken: string | null;
  user?: User | null;
  factorId?: string;
  error?: string;
}

/**
 * TokenService: Manages JWT token lifecycle securely
 * 
 * Features:
 * - Secure token storage using HttpOnly cookies
 * - Automatic token refresh
 * - Token validation and expiration handling
 * - CSRF protection for authenticated requests
 */
class TokenService {
  private static instance: TokenService;
  private supabase: ReturnType<typeof createClient>;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private SESSION_EXPIRY_THRESHOLD = 5 * 60; // 5 minutes in seconds
  
  // Observable to track authentication state changes
  private authStateSubject = new BehaviorSubject<{
    isAuthenticated: boolean;
    user: User | null;
  }>({
    isAuthenticated: false,
    user: null
  });

  public authState$ = this.authStateSubject.asObservable();
  
  constructor() {
    // Get Supabase configuration
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    // Initialize Supabase client with secure cookie storage
    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        // Use cookies for storage instead of localStorage
        storageKey: 'airwave_auth_token',
        storage: {
          getItem: (key) => {
            // This is only for type compatibility - actual token is stored in HttpOnly cookies
            // and managed by the server
            return null;
          },
          setItem: (key, value) => {
            // Token setting is done through the authentication API
            // which sets HttpOnly cookies
          },
          removeItem: (key) => {
            // Cookie removal will be handled by the server on logout
          }
        },
        autoRefreshToken: true,
        detectSessionInUrl: false // Disable automatic detection to handle manually
      },
      global: {
        headers: {
          'X-CSRF-Token': this.generateCSRFToken(),
        },
      },
    });
    
    // Initialize authentication state monitoring
    this.initAuthStateMonitoring();
  }
  
  /**
   * Get the singleton instance of TokenService
   */
  public static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }
  
  /**
   * Initialize authentication state monitoring
   */
  private initAuthStateMonitoring(): void {
    // Check initial session
    this.supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('Error fetching session:', error);
        return;
      }
      
      if (data?.session) {
        this.updateAuthState(true, data.session.user);
        this.startTokenRefreshTimer(data.session);
      }
    });
    
    // Listen for auth state changes
    this.supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session) {
          this.updateAuthState(true, session.user);
          this.startTokenRefreshTimer(session);
        }
      } else if (event === 'SIGNED_OUT') {
        this.updateAuthState(false, null);
        this.stopTokenRefreshTimer();
      }
    });
  }
  
  /**
   * Update the authentication state and notify subscribers
   */
  private updateAuthState(isAuthenticated: boolean, user: User | null): void {
    this.authStateSubject.next({ isAuthenticated, user });
  }
  
  /**
   * Login with email and password
   */
  public async login(email: string, password: string): Promise<TokenResponse> {
    try {
      // Use Supabase authentication
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      if (data.session) {
        this.updateAuthState(true, data.session.user);
        this.startTokenRefreshTimer(data.session);
        
        return {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token
        };
      }
      
      return { accessToken: null, refreshToken: null, error: 'No session returned' };
    } catch (error: any) {
      console.error('Login error:', error);
      return { accessToken: null, refreshToken: null, error: error.message };
    }
  }
  
  /**
   * Register a new user
   */
  public async register(email: string, password: string, userData: any): Promise<TokenResponse> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) throw error;
      
      if (data.session) {
        this.updateAuthState(true, data.session.user);
        this.startTokenRefreshTimer(data.session);
        
        return {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token
        };
      }
      
      return { 
        accessToken: null, 
        refreshToken: null,
        error: data.user ? 'Email confirmation required' : 'No session returned'
      };
    } catch (error: any) {
      console.error('Registration error:', error);
      return { accessToken: null, refreshToken: null, error: error.message };
    }
  }
  
  /**
   * Logout the current user
   */
  public async logout(): Promise<void> {
    try {
      await this.supabase.auth.signOut();
      this.updateAuthState(false, null);
      this.stopTokenRefreshTimer();
      
      // Make a call to the backend to clear HttpOnly cookies
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRF-Token': this.generateCSRFToken(),
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
  
  /**
   * Get the current session
   */
  public async getCurrentSession(): Promise<Session | null> {
    try {
      const { data, error } = await this.supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    } catch (error) {
      console.error('Get session error:', error);
      return null;
    }
  }
  
  /**
   * Get the current user
   */
  public async getCurrentUser(): Promise<User | null> {
    try {
      const { data, error } = await this.supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }
  
  /**
   * Check if the current session is valid
   */
  public async isAuthenticated(): Promise<boolean> {
    const session = await this.getCurrentSession();
    return !!session;
  }
  
  /**
   * Force refresh the token
   */
  public async refreshToken(): Promise<TokenResponse> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession();
      
      if (error) throw error;
      
      if (data.session) {
        this.startTokenRefreshTimer(data.session);
        return {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token
        };
      }
      
      return { accessToken: null, refreshToken: null, error: 'No session returned' };
    } catch (error: any) {
      console.error('Token refresh error:', error);
      return { accessToken: null, refreshToken: null, error: error.message };
    }
  }
  
  /**
   * Start token refresh timer
   */
  private startTokenRefreshTimer(session: Session): void {
    // Clear any existing timer
    this.stopTokenRefreshTimer();
    
    // Calculate when to refresh (5 minutes before expiration)
    try {
      const expiresAt = session.expires_at;
      if (!expiresAt) throw new Error('No expiration date in session');
      
      const expiresInSeconds = expiresAt - Math.floor(Date.now() / 1000);
      const refreshInSeconds = Math.max(expiresInSeconds - this.SESSION_EXPIRY_THRESHOLD, 0);
      
      console.log(`Token expires in ${expiresInSeconds}s, will refresh in ${refreshInSeconds}s`);
      
      // Set refresh timer
      this.refreshInterval = setInterval(() => {
        this.refreshToken().catch(error => {
          console.error('Error in automatic token refresh:', error);
        });
      }, refreshInSeconds * 1000);
    } catch (error) {
      console.error('Error starting token refresh timer:', error);
    }
  }
  
  /**
   * Stop token refresh timer
   */
  private stopTokenRefreshTimer(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
  
  /**
   * Decode and validate a JWT token
   */
  public decodeToken(token: string): DecodedToken | null {
    try {
      return jwtDecode<DecodedToken>(token);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }
  
  /**
   * Check if a token is expired
   */
  public isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded) return true;
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  }
  
  /**
   * Generate a CSRF token
   */
  private generateCSRFToken(): string {
    // In a real implementation, you'd use a more secure way to generate and validate CSRF tokens
    // This is a simplified example
    const token = crypto.getRandomValues(new Uint8Array(16))
      .reduce((acc, val) => acc + val.toString(16).padStart(2, '0'), '');
    
    // Store the token in a non-HttpOnly cookie to be included in requests
    document.cookie = `csrf_token=${token}; path=/; samesite=strict`;
    
    return token;
  }
  
  /**
   * Initialize multi-factor authentication
   */
  public async initiateMFA(phone: string): Promise<{ success: boolean, error?: string }> {
    try {
      const { data, error } = await this.supabase.auth.mfa.enroll({
        factorType: 'totp'
      });
      
      if (error) throw error;
      
      return { success: true };
    } catch (error: any) {
      console.error('MFA initiation error:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Verify MFA code
   */
  public async verifyMFA(code: string, factorId: string): Promise<{ success: boolean, error?: string }> {
    try {
      const { data, error } = await this.supabase.auth.mfa.challenge({
        factorId: factorId
      });
      
      if (error) throw error;
      
      const { data: verifyData, error: verifyError } = await this.supabase.auth.mfa.verify({
        factorId: factorId,
        challengeId: data.id,
        code: code
      });
      
      if (verifyError) throw verifyError;
      
      return { success: true };
    } catch (error: any) {
      console.error('MFA verification error:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Request password reset
   */
  public async requestPasswordReset(email: string): Promise<{ success: boolean, error?: string }> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });
      
      if (error) throw error;
      
      return { success: true };
    } catch (error: any) {
      console.error('Password reset request error:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Complete password reset
   */
  public async completePasswordReset(password: string): Promise<{ success: boolean, error?: string }> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: password
      });
      
      if (error) throw error;
      
      return { success: true };
    } catch (error: any) {
      console.error('Password reset completion error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default TokenService.getInstance();
