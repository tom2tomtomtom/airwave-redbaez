import React from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Typography,
  Paper,
  CircularProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Delete as DeleteIcon,
  ContentCopy as DuplicateIcon,
  PlayArrow as RenderIcon,
} from '@mui/icons-material';
import AssetSlot from './AssetSlot';

export interface Asset {
  id: string;
  name: string;
  preview?: string;
  type: 'video' | 'image' | 'copy' | 'music' | 'voiceover';
}

interface MatrixRowProps {
  rowId: string;
  rowNumber: number;
  assets: Record<string, Asset | undefined>;
  lockedSlots: string[];
  isRendering?: boolean;
  renderProgress?: number;
  onAssetSelect: (assetType: string) => void;
  onAssetRemove: (assetType: string) => void;
  onSlotLockToggle: (assetType: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRender: () => void;
}

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
}));

const assetTypes = ['video', 'image', 'copy', 'music', 'voiceover'];

const MatrixRow: React.FC<MatrixRowProps> = ({
  rowId,
  rowNumber,
  assets,
  lockedSlots,
  isRendering = false,
  renderProgress = 0,
  onAssetSelect,
  onAssetRemove,
  onSlotLockToggle,
  onDuplicate,
  onDelete,
  onRender,
}) => {
  return (
    <StyledPaper elevation={2}>
      <Box sx={{ width: 50, textAlign: 'center' }}>
        <Typography variant="subtitle1" color="text.secondary">
          #{rowNumber}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flex: 1, gap: 2 }}>
        {assetTypes.map((type) => (
          <Box key={type} sx={{ flex: 1 }}>
            <AssetSlot
              assetType={type as Asset['type']}
              asset={assets[type]}
              isLocked={lockedSlots.includes(type)}
              onLockToggle={() => onSlotLockToggle(type)}
              onRemove={() => onAssetRemove(type)}
              onSelect={() => onAssetSelect(type)}
            />
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        {isRendering ? (
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <CircularProgress variant="determinate" value={renderProgress} />
            <Box
              sx={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="caption" component="div" color="text.secondary">
                {`${Math.round(renderProgress)}%`}
              </Typography>
            </Box>
          </Box>
        ) : (
          <>
            <Tooltip title="Render variation">
              <IconButton onClick={onRender} size="small">
                <RenderIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Duplicate row">
              <IconButton onClick={onDuplicate} size="small">
                <DuplicateIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete row">
              <IconButton onClick={onDelete} size="small">
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Box>
    </StyledPaper>
  );
};

export default MatrixRow;
