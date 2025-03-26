"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabaseClient_1 = require("./db/supabaseClient");
/**
 * This script prints out template information including format values
 * to help diagnose why they're showing up as square in the UI
 */
async function debugTemplates() {
    try {
        console.log('Debugging template formats...');
        // Get all templates
        const { data: templates, error: fetchError } = await supabaseClient_1.supabase
            .from('templates')
            .select('*')
            .limit(20);
        if (fetchError) {
            console.error('Error fetching templates:', fetchError);
            return;
        }
        console.log(`Found ${templates?.length || 0} templates`);
        // Print detailed format information for each template
        if (templates && templates.length > 0) {
            templates.forEach((template, index) => {
                console.log(`\nTemplate ${index + 1}: ${template.name}`);
                console.log(`  ID: ${template.id}`);
                console.log(`  Format: ${template.format}`);
                console.log(`  Format type: ${typeof template.format}`);
                console.log(`  Description: ${template.description}`);
                console.log(`  Created: ${template.created_at}`);
                // Check column names
                console.log('  All columns:', Object.keys(template).join(', '));
            });
        }
        else {
            console.log('No templates found');
        }
        console.log('\nDebug completed');
    }
    catch (error) {
        console.error('Unhandled error:', error);
    }
}
// Run the debug function
debugTemplates().catch(console.error);
