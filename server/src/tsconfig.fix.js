// server/src/tsconfig.fix.js
/**
 * This script automatically fixes common TypeScript errors in the codebase
 * It addresses:
 * 1. Import issues (default vs namespace imports)
 * 2. Type safety improvements (replacing 'any' with proper types)
 * 3. Missing properties and function arguments
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const rootDir = path.resolve(__dirname);
const srcDir = rootDir;
const fileExtensions = ['.ts', '.tsx'];

// Helper functions
function findFiles(dir, extensions, excludeDirs = ['node_modules', 'dist']) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!excludeDirs.includes(file)) {
        results = results.concat(findFiles(fullPath, extensions, excludeDirs));
      }
    } else {
      const ext = path.extname(file);
      if (extensions.includes(ext)) {
        results.push(fullPath);
      }
    }
  });
  
  return results;
}

function fixImports(content) {
  // Fix default imports for CommonJS modules
  const importFixes = [
    { pattern: /import\s+(\w+)\s+from\s+['"]winston['"]/g, replacement: 'import * as $1 from \'winston\'' },
    { pattern: /import\s+(\w+)\s+from\s+['"]dotenv['"]/g, replacement: 'import * as $1 from \'dotenv\'' },
    { pattern: /import\s+(\w+)\s+from\s+['"]fs['"]/g, replacement: 'import * as $1 from \'fs\'' },
    { pattern: /import\s+(\w+)\s+from\s+['"]path['"]/g, replacement: 'import * as $1 from \'path\'' },
    { pattern: /import\s+(\w+)\s+from\s+['"]crypto['"]/g, replacement: 'import * as $1 from \'crypto\'' }
  ];
  
  let newContent = content;
  importFixes.forEach(fix => {
    newContent = newContent.replace(fix.pattern, fix.replacement);
  });
  
  return newContent;
}

function fixTypeSafety(content) {
  // Replace 'any' with more specific types where possible
  const typeFixes = [
    { pattern: /Map<string,\s*any(\[\])?>/g, replacement: 'Map<string, Record<string, unknown>$1>' },
    { pattern: /:\s*any(\[\])?\s*=/g, replacement: ': Record<string, unknown>$1 =' },
    { pattern: /\(\s*\w+\s*:\s*any\s*\)/g, replacement: '($1: unknown)' }
  ];
  
  let newContent = content;
  typeFixes.forEach(fix => {
    newContent = newContent.replace(fix.pattern, fix.replacement);
  });
  
  return newContent;
}

function fixConsoleLog(content) {
  // Replace console.log with logger
  const loggerImport = 'import { logger } from \'../utils/logger\';';
  const relativeLoggerImport = 'import { logger } from \'./logger\';';
  
  let newContent = content;
  
  // Add logger import if needed and console.log is used
  if (content.includes('console.log') && !content.includes('logger')) {
    if (content.includes('from \'../utils/')) {
      newContent = content.replace(/import.*?from.*?;/, match => `${match}\n${loggerImport}`);
    } else if (content.includes('./')) {
      newContent = content.replace(/import.*?from.*?;/, match => `${match}\n${relativeLoggerImport}`);
    } else {
      newContent = `${loggerImport}\n${content}`;
    }
  }
  
  // Replace console.log with logger.info/debug
  newContent = newContent.replace(/console\.log\((.*?)\)/g, 'logger.info($1)');
  newContent = newContent.replace(/console\.error\((.*?)\)/g, 'logger.error($1)');
  newContent = newContent.replace(/console\.warn\((.*?)\)/g, 'logger.warn($1)');
  
  return newContent;
}

function fixApiErrorUsage(content) {
  // Fix ApiError constructor calls
  const errorFixes = [
    { pattern: /new ApiError\(ErrorCode\.\w+\)/g, replacement: match => `${match}, 'An error occurred'` },
    { pattern: /new ApiError\(ErrorCode\.\w+,\s*.*?,\s*undefined,\s*(.*?)\)/g, replacement: 'new ApiError(ErrorCode.$1, $2, { originalError: $3 })' }
  ];
  
  let newContent = content;
  errorFixes.forEach(fix => {
    newContent = newContent.replace(fix.pattern, fix.replacement);
  });
  
  return newContent;
}

// Main execution
console.log('Starting TypeScript error fixing script...');

// Find all TypeScript files
const files = findFiles(srcDir, fileExtensions);
console.log(`Found ${files.length} TypeScript files to process`);

// Process each file
let fixedFiles = 0;
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Apply fixes
  let newContent = content;
  newContent = fixImports(newContent);
  newContent = fixTypeSafety(newContent);
  newContent = fixConsoleLog(newContent);
  newContent = fixApiErrorUsage(newContent);
  
  // Write back if changed
  if (newContent !== content) {
    fs.writeFileSync(file, newContent);
    fixedFiles++;
    console.log(`Fixed: ${file}`);
  }
});

console.log(`Completed! Fixed ${fixedFiles} files.`);
console.log('Running TypeScript check to see remaining errors...');

try {
  const result = execSync('npx tsc --noEmit', { encoding: 'utf8' });
  console.log('No TypeScript errors found!');
} catch (error) {
  console.log(`Remaining TypeScript errors: ${error.stdout.split('error TS').length - 1}`);
  console.log('You may need to fix these errors manually.');
}
