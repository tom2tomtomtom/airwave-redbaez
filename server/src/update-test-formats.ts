import { supabase } from './db/supabaseClient';

/**
 * This script manually updates sample templates with different formats
 * to test if our format changes are being applied properly
 */
async function updateTestFormats() {
  try {
    console.log('Starting format test update...');
    
    // First get a list of template IDs
    const { data: templates, error: fetchError } = await supabase
      .from('templates')
      .select('id, name, format')
      .limit(10);
      
    if (fetchError) {
      console.error('Error fetching templates:', fetchError);
      return;
    }
    
    console.log('Found templates:', templates);
    
    if (!templates || templates.length === 0) {
      console.log('No templates found to update');
      return;
    }
    
    // Assign different formats to test templates
    const formats = ['square', 'landscape', 'portrait', 'story'];
    
    for (let i = 0; i < Math.min(templates.length, formats.length); i++) {
      const template = templates[i];
      const format = formats[i];
      
      console.log(`Updating template ${template.id} (${template.name}) to format ${format}`);
      
      // Update the format directly
      const { error: updateError } = await supabase
        .from('templates')
        .update({ format })
        .eq('id', template.id);
        
      if (updateError) {
        console.error(`Error updating template ${template.id}:`, updateError);
      } else {
        console.log(`✅ Successfully updated template ${template.id} to ${format}`);
      }
    }
    
    // Verify the updates
    const { data: updatedTemplates, error: verifyError } = await supabase
      .from('templates')
      .select('id, name, format')
      .in('id', templates.map(t => t.id));
      
    if (verifyError) {
      console.error('Error verifying updates:', verifyError);
    } else {
      console.log('Updated templates:', updatedTemplates);
    }
    
    console.log('Format test update completed');
  } catch (error) {
    console.error('Unhandled error:', error);
  }
}

// Run the update function
updateTestFormats().catch(console.error);
