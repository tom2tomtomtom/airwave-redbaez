// server/src/types/serviceResult.ts

/**
 * Generic interface for service operation results
 * Provides a consistent return type for all service methods
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
