import { supabase } from './db/supabaseClient';
import { logger } from './logger';

/**
 * This script manually updates sample templates with different formats
 * to test if our format changes are being applied properly
 */
async function updateTestFormats() {
  try {
    logger.info('Starting format test update...');
    
    // First get a list of template IDs
    const { data: templates, error: fetchError } = await supabase
      .from('templates')
      .select('id, name, format')
      .limit(10);
      
    if (fetchError) {
      logger.error('Error fetching templates:', fetchError);
      return;
    }
    
    logger.info('Found templates:', templates);
    
    if (!templates || templates.length === 0) {
      logger.info('No templates found to update');
      return;
    }
    
    // Assign different formats to test templates
    const formats = ['square', 'landscape', 'portrait', 'story'];
    
    for (let i = 0; i < Math.min(templates.length, formats.length); i++) {
      const template = templates[i];
      const format = formats[i];
      
      logger.info(`Updating template ${template.id} (${template.name}) to format ${format}`);
      
      // Update the format directly
      const { error: updateError } = await supabase
        .from('templates')
        .update({ format })
        .eq('id', template.id);
        
      if (updateError) {
        logger.error(`Error updating template ${template.id}:`, updateError);
      } else {
        logger.info(`✅ Successfully updated template ${template.id} to ${format}`);
      }
    }
    
    // Verify the updates
    const { data: updatedTemplates, error: verifyError } = await supabase
      .from('templates')
      .select('id, name, format')
      .in('id', templates.map(t => t.id));
      
    if (verifyError) {
      logger.error('Error verifying updates:', verifyError);
    } else {
      logger.info('Updated templates:', updatedTemplates);
    }
    
    logger.info('Format test update completed');
  } catch (error) {
    logger.error('Unhandled error:', error);
  }
}

// Run the update function
updateTestFormats().catch(console.error);
