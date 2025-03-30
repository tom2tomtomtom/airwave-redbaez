// server/src/types/ServiceResult.ts

/**
 * Standardized result structure for service methods.
 * @template T The type of data returned on success.
 */
export type ServiceResult<T> = 
  | { success: true; data: T } 
  | { success: false; error: string; statusCode?: number };
