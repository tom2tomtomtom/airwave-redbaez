import { supabase } from '../../src/supabaseClient';

declare global {
  namespace Cypress {
    interface Chainable {
      loginWithOrganisation(email: string, password: string, organisationId: string): Chainable<void>;
      uploadAsset(file: string, name: string, type: string): Chainable<void>;
      createCampaign(name: string, objective: string): Chainable<void>;
      submitForApproval(message: string): Chainable<void>;
      checkOrganisationContext(): Chainable<void>;
    }
  }
}

// Login with organisation context
Cypress.Commands.add('loginWithOrganisation', (email: string, password: string, organisationId: string) => {
  cy.session([email, organisationId], async () => {
    const { data: { session }, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !session) {
      throw new Error('Failed to log in');
    }

    // Set organisation context
    Cypress.env('organisationId', organisationId);
    localStorage.setItem('organisationId', organisationId);
  });
});

// Upload asset with proper validation
Cypress.Commands.add('uploadAsset', (file: string, name: string, type: string) => {
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime', 'application/pdf'];
  if (!allowedTypes.includes(type)) {
    throw new Error('Invalid file type');
  }

  cy.get('[data-testid=upload-asset-button]').click();
  cy.get('[data-testid=file-input]').attachFile(file);
  cy.get('[data-testid=asset-name-input]').type(name);
  cy.get('[data-testid=upload-submit-button]').click();

  // Verify organisation context
  cy.get('[data-testid=asset-item]').last().should('have.attr', 'data-org-id', Cypress.env('organisationId'));
});

// Create campaign with proper validation
Cypress.Commands.add('createCampaign', (name: string, objective: string) => {
  cy.get('[data-testid=create-campaign-button]').click();
  cy.get('[data-testid=campaign-name-input]').type(name);
  cy.get('[data-testid=campaign-objective-input]').type(objective);
  cy.get('[data-testid=save-campaign-button]').click();

  // Verify organisation context
  cy.get('[data-testid=campaign-item]').last().should('have.attr', 'data-org-id', Cypress.env('organisationId'));
});

// Submit campaign for approval
Cypress.Commands.add('submitForApproval', (message: string) => {
  cy.get('[data-testid=submit-approval-button]').click();
  cy.get('[data-testid=approval-message-input]').type(message);
  cy.get('[data-testid=confirm-submit-button]').click();

  // Verify organisation context
  cy.get('[data-testid=approval-request]').last().should('have.attr', 'data-org-id', Cypress.env('organisationId'));
});

// Check organisation context
Cypress.Commands.add('checkOrganisationContext', () => {
  const orgId = Cypress.env('organisationId');
  if (!orgId) {
    throw new Error('Organisation context not set');
  }

  cy.get('[data-testid=org-context]').should('have.attr', 'data-org-id', orgId);
});
