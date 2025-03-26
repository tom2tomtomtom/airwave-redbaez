"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRelatedCounts = exports.deleteClient = exports.updateClient = exports.createClient = exports.getClientById = exports.getAllClients = void 0;
const express_validator_1 = require("express-validator");
const supabaseClient_1 = require("../db/supabaseClient");
/**
 * Get all clients
 */
const getAllClients = async (req, res) => {
    try {
        const { data: clients, error } = await supabaseClient_1.supabase
            .from('clients')
            .select('*')
            .order('name');
        if (error)
            throw error;
        res.json(clients);
    }
    catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({
            message: 'Error fetching clients',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getAllClients = getAllClients;
/**
 * Get a client by ID
 */
const getClientById = async (req, res) => {
    try {
        const { id } = req.params;
        const { data: client, error } = await supabaseClient_1.supabase
            .from('clients')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                res.status(404).json({ message: 'Client not found' });
                return;
            }
            throw error;
        }
        res.json(client);
    }
    catch (error) {
        console.error('Error fetching client:', error);
        res.status(500).json({
            message: 'Error fetching client',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getClientById = getClientById;
/**
 * Create a new client
 */
const createClient = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { name, logo_url, primary_color, secondary_color, description } = req.body;
        const { data: client, error } = await supabaseClient_1.supabase
            .from('clients')
            .insert([
            {
                name,
                logo_url,
                primary_color,
                secondary_color,
                description,
                is_active: true
            }
        ])
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json(client);
    }
    catch (error) {
        console.error('Error creating client:', error);
        res.status(500).json({
            message: 'Error creating client',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.createClient = createClient;
/**
 * Update a client
 */
const updateClient = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { id } = req.params;
        const { name, logo_url, primary_color, secondary_color, description, is_active } = req.body;
        // First check if client exists
        const { data: existingClient, error: fetchError } = await supabaseClient_1.supabase
            .from('clients')
            .select('*')
            .eq('id', id)
            .single();
        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                res.status(404).json({ message: 'Client not found' });
                return;
            }
            throw fetchError;
        }
        const { data: client, error } = await supabaseClient_1.supabase
            .from('clients')
            .update({
            name,
            logo_url,
            primary_color,
            secondary_color,
            description,
            is_active: is_active !== undefined ? is_active : existingClient.is_active,
            updated_at: new Date().toISOString()
        })
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        res.json(client);
    }
    catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({
            message: 'Error updating client',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateClient = updateClient;
/**
 * Delete a client
 */
const deleteClient = async (req, res) => {
    try {
        const { id } = req.params;
        // First check if client exists
        const { data: client, error: fetchError } = await supabaseClient_1.supabase
            .from('clients')
            .select('*')
            .eq('id', id)
            .single();
        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                res.status(404).json({ message: 'Client not found' });
                return;
            }
            throw fetchError;
        }
        // Check if client has associated assets, templates, or campaigns
        const counts = await getClientRelatedCounts(id);
        const totalRelated = counts.assets + counts.templates + counts.campaigns;
        if (totalRelated > 0) {
            res.status(400).json({
                message: 'Cannot delete client with associated assets, templates, or campaigns',
                counts
            });
            return;
        }
        const { error } = await supabaseClient_1.supabase
            .from('clients')
            .delete()
            .eq('id', id);
        if (error)
            throw error;
        res.json({ message: 'Client deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting client:', error);
        res.status(500).json({
            message: 'Error deleting client',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.deleteClient = deleteClient;
/**
 * Get related counts for a client
 */
const getRelatedCounts = async (req, res) => {
    try {
        const { id } = req.params;
        // First check if client exists
        const { data: client, error: fetchError } = await supabaseClient_1.supabase
            .from('clients')
            .select('*')
            .eq('id', id)
            .single();
        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                res.status(404).json({ message: 'Client not found' });
                return;
            }
            throw fetchError;
        }
        const counts = await getClientRelatedCounts(id);
        res.json(counts);
    }
    catch (error) {
        console.error('Error fetching client related counts:', error);
        res.status(500).json({
            message: 'Error fetching client related counts',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getRelatedCounts = getRelatedCounts;
/**
 * Helper function to get counts of assets, templates, and campaigns for a client
 */
const getClientRelatedCounts = async (clientId) => {
    // Get asset count
    const { count: assetCount, error: assetError } = await supabaseClient_1.supabase
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId);
    if (assetError)
        throw assetError;
    // Get template count
    const { count: templateCount, error: templateError } = await supabaseClient_1.supabase
        .from('templates')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId);
    if (templateError)
        throw templateError;
    // Get campaign count
    const { count: campaignCount, error: campaignError } = await supabaseClient_1.supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId);
    if (campaignError)
        throw campaignError;
    return {
        assets: assetCount || 0,
        templates: templateCount || 0,
        campaigns: campaignCount || 0
    };
};
