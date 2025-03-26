/**
 * Client routes for the AIrWAVE application
 */
const express = require('express');
const { body } = require('express-validator');
const ClientController = require('../controllers/client.controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all client routes
router.use(authMiddleware);

// Validation rules for client creation/updating
const clientValidationRules = [
  body('name').notEmpty().withMessage('Client name is required').trim(),
  body('logo_url').optional({ nullable: true }).isURL().withMessage('Logo URL must be a valid URL'),
  body('primary_color').optional({ nullable: true }).isHexColor().withMessage('Primary colour must be a valid hex colour'),
  body('secondary_color').optional({ nullable: true }).isHexColor().withMessage('Secondary colour must be a valid hex colour'),
  body('description').optional({ nullable: true }).trim(),
  body('is_active').optional().isBoolean().withMessage('Is active must be a boolean')
];

// Routes
router.get('/', ClientController.getAllClients);
router.get('/:id', ClientController.getClientById);
router.post('/', clientValidationRules, ClientController.createClient);
router.put('/:id', clientValidationRules, ClientController.updateClient);
router.delete('/:id', ClientController.deleteClient);
router.get('/:id/counts', ClientController.getRelatedCounts);

module.exports = router;
