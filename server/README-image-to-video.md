# AIrWAVE Image-to-Video Service

## Introduction

The Image-to-Video service in the AIrWAVE platform converts static images into dynamic videos with motion effects. This service integrates with the asset management system to automatically save generated videos as assets, making them easily accessible and reusable.

## Key Features

- **Image-to-Video Conversion**: Transform static images into dynamic videos with various motion effects
- **Motion Controls**: Select from zoom, pan, rotation, or complex motion patterns
- **Asset Integration**: Generated videos are automatically saved to the asset library
- **Webhook Support**: Process status updates from the external video generation API
- **Real-time Updates**: Progress and completion notifications via WebSockets

## Integration with Asset Management

The image-to-video service is fully integrated with the asset management system:

1. **Automatic Asset Creation**: Successfully generated videos are automatically saved as assets
2. **Metadata Preservation**: Generation parameters are stored in asset metadata
3. **Search & Discovery**: Generated videos are tagged for easy discovery in the asset library
4. **Client Context**: All generated assets respect client context boundaries
5. **User Attribution**: Assets maintain connection to the generating user

## API Endpoints

### Generate Video

```
POST /api/image-to-video/generate
```

**Request Body:**
```json
{
  "sourceImage": "data:image/jpeg;base64,...", // Base64 encoded image
  "motionType": "zoom", // Options: zoom, pan, rotation, complex
  "motionStrength": 50, // 1-100
  "motionDirection": "in", // Options: in, out, left, right, up, down
  "duration": 3, // In seconds
  "outputFormat": "mp4", // Options: mp4, mov, gif
  "width": 1080, // Output width in pixels
  "height": 1080 // Output height in pixels
}
```

### Get Job Status

```
GET /api/image-to-video/jobs/:jobId
```

### Get Client Jobs

```
GET /api/image-to-video/jobs/client/:clientId
```

### Webhook (Internal)

```
POST /api/image-to-video/webhook
```

## Finding Generated Videos in Asset Library

Generated videos can be found in the asset library by:

- Searching for the tag "image-to-video"
- Filtering by categories "videos, generated"
- Looking up specific assets via their job ID in the metadata

## Technical Implementation

The image-to-video service is implemented as a singleton with a clean interface to the underlying video generation provider (Runway ML). Key components include:

1. **WebSocket Service Integration**: Real-time updates are sent to clients through the WebSocket service
2. **Webhook Handler**: Processes callbacks from the external API
3. **Asset Service Integration**: Saves generated videos to the asset library
4. **Job Management**: Tracks and manages video generation jobs

## Error Handling

- **Connection Errors**: Failed connections to external API are retried
- **Invalid Parameters**: Parameter validation before sending to external service
- **Asset Creation Failures**: Asset creation errors are logged but don't disrupt user experience
- **Webhook Processing Errors**: Robust error handling to prevent webhook acknowledgment issues

## Configuration

The service requires the following environment variables:

- `RUNWAY_API_KEY`: API key for the Runway ML service
- `RUNWAY_API_URL`: Base URL for the Runway ML API
- `UPLOAD_DIR`: Directory for temporary file storage

## Asset Integration Details

When videos are successfully generated, they're automatically saved to the asset library with:

- **File handling**: Video is downloaded and processed for asset storage
- **Metadata**: Generation parameters and job ID stored in metadata
- **Tags**: Tagged with "generated" and "image-to-video"
- **Categories**: Categorized as "videos" and "generated"
- **Ownership**: Properly attributed to the requesting user and client
