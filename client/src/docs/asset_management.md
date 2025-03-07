# Asset Management Documentation

This document provides an overview of the asset management system in AIrWAVE, including components, hooks, and integration guidelines.

## Components Overview

### AssetList

The `AssetList` component displays a filterable, sortable grid of assets with search functionality and type filtering.

#### Props:

- `initialType` (optional): The initial type of assets to display (`'image'`, `'video'`, `'audio'`, `'text'`, or `'all'`)
- `showFilters` (optional): Whether to show the filtering UI (default: `true`)
- `onAssetSelect` (optional): Callback function when an asset is selected
- `selectedAssetId` (optional): ID of the currently selected asset
- `initialFavourite` (optional): Whether to initially show only favourites (default: `false`)
- `sortBy` (optional): Initial sorting field (`'date'`, `'name'`, `'type'`)
- `sortDirection` (optional): Initial sort direction (`'asc'` or `'desc'`)

#### Usage:

```tsx
// Example: Assets Tab with Recent Items
<AssetList 
  initialType="all"
  sortBy="date"
  sortDirection="desc"
/>

// Example: Favourites Tab
<AssetList 
  initialType="all"
  initialFavourite={true}
  sortBy="date"
  sortDirection="desc"
/>
```

## Hooks

### useAssetSelectionState

This hook manages the asset selection state, including loading, filtering, sorting, and selection operations.

#### Parameters:

- `initialType`: The initial asset type to filter by
- `initialFavourite`: Whether to initially show only favourites
- `sortBy`: The field to sort by
- `sortDirection`: The direction to sort in
- `showFilters`: Whether to display filtering options

#### Returns:

- `assets`: The list of filtered, sorted assets
- `loading`: Whether assets are currently loading
- `error`: Any error that occurred during loading
- `filters`: The current filter state
- `updateFilters`: Function to update filters
- `selectAsset`: Function to select an asset
- `selectedAsset`: The currently selected asset
- `handleAssetChanged`: Function to handle asset changes

#### Usage:

```tsx
const { 
  assets,
  loading,
  error,
  filters,
  updateFilters,
  selectAsset,
  selectedAsset
} = useAssetSelectionState(
  'all',      // initialType
  false,      // initialFavourite
  'date',     // sortBy
  'desc',     // sortDirection
  true        // showFilters
);
```

### useAssetOperations

This hook provides CRUD operations for assets, including toggling favourites.

#### Methods:

- `toggleFavourite(assetId, currentStatus)`: Toggle an asset's favourite status
- `deleteAsset(assetId)`: Delete an asset
- `fetchAssets(filters)`: Fetch assets with optional filters
- `downloadAsset(assetId)`: Download an asset file
- `updateAsset(assetId, data)`: Update an asset's metadata

## Filters and Sorting

### Asset Filters

The `AssetFilters` interface defines the available filtering options:

```typescript
interface AssetFilters {
  search?: string;
  type?: AssetType | 'all';
  tags?: string[];
  favourite?: boolean;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  dateRange?: {
    from: string;
    to: string;
  };
}
```

### Sorting Options

Available sorting options:
- `date-desc`: Newest first (default)
- `date-asc`: Oldest first
- `name-asc`: Name (A-Z)
- `name-desc`: Name (Z-A)
- `type-asc`: Type (A-Z)
- `type-desc`: Type (Z-A)

## Integration Example

Here's how to integrate the asset management components into a page:

```tsx
import React, { useState } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import { AssetList } from '../components/assets/AssetList';

const AssetsPage = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Tabs value={tabValue} onChange={handleTabChange}>
        <Tab label="All Assets" />
        <Tab label="Recent" />
        <Tab label="Favourites" />
      </Tabs>
      
      <Box sx={{ mt: 2 }}>
        {tabValue === 0 && (
          <AssetList initialType="all" />
        )}
        {tabValue === 1 && (
          <AssetList 
            initialType="all"
            sortBy="date"
            sortDirection="desc"
          />
        )}
        {tabValue === 2 && (
          <AssetList 
            initialType="all"
            initialFavourite={true}
          />
        )}
      </Box>
    </Box>
  );
};

export default AssetsPage;
```

## Best Practices

1. **Performance**: When working with large asset libraries, consider implementing pagination or infinite scrolling
2. **Error Handling**: Always display user-friendly error messages when asset operations fail
3. **Loading States**: Show loading indicators for long-running operations
4. **Accessibility**: Ensure all asset selection and filtering controls are keyboard-accessible
5. **Responsiveness**: Test the asset grid layout on different screen sizes

## Security Considerations

1. **Row Level Security**: The database implements RLS policies to ensure users only see their own assets
2. **File Type Validation**: The system validates file types on upload to prevent security issues
3. **Permission Checks**: API endpoints verify user permissions before allowing asset operations
