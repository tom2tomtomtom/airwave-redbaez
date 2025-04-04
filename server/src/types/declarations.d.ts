/**
 * TypeScript declarations for external modules
 */

// Declaration for modules without type definitions
declare module 'winston' {
  // Winston logger interface
  export interface Logger {
    debug: (message: string, meta?: any) => void;
    info: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    error: (message: string, meta?: any) => void;
  }

  // Winston transport interface
  export interface Transport {
    level?: string;
    silent?: boolean;
    handleExceptions?: boolean;
  }

  // Winston format namespace
  export namespace format {
    function combine(...formats: any[]): any;
    function timestamp(options?: any): any;
    function colorize(options?: any): any;
    function printf(template: ($1: unknown) => string): any;
  }

  // Winston functions
  export function createLogger($1: unknown): Logger;

  // Winston transports namespace
  export namespace transports {
    class Console extends Transport {
      constructor(options?: any);
    }

    class File extends Transport {
      constructor(options?: any);
    }
  }
}
