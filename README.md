# NSFW Content Detector & Profanity Checker

A Deno Deploy application that detects NSFW (Not Safe For Work) content in images using the nsfwjs library and checks text for profanity using language-specific word lists.

## Features

- **Dual Content Detection**: Supports both image NSFW detection and text profanity checking
- **HTTP API Endpoint**: Accepts POST requests with JPEG image data or JSON text content
- **NSFW Classification**: Uses TensorFlow.js and nsfwjs for accurate image content detection
- **Profanity Detection**: Uses language-specific profanity word lists from [jmas/profanity-list](https://github.com/jmas/profanity-list)
- **Multi-language Support**: Supports 21 languages for profanity checking
- **Multiple Categories**: Detects Porn, Sexy, and Hentai content in images
- **Confidence Scoring**: Returns probability scores for each classification
- **Image Validation**: Validates image dimensions (max 640x640) and file size
- **Text Validation**: Validates text content and language headers
- **CORS Enabled**: Supports cross-origin requests
- **Error Handling**: Comprehensive error handling and validation
- **Backend Processing**: Uses Deno-compatible image processing libraries

## Usage

### API Endpoint

**POST** `/`

### Content Types

The API supports three types of content detection based on field presence:

1. **Image NSFW Detection**: Send form data with an 'image' field
2. **Text Profanity Checking**: Send form data with a 'text' field  
3. **Combined Detection**: Send form data with both 'image' and 'text' fields

All content types support `multipart/form-data` and `application/x-www-form-urlencoded` content types.

**Note**: Libraries are loaded dynamically only when needed:
- Image processing libraries (TensorFlow.js, nsfwjs, jpeg-js) are loaded only when an image is present
- Profanity checking is performed using simple word matching for optimal performance

### Image NSFW Detection

Send a POST request with form data containing an image file in the `image` field.

### Image Requirements

- **Format**: JPEG/JPG only
- **Dimensions**: Maximum 640x640 pixels
- **File Size**: Between 1KB and 500KB (need to scale down)
- **Quality**: Must be properly compressed (not corrupted or overly compressed)

```bash
curl -X POST \
  -F "image=@/path/to/your/image.jpg" \
  https://nsfw-detector.ujournal.com.ua/
```

or using JS:

```js
const formdata = new FormData();
formdata.append("image", fileInput.files[0], "(m=eGM68f)(mh=YGlybUU_5R6MVJfb)0.jpg");

const requestOptions = {
  method: "POST",
  body: formdata,
  redirect: "follow"
};

fetch("https://nsfw-detector.ujournal.com.ua/", requestOptions)
  .then((response) => response.json())
  .then((result) => console.log(result))
  .catch((error) => console.error(error));
```

### Text Profanity Checking

Send a POST request with form data containing text content and include a `Content-Language` header.

#### Request Format (multipart/form-data)

```bash
curl -X POST \
  -H "Content-Language: en" \
  -F "text=Your text content here" \
  https://nsfw-detector.ujournal.com.ua/
```

#### Request Format (application/x-www-form-urlencoded)

```bash
curl -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Content-Language: en" \
  -d "text=Your text content here" \
  https://nsfw-detector.ujournal.com.ua/
```

#### JavaScript Example (FormData)

```js
const formdata = new FormData();
formdata.append("text", "Your text content to check for profanity");

const requestOptions = {
  method: "POST",
  headers: {
    "Content-Language": "en"
  },
  body: formdata
};

fetch("https://nsfw-detector.ujournal.com.ua/", requestOptions)
  .then((response) => response.json())
  .then((result) => console.log(result))
  .catch((error) => console.error(error));
```

#### JavaScript Example (URLSearchParams)

```js
const params = new URLSearchParams();
params.append("text", "Your text content to check for profanity");

const requestOptions = {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    "Content-Language": "en"
  },
  body: params
};

fetch("https://nsfw-detector.ujournal.com.ua/", requestOptions)
  .then((response) => response.json())
  .then((result) => console.log(result))
  .catch((error) => console.error(error));
```

### Combined Image and Text Detection

You can check both image and text content in a single request by including both fields.

#### Request Format (multipart/form-data)

```bash
curl -X POST \
  -H "Content-Language: en" \
  -F "image=@/path/to/image.jpg" \
  -F "text=Your text content here" \
  https://nsfw-detector.ujournal.com.ua/
```

#### JavaScript Example (FormData)

```js
const formdata = new FormData();
formdata.append("image", fileInput.files[0]);
formdata.append("text", "Your text content to check for profanity");

const requestOptions = {
  method: "POST",
  headers: {
    "Content-Language": "en"
  },
  body: formdata
};

fetch("https://nsfw-detector.ujournal.com.ua/", requestOptions)
  .then((response) => response.json())
  .then((result) => console.log(result))
  .catch((error) => console.error(error));
```

#### Supported Languages

The API supports profanity checking for the following languages:

- **en** - English
- **es** - Spanish
- **fi** - Finnish
- **fr** - French
- **hi** - Hindi
- **hu** - Hungarian
- **it** - Italian
- **ja** - Japanese
- **ko** - Korean
- **nl** - Dutch
- **no** - Norwegian
- **pl** - Polish
- **pt** - Portuguese
- **ru** - Russian
- **sv** - Swedish
- **th** - Thai
- **tr** - Turkish
- **uk** - Ukrainian
- **zh** - Chinese
- **eo** - Esperanto
- **fil** - Filipino

### Response Format

#### Image NSFW Detection Response

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

#### Text Profanity Checking Response

```json
{
  "isProfanity": true,
  "profanity": ["badword1", "badword2"],
  "processingTime": 45
}
```

#### Combined Detection Response

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
    }
  ],
  "isNSFW": false,
  "isProfanity": true,
  "confidence": 0.12,
  "profanity": ["badword1", "badword2"],
  "processingTime": 1300
}
```

### Response Fields

#### Response Fields

**Image Detection Fields:**
- **predictions**: Array of all classification results with probabilities (only present for image requests)
- **isNSFW**: Boolean indicating if image content is considered NSFW (threshold: 0.5)
- **confidence**: Highest probability among NSFW categories (Porn, Sexy, Hentai) - only present for image requests

**Text Detection Fields:**
- **isProfanity**: Boolean indicating if profanity was detected in the text
- **profanity**: Array of detected profane words - only present for text requests

**Common Fields:**
- **processingTime**: Time taken to process the content in milliseconds

#### Combined Detection

When both image and text are processed in the same request:
- Both **isNSFW** and **isProfanity** fields are included separately
- Both **predictions** and **profanity** fields are included in the response
- **confidence** field is included from image processing

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
  "error": "Method not allowed. Use POST to upload images for NSFW detection or text for profanity checking."
}
```

