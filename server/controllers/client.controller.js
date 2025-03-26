/**
 * Client controller for handling client-related API requests
 */
const ClientModel = require('../models/client.model');
const { validationResult } = require('express-validator');

class ClientController {
  /**
   * Get all clients
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getAllClients(req, res) {
    try {
      const clients = await ClientModel.getAll();
      return res.json(clients);
    } catch (error) {
      console.error('Error fetching clients:', error);
      return res.status(500).json({ message: 'Error fetching clients' });
    }
  }

  /**
   * Get a client by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getClientById(req, res) {
    try {
      const { id } = req.params;
      const client = await ClientModel.getById(id);
      
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      return res.json(client);
    } catch (error) {
      console.error('Error fetching client:', error);
      return res.status(500).json({ message: 'Error fetching client' });
    }
  }

  /**
   * Create a new client
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async createClient(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const client = await ClientModel.create(req.body);
      return res.status(201).json(client);
    } catch (error) {
      console.error('Error creating client:', error);
      return res.status(500).json({ message: 'Error creating client' });
    }
  }

  /**
   * Update a client
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async updateClient(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { id } = req.params;
      const client = await ClientModel.getById(id);
      
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      const updatedClient = await ClientModel.update(id, req.body);
      return res.json(updatedClient);
    } catch (error) {
      console.error('Error updating client:', error);
      return res.status(500).json({ message: 'Error updating client' });
    }
  }

  /**
   * Delete a client
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async deleteClient(req, res) {
    try {
      const { id } = req.params;
      const client = await ClientModel.getById(id);
      
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      // Get counts of related objects
      const counts = await ClientModel.getRelatedCounts(id);
      const totalRelated = counts.assets + counts.templates + counts.campaigns;
      
      if (totalRelated > 0) {
        return res.status(400).json({ 
          message: 'Cannot delete client with associated assets, templates, or campaigns',
          counts
        });
      }
      
      await ClientModel.delete(id);
      return res.json({ message: 'Client deleted successfully' });
    } catch (error) {
      console.error('Error deleting client:', error);
      return res.status(500).json({ message: 'Error deleting client' });
    }
  }

  /**
   * Get related counts for a client
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getRelatedCounts(req, res) {
    try {
      const { id } = req.params;
      const client = await ClientModel.getById(id);
      
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      const counts = await ClientModel.getRelatedCounts(id);
      return res.json(counts);
    } catch (error) {
      console.error('Error fetching client related counts:', error);
      return res.status(500).json({ message: 'Error fetching client related counts' });
    }
  }
}

module.exports = ClientController;
