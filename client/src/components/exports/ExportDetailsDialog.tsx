import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Divider,
  Chip,
  IconButton,
  Link
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import ShareIcon from '@mui/icons-material/Share';
import LinkIcon from '@mui/icons-material/Link';
import QrCodeIcon from '@mui/icons-material/QrCode';

interface ExportDetailsProps {
  open: boolean;
  onClose: () => void;
  exportItem: {
    id: string;
    platform: string;
    format: string;
    status: string;
    createdAt: string;
    url: string;
    resolution?: string;
    size?: number;
    duration?: number;
  } | null;
  onDownload: (exportId: string) => void;
  onShare: (exportUrl: string) => void;
}

const ExportDetailsDialog: React.FC<ExportDetailsProps> = ({
  open,
  onClose,
  exportItem,
  onDownload,
  onShare
}) => {
  if (!exportItem) return null;

  const handleDownloadClick = () => {
    onDownload(exportItem.id);
  };

  const handleShareClick = () => {
    onShare(exportItem.url);
  };

  // Format file size for display
  const formatFileSize = (sizeInMB?: number) => {
    if (!sizeInMB) return 'Unknown';
    if (sizeInMB < 1) return `${Math.round(sizeInMB * 1000)} KB`;
    return `${sizeInMB.toFixed(2)} MB`;
  };

  // Format duration for display
  const formatDuration = (durationInSeconds?: number) => {
    if (!durationInSeconds) return 'Unknown';
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = durationInSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="export-details-dialog-title"
    >
      <DialogTitle id="export-details-dialog-title">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Export Details</Typography>
          <IconButton aria-label="close" onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Header */}
          <Grid item xs={12}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h5" component="div">
                {exportItem.format} Format
              </Typography>
              <Chip 
                label={exportItem.platform.toUpperCase()} 
                color="primary" 
              />
            </Box>
            <Divider />
          </Grid>
          
          {/* Preview (placeholder for now) */}
          <Grid item xs={12} md={6}>
            <Box 
              sx={{ 
                bgcolor: 'grey.200', 
                width: '100%', 
                height: 200, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                borderRadius: 1
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Video Preview
              </Typography>
            </Box>
          </Grid>
          
          {/* Details */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Details
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
                <Typography variant="body1">
                  {exportItem.status.charAt(0).toUpperCase() + exportItem.status.slice(1)}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body1">
                  {new Date(exportItem.createdAt).toLocaleString()}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Resolution
                </Typography>
                <Typography variant="body1">
                  {exportItem.resolution || 'Unknown'}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  File Size
                </Typography>
                <Typography variant="body1">
                  {formatFileSize(exportItem.size)}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Duration
                </Typography>
                <Typography variant="body1">
                  {formatDuration(exportItem.duration)}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Format
                </Typography>
                <Typography variant="body1">
                  {exportItem.format}
                </Typography>
              </Grid>
            </Grid>
          </Grid>
          
          {/* URL and sharing options */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom>
              Share and Download
            </Typography>
            
            <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, mb: 2 }}>
              <Typography variant="body2" noWrap>
                <Link href={exportItem.url} target="_blank" rel="noopener noreferrer">
                  {exportItem.url}
                </Link>
              </Typography>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item>
                <Button 
                  variant="outlined" 
                  startIcon={<CloudDownloadIcon />}
                  onClick={handleDownloadClick}
                >
                  Download
                </Button>
              </Grid>
              
              <Grid item>
                <Button 
                  variant="outlined"
                  startIcon={<ShareIcon />}
                  onClick={handleShareClick}
                >
                  Copy Link
                </Button>
              </Grid>
              
              <Grid item>
                <Button 
                  variant="outlined"
                  startIcon={<QrCodeIcon />}
                >
                  QR Code
                </Button>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
        <Button 
          variant="contained"
          color="primary"
          startIcon={<CloudDownloadIcon />}
          onClick={handleDownloadClick}
        >
          Download
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportDetailsDialog;
