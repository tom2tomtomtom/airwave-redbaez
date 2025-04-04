import { logger } from '../utils/logger';

/**
 * Debug script for examining template formats in the database
 * This is a development utility and should not be used in production
 */
export async function debugTemplates() {
  try {
    logger.info('Debugging template formats...');
    
    // Import dependencies inside function to avoid loading in production
    const { supabase } = await import('../db/supabaseClient');
    
    // Fetch all templates
    const { data: templates, error } = await supabase
      .from('templates')
      .select('*');
    
    if (error) {
      logger.error('Error fetching templates:', error);
      return;
    }
    
    logger.info(`Found ${templates?.length || 0} templates`);
    
    if (templates && templates.length > 0) {
      templates.forEach((template, index) => {
        logger.debug(`\nTemplate ${index + 1}: ${template.name}`);
        logger.debug(`  ID: ${template.id}`);
        logger.debug(`  Format: ${template.format}`);
        logger.debug(`  Format type: ${typeof template.format}`);
        logger.debug(`  Description: ${template.description}`);
        logger.debug(`  Created: ${template.created_at}`);
        logger.debug('  All columns:', Object.keys(template).join(', '));
      });
    } else {
      logger.warn('No templates found');
    }
    
    logger.info('\nDebug completed');
  } catch (error) {
    logger.error('Error in debugTemplates:', error);
  }
}
