"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * This script fixes multiple issues with the asset service and routes
 * Focusing on:
 * 1. Removing duplicate method implementations
 * 2. Fixing TypeScript typing errors
 * 3. Ensuring proper interface compatibility
 */
async function main() {
    try {
        // Asset service file path
        const servicePath = path_1.default.resolve(__dirname, '../services/assetService.ts');
        const routesPath = path_1.default.resolve(__dirname, '../routes/assetRoutes.ts');
        console.log('Starting comprehensive fix of asset-related code...');
        // 1. Fix Asset Service file first
        console.log(`\nFixing asset service file: ${servicePath}`);
        // Read the file content
        let serviceContent = fs_1.default.readFileSync(servicePath, 'utf8');
        // Create a backup
        const serviceBackupPath = `${servicePath}.backup-${Date.now()}`;
        fs_1.default.writeFileSync(serviceBackupPath, serviceContent, 'utf8');
        console.log(`Created backup at: ${serviceBackupPath}`);
        // Find and remove duplicate implementations of getAssetsByClientSlug
        // Keep only the first one and remove others
        let methodStartRegex = /async getAssetsByClientSlug\s*\(/g;
        let matches = [...serviceContent.matchAll(methodStartRegex)];
        console.log(`Found ${matches.length} implementations of getAssetsByClientSlug`);
        if (matches.length > 1) {
            // Keep only the first implementation (after we've fixed it)
            let firstMatchPos = matches[0].index;
            let methodEndPos = -1;
            let bracketCount = 0;
            let inMethod = false;
            let methodFix = '';
            // Define a proper fixed version of the method
            methodFix = `  /**
   * Get assets by client slug with optional filtering and pagination
   * @param slug The client slug to get assets for
   * @param options Optional filtering and pagination options
   * @returns Object containing paginated assets and total count
   */
  async getAssetsByClientSlug(slug: string, options: AssetFilters = {}): Promise<{assets: Asset[], total: number}> {
    try {
      console.log(\`Getting assets for client slug: \${slug}\`);
      
      // Default pagination values
      const limit = options.limit || 20;
      const offset = options.offset || 0;
      
      // 1. Find the client ID from the slug
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('client_slug', slug.toLowerCase())
        .single();
      
      if (clientError) {
        console.error('Error finding client by slug:', clientError);
        return { assets: [], total: 0 };
      }
      
      if (!client) {
        console.log(\`No client found for slug: \${slug}\`);
        return { assets: [], total: 0 };
      }
      
      console.log(\`Found client ID: \${client.id} for slug: \${slug}\`);
      
      // 2. Build the base queries for assets
      let dataQuery = supabase
        .from('assets')
        .select('*')
        .eq('client_id', client.id);
        
      let countQuery = supabase
        .from('assets')
        .select('id', { count: 'exact' })
        .eq('client_id', client.id);
      
      // 3. Apply type filters
      if (options.type) {
        if (Array.isArray(options.type) && options.type.length > 0) {
          dataQuery = dataQuery.in('type', options.type);
          countQuery = countQuery.in('type', options.type);
        } else if (typeof options.type === 'string' && options.type !== 'all') {
          dataQuery = dataQuery.eq('type', options.type);
          countQuery = countQuery.eq('type', options.type);
        }
      }
      
      // 4. Apply search term filters
      if (options.searchTerm) {
        const searchTerm = options.searchTerm.trim();
        if (searchTerm.length > 0) {
          // For simple searches, use basic pattern matching
          if (searchTerm.length < 3 || !searchTerm.includes(' ')) {
            const condition = \`name.ilike.%\${searchTerm}%,meta->description.ilike.%\${searchTerm}%\`;
            dataQuery = dataQuery.or(condition);
            countQuery = countQuery.or(condition);
          } else {
            // For more complex searches, use full-text search capabilities
            const formattedSearchTerm = searchTerm
              .split(' ')
              .filter((word: string) => word.length > 0)
              .map((word: string) => word + ':*')
              .join(' & ');
            
            const condition = \`name.wfts.\${formattedSearchTerm},meta->description.wfts.\${formattedSearchTerm}\`;
            dataQuery = dataQuery.or(condition);
            countQuery = countQuery.or(condition);
          }
        }
      }
      
      // 5. Apply favourite filter
      if (options.favouritesOnly) {
        dataQuery = dataQuery.eq('meta->isFavourite', true);
        countQuery = countQuery.eq('meta->isFavourite', true);
      }
      
      // 6. Get the total count
      const { count, error: countError } = await countQuery;
      
      if (countError) {
        console.error('Error counting assets:', countError);
      }
      
      // 7. Apply sorting
      const sortBy = options.sortBy || 'createdAt';
      const sortDirection = options.sortDirection || 'desc';
      
      // Map frontend field names to database field names
      let sortField: string;
      if (sortBy === 'name') {
        sortField = 'name'; 
      } else if (sortBy === 'createdAt') {
        sortField = 'created_at';
      } else if (sortBy === 'updatedAt') {
        sortField = 'updated_at';
      } else if (sortBy === 'usageCount') {
        sortField = 'meta->usageCount';
      } else {
        // Default to created_at for any other value
        sortField = 'created_at';
      }
      
      dataQuery = dataQuery
        .order(sortField, { ascending: sortDirection === 'asc' })
        .range(offset, offset + limit - 1);
      
      // 8. Execute query
      const { data: assets, error: assetError } = await dataQuery;
      
      if (assetError) {
        console.error('Error fetching assets by client ID:', assetError);
        return { assets: [], total: 0 };
      }
      
      console.log(\`Found \${assets?.length || 0} assets for client slug \${slug} (total: \${count || 0})\`);
      
      // 9. Transform the assets and return them
      const transformedAssets = (assets || []).map(item => this.transformAssetFromDb(item));
      return {
        assets: transformedAssets,
        total: count || 0
      };
    } catch (error) {
      console.error('Error in getAssetsByClientSlug:', error);
      return { assets: [], total: 0 };
    }
  }`;
            // Find duplicate method implementations
            let implementationStartPositions = [];
            let implementationEndPositions = [];
            for (let match of matches) {
                if (match.index !== undefined) {
                    implementationStartPositions.push(match.index);
                }
            }
            // Find the end of each implementation
            for (let pos of implementationStartPositions) {
                let i = pos;
                let bracketCount = 0;
                let inMethod = false;
                while (i < serviceContent.length) {
                    if (serviceContent[i] === '{') {
                        bracketCount++;
                        inMethod = true;
                    }
                    else if (serviceContent[i] === '}') {
                        bracketCount--;
                        if (inMethod && bracketCount === 0) {
                            implementationEndPositions.push(i + 1);
                            break;
                        }
                    }
                    i++;
                }
            }
            // Remove duplicates, keeping only the first implementation
            let newServiceContent = serviceContent;
            // Replace the first implementation with our fixed version
            if (implementationStartPositions.length > 0 && implementationEndPositions.length > 0) {
                const start = implementationStartPositions[0];
                const end = implementationEndPositions[0];
                // Get the content before and after the method
                const beforeMethod = newServiceContent.substring(0, start - 2); // -2 to remove the indentation
                const afterMethod = newServiceContent.substring(end);
                // Replace with our fixed implementation
                newServiceContent = beforeMethod + methodFix + afterMethod;
                // Now remove the other implementations
                for (let i = 1; i < implementationStartPositions.length; i++) {
                    // We need to recalculate positions because the string has changed
                    const originalStart = implementationStartPositions[i];
                    const originalEnd = implementationEndPositions[i];
                    // Find the start position in the new content
                    const searchFrom = Math.max(0, originalStart - 100); // Search from a bit before to be safe
                    const methodSnippet = serviceContent.substring(originalStart, originalStart + 50);
                    const newStart = newServiceContent.indexOf(methodSnippet, searchFrom);
                    if (newStart !== -1) {
                        // Find the end of this method instance
                        let j = newStart;
                        let bracketCount = 0;
                        let inMethod = false;
                        while (j < newServiceContent.length) {
                            if (newServiceContent[j] === '{') {
                                bracketCount++;
                                inMethod = true;
                            }
                            else if (newServiceContent[j] === '}') {
                                bracketCount--;
                                if (inMethod && bracketCount === 0) {
                                    const newEnd = j + 1;
                                    // Remove this method implementation
                                    newServiceContent =
                                        newServiceContent.substring(0, newStart - 2) + // Remove indentation
                                            newServiceContent.substring(newEnd);
                                    break;
                                }
                            }
                            j++;
                        }
                    }
                }
            }
            // Apply similar fixes for the getAssets method (remove duplicates)
            methodStartRegex = /async getAssets\s*\(/g;
            matches = [...newServiceContent.matchAll(methodStartRegex)];
            console.log(`Found ${matches.length} implementations of getAssets`);
            if (matches.length > 1) {
                implementationStartPositions = [];
                implementationEndPositions = [];
                for (let match of matches) {
                    if (match.index !== undefined) {
                        implementationStartPositions.push(match.index);
                    }
                }
                // Find the end of each implementation
                for (let pos of implementationStartPositions) {
                    let i = pos;
                    let bracketCount = 0;
                    let inMethod = false;
                    while (i < newServiceContent.length) {
                        if (newServiceContent[i] === '{') {
                            bracketCount++;
                            inMethod = true;
                        }
                        else if (newServiceContent[i] === '}') {
                            bracketCount--;
                            if (inMethod && bracketCount === 0) {
                                implementationEndPositions.push(i + 1);
                                break;
                            }
                        }
                        i++;
                    }
                }
                // Remove all duplicates after the first one
                for (let i = 1; i < implementationStartPositions.length; i++) {
                    // We need to recalculate positions because the string has changed
                    const originalStart = implementationStartPositions[i];
                    const originalEnd = implementationEndPositions[i];
                    // Find the start position in the new content
                    const searchFrom = Math.max(0, originalStart - 100); // Search from a bit before to be safe
                    const methodSnippet = newServiceContent.substring(Math.min(originalStart, newServiceContent.length), Math.min(originalStart + 50, newServiceContent.length));
                    const newStart = newServiceContent.indexOf(methodSnippet, searchFrom);
                    if (newStart !== -1) {
                        // Find the end of this method instance
                        let j = newStart;
                        let bracketCount = 0;
                        let inMethod = false;
                        while (j < newServiceContent.length) {
                            if (newServiceContent[j] === '{') {
                                bracketCount++;
                                inMethod = true;
                            }
                            else if (newServiceContent[j] === '}') {
                                bracketCount--;
                                if (inMethod && bracketCount === 0) {
                                    const newEnd = j + 1;
                                    // Remove this method implementation
                                    newServiceContent =
                                        newServiceContent.substring(0, newStart - 2) + // Remove indentation
                                            newServiceContent.substring(newEnd);
                                    break;
                                }
                            }
                            j++;
                        }
                    }
                }
            }
            // Fix type issues in the AssetFilters interface
            const filtersInterfaceRegex = /export interface AssetFilters {[^}]+}/;
            const fixedFiltersInterface = `export interface AssetFilters {
  clientId?: string;
  clientSlug?: string;
  type?: string | string[];
  searchTerm?: string;
  search?: string; // Alias for searchTerm
  favouritesOnly?: boolean;
  favourite?: boolean; // Alias for favouritesOnly
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'usageCount';
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  userId?: string;
}`;
            // Replace the AssetFilters interface
            newServiceContent = newServiceContent.replace(filtersInterfaceRegex, fixedFiltersInterface);
            // Write the fixed content
            fs_1.default.writeFileSync(servicePath, newServiceContent, 'utf8');
            console.log('Successfully fixed asset service file!');
        }
        // 2. Now fix the routes file to match the updated interface
        console.log(`\nFixing asset routes file: ${routesPath}`);
        // Read the file content
        let routesContent = fs_1.default.readFileSync(routesPath, 'utf8');
        // Create a backup
        const routesBackupPath = `${routesPath}.backup-${Date.now()}`;
        fs_1.default.writeFileSync(routesBackupPath, routesContent, 'utf8');
        console.log(`Created backup at: ${routesBackupPath}`);
        // Fix the type issues in the by-client route handler
        const byClientOptionsSection = routesContent.match(/const options: Omit<AssetFilters, "clientSlug"> = {[^}]+}/);
        if (byClientOptionsSection) {
            const fixedOptionsSection = `const options: AssetFilters = {
      userId: req.user.id
    }`;
            routesContent = routesContent.replace(byClientOptionsSection[0], fixedOptionsSection);
        }
        // Fix the type assignment for sortBy
        routesContent = routesContent.replace(/if \(req\.query\.sortBy\) options\.sortBy = req\.query\.sortBy as string;/, 'if (req.query.sortBy) options.sortBy = req.query.sortBy as any;');
        // Fix the type assignment for type
        routesContent = routesContent.replace(/if \(req\.query\.type\) options\.type = req\.query\.type as string;/, 'if (req.query.type) options.type = req.query.type as string;');
        // Fix search property
        routesContent = routesContent.replace(/if \(req\.query\.search\) options\.search = req\.query\.search as string;/, 'if (req.query.search) options.searchTerm = req.query.search as string;');
        // Fix favourite property
        routesContent = routesContent.replace(/if \(req\.query\.favourite\) options\.favourite = req\.query\.favourite === 'true';/, 'if (req.query.favourite) options.favouritesOnly = req.query.favourite === \'true\';');
        // Write the fixed content
        fs_1.default.writeFileSync(routesPath, routesContent, 'utf8');
        console.log('Successfully fixed asset routes file!');
        // Suggest next steps
        console.log('\nNext steps:');
        console.log('1. Run npm run build to verify the fixes worked');
        console.log('2. Start the server with npm run start');
        console.log('3. Test the asset loading with a client request');
    }
    catch (error) {
        console.error('Error fixing asset issues:', error);
    }
}
main().catch(console.error);
