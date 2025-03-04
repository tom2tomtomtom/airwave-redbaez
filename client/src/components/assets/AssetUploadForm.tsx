import React, { useState, useRef } from 'react';
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
  FormHelperText
} from '@mui/material';
import { 
  CloudUpload as CloudUploadIcon, 
  Add as AddIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';

interface AssetUploadFormProps {
  onSubmit: (formData: FormData) => void;
}

const assetTypes = [
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Voice Over' },
  { value: 'text', label: 'Copy Text' },
];

const validationSchema = Yup.object({
  name: Yup.string().required('Name is required'),
  type: Yup.string().required('Asset type is required').oneOf(['image', 'video', 'audio', 'text']),
  tags: Yup.array().of(Yup.string()),
  description: Yup.string(),
  // File validation happens separately because formik doesn't handle file uploads well
});

const AssetUploadForm: React.FC<AssetUploadFormProps> = ({ onSubmit }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  
  const formik = useFormik({
    initialValues: {
      name: '',
      type: 'image',
      tags: [] as string[],
      description: '',
      content: '',
    },
    validationSchema,
    onSubmit: (values) => {
      // For text assets, we don't need a file
      if (values.type === 'text') {
        if (!values.content) {
          setFileError('Content is required for text assets');
          return;
        }
      } else if (!selectedFile) {
        setFileError('File is required');
        return;
      }

      const formData = new FormData();
      
      // Add all form values to the FormData
      Object.keys(values).forEach(key => {
        if (key === 'tags') {
          formData.append(key, JSON.stringify(values.tags));
        } else {
          formData.append(key, (values as any)[key]);
        }
      });
      
      // Add the file if it's not a text asset
      if (values.type !== 'text' && selectedFile) {
        formData.append('file', selectedFile);
      }
      
      onSubmit(formData);
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      // Validate file type
      const assetType = formik.values.type;
      let isValid = false;
      
      if (assetType === 'image' && file.type.startsWith('image/')) {
        isValid = true;
      } else if (assetType === 'video' && file.type.startsWith('video/')) {
        isValid = true;
      } else if (assetType === 'audio' && file.type.startsWith('audio/')) {
        isValid = true;
      }
      
      if (!isValid) {
        setFileError(`File must be a valid ${assetType} file`);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      setSelectedFile(file);
      setFileError(null);
      
      // Auto-fill name if empty
      if (!formik.values.name) {
        formik.setFieldValue('name', file.name.split('.')[0]);
      }
    }
  };

  const handleAddTag = () => {
    if (newTag && !formik.values.tags.includes(newTag)) {
      formik.setFieldValue('tags', [...formik.values.tags, newTag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    formik.setFieldValue(
      'tags', 
      formik.values.tags.filter(tag => tag !== tagToRemove)
    );
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddTag();
    }
  };

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
                onKeyDown={handleKeyDown}
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
              {formik.values.tags.map((tag, index) => (
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
              }}
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
                    Drag and drop your file here
                  </Typography>
                  <Typography variant="body2" color="text.secondary" align="center" gutterBottom>
                    or
                  </Typography>
                  <Button
                    variant="contained"
                    component="label"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Browse Files
                    <input
                      ref={fileInputRef}
                      type="file"
                      hidden
                      onChange={handleFileChange}
                      accept={
                        formik.values.type === 'image' ? 'image/*' :
                        formik.values.type === 'video' ? 'video/*' :
                        formik.values.type === 'audio' ? 'audio/*' : undefined
                      }
                    />
                  </Button>
                  <Typography variant="caption" color="text.secondary" align="center" sx={{ mt: 2, px: 2 }}>
                    {formik.values.type === 'image' ? 'Supports: JPG, PNG, GIF, WebP (max 10MB)' :
                    formik.values.type === 'video' ? 'Supports: MP4, WebM, MOV (max 200MB)' :
                    formik.values.type === 'audio' ? 'Supports: MP3, WAV, AAC (max 50MB)' : ''}
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
        >
          Upload Asset
        </Button>
      </Box>
    </form>
  );
};

export default AssetUploadForm;