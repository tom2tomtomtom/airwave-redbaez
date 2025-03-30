import React from 'react';
import { 
  Card, 
  CardMedia, 
  CardContent, 
  Typography, 
  Box 
} from '@mui/material';
import { Asset } from '../../api/types/asset.types'; // Corrected import path

interface AssetCardProps {
  asset: Asset;
  isSelected: boolean;
  onClick: (assetId: string) => void;
  style?: React.CSSProperties; // Needed for react-window
  assetType: string; // Explicitly pass asset type
}

const AssetCardComponent: React.FC<AssetCardProps> = ({ 
  asset, 
  isSelected, 
  onClick, 
  style,
  assetType 
}) => {
  const handleClick = (): void => {
    onClick(asset.id);
  };

  return (
    <Card 
      style={style} // Apply style from react-window
      sx={{ 
        cursor: 'pointer',
        border: isSelected ? '2px solid #1976d2' : '1px solid #e0e0e0',
        transition: 'all 0.2s ease-in-out',
        height: '100%', // Ensure card fills grid item height
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          borderColor: isSelected ? '#1976d2' : '#bbdefb'
        }
      }}
      onClick={handleClick}
    >
      {assetType === 'image' || assetType === 'video' ? (
        <CardMedia
          component="img"
          height="80" // Keep height fixed for consistency
          image={asset.thumbnailUrl || '/placeholder-asset.jpg'}
          alt={asset.name}
          sx={{
            backgroundColor: '#f5f5f5',
            objectFit: 'cover' // Ensure image covers the area
          }}
        />
      ) : (
        <Box sx={{ 
          p: 1, // Reduced padding
          height: 80, // Match media height
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          bgcolor: isSelected ? '#e3f2fd' : '#f5f5f5',
          textAlign: 'center',
          flexGrow: 1, // Allow text box to grow if needed
          overflow: 'hidden', // Prevent text overflow issues
          transition: 'background-color 0.2s ease-in-out'
        }}>
          <Typography 
            variant="caption" // Use smaller variant for potentially long text
            sx={{ 
              fontWeight: isSelected ? 'bold' : 'normal',
              color: isSelected ? '#1976d2' : 'inherit',
              // Basic text overflow handling
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              wordBreak: 'break-word', // Break long words
            }}
          >
            {asset.content || asset.name}
          </Typography>
        </Box>
      )}
      <CardContent sx={{ 
        py: 1, 
        bgcolor: isSelected ? '#f5f5f5' : 'transparent',
        mt: 'auto' // Push content to bottom if media exists
      }}>
        <Typography 
          variant="caption" 
          noWrap 
          sx={{ 
            fontWeight: isSelected ? 'bold' : 'normal', 
            display: 'block' // Ensure noWrap works
          }}
          title={asset.name} // Add title for full name on hover
        >
          {asset.name}
        </Typography>
      </CardContent>
    </Card>
  );
};

// Memoize the component
export const AssetCard = React.memo(AssetCardComponent);
