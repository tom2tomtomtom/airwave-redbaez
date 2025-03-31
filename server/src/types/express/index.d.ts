// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Request } from 'express';

// Define the structure of your auth object
// Adjust this based on what your authentication middleware actually adds
interface AuthPayload {
  userId: string;
  // Add other properties if needed, e.g., email, role, etc.
}

declare global {
  namespace Express {
    export interface Request {
      auth?: AuthPayload; // Add the optional auth property
    }
  }
}

// Export something to make it a module (can be an empty object)
export {};
