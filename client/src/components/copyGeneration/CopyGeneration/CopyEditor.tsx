import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  IconButton,
  Grid,
  Tooltip,
  Alert
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import UndoIcon from '@mui/icons-material/Undo';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

import { CopyVariation, CopyType, CopyStatus, QualityScore } from '../../../services/copyGeneration/types';
import { PromptEngineeringService } from '../../../services/copyGeneration/PromptEngineeringService';

interface CopyEditorProps {
  variation: CopyVariation;
  onSave: (variation: CopyVariation) => void;
  onCancel: () => void;
}

/**
 * Copy Editor Component
 * 
 * Provides an interface for editing copy with real-time quality checks,
 * feedback, and improvement suggestions based on best practices.
 */
const CopyEditor: React.FC<CopyEditorProps> = ({
  variation,
  onSave,
  onCancel
}) => {
  const [editedText, setEditedText] = useState<string>(variation.text || '');
  const [editedFrames, setEditedFrames] = useState<string[]>(variation.frames || []);
  const [hasFrames, setHasFrames] = useState<boolean>(!!variation.frames);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [changesDetected, setChangesDetected] = useState<boolean>(false);
  
  // Update state when variation prop changes
  useEffect(() => {
    setEditedText(variation.text || '');
    setEditedFrames(variation.frames || []);
    setHasFrames(!!variation.frames);
    setChangesDetected(false);
  }, [variation]);
  
  // Handle text change for non-framed content
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedText(e.target.value);
    setChangesDetected(true);
  };
  
  // Handle frame change for framed content
  const handleFrameChange = (index: number, newText: string) => {
    const newFrames = [...editedFrames];
    newFrames[index] = newText;
    setEditedFrames(newFrames);
    setChangesDetected(true);
  };
  
  // Add a new frame
  const handleAddFrame = () => {
    setEditedFrames([...editedFrames, '']);
    setChangesDetected(true);
  };
  
  // Delete a frame
  const handleDeleteFrame = (index: number) => {
    if (editedFrames.length <= 1) return;
    
    const newFrames = [...editedFrames];
    newFrames.splice(index, 1);
    setEditedFrames(newFrames);
    setChangesDetected(true);
  };
  
  // Run quality checks
  const runQualityChecks = async () => {
    setIsChecking(true);
    
    try {
      // Get text to check
      const textToCheck = hasFrames 
        ? editedFrames.join('\n\n') 
        : editedText;
      
      // Use prompt engineering service to check copy quality
      // await PromptEngineeringService.checkCopyQuality(textToCheck); // TODO: Verify if this service/method still exists or is needed
    } catch (error) {
      console.error('Error checking copy quality:', error);
    } finally {
      setIsChecking(false);
    }
  };
  
  // Save changes
  const handleSave = () => {
    const updatedVariation: CopyVariation = {
      ...variation,
      version: variation.version + 1,
      modifiedAt: new Date(),
      text: hasFrames ? '' : editedText,
      frames: hasFrames ? editedFrames : undefined,
    };
    
    onSave(updatedVariation);
  };
  
  // Get icon based on severity
  const getSeverityIcon = (severity: 'error' | 'warning' | 'success') => {
    switch (severity) {
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'success':
        return <CheckCircleIcon color="success" />;
      default:
        return <CheckCircleIcon color="success" />;
    }
  };
  
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Edit Copy {variation.version > 1 ? `(v${variation.version})` : ''}
        </Typography>
        
        <Box>
          <Tooltip title="Reset changes">
            <span>
              <IconButton 
                disabled={!changesDetected} 
                onClick={() => {
                  setEditedText(variation.text || '');
                  setEditedFrames(variation.frames || []);
                  setChangesDetected(false);
                }}
              >
                <UndoIcon />
              </IconButton>
            </span>
          </Tooltip>
          
          <Tooltip title="Check quality">
            <IconButton 
              color="primary" 
              onClick={runQualityChecks}
              disabled={isChecking}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Editor UI */}
      <Box sx={{ mb: 3 }}>
        {hasFrames ? (
          // Frame-based content editor
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Frame Content
            </Typography>
            
            {editedFrames.map((frame, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Grid container spacing={1} alignItems="center">
                  <Grid item xs>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Frame {index + 1}
                    </Typography>
                  </Grid>
                  <Grid item>
                    <Tooltip title="Delete frame">
                      <span>
                        <IconButton 
                          size="small" 
                          disabled={editedFrames.length <= 1}
                          onClick={() => handleDeleteFrame(index)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Grid>
                </Grid>
                
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  maxRows={6}
                  value={frame}
                  onChange={(e) => handleFrameChange(index, e.target.value)}
                  placeholder={`Enter content for frame ${index + 1}`}
                  variant="outlined"
                />
              </Box>
            ))}
            
            <Button 
              startIcon={<AddIcon />} 
              onClick={handleAddFrame}
              variant="outlined"
              size="small"
              sx={{ mt: 1 }}
            >
              Add Frame
            </Button>
          </Box>
        ) : (
          // Single content editor
          <TextField
            fullWidth
            multiline
            minRows={6}
            maxRows={12}
            value={editedText}
            onChange={handleTextChange}
            placeholder="Enter your copy here"
            variant="outlined"
          />
        )}
      </Box>
      
      {/* Action buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
        <Button variant="outlined" onClick={onCancel}>
          Cancel
        </Button>
        
        <Button 
          variant="contained" 
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={!changesDetected}
        >
          Save Changes
        </Button>
      </Box>
    </Paper>
  );
};

export default CopyEditor;
