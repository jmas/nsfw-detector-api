# NSFW Content Detector

A Deno Deploy application that detects NSFW (Not Safe For Work) content in images using the nsfwjs library.

## Features

- **HTTP API Endpoint**: Accepts POST requests with JPEG image data
- **NSFW Classification**: Uses TensorFlow.js and nsfwjs for accurate content detection
- **Multiple Categories**: Detects Porn, Sexy, and Hentai content
- **Confidence Scoring**: Returns probability scores for each classification
- **CORS Enabled**: Supports cross-origin requests
- **Error Handling**: Comprehensive error handling and validation
- **Backend Processing**: Uses Deno-compatible image processing libraries

## Usage

### API Endpoint

**POST** `/`

### Request Format

Send a POST request with form data containing an image file in the `image` field.

```bash
curl -X POST \
  -F "image=@/path/to/your/image.jpg" \
  https://your-deno-deploy-url.deno.dev/
```

### Response Format

```json
{
  "predictions": [
    {
      "className": "Neutral",
      "probability": 0.85
    },
    {
      "className": "Porn", 
      "probability": 0.12
    },
    {
      "className": "Sexy",
      "probability": 0.03
    }
  ],
  "isNSFW": false,
  "confidence": 0.12,
  "processingTime": 1250
}
```

### Response Fields

- **predictions**: Array of all classification results with probabilities
- **isNSFW**: Boolean indicating if content is considered NSFW (threshold: 0.5)
- **confidence**: Highest probability among NSFW categories (Porn, Sexy, Hentai)
- **processingTime**: Time taken to process the image in milliseconds

### Classification Categories

The model can classify images into these categories:
- **Neutral**: Safe, non-sexual content
- **Drawing**: Artistic drawings/illustrations
- **Porn**: Explicit sexual content
- **Sexy**: Suggestive but not explicit content
- **Hentai**: Explicit anime/manga content

## Error Responses

### Method Not Allowed (405)
```json
{
  "error": "Method not allowed. Use POST to upload images for NSFW detection."
}
```

### No Image Provided (400)
```json
{
  "error": "No image provided. Please include an 'image' field in your POST request."
}
```

### Invalid File Type (400)
```json
{
  "error": "Unsupported file type. Please upload a JPEG image file."
}
```

### Server Error (500)
```json
{
  "error": "Internal server error during NSFW detection",
  "details": "Error message details"
}
```

## Technical Details

- **Model**: Uses nsfwjs v2.4.2 with TensorFlow.js v4.15.0
- **Image Processing**: Uses jpeg-js library to decode JPEG images and convert to tensors for nsfwjs compatibility
- **Model Loading**: Attempts multiple model sources for Deno Deploy compatibility
- **Performance**: Model is loaded once and cached for subsequent requests
- **Memory Management**: Properly disposes tensors to prevent memory leaks
- **Threshold**: Content is considered NSFW if any NSFW category has probability > 0.5

## Deployment

This application is designed to run on Deno Deploy. You can deploy it using the following methods:

### Option 1: Deploy from GitHub
1. Fork this repository
2. Connect your GitHub account to [Deno Deploy](https://dash.deno.com/)
3. Create a new project and select your forked repository
4. Set the entry point to `nsfw-detector.http.tsx`
5. Deploy!

### Option 2: Deploy using Deno CLI
```bash
# Install Deno CLI if you haven't already
curl -fsSL https://deno.land/install.sh | sh

# Deploy directly from the repository
deno deploy --project=your-project-name nsfw-detector.http.tsx
```

### Option 3: Deploy from local files
```bash
# Clone the repository
git clone <your-repo-url>
cd vt-nsfw-detector

# Deploy from local files
deno deploy --project=your-project-name nsfw-detector.http.tsx
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

This project uses the nsfwjs library for content detection. Please refer to their license terms for usage restrictions.