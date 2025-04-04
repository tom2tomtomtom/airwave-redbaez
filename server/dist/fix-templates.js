"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabaseClient_1 = require("./db/supabaseClient");
const logger_1 = require("./utils/logger");
/**
 * This script fixes template format values in the database.
 * It attempts three different approaches:
 * 1. Update using the format column
 * 2. Add a format column if it doesn't exist
 * 3. Try alternate column names based on typical naming conventions
 */
async function fixTemplates() {
    logger_1.logger.info('Starting template format fix script...');
    try {
        // First check if the table and column exist
        const { data: tableInfo, error: tableError } = await supabaseClient_1.supabase
            .from('templates')
            .select('*')
            .limit(1);
        if (tableError) {
            logger_1.logger.error('Error accessing templates table:', tableError);
            return;
        }
        logger_1.logger.info('Templates table exists. Sample record:', tableInfo);
        // Approach 1: Try to update using the format column
        try {
            const { data: formatCheckData, error: formatCheckError } = await supabaseClient_1.supabase
                .from('templates')
                .select('id, format, name')
                .limit(10);
            if (formatCheckError) {
                logger_1.logger.error('Error checking format column:', formatCheckError);
                logger_1.logger.info('Format column may not exist, trying alternate approaches');
            }
            else {
                logger_1.logger.info('Format column exists. Sample data:', formatCheckData);
                // Update templates with missing or invalid formats
                for (const template of formatCheckData) {
                    if (!template.format || !['square', 'landscape', 'portrait', 'story'].includes(template.format)) {
                        const { error: updateError } = await supabaseClient_1.supabase
                            .from('templates')
                            .update({ format: 'square' })
                            .eq('id', template.id);
                        if (updateError) {
                            logger_1.logger.error(`Failed to update template ${template.id}:`, updateError);
                        }
                        else {
                            logger_1.logger.info(`Updated template ${template.id} (${template.name}) to square format`);
                        }
                    }
                }
            }
        }
        catch (err) {
            logger_1.logger.error('Error in approach 1:', err);
        }
        // Approach 2: Try to add the format column if it doesn't exist
        try {
            logger_1.logger.info('Attempting to add format column if it doesn\'t exist...');
            // This would require rpc permission or SQL execution rights
            // In a real environment, you would create a migration to add this column
            // For demo purposes, let's simulate this with a direct SQL query through RPC
            const { error: alterError } = await supabaseClient_1.supabase.rpc('execute_sql', {
                sql: 'ALTER TABLE templates ADD COLUMN IF NOT EXISTS format TEXT DEFAULT \'square\' NOT NULL'
            });
            if (alterError) {
                logger_1.logger.error('Could not add format column:', alterError);
            }
            else {
                logger_1.logger.info('Successfully added format column or it already existed');
            }
        }
        catch (err) {
            logger_1.logger.error('Error in approach 2:', err);
        }
        // Approach 3: Check for alternate column names (type, aspect_ratio, etc.)
        try {
            const alternateColumns = ['type', 'aspect_ratio', 'template_type', 'template_format'];
            for (const colName of alternateColumns) {
                const { data: checkData, error: checkError } = await supabaseClient_1.supabase
                    .from('templates')
                    .select(`id, name, ${colName}`)
                    .limit(1);
                if (!checkError) {
                    logger_1.logger.info(`Found alternate column: ${colName}. Sample:`, checkData);
                    // If we found an alternate column, use it to set the format
                    const { error: sqlError } = await supabaseClient_1.supabase.rpc('execute_sql', {
                        sql: `UPDATE templates SET format = ${colName} WHERE format IS NULL`
                    });
                    if (sqlError) {
                        logger_1.logger.error(`Could not update from ${colName}:`, sqlError);
                    }
                    else {
                        logger_1.logger.info(`Updated format column using values from ${colName}`);
                    }
                }
            }
        }
        catch (err) {
            logger_1.logger.error('Error in approach 3:', err);
        }
        logger_1.logger.info('Template format fix script completed');
    }
    catch (error) {
        logger_1.logger.error('Unhandled error in fix script:', error);
    }
}
// Run the fix function
fixTemplates().catch(err => logger_1.logger.error('Failed to run fix templates script:', err));
