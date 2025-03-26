import './commands';
import { supabase } from '../../src/supabaseClient';

beforeEach(() => {
  // Clear local storage and cookies before each test
  cy.clearLocalStorage();
  cy.clearCookies();

  // Reset Supabase auth state
  supabase.auth.signOut();
});

// Handle uncaught exceptions
Cypress.on('uncaught:exception', (err) => {
  // Prevent Cypress from failing the test for uncaught exceptions
  return false;
});

// Add custom assertion for organisation context
chai.Assertion.addProperty('belongToOrganisation', function () {
  const obj = this._obj;
  const orgId = obj.getAttribute('data-org-id');
  
  this.assert(
    orgId === Cypress.env('organisationId'),
    'expected #{this} to belong to the current organisation',
    'expected #{this} to not belong to the current organisation'
  );
});
