import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  CircularProgress,
  Alert,
  AlertTitle,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import HistoryIcon from '@mui/icons-material/History';

import GenerationConfigForm from './GenerationConfigForm';
import VariationGallery from './VariationGallery';
import CopyEditor from './CopyEditor';

import { 
  MarketingStrategy, 
  CopyGenerationConfig, 
  CopyVariation,
  StrategyAnalysis 
} from '../../../services/copyGeneration/types';
import CopyGenerationMediator from '../../../services/copyGeneration/CopyGenerationMediator';

interface CopyGenerationSectionProps {
  strategy: MarketingStrategy;
  analysis: StrategyAnalysis;
  onGenerationComplete: (variations: CopyVariation[]) => void;
}

/**
 * Copy Generation Section Component
 * 
 * Handles the copy generation process, including configuration,
 * displaying variations, and editing capabilities.
 */
const CopyGenerationSection: React.FC<CopyGenerationSectionProps> = ({
  strategy,
  analysis,
  onGenerationComplete
}) => {
  // Default generation configuration
  const defaultConfig: CopyGenerationConfig = {
    tone: strategy.brandVoice.tone || 'Professional',
    style: 'Direct',
    length: 'medium',
    type: 'body',
    includeCallToAction: true,
    callToActionText: 'Learn More',
    frameCount: 1
  };
  
  // State
  const [config, setConfig] = useState<CopyGenerationConfig>(defaultConfig);
  const [variations, setVariations] = useState<CopyVariation[]>([]);
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null);
  const [activeVariation, setActiveVariation] = useState<CopyVariation | null>(null);
  const [historyVariation, setHistoryVariation] = useState<string | null>(null);
  const [variationHistory, setVariationHistory] = useState<CopyVariation[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState<boolean>(false);
  
  // Handler for config changes
  const handleConfigChange = (newConfig: CopyGenerationConfig) => {
    setConfig(newConfig);
  };
  
  // Generate copy variations
  const generateCopy = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const newVariations = await CopyGenerationMediator.generateCopyVariations(
        strategy,
        config,
        variations.length > 0 ? variations : undefined
      );
      
      setVariations([...newVariations, ...variations]);
      
      if (newVariations.length > 0) {
        setSelectedVariationId(newVariations[0].id);
        onGenerationComplete(newVariations);
      }
    } catch (err) {
      console.error('Error generating copy:', err);
      setError('Failed to generate copy. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Handler for selecting a variation
  const handleSelectVariation = (id: string) => {
    setSelectedVariationId(id);
    setActiveVariation(null);
  };
  
  // Handler for editing a variation
  const handleEditVariation = (variation: CopyVariation) => {
    setActiveVariation(variation);
  };
  
  // Handler for saving edited variation
  const handleSaveVariation = (editedVariation: CopyVariation) => {
    // Update variations list
    const updatedVariations = variations.map((variation) =>
      variation.id === editedVariation.id ? editedVariation : variation
    );
    
    setVariations(updatedVariations);
    setActiveVariation(null);
    onGenerationComplete(updatedVariations);
  };
  
  // Handler for canceling edit
  const handleCancelEdit = () => {
    setActiveVariation(null);
  };
  
  // Handler for viewing variation history
  const handleViewHistory = async (variationId: string) => {
    setHistoryVariation(variationId);
    
    try {
      const history = await CopyGenerationMediator.getVariationHistory(variationId);
      setVariationHistory(history);
      setHistoryDialogOpen(true);
    } catch (err) {
      console.error('Error fetching variation history:', err);
    }
  };
  
  // Format date for display
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <Box>
      {/* Config form */}
      <GenerationConfigForm 
        config={config} 
        onConfigChange={handleConfigChange} 
      />
      
      {/* Generate button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={isGenerating ? <CircularProgress size={24} color="inherit" /> : <AutoFixHighIcon />}
          onClick={generateCopy}
          disabled={isGenerating || analysis.completeness < 0.5}
          sx={{ px: 4, py: 1 }}
        >
          {isGenerating ? 'Generating...' : 'Generate Copy'}
        </Button>
      </Box>
      
      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}
      
      {/* Warning if strategy is incomplete */}
      {analysis.completeness < 0.5 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <AlertTitle>Strategy Incomplete</AlertTitle>
          Your marketing strategy is incomplete. Please complete the strategy before generating copy for better results.
        </Alert>
      )}
      
      {/* Variation gallery */}
      {variations.length > 0 ? (
        <>
          {activeVariation ? (
            // Copy editor
            <CopyEditor
              variation={activeVariation}
              onSave={handleSaveVariation}
              onCancel={handleCancelEdit}
            />
          ) : (
            // Variation gallery
            <VariationGallery
              variations={variations}
              selectedVariationId={selectedVariationId}
              onSelectVariation={handleSelectVariation}
              onEditVariation={handleEditVariation}
              onViewHistory={handleViewHistory}
            />
          )}
        </>
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Ready to Generate Copy
          </Typography>
          <Typography variant="body1" paragraph>
            Configure your generation settings above and click "Generate Copy" to create variations based on your marketing strategy.
          </Typography>
        </Paper>
      )}
      
      {/* History dialog */}
      <Dialog 
        open={historyDialogOpen} 
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <HistoryIcon sx={{ mr: 1 }} />
            Version History
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          {variationHistory.length > 0 ? (
            <Box>
              {variationHistory.map((variation, index) => (
                <Box key={variation.id + index} sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1">
                      Version {variation.version}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(variation.modifiedAt)}
                    </Typography>
                  </Box>
                  
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body1">
                      {variation.frames 
                        ? variation.frames.map((frame, idx) => (
                            <Box key={idx} sx={{ mb: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                Frame {idx + 1}
                              </Typography>
                              <Typography variant="body1" paragraph>
                                {frame}
                              </Typography>
                            </Box>
                          ))
                        : variation.text}
                    </Typography>
                  </Paper>
                  
                  {index < variationHistory.length - 1 && <Divider sx={{ my: 2 }} />}
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body1" color="text.secondary" align="center">
              No version history available for this variation.
            </Typography>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CopyGenerationSection;
