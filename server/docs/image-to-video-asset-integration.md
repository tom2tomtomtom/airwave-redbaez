# Image-to-Video Asset Integration Documentation

## Overview

This document explains how the image-to-video service integrates with the asset management system in the AIrWAVE platform. The integration automatically saves generated videos as assets in the asset library when video generation completes successfully, enabling users to find, manage, and reuse these videos through the standard asset library interface.

## Technical Implementation

### Integration Flow

1. **Video Generation Request**
   - User initiates video generation through the UI
   - Request is processed by `imageToVideoService.generateVideo()`
   - A job is created and tracked in `activeJobs` map

2. **Job Processing**
   - External API generates the video
   - Status is polled or received via webhook
   - Job status updates are broadcast to clients via WebSockets

3. **Asset Creation (on success)**
   - When job status changes to "succeeded", `saveVideoToAssets()` is called
   - Downloaded video is saved to temp location
   - Video is uploaded to asset library with metadata including:
     - Source information (image-to-video generation)
     - Motion parameters used for generation
     - Generation timestamp and user/client context
   - Job is updated with reference to created asset (`assetId`)
   - Asset creation is skipped if the job already has an `assetId` to prevent duplication

4. **Asset Management**
   - Videos become available in asset library
   - Standard asset features (search, filter, delete) apply to generated videos
   - Assets are tagged with "generated" and "image-to-video" for easy identification

### Key Components

1. **ImageToVideoService**
   - Manages the video generation process
   - Tracks job status and progress
   - Integrates with the asset service for video storage

2. **AssetService**
   - Handles file management and metadata extraction
   - Stores generated videos with appropriate properties
   - Provides API for accessing and managing assets

3. **Webhook Handler**
   - Processes notifications from external API
   - Updates job status and triggers asset creation

## Usage in Client Applications

### Client-Side Integration

The client-side integration provides these features:

1. **Video Generation UI**
   - Users can generate videos through the Image-to-Video page
   - Generation parameters are sent to the server through the Image-to-Video API

2. **Real-time Updates**
   - WebSocket notifications update the client when generation completes
   - Updates include the `assetId` when the video is saved to the asset library

3. **Asset Library Access**
   - Completed videos show a "View in Asset Library" button
   - This button links directly to the asset details page
   - Users can manage the generated video like any other asset

### Finding Generated Videos

Generated videos can be found in the asset library by:

1. Searching for assets with the tag "image-to-video"
2. Using the regular asset filtering functionality
3. Looking up the asset via the job ID (if stored)
4. From the Image-to-Video generation history, click "View in Library"

### Related Properties

Generated videos include these properties:

- **tags**: "generated", "image-to-video"
- **categories**: "videos", "generated"
- **name**: "Generated Video - {timestamp}" (default)

## Error Handling

The integration includes several error handling mechanisms:

1. **Network Failures**: If downloading the video fails, errors are logged and the asset is not created
2. **Asset Service Failures**: If the asset service fails, errors are logged but the job still shows as successful
3. **Missing Fields**: Required fields are validated before attempting asset creation
4. **Webhook Processing**: Robust error handling ensures webhook processing doesn't fail even if asset creation encounters issues
5. **Client-Side Recovery**: Client displays appropriate error messages but still allows access to the video URL even if asset creation fails

## Technical Modifications

The following files were modified to implement this integration:

1. **Server-side**
   - `imageToVideoService.ts`: Added `saveVideoToAssets` method and updated `updateJobStatus` and `handleWebhook`
   - `ImageToVideoRouter.ts`: Updated to handle webhook processing with the full request body
   - `image-to-video.routes.ts`: Modified webhook route to correctly pass webhook data

2. **Client-side**
   - `ImageToVideoPlugin.ts`: Updated to include `assetId` in the result interface
   - `ImageToVideoPage.tsx`: Modified to display asset library links when videos have assets

## Future Improvements

Potential future enhancements:

1. Add ability to customise asset metadata during video generation
2. Implement batch processing for multiple videos
3. Add option to generate additional thumbnail variations
4. Improve error recovery for partially completed processes
5. Implement streaming downloads for large video files
6. Add asset collection support for organising related video generations
7. Enhance metadata extraction for better searchability
