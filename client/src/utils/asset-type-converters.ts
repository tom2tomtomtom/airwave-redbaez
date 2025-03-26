import { Asset as ApiAsset } from '../api/types/asset.types';
import { Asset as AppAsset, AssetType } from '../types/assets';

/**
 * Helper to convert asset types between API and App models
 */
export const convertAssetType = (apiType: string): AssetType => {
  if (apiType === 'document') return 'text'; // Map 'document' to 'text'
  return apiType as AssetType;
};

/**
 * Convert API Asset type to application Asset type
 * Important: Ensures client ID is properly maintained during conversion
 */
export const convertApiAssetToAppAsset = (apiAsset: ApiAsset | null): AppAsset | null => {
  if (!apiAsset) return null;
  
  return {
    id: apiAsset.id,
    name: apiAsset.name,
    type: convertAssetType(apiAsset.type),
    url: apiAsset.url,
    thumbnailUrl: apiAsset.thumbnailUrl,
    description: apiAsset.description,
    tags: apiAsset.metadata?.tags,
    metadata: apiAsset.metadata,
    createdAt: apiAsset.createdAt,
    updatedAt: apiAsset.updatedAt,
    size: apiAsset.metadata?.size,
    duration: apiAsset.metadata?.duration,
    width: apiAsset.metadata?.width,
    height: apiAsset.metadata?.height,
    ownerId: 'system', // Default value
    clientSlug: apiAsset.clientId,
    clientId: apiAsset.clientId, // Preserving the client ID is critical
    isFavourite: apiAsset.favourite,
    status: apiAsset.status as any
  };
};
