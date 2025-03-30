import React, { useCallback } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer'; // We need AutoSizer for responsive grid
import { AssetCard } from './AssetCard';
import { Box, Typography } from '@mui/material';
import { Asset } from '../../types/asset.types';

interface VirtualizedAssetGridProps {
  assets: Asset[];
  selectedAssetId: string | null;
  onAssetSelect: (assetId: string) => void;
  assetType: string;
}

// Define typical column/row dimensions
const COLUMN_WIDTH = 150; 
const ROW_HEIGHT = 150; // Approximate height including padding/margins
const GRID_GAP = 8; // Gap between items in pixels

export const VirtualizedAssetGrid: React.FC<VirtualizedAssetGridProps> = React.memo(({ 
  assets, 
  selectedAssetId, 
  onAssetSelect, 
  assetType
}) => {

  if (!assets || assets.length === 0) {
    return <Typography variant="body2" sx={{ p: 2, textAlign: 'center' }}>No assets available</Typography>;
  }

  // Cell renderer function for FixedSizeGrid
  const Cell = useCallback(({ columnIndex, rowIndex, style }: {
    columnIndex: number;
    rowIndex: number;
    style: React.CSSProperties;
  }) => {
    // Calculate index based on grid position and number of columns
    // This needs the column count, which AutoSizer provides.
    // We will pass columnCount down to this component when using AutoSizer.
    // For now, let's assume we get columnCount somehow (will fix in AutoSizer part)
    const columnCount = style.gridColumnCount || 2; // Placeholder, needs actual value
    const index = rowIndex * columnCount + columnIndex;

    // Check if index is out of bounds
    if (index >= assets.length) {
      return null; // Render nothing if it's beyond the asset list
    }

    const asset = assets[index];
    
    // Adjust style to account for grid gap
    const adjustedStyle = {
      ...style,
      left: `calc(${style.left} + ${GRID_GAP / 2}px)`,
      top: `calc(${style.top} + ${GRID_GAP / 2}px)`,
      width: `calc(${style.width} - ${GRID_GAP}px)`,
      height: `calc(${style.height} - ${GRID_GAP}px)`,
    };

    return (
      <AssetCard
        style={adjustedStyle}
        asset={asset}
        isSelected={selectedAssetId === asset.id}
        onClick={onAssetSelect}
        assetType={assetType}
      />
    );
  }, [assets, selectedAssetId, onAssetSelect, assetType]);

  return (
    <Box sx={{ height: 300, width: '100%', overflow: 'hidden' }}>
      <AutoSizer>
        {({ height, width }) => {
          // Calculate number of columns based on available width
          const columnCount = Math.max(1, Math.floor(width / (COLUMN_WIDTH + GRID_GAP)));
          const calculatedColumnWidth = (width - (columnCount + 1) * GRID_GAP) / columnCount;
          const rowCount = Math.ceil(assets.length / columnCount);

          return (
            <Grid
              className="virtualized-asset-grid" // Add class for potential styling
              columnCount={columnCount}
              columnWidth={calculatedColumnWidth + GRID_GAP} // Include gap in width
              height={height}
              rowCount={rowCount}
              rowHeight={ROW_HEIGHT + GRID_GAP} // Include gap in height
              width={width}
              itemData={{ // Pass necessary data to Cell renderer
                assets,
                selectedAssetId,
                onAssetSelect,
                assetType,
                columnCount // Pass calculated columnCount
              }}
              style={{ overflowX: 'hidden' }} // Prevent horizontal scrollbar if calculation is slightly off
            >
              {/* Pass columnCount to Cell via style prop (a bit hacky but works with react-window) */}
              {({ columnIndex, rowIndex, style, data }) => (
                <Cell 
                  columnIndex={columnIndex} 
                  rowIndex={rowIndex} 
                  style={{ ...style, gridColumnCount: data.columnCount }} // Inject columnCount
                />
              )}
            </Grid>
          );
        }}
      </AutoSizer>
    </Box>
  );
});
