import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  CircularProgress, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon,
  Divider,
  Chip,
  Grid,
  TextField,
  IconButton,
  Tooltip,
  Alert,
  AlertTitle,
  LinearProgress,
  Card,
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle
} from '@mui/material';
import { 
  CreateNewFolder as CreateNewFolderIcon,
  Folder as FolderIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  AudioFile as AudioIcon,
  Description as TextIcon,
  Description,
  Upload as UploadIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  ExpandLess,
  ExpandMore
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { uploadAsset } from '../../store/slices/assetsSlice';
import { useDropzone } from 'react-dropzone';
import { styled } from '@mui/material/styles';
import { v4 as uuidv4 } from 'uuid';

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

// Define our own custom asset file type that extends the basic File type
type AssetFile = File & {
  path?: string;
  preview?: string;
  category?: string;
  tags?: string[];
  description?: string;
  detectedType?: 'image' | 'video' | 'audio' | 'text' | null;
  customName?: string;
  isEditing?: boolean;
  isUploading?: boolean;
  uploadProgress?: number;
  uploadError?: string;
  uploadSuccess?: boolean;
}

interface AssetCategory {
  name: string;
  files: AssetFile[];
  isExpanded: boolean;
}

const FILE_TYPE_PATTERNS = {
  image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff', '.ico'],
  video: ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.webm', '.mkv', '.m4v'],
  audio: ['.mp3', '.wav', '.aac', '.ogg', '.flac', '.m4a'],
  text: ['.txt', '.rtf', '.pdf', '.doc', '.docx', '.md', '.csv']
};

// Helper function to detect and categorize files
const detectFileType = (file?: File): 'image' | 'video' | 'audio' | 'text' | null => {
  // Safety check - if file is undefined or null, return null
  if (!file) return null;
  
  try {
    const filename = file.name?.toLowerCase() || '';
    
    // Try to detect by file extension first
    for (const [type, extensions] of Object.entries(FILE_TYPE_PATTERNS)) {
      if (extensions.some(ext => filename.endsWith(ext))) {
        return type as 'image' | 'video' | 'audio' | 'text';
      }
    }
    
    // Fallback to MIME type if available
    if (file.type) {
      const mimeType = file.type.toLowerCase();
      if (mimeType.startsWith('image/')) return 'image';
      if (mimeType.startsWith('video/')) return 'video';
      if (mimeType.startsWith('audio/')) return 'audio';
      if (mimeType.startsWith('text/') || 
          mimeType === 'application/pdf' || 
          mimeType.includes('document') || 
          mimeType.includes('msword')) return 'text';
    }
  } catch (error) {
    console.error('Error detecting file type:', error);
  }
  
  return null;
};

// Helper to extract category from file path
const extractCategoryFromPath = (path: string): string => {
  if (!path) return 'Uncategorized';
  
  // Split the path into segments and take the first one after the root
  const segments = path.split('/');
  if (segments.length > 1) {
    return segments[0] || 'Uncategorized';
  }
  
  return 'Uncategorized';
};

// Generate a synthetic path for files without webkitRelativePath
const generateSyntheticPath = (file: File): string => {
  const extension = file.name.split('.').pop() || '';
  const type = extension ? detectFileType(file) || 'other' : 'other';
  return `${type}/${file.name}`;
};

// Helper to generate tags from file attributes
const generateTagsFromFile = (file: AssetFile): string[] => {
  const tags: string[] = [];
  const filename = file.name.toLowerCase();
  
  // Add type-based tag
  const detectedType = file.detectedType || detectFileType(file);
  if (detectedType) tags.push(detectedType);
  
  // Add category-based tag if it exists
  if (file.category && file.category !== 'Uncategorized') {
    tags.push(file.category);
  }
  
  // Add format tag based on extension
  const extension = filename.split('.').pop();
  if (extension) tags.push(extension);
  
  // Add dimension-based tags for images (we could expand this later with actual image analysis)
  if (detectedType === 'image') {
    // These would be populated after image analysis in a future enhancement
    // For now, just add a placeholder
    tags.push('brand-asset');
  }
  
  return tags;
};

interface BulkAssetUploadProps {
  onUploadsComplete: () => void;
  clientId?: string;
}

const BulkAssetUpload: React.FC<BulkAssetUploadProps> = ({ onUploadsComplete, clientId }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { selectedClientId } = useSelector((state: RootState) => state.clients);
  const [assetCategories, setAssetCategories] = useState<AssetCategory[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [totalToUpload, setTotalToUpload] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [fileToRename, setFileToRename] = useState<{categoryIndex: number, fileIndex: number} | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  const folderInputRef = useRef<HTMLInputElement>(null);
  
  // We'll use a simple approach without drag-drop since folder uploads have browser limitations
  
  // Function to handle folder selection via input
  const handleFolderSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const files = event.target.files;
    console.log('Selected files:', files ? files.length : 0);
    if (!files || files.length === 0) {
      console.log('No files selected');
      return;
    }
    
    processFiles(Array.from(files));
  }, []);
  
  // Process files from either drag-drop or folder selection
  const processFiles = useCallback((fileList: File[]) => {
    console.log('Processing files:', fileList.length);
    if (fileList.length === 0) return;
    
    // Group files by folders
    const folderMap = new Map<string, File[]>();
    
    // First check if any file has webkitRelativePath to confirm we got a folder structure
    const hasPath = fileList.some(file => file.webkitRelativePath && file.webkitRelativePath.length > 0);
    
    if (!hasPath && fileList.length === 1) {
      // Single file without path - probably not from a folder upload
      alert('Please select an entire folder, not individual files.');
      return;
    }
    
    // Process files and convert them to our AssetFile type
    const processedFiles = fileList.map(file => {
      // Create our extended AssetFile from the File object
      const assetFile = file as AssetFile;
      // Get the path from webkitRelativePath or create a synthetic one
      const path = file.webkitRelativePath || generateSyntheticPath(file);
      console.log('File path:', path);
      // Set up initial asset metadata
      assetFile.path = path;
      assetFile.category = extractCategoryFromPath(path);
      assetFile.detectedType = detectFileType(file);
      assetFile.tags = generateTagsFromFile(assetFile);
      return assetFile;
    });
    
    // Process files and organize them into categories based on folder structure
    const categoriesMap = new Map<string, AssetFile[]>();
    
    processedFiles.forEach(file => {
      const category = file.category as string;
      
      if (!categoriesMap.has(category)) {
        categoriesMap.set(category, []);
      }
      categoriesMap.get(category)?.push(file);
    });
    
    // Convert map to array of categories
    const categoriesArray: AssetCategory[] = Array.from(categoriesMap.entries())
      .map(([name, files]) => ({
        name,
        files,
        isExpanded: true
      }));
    
    setAssetCategories(categoriesArray);
  }, []);
  
  // Function to toggle a category expansion
  const toggleCategory = (index: number) => {
    setAssetCategories(prev => 
      prev.map((category, i) => 
        i === index ? { ...category, isExpanded: !category.isExpanded } : category
      )
    );
  };
  
  // Function to handle editing file metadata
  const toggleFileEdit = (categoryIndex: number, fileIndex: number) => {
    setAssetCategories(prev => {
      const newCategories = [...prev];
      const category = newCategories[categoryIndex];
      const file = category.files[fileIndex];
      
      category.files[fileIndex] = {
        ...file,
        isEditing: !file.isEditing
      };
      
      return newCategories;
    });
  };
  
  // Function to update file metadata
  const updateFileMetadata = (
    categoryIndex: number, 
    fileIndex: number, 
    data: { description?: string, tags?: string[] }
  ) => {
    setAssetCategories(prev => {
      const newCategories = [...prev];
      const category = newCategories[categoryIndex];
      const file = category.files[fileIndex];
      
      category.files[fileIndex] = {
        ...file,
        ...data
      };
      
      return newCategories;
    });
  };
  
  // Function to handle file renaming
  const handleRename = (categoryIndex: number, fileIndex: number) => {
    const file = assetCategories[categoryIndex].files[fileIndex];
    setFileToRename({ categoryIndex, fileIndex });
    setNewFileName(file.customName || file.name);
    setRenameDialogOpen(true);
  };
  
  // Function to save the renamed file
  const saveRenamedFile = () => {
    if (!fileToRename) return;
    
    const { categoryIndex, fileIndex } = fileToRename;
    
    setAssetCategories(prev => {
      const newCategories = [...prev];
      const category = newCategories[categoryIndex];
      const file = category.files[fileIndex];
      
      category.files[fileIndex] = {
        ...file,
        customName: newFileName
      };
      
      return newCategories;
    });
    
    setRenameDialogOpen(false);
    setFileToRename(null);
    setNewFileName('');
  };
  
  // Upload all assets
  const uploadAllAssets = async () => {
    if (!selectedClientId) {
      setUploadError('Please select a client before uploading assets');
      return;
    }
    
    const allFiles = assetCategories.flatMap(category => category.files);
    if (allFiles.length === 0) {
      setUploadError('No files to upload');
      return;
    }
    
    setUploading(true);
    setUploadError(null);
    setTotalToUpload(allFiles.length);
    setUploadedCount(0);
    
    // Create a copy of categories for updating upload status
    const categoriesCopy = [...assetCategories];
    
    // Process each file sequentially
    for (let categoryIndex = 0; categoryIndex < categoriesCopy.length; categoryIndex++) {
      const category = categoriesCopy[categoryIndex];
      
      for (let fileIndex = 0; fileIndex < category.files.length; fileIndex++) {
        const file = category.files[fileIndex];
        
        // Skip files that have already been uploaded
        if (file.uploadSuccess) {
          continue;
        }
        
        // Update status to uploading
        setAssetCategories(prev => {
          const newCategories = [...prev];
          const category = newCategories[categoryIndex];
          category.files[fileIndex] = {
            ...category.files[fileIndex],
            isUploading: true,
            uploadProgress: 0,
            uploadError: undefined
          };
          return newCategories;
        });
        
        try {
          // Create form data for this asset
          const formData = new FormData();
          // Our AssetFile is already a File object, but we cast it to be safe
          formData.append('file', file);
          formData.append('name', file.customName || file.name);
          formData.append('type', file.detectedType || 'image');
          if (file.description) formData.append('description', file.description);
          if (file.tags && file.tags.length > 0) {
            formData.append('tags', JSON.stringify(file.tags));
          }
          if (file.category) formData.append('category', file.category);
          if (selectedClientId) formData.append('clientId', selectedClientId);
          
          // Dispatch upload action
          const result = await dispatch(uploadAsset(formData)).unwrap();
          
          // Update status to uploaded
          setAssetCategories(prev => {
            const newCategories = [...prev];
            const category = newCategories[categoryIndex];
            category.files[fileIndex] = {
              ...category.files[fileIndex],
              isUploading: false,
              uploadProgress: 100,
              uploadSuccess: true
            };
            return newCategories;
          });
          
          setUploadedCount(prev => prev + 1);
          
        } catch (error: any) {
          // Update status to error
          setAssetCategories(prev => {
            const newCategories = [...prev];
            const category = newCategories[categoryIndex];
            category.files[fileIndex] = {
              ...category.files[fileIndex],
              isUploading: false,
              uploadError: error.message || 'Upload failed'
            };
            return newCategories;
          });
          
          console.error('Error uploading file:', file.name, error);
        }
      }
    }
    
    setUploading(false);
    
    // Notify parent component that uploads are complete
    onUploadsComplete();
  };
  
  // Check if all files have been processed
  const allFilesProcessed = uploadedCount === totalToUpload && totalToUpload > 0;
  
  // Reset the uploader
  const resetUploader = () => {
    setAssetCategories([]);
    setUploading(false);
    setUploadedCount(0);
    setTotalToUpload(0);
    setUploadError(null);
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };
  
  // Calculate total files count
  const totalFiles = assetCategories.reduce((total, category) => total + category.files.length, 0);
  
  // Function to render the icon for a file based on its type
  const renderFileIcon = (file?: AssetFile) => {
    // Safety check - if file is undefined or null, return default icon
    if (!file) {
      return <Description fontSize="small" />;
    }
    
    const type = file.detectedType || detectFileType(file);
    
    switch (type) {
      case 'image':
        return <ImageIcon color="primary" />;
      case 'video':
        return <VideoIcon color="secondary" />;
      case 'audio':
        return <AudioIcon color="success" />;
      case 'text':
        return <TextIcon color="info" />;
      default:
        return <Description fontSize="small" />;
    }
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Bulk Asset Upload
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          Upload a client's brand assets folder. The system will organize and categorize the files automatically.
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12}>
            <Box sx={{
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 1,
              p: 3,
              mb: 2,
              textAlign: 'center',
              bgcolor: 'background.paper'
            }}>
              <CreateNewFolderIcon color="primary" sx={{ fontSize: 40, mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Select a folder to upload
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Use the button below to select a folder from your device
              </Typography>
              
              <Button
                variant="contained"
                color="primary"
                startIcon={<CreateNewFolderIcon />}
                sx={{ mt: 2 }}
                disabled={uploading}
                component="label"
              >
                Select Folder
                <input 
                  type="file" 
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    left: 0,
                    bottom: 0,
                    width: '100%',
                    opacity: 0,
                    cursor: 'pointer',
                    zIndex: 2
                  }}
                  ref={folderInputRef}
                  onChange={handleFolderSelect}
                  // These attributes are valid but TypeScript doesn't recognize them
                  // @ts-ignore
                  webkitdirectory=""
                  // @ts-ignore
                  directory=""
                  // @ts-ignore
                  mozdirectory=""
                  multiple
                />
              </Button>
              
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                <strong>Tip:</strong> For macOS users, please click "Upload" or equivalent in the file dialog, rather than opening the folder.
                For Windows users, select the folder and click "Select Folder".
              </Typography>
            </Box>
          </Grid>
          
          {assetCategories.length > 0 && (
            <Grid item>
              <Button
                variant="contained"
                color="primary"
                startIcon={<UploadIcon />}
                onClick={uploadAllAssets}
                disabled={uploading || !selectedClientId}
              >
                Upload All Assets
              </Button>
            </Grid>
          )}
          
          {assetCategories.length > 0 && (
            <Grid item>
              <Button
                variant="outlined"
                color="secondary"
                onClick={resetUploader}
                disabled={uploading}
              >
                Reset
              </Button>
            </Grid>
          )}
          
          {!selectedClientId && assetCategories.length > 0 && (
            <Grid item xs={12}>
              <Alert severity="warning" sx={{ mt: 2 }}>
                Please select a client before uploading assets
              </Alert>
            </Grid>
          )}
        </Grid>
        
        {uploading && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2">
              Uploading: {uploadedCount} of {totalToUpload} assets
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={totalToUpload > 0 ? (uploadedCount / totalToUpload) * 100 : 0} 
              sx={{ mt: 1 }}
            />
          </Box>
        )}
        
        {uploadError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {uploadError}
          </Alert>
        )}
        
        {allFilesProcessed && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <AlertTitle>All Assets Uploaded Successfully</AlertTitle>
            {uploadedCount} assets have been processed and organized in the library.
          </Alert>
        )}
      </Paper>
      
      {assetCategories.length > 0 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Folder Structure ({totalFiles} files in {assetCategories.length} categories)
          </Typography>
          
          {assetCategories.map((category, categoryIndex) => (
            <Card key={category.name} sx={{ mb: 2, overflow: 'visible' }}>
              <Box 
                sx={{ 
                  p: 1, 
                  display: 'flex', 
                  alignItems: 'center',
                  cursor: 'pointer',
                  bgcolor: 'action.selected'
                }}
                onClick={() => toggleCategory(categoryIndex)}
              >
                <FolderIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                  {category.name} ({category.files.length} files)
                </Typography>
                {category.isExpanded ? (
                  <ExpandLess />
                ) : (
                  <ExpandMore />
                )}
              </Box>
              
              {category.isExpanded && (
                <List dense>
                  {category.files.map((file, fileIndex) => (
                    <ListItem 
                      key={`${categoryIndex}-${fileIndex}-${file.name}`}
                      secondaryAction={
                        <>
                          <Tooltip title="Rename">
                            <span>
                              <IconButton 
                                edge="end" 
                                aria-label="rename"
                                onClick={() => handleRename(categoryIndex, fileIndex)}
                                disabled={uploading || file.uploadSuccess}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          
                          <Tooltip title={file.isEditing ? "Save" : "Edit Metadata"}>
                            <span>
                              <IconButton 
                                edge="end" 
                                aria-label="edit"
                                onClick={() => toggleFileEdit(categoryIndex, fileIndex)}
                                disabled={uploading || file.uploadSuccess}
                                sx={{ ml: 1 }}
                              >
                                {file.isEditing ? (
                                  <CheckIcon fontSize="small" />
                                ) : (
                                  <EditIcon fontSize="small" />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                        </>
                      }
                    >
                      <ListItemIcon>
                        {renderFileIcon(file)}
                      </ListItemIcon>
                      <ListItemText 
                        primary={file.customName || file.name}
                        secondary={
                          // @ts-ignore - Complex secondary content is valid
                          <Box>
                            <Typography variant="caption" component="span" color="text.secondary">
                              {(file.size / 1024).toFixed(2)} KB | {file.detectedType || 'unknown'}
                            </Typography>
                            
                            {file.isEditing ? (
                              <Box sx={{ mt: 1 }}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  label="Description"
                                  value={file.description || ''}
                                  onChange={(e) => updateFileMetadata(categoryIndex, fileIndex, { 
                                    description: e.target.value 
                                  })}
                                  sx={{ mb: 1 }}
                                />
                                
                                <TextField
                                  fullWidth
                                  size="small"
                                  label="Tags (comma separated)"
                                  value={(file.tags || []).join(', ')}
                                  onChange={(e) => updateFileMetadata(categoryIndex, fileIndex, { 
                                    tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                                  })}
                                />
                              </Box>
                            ) : (
                              <Box sx={{ mt: 0.5 }}>
                                {file.description && (
                                  <Typography variant="body2" color="text.secondary">
                                    {file.description}
                                  </Typography>
                                )}
                                
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                  {file.tags && file.tags.map((tag, i) => (
                                    <Chip 
                                      key={i} 
                                      label={tag} 
                                      size="small" 
                                      variant="outlined"
                                    />
                                  ))}
                                </Box>
                              </Box>
                            )}
                            
                            {file.isUploading && (
                              <LinearProgress 
                                sx={{ mt: 1 }} 
                                variant="indeterminate"
                              />
                            )}
                            
                            {file.uploadSuccess && (
                              <Chip 
                                label="Uploaded" 
                                color="success" 
                                size="small" 
                                sx={{ mt: 1 }} 
                              />
                            )}
                            
                            {file.uploadError && (
                              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                                Error: {file.uploadError}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Card>
          ))}
        </Paper>
      )}
      
      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onClose={() => setRenameDialogOpen(false)}>
        <DialogTitle>Rename File</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="New Filename"
            fullWidth
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
          <Button onClick={saveRenamedFile} color="primary">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BulkAssetUpload;
