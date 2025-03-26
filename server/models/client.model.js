/**
 * Client model for the AIrWAVE application
 * This model is used to store client information and supports the client-based filtering
 * across assets, templates, campaigns, etc.
 */
const { SQL } = require('@databases/pg');
const db = require('../database');

class ClientModel {
  /**
   * Create a new client
   * @param {Object} clientData - Client data
   * @returns {Promise<Object>} Created client
   */
  static async create(clientData) {
    const { name, logo_url, primary_color, secondary_color, description } = clientData;
    
    const result = await db.query(SQL`
      INSERT INTO clients (
        name, 
        logo_url, 
        primary_color, 
        secondary_color, 
        description,
        is_active
      ) VALUES (
        ${name},
        ${logo_url || null},
        ${primary_color || null},
        ${secondary_color || null},
        ${description || null},
        ${true}
      )
      RETURNING *
    `);
    
    return result[0] || null;
  }

  /**
   * Get all clients
   * @returns {Promise<Array>} List of clients
   */
  static async getAll() {
    const clients = await db.query(SQL`
      SELECT * FROM clients
      ORDER BY name ASC
    `);
    
    return clients;
  }

  /**
   * Get a client by ID
   * @param {string} id - Client ID
   * @returns {Promise<Object>} Client
   */
  static async getById(id) {
    const clients = await db.query(SQL`
      SELECT * FROM clients
      WHERE id = ${id}
    `);
    
    return clients[0] || null;
  }

  /**
   * Update a client
   * @param {string} id - Client ID
   * @param {Object} clientData - Updated client data
   * @returns {Promise<Object>} Updated client
   */
  static async update(id, clientData) {
    const { name, logo_url, primary_color, secondary_color, description, is_active } = clientData;
    
    const result = await db.query(SQL`
      UPDATE clients
      SET 
        name = ${name},
        logo_url = ${logo_url || null},
        primary_color = ${primary_color || null},
        secondary_color = ${secondary_color || null},
        description = ${description || null},
        is_active = ${is_active !== undefined ? is_active : true},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `);
    
    return result[0] || null;
  }

  /**
   * Delete a client
   * @param {string} id - Client ID
   * @returns {Promise<boolean>} Whether the client was deleted
   */
  static async delete(id) {
    const result = await db.query(SQL`
      DELETE FROM clients
      WHERE id = ${id}
      RETURNING id
    `);
    
    return !!result[0];
  }

  /**
   * Get count of assets, templates, campaigns by client
   * @param {string} id - Client ID
   * @returns {Promise<Object>} Counts of related objects
   */
  static async getRelatedCounts(id) {
    const assetCount = await db.query(SQL`
      SELECT COUNT(*) FROM assets
      WHERE client_id = ${id}
    `);
    
    const templateCount = await db.query(SQL`
      SELECT COUNT(*) FROM templates
      WHERE client_id = ${id}
    `);
    
    const campaignCount = await db.query(SQL`
      SELECT COUNT(*) FROM campaigns
      WHERE client_id = ${id}
    `);
    
    return {
      assets: parseInt(assetCount[0]?.count || 0, 10),
      templates: parseInt(templateCount[0]?.count || 0, 10),
      campaigns: parseInt(campaignCount[0]?.count || 0, 10)
    };
  }
}

module.exports = ClientModel;
