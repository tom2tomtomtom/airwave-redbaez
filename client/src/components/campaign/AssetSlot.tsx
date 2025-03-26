import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Lock as LockIcon,
  LockOpen as UnlockIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

interface AssetSlotProps {
  assetType: 'video' | 'image' | 'copy' | 'music' | 'voiceover';
  asset?: {
    id: string;
    name: string;
    preview?: string;
  };
  isLocked: boolean;
  onLockToggle: () => void;
  onRemove: () => void;
  onSelect: () => void;
}

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  minHeight: 120,
  display: 'flex',
  flexDirection: 'column',
  cursor: 'pointer',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
}));

const PreviewBox = styled(Box)(({ theme }) => ({
  height: 80,
  backgroundColor: theme.palette.grey[100],
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
}));

const AssetSlot: React.FC<AssetSlotProps> = ({
  assetType,
  asset,
  isLocked,
  onLockToggle,
  onRemove,
  onSelect,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  };

  const getAssetTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      video: 'Video',
      image: 'Image',
      copy: 'Copy',
      music: 'Music',
      voiceover: 'Voice-over',
    };
    return labels[type] || type;
  };

  return (
    <StyledCard onClick={handleClick}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {getAssetTypeLabel(assetType)}
          </Typography>
          <Box>
            <Tooltip title={isLocked ? 'Unlock slot' : 'Lock slot'}>
              <IconButton size="small" onClick={(e) => {
                e.stopPropagation();
                onLockToggle();
              }}>
                {isLocked ? <LockIcon fontSize="small" /> : <UnlockIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            {asset && (
              <Tooltip title="Remove asset">
                <IconButton size="small" onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {asset ? (
          <>
            <PreviewBox>
              {asset.preview ? (
                <img 
                  src={asset.preview} 
                  alt={asset.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {asset.name}
                </Typography>
              )}
            </PreviewBox>
            <Typography variant="caption" noWrap sx={{ mt: 1 }}>
              {asset.name}
            </Typography>
          </>
        ) : (
          <PreviewBox>
            <Typography variant="body2" color="text.secondary">
              Click to select {assetType}
            </Typography>
          </PreviewBox>
        )}
      </CardContent>
    </StyledCard>
  );
};

export default AssetSlot;
