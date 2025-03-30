import React from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Grid, 
  Typography, 
  MenuItem, 
  Divider,
  Paper,
  Chip,
  IconButton,
  FormHelperText,
  CircularProgress
} from '@mui/material';
import { 
  CloudUpload as CloudUploadIcon, 
  Add as AddIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useAssetUploadForm, assetTypes } from '../../hooks/useAssetUploadForm';
import { textContent } from '../../utils/textContent';

interface AssetUploadFormProps {
  onSubmit: (formData: FormData) => void;
  clientId: string; // Required client ID for asset association
  onCancel?: () => void; // Optional callback when cancel is clicked
  isUploading?: boolean; // Add the optional isUploading prop
}

const AssetUploadForm: React.FC<AssetUploadFormProps> = ({ onSubmit, clientId, isUploading = false }) => {
  // Use our custom hook to handle form state and logic
  const {
    formik, 
    fileInputRef,
    selectedFile,
    setSelectedFile,
    fileError,
    setFileError,
    newTag,
    setNewTag,
    handleFileChange,
    handleAddTag,
    handleRemoveTag,
    handleTagKeyDown
  } = useAssetUploadForm({ onSubmit, clientId });

  return (
    <form onSubmit={formik.handleSubmit}>
      <Grid container spacing={3}>
        {/* Left column for metadata */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            id="name"
            name="name"
            label="Asset Name"
            value={formik.values.name}
            onChange={formik.handleChange}
            error={formik.touched.name && Boolean(formik.errors.name)}
            helperText={formik.touched.name && formik.errors.name}
            margin="normal"
          />
          
          <TextField
            fullWidth
            id="type"
            name="type"
            select
            label="Asset Type"
            value={formik.values.type}
            onChange={(e) => {
              formik.handleChange(e);
              // Reset file when changing type
              setSelectedFile(null);
              setFileError(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
            error={formik.touched.type && Boolean(formik.errors.type)}
            helperText={formik.touched.type && formik.errors.type}
            margin="normal"
          >
            {assetTypes.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          
          <TextField
            fullWidth
            id="description"
            name="description"
            label="Description"
            multiline
            rows={4}
            value={formik.values.description}
            onChange={formik.handleChange}
            margin="normal"
          />
          
          <Box sx={{ mt: 2, mb: 1 }}>
            <Typography variant="subtitle2">Tags</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <TextField 
                size="small"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add tags..."
                fullWidth
              />
              <IconButton 
                color="primary" 
                onClick={handleAddTag}
                disabled={!newTag}
              >
                <AddIcon />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {formik.values.tags?.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  size="small"
                />
              ))}
            </Box>
          </Box>
        </Grid>
        
        {/* Right column for file upload or text content */}
        <Grid item xs={12} md={6}>
          {formik.values.type === 'text' ? (
            <TextField
              fullWidth
              id="content"
              name="content"
              label="Text Content"
              multiline
              rows={11}
              value={formik.values.content}
              onChange={formik.handleChange}
              margin="normal"
              error={formik.values.type === 'text' && Boolean(fileError)}
              helperText={formik.values.type === 'text' && fileError}
            />
          ) : (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 300,
                mt: 2,
                borderStyle: fileError ? 'solid' : 'dashed',
                borderColor: fileError ? 'error.main' : 'divider',
                bgcolor: fileError ? 'error.light' : 'background.paper',
                cursor: 'pointer',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover'
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  const file = e.dataTransfer.files[0];
                  // Create a synthetic event object that mimics the structure expected by handleFileChange
                  const syntheticEvent = {
                    target: {
                      files: e.dataTransfer.files
                    }
                  } as React.ChangeEvent<HTMLInputElement>;
                  handleFileChange(syntheticEvent);
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              {selectedFile ? (
                <Box sx={{ width: '100%', textAlign: 'center' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Selected file:
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedFile.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </Typography>
                  
                  {formik.values.type === 'image' && (
                    <Box sx={{ mt: 2, mb: 2, maxWidth: '100%', maxHeight: 200, overflow: 'hidden' }}>
                      <img 
                        src={URL.createObjectURL(selectedFile)} 
                        alt="Preview" 
                        style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }}
                      />
                    </Box>
                  )}
                  
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => {
                      setSelectedFile(null);
                      setFileError(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    sx={{ mt: 2 }}
                  >
                    Change File
                  </Button>
                </Box>
              ) : (
                <>
                  <CloudUploadIcon color="primary" sx={{ fontSize: 60, mb: 2 }} />
                  <Typography variant="h6" gutterBottom align="center">
                    {textContent.labels.assets.dragDrop}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" align="center" gutterBottom>
                    or
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={(e) => {
                      e.stopPropagation(); // Stop event from bubbling up to Paper
                      fileInputRef.current?.click(); // Directly click the input
                    }}
                  >
                    {textContent.labels.assets.select}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                    accept={
                      formik.values.type === 'image' ? 'image/*' :
                      formik.values.type === 'video' ? 'video/*' :
                      formik.values.type === 'audio' ? 'audio/*' : undefined
                    }
                  />
                  <Typography variant="caption" color="text.secondary" align="center" sx={{ mt: 2, px: 2 }}>
                    {textContent.tooltips.assets.types}
                  </Typography>
                </>
              )}
              {fileError && (
                <FormHelperText error sx={{ mt: 1 }}>
                  {fileError}
                </FormHelperText>
              )}
            </Paper>
          )}
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          type="submit" 
          variant="contained" 
          color="primary" 
          size="large"
          startIcon={<CloudUploadIcon />}
          disabled={isUploading} // Disable button when uploading
        >
          {isUploading ? <CircularProgress size={24} /> : textContent.labels.assets.upload}
        </Button>
      </Box>
    </form>
  );
};

export default AssetUploadForm;