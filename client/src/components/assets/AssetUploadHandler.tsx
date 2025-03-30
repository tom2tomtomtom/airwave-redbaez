import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import AssetUploadForm from './AssetUploadForm';
import BulkAssetUpload from './BulkAssetUpload';
import { useUploadAssetMutation } from '../../store/api/assetsApi';

interface AssetUploadHandlerProps {
  onAssetUploaded?: () => void;
  clientId: string;
}

/**
 * Component that handles asset upload functionality
 */
export const AssetUploadHandler: React.FC<AssetUploadHandlerProps> = ({
  onAssetUploaded,
  clientId
}) => {
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [uploadType, setUploadType] = useState<'single' | 'bulk'>('single');

  const [uploadAssetMutation, { isLoading: isUploading, error: uploadError }] = useUploadAssetMutation();

  const handleOpenUploadDialog = (type: 'single' | 'bulk') => {
    setUploadType(type);
    setOpenUploadDialog(true);
  };

  const handleCloseUploadDialog = () => {
    setOpenUploadDialog(false);
  };

  const handleAssetUpload = (formData: FormData) => {
    const assetData = new FormData();
    
    assetData.append('clientId', clientId);
    console.log('Using client ID for upload:', clientId);
    
    const file = formData.get('file');
    if (file instanceof File) {
      assetData.append('file', file, file.name); 
    } else {
      console.error('No file found in form data for single upload!');
      alert('Upload failed: No file provided.');
      return; // Stop if no file
    }

    if (formData.has('name')) assetData.append('name', formData.get('name')!);
    if (formData.has('description')) assetData.append('description', formData.get('description')!);
    
    uploadAssetMutation(assetData)
      .unwrap()
      .then(response => {
        console.log('Asset upload successful:', response);
        
        setOpenUploadDialog(false);
        
        if (onAssetUploaded) {
          onAssetUploaded();
        }
      })
      .catch(error => {
        console.error('Asset upload failed:', error);
        alert(`Upload failed: ${error.data?.message || error.message || 'Unknown error'}`);
      });
  };

  const handleBulkUploadComplete = () => {
    setOpenUploadDialog(false); 
    if (onAssetUploaded) {
      onAssetUploaded(); 
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => handleOpenUploadDialog('single')}
        >
          Upload Single Asset
        </Button>
        <Button 
          variant="outlined" 
          color="primary"
          onClick={() => handleOpenUploadDialog('bulk')}
        >
          Bulk Upload Assets
        </Button>
      </Box>

      <Dialog 
        open={openUploadDialog} 
        onClose={handleCloseUploadDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{uploadType === 'single' ? 'Upload Single Asset' : 'Bulk Upload Assets'}</DialogTitle>
        <DialogContent>
          {uploadType === 'single' ? (
            <AssetUploadForm 
              onSubmit={handleAssetUpload} 
              isUploading={isUploading} 
              clientId={clientId} 
            />
          ) : (
            <BulkAssetUpload 
              clientId={clientId} 
              onComplete={handleBulkUploadComplete} 
            />
          )}
          {uploadError && <Alert severity="error">Upload failed: {JSON.stringify(uploadError)}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUploadDialog}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AssetUploadHandler;
