import express from 'express';
import { logger } from './logger';
import { supabase } from '../db/supabaseClient';

const router = express.Router();

// POST - Handle Creatomate webhook for render status updates
router.post('/creatomate', async (req, res) => {
  try {
    const { render } = req.body;
    
    if (!render || !render.id) {
      return res.status(400).json({ message: 'Invalid webhook payload' });
    }
    
    logger.info(`Received webhook for render ${render.id}, status: ${render.status}`);
    
    // Find the execution with this render ID
    const { data: execution, error } = await supabase
      .from('executions')
      .select('*')
      .eq('creatomate_render_id', render.id)
      .single();
    
    if (error || !execution) {
      logger.error('Could not find execution for render ID:', render.id);
      return res.status(404).json({ message: 'Execution not found' });
    }
    
    // Update execution status based on render status
    let executionStatus = 'processing';
    let outputUrl = null;
    
    if (render.status === 'completed') {
      executionStatus = 'completed';
      outputUrl = render.url;
    } else if (render.status === 'failed') {
      executionStatus = 'failed';
    }
    
    // Update execution in database
    const { error: updateError } = await supabase
      .from('executions')
      .update({
        status: executionStatus,
        output_url: outputUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', execution.id);
      
    if (updateError) {
      logger.error('Error updating execution:', updateError);
      return res.status(500).json({ message: 'Failed to update execution status' });
    }
    
    // If completed, also create an export record
    if (render.status === 'completed' && outputUrl) {
      const { error: exportError } = await supabase
        .from('exports')
        .insert([{
          execution_id: execution.id,
          platform: execution.platform,
          format: execution.format,
          file_url: outputUrl,
          file_size: render.file_size || 0,
          status: 'completed',
          created_by: execution.created_by
        }]);
        
      if (exportError) {
        logger.error('Error creating export record:', exportError);
      }
    }
    
    // Send response to Creatomate
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error handling Creatomate webhook:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;