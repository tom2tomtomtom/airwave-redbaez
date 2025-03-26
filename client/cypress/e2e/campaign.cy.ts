describe('Campaign Workflow', () => {
  beforeEach(() => {
    cy.intercept('POST', '**/auth/v1/token?grant_type=password').as('loginRequest');
    cy.intercept('GET', '**/rest/v1/campaigns*').as('getCampaigns');
    cy.intercept('GET', '**/rest/v1/assets*').as('getAssets');
  });

  it('should create and manage a campaign successfully', () => {
    // Login
    cy.visit('/login');
    cy.get('[data-testid=email-input]').type('test@example.com');
    cy.get('[data-testid=password-input]').type('testpassword');
    cy.get('[data-testid=login-button]').click();
    cy.wait('@loginRequest');

    // Create new campaign
    cy.get('[data-testid=create-campaign-button]').click();
    cy.get('[data-testid=campaign-name-input]').type('Test Campaign');
    cy.get('[data-testid=campaign-objective-input]').type('Increase brand awareness');
    cy.get('[data-testid=save-campaign-button]').click();

    // Verify campaign creation
    cy.wait('@getCampaigns');
    cy.contains('Test Campaign').should('be.visible');

    // Upload asset with proper organisation context
    cy.get('[data-testid=upload-asset-button]').click();
    cy.get('[data-testid=file-input]').attachFile('test-image.jpg');
    cy.get('[data-testid=asset-name-input]').type('Test Asset');
    cy.get('[data-testid=upload-submit-button]').click();

    // Verify asset upload
    cy.wait('@getAssets');
    cy.contains('Test Asset').should('be.visible');

    // Create campaign variation
    cy.get('[data-testid=create-variation-button]').click();
    cy.get('[data-testid=variation-name-input]').type('Variation 1');
    cy.get('[data-testid=select-asset-button]').click();
    cy.contains('Test Asset').click();
    cy.get('[data-testid=save-variation-button]').click();

    // Submit for approval
    cy.get('[data-testid=submit-approval-button]').click();
    cy.get('[data-testid=approval-message-input]').type('Please review this campaign');
    cy.get('[data-testid=confirm-submit-button]').click();

    // Verify approval submission
    cy.contains('Pending Approval').should('be.visible');
  });

  it('should handle asset operations securely', () => {
    // Login as organisation user
    cy.visit('/login');
    cy.get('[data-testid=email-input]').type('org-user@example.com');
    cy.get('[data-testid=password-input]').type('testpassword');
    cy.get('[data-testid=login-button]').click();
    cy.wait('@loginRequest');

    // Attempt to access assets
    cy.visit('/assets');
    cy.wait('@getAssets');

    // Should only see organisation's assets
    cy.get('[data-testid=asset-list]').should('exist');
    cy.get('[data-testid=asset-item]').each(($el) => {
      cy.wrap($el).should('have.attr', 'data-org-id').and('eq', 'test-org-id');
    });

    // Upload new asset
    cy.get('[data-testid=upload-asset-button]').click();
    cy.get('[data-testid=file-input]').attachFile('test-video.mp4');
    cy.get('[data-testid=asset-name-input]').type('Test Video');
    cy.get('[data-testid=upload-submit-button]').click();

    // Verify asset appears in organisation's list
    cy.contains('Test Video').should('be.visible');
    cy.get('[data-testid=asset-org-id]').should('have.text', 'test-org-id');
  });

  it('should enforce file size and type restrictions', () => {
    // Login
    cy.visit('/login');
    cy.get('[data-testid=email-input]').type('test@example.com');
    cy.get('[data-testid=password-input]').type('testpassword');
    cy.get('[data-testid=login-button]').click();
    cy.wait('@loginRequest');

    // Attempt to upload oversized file
    cy.get('[data-testid=upload-asset-button]').click();
    cy.get('[data-testid=file-input]').attachFile('large-file.mp4');
    cy.contains('File size exceeds 100MB limit').should('be.visible');

    // Attempt to upload unsupported file type
    cy.get('[data-testid=file-input]').attachFile('unsupported.exe');
    cy.contains('Invalid file type').should('be.visible');

    // Upload valid file
    cy.get('[data-testid=file-input]').attachFile('valid-image.jpg');
    cy.get('[data-testid=asset-name-input]').type('Valid Image');
    cy.get('[data-testid=upload-submit-button]').click();
    cy.contains('Asset uploaded successfully').should('be.visible');
  });

  it('should handle campaign export workflow', () => {
    // Login
    cy.visit('/login');
    cy.get('[data-testid=email-input]').type('test@example.com');
    cy.get('[data-testid=password-input]').type('testpassword');
    cy.get('[data-testid=login-button]').click();
    cy.wait('@loginRequest');

    // Navigate to campaign
    cy.visit('/campaigns/test-campaign');

    // Configure export settings
    cy.get('[data-testid=export-button]').click();
    cy.get('[data-testid=platform-select]').select('Facebook');
    cy.get('[data-testid=format-select]').select('MP4');
    cy.get('[data-testid=quality-select]').select('High');
    
    // Select variations
    cy.get('[data-testid=variation-checkbox]').first().check();
    
    // Start export
    cy.get('[data-testid=start-export-button]').click();
    
    // Verify export started
    cy.contains('Export started').should('be.visible');
    cy.get('[data-testid=export-progress]').should('exist');
  });
});