### No Valid Content Provided (400)
```json
{
  "error": "No valid content provided. Please include either a 'text' field for profanity checking or an 'image' field for NSFW detection."
}
```

### Missing Language Header (400)
```json
{
  "error": "Content-Language header is required for text profanity checking."
}
```

### Unsupported Language (400)
```json
{
  "error": "Unsupported language: xx. Supported languages: en, es, fi, fr, hi, hu, it, ja, ko, nl, no, pl, pt, ru, sv, th, tr, uk, zh, eo, fil"
}
```

### Profanity List Not Found (400)
```json
{
  "error": "Profanity list not found for language: en (english)"
}
```

### Invalid File Type (400)
```json
{
  "error": "Unsupported file type. Please upload a JPEG image file."
}
```

### Image Validation Errors (400)

#### Dimensions Too Large
```json
{
  "error": "Image dimensions exceed maximum allowed size. Current: 800x600, Maximum: 640x640"
}
```

#### File Size Too Small
```json
{
  "error": "File size too small. Current: 500 bytes, Minimum: 1024 bytes"
}
```

#### File Size Too Large
```json
{
  "error": "File size too large. Current: 15728640 bytes, Maximum: 10485760 bytes"
}
```

#### Corrupted/Invalid Compression
```json
{
  "error": "File appears to be too compressed or corrupted. File size (100 bytes) is too small for image dimensions (640x640)"
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

### Image NSFW Detection

- **Model**: Uses nsfwjs v2.4.2 with TensorFlow.js v4.15.0
- **Image Processing**: Uses jpeg-js library to decode JPEG images and convert to tensors for nsfwjs compatibility
- **Image Validation**: Validates dimensions (max 640x640), file size (1KB-10MB), and compression quality
- **Model Loading**: Attempts multiple model sources for Deno Deploy compatibility
- **Performance**: Model is loaded once and cached for subsequent requests
- **Memory Management**: Properly disposes tensors to prevent memory leaks
- **Threshold**: Content is considered NSFW if any NSFW category has probability > 0.5

### Text Profanity Checking

- **Profanity Lists**: Uses word lists from [jmas/profanity-list](https://github.com/jmas/profanity-list) repository
- **Language Support**: Supports 21 languages with cached word lists for performance
- **Detection Method**: Simple substring matching with case-insensitive comparison
- **Caching**: Profanity lists are loaded once per language and cached in memory
- **Language Validation**: Validates language codes and throws errors for unsupported languages
- **Performance**: Fast text processing with minimal memory footprint

### Dynamic Loading & Performance

- **Conditional Imports**: Image processing libraries (TensorFlow.js, nsfwjs, jpeg-js) are only loaded when an image is present
- **Memory Efficiency**: Libraries are imported dynamically to reduce initial bundle size
- **Combined Processing**: Both image and text can be processed in a single request for efficiency
- **Unified Response**: Single `isNSFW` field indicates if either image OR text contains inappropriate content

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
