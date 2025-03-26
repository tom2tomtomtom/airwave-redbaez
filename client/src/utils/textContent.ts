// Central location for all UI text content with UK English spelling
export const textContent = {
  errors: {
    auth: {
      sessionExpired: 'Your session has expired. Please sign in again.',
      unauthorised: 'You are not authorised to access this resource.',
      organisationRequired: 'Please select an organisation to continue.',
    },
    assets: {
      upload: {
        sizeLimitExceeded: 'File size exceeds maximum limit of 100MB.',
        invalidType: 'Invalid file type. Please upload images (JPG, PNG, GIF) or videos (MP4, MOV).',
        rateLimitExceeded: 'Upload limit reached (100 per hour). Please try again later.',
        failed: 'Failed to upload file. Please try again.',
      },
      access: {
        denied: 'You do not have permission to access this asset.',
        organisationMismatch: 'Asset belongs to a different organisation.',
      },
    },
    campaigns: {
      creation: {
        nameRequired: 'Please enter a campaign name.',
        assetsRequired: 'Please select at least one asset.',
        templateRequired: 'Please select a template.',
        organisationRequired: 'Campaign must be associated with an organisation.',
      },
      export: {
        noDestination: 'Please select at least one export destination.',
        optimisationFailed: 'Asset optimisation failed. Please try again.',
      },
    },
    brief: {
      submission: {
        detailsRequired: 'Please provide all required brief details.',
        objectivesRequired: 'Please specify campaign objectives.',
        targetAudienceRequired: 'Please define target audience.',
      },
    },
  },
  success: {
    assets: {
      uploaded: 'File uploaded successfully.',
      deleted: 'Asset deleted successfully.',
      updated: 'Asset updated successfully.',
    },
    campaigns: {
      created: 'Campaign created successfully.',
      updated: 'Campaign updated successfully.',
      exported: 'Campaign exported successfully.',
    },
    brief: {
      submitted: 'Brief submitted successfully.',
      approved: 'Brief approved successfully.',
    },
  },
  labels: {
    assets: {
      upload: 'Upload Files',
      select: 'Select Files',
      dragDrop: 'Drag and drop files here',
      processing: 'Processing...',
      optimising: 'Optimising...',
    },
    campaigns: {
      name: 'Campaign Name',
      template: 'Template',
      assets: 'Assets',
      settings: 'Settings',
      preview: 'Preview',
      export: 'Export',
    },
    brief: {
      objectives: 'Campaign Objectives',
      targetAudience: 'Target Audience',
      keyMessages: 'Key Messages',
      brandGuidelines: 'Brand Guidelines',
    },
    strategy: {
      briefAnalysis: 'Brief Analysis',
      uploadBrief: 'Click to upload brief (PDF, DOC, DOCX, or TXT)',
      pasteBrief: 'Or paste brief content:',
      targetAudience: 'Target Audience',
      campaignObjectives: 'Campaign Objectives',
      motivations: 'Audience Motivations',
      selectMotivation: 'Select primary motivation',
    },
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      next: 'Next',
      back: 'Back',
      submit: 'Submit',
      loading: 'Loading...',
      processing: 'Processing...',
      optimising: 'Optimising...',
      error: 'Error',
      success: 'Success',
    },
  },
  placeholders: {
    strategy: {
      briefContent: 'Enter brief content here...',
      targetAudience: 'Describe your target audience...',
      campaignObjectives: 'What are your campaign objectives?',
    },
    campaigns: {
      name: 'Enter campaign name...',
      description: 'Enter campaign description...',
      client: 'Select or enter client name...',
    },
    assets: {
      name: 'Enter asset name...',
      tags: 'Add tags...',
      description: 'Enter asset description...',
    },
  },
  status: {
    analysing: 'Analysing...',
    loading: 'Loading...',
    uploading: 'Uploading...',
    processing: 'Processing...',
    optimising: 'Optimising...',
    exporting: 'Exporting...',
    generating: 'Generating...',
  },
  actions: {
    analyse: 'Analyse Brief',
    upload: 'Upload',
    download: 'Download',
    generate: 'Generate',
    export: 'Export',
    save: 'Save',
    submit: 'Submit',
  },
  confirmations: {
    delete: {
      asset: 'Are you sure you want to delete this asset?',
      campaign: 'Are you sure you want to delete this campaign?',
      brief: 'Are you sure you want to delete this brief?',
    },
    export: {
      confirm: 'Are you sure you want to export this campaign?',
      warning: 'This action cannot be undone.',
    },
  },
  tooltips: {
    assets: {
      size: 'Maximum file size: 100MB',
      types: 'Supported files: JPG, PNG, GIF, MP4, MOV',
    },
    campaigns: {
      preview: 'Preview how your campaign will look',
      export: 'Export campaign to selected platforms',
    },
  },
};
