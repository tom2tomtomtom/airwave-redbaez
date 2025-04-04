"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugTemplates = debugTemplates;
const logger_1 = require("../utils/logger");
/**
 * Debug script for examining template formats in the database
 * This is a development utility and should not be used in production
 */
async function debugTemplates() {
    try {
        logger_1.logger.info('Debugging template formats...');
        // Import dependencies inside function to avoid loading in production
        const { supabase } = await Promise.resolve().then(() => __importStar(require('../db/supabaseClient')));
        // Fetch all templates
        const { data: templates, error } = await supabase
            .from('templates')
            .select('*');
        if (error) {
            logger_1.logger.error('Error fetching templates:', error);
            return;
        }
        logger_1.logger.info(`Found ${templates?.length || 0} templates`);
        if (templates && templates.length > 0) {
            templates.forEach((template, index) => {
                logger_1.logger.debug(`\nTemplate ${index + 1}: ${template.name}`);
                logger_1.logger.debug(`  ID: ${template.id}`);
                logger_1.logger.debug(`  Format: ${template.format}`);
                logger_1.logger.debug(`  Format type: ${typeof template.format}`);
                logger_1.logger.debug(`  Description: ${template.description}`);
                logger_1.logger.debug(`  Created: ${template.created_at}`);
                logger_1.logger.debug('  All columns:', Object.keys(template).join(', '));
            });
        }
        else {
            logger_1.logger.warn('No templates found');
        }
        logger_1.logger.info('\nDebug completed');
    }
    catch (error) {
        logger_1.logger.error('Error in debugTemplates:', error);
    }
}
