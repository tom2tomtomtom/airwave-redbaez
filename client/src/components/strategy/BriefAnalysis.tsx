import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { UploadFile as UploadIcon } from '@mui/icons-material';
import type { BriefAnalysisRequest } from '../../types/api';
import { textContent } from '../../utils/textContent';

interface BriefAnalysisProps {
  onAnalyse: (request: BriefAnalysisRequest) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

const UploadArea = styled(Box)(({ theme }) => ({
  border: `2px dashed ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'border-color 0.2s ease-in-out',
  '&:hover': {
    borderColor: theme.palette.primary.main,
  },
}));

const BriefAnalysis: React.FC<BriefAnalysisProps> = ({
  onAnalyse,
  isLoading = false,
  error,
}) => {
  const [briefContent, setBriefContent] = useState('');
  const [fileType, setFileType] = useState<'pdf' | 'doc' | 'docx' | 'txt' | ''>('');
  const [targetAudience, setTargetAudience] = useState('');
  const [campaignObjectives, setCampaignObjectives] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files[0]) {
      const uploadedFile = files[0];
      setFile(uploadedFile);
      
      // Set file type based on extension
      const extension = uploadedFile.name.split('.').pop()?.toLowerCase() as 'pdf' | 'doc' | 'docx' | 'txt';
      setFileType(extension);

      // Read file content
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setBriefContent(content);
      };
      reader.readAsText(uploadedFile);
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!briefContent && !file) return;

    const request: BriefAnalysisRequest = {
      content: briefContent,
      fileType: fileType || undefined,
      targetAudience: targetAudience || undefined,
      campaignObjectives: campaignObjectives || undefined,
    };

    await onAnalyse(request);
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {textContent.labels.strategy.briefAnalysis}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            id="brief-upload"
          />

          <label htmlFor="brief-upload">
            <UploadArea>
              {file ? (
                <Typography>
                  Selected file: {file.name}
                </Typography>
              ) : (
                <>
                  <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  <Typography>
                    {textContent.labels.strategy.uploadBrief}
                  </Typography>
                </>
              )}
            </UploadArea>
          </label>

          <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
            {textContent.labels.strategy.pasteBrief}
          </Typography>

          <TextField
            fullWidth
            multiline
            rows={6}
            value={briefContent}
            onChange={(e) => setBriefContent(e.target.value)}
            placeholder={textContent.placeholders.strategy.briefContent}
            sx={{ mb: 3 }}
          />

          <FormControl fullWidth sx={{ mb: 3 }}>
            <TextField
              label={textContent.labels.strategy.targetAudience}
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder={textContent.placeholders.strategy.targetAudience}
              multiline
              rows={2}
            />
          </FormControl>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <TextField
              label={textContent.labels.strategy.campaignObjectives}
              value={campaignObjectives}
              onChange={(e) => setCampaignObjectives(e.target.value)}
              placeholder={textContent.placeholders.strategy.campaignObjectives}
              multiline
              rows={2}
            />
          </FormControl>

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={isLoading || (!briefContent && !file)}
            startIcon={isLoading ? <CircularProgress size={20} /> : undefined}
          >
            {isLoading ? textContent.status.analysing : textContent.actions.analyse}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default BriefAnalysis;
