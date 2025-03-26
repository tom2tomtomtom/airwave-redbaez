import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { 
  Box, 
  Button, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { AppDispatch } from '../../store';
import { uploadAsset } from '../../store/slices/assetsSlice';
import AssetUploadForm from './AssetUploadForm';
import BulkAssetUpload from './BulkAssetUpload';

interface AssetUploadHandlerProps {
  onAssetUploaded: () => void;
  clientId: string;
}

/**
 * Component that handles asset upload functionality
 */
export const AssetUploadHandler: React.FC<AssetUploadHandlerProps> = ({
  onAssetUploaded,
  clientId
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [uploadType, setUploadType] = useState<'single' | 'bulk'>('single');

  const handleOpenUploadDialog = (type: 'single' | 'bulk') => {
    setUploadType(type);
    setOpenUploadDialog(true);
  };

  const handleCloseUploadDialog = () => {
    setOpenUploadDialog(false);
  };

  const handleAssetUpload = (formData: FormData) => {
    // Create a new FormData instance for the asset
    const assetData = new FormData();
    
    // Get client ID from the provided prop - this ensures we use the correct client ID
    assetData.append('clientId', clientId);
    console.log('Using client ID for upload:', clientId);
    
    // Append all fields from the form
    formData.forEach((value, key) => {
      if (value instanceof File) {
        console.log(`Form data ${key}:`, value.name);
        assetData.append(key, value);
      } else {
        console.log(`Form data ${key}:`, value);
      }
    });
    
    dispatch(uploadAsset(assetData))
      .unwrap()
      .then(response => {
        console.log('Asset upload successful:', response);
        
        // Close the dialog first
        setOpenUploadDialog(false);
        
        // Wait a short delay before refreshing assets to ensure server has processed the upload
        setTimeout(() => {
          // Call the callback to refresh assets
          onAssetUploaded();
        }, 500); // Small delay to ensure server has processed the upload
      })
      .catch(error => {
        console.error('Asset upload failed:', error);
        alert(`Upload failed: ${error}`);
        // Keep dialog open to let user retry
      });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => handleOpenUploadDialog('single')}
        >
          Upload Asset
        </Button>
        <Button 
          variant="outlined" 
          color="primary"
          onClick={() => handleOpenUploadDialog('bulk')}
        >
          Bulk Upload
        </Button>
      </Box>

      <Dialog 
        open={openUploadDialog} 
        onClose={handleCloseUploadDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {uploadType === 'single' ? 'Upload Asset' : 'Bulk Upload Assets'}
        </DialogTitle>
        <DialogContent>
          {uploadType === 'single' ? (
            <AssetUploadForm 
              onSubmit={handleAssetUpload}
              clientId={clientId}
            />
          ) : (
            <BulkAssetUpload 
              onUploadsComplete={() => {
                setOpenUploadDialog(false);
                // Trigger refresh after successful upload
                setTimeout(onAssetUploaded, 500);
              }}
              clientId={clientId}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default AssetUploadHandler;
