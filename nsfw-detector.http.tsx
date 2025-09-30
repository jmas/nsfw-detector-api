/**
 * NSFW Content Detection API
 * 
 * This Deno Deploy application provides an HTTP endpoint for detecting NSFW content in images
 * using the nsfwjs library and profanity in text using content-checker. It accepts POST requests 
 * with image data or text content and returns classification results.
 * 
 * Usage:
 * POST / with form data containing 'image' field OR JSON body with 'text' field
 * Include 'Content-Language' header for text profanity checking
 * Returns JSON with NSFW/profanity classification results
 */

// Dynamic imports will be used when needed
// tf, nsfwjs, and jpeg-js will be imported only when image processing is required
// content-checker will be imported only when text processing is required

// Initialize the NSFW model (loaded dynamically when needed)
let model: any = null;

// Supported languages for profanity checking
const SUPPORTED_LANGUAGES = [
  'en', 'es', 'fi', 'fr', 'hi', 'hu', 'it', 'ja', 'ko', 'nl', 'no', 'pl', 
  'pt', 'ru', 'sv', 'th', 'tr', 'uk', 'zh', 'eo', 'fil'
];


// Cache for loaded profanity lists
const profanityListsCache = new Map<string, string[]>();

// Load profanity list for a specific language
async function loadProfanityList(language: string): Promise<string[]> {
  if (profanityListsCache.has(language)) {
    return profanityListsCache.get(language)!;
  }

  if (!SUPPORTED_LANGUAGES.includes(language)) {
    throw new Error(`Unsupported language: ${language}`);
  }

  try {
    const response = await fetch(`https://raw.githubusercontent.com/jmas/profanity-list/main/list/${language}.txt`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Profanity list not found for language: ${language}`);
      }
      throw new Error(`Failed to load profanity list for language: ${language}`);
    }

    const text = await response.text();
    const words = text.split('\n')
      .map(word => word.trim().toLowerCase())
      .filter(word => word.length > 0);

    profanityListsCache.set(language, words);
    return words;
  } catch (_error) {
    console.error(`Error loading profanity list for ${language}:`, _error);
    throw new Error(`Failed to load profanity list for language: ${language}`);
  }
}

// Simple profanity checker function
function checkProfanity(text: string, profanityWords: string[]): string[] {
  const detectedWords: string[] = [];
  const normalizedText = text.toLowerCase();
  
  for (const word of profanityWords) {
    if (normalizedText.includes(word)) {
      detectedWords.push(word);
    }
  }
  
  return detectedWords;
}

// Dynamic model loading with imports
async function loadModel() {
  if (!model) {
    console.log("Loading NSFW model...");
    try {
      // Dynamic imports for image processing
      const tf = await import("@tensorflow/tfjs");
      const nsfwjs = await import("nsfwjs");
      
      tf.env().set('IS_NODE', false);
      
      // Try loading with a different model URL that might work in Deno Deploy
      model = await nsfwjs.load('https://raw.githubusercontent.com/infinitered/nsfwjs/refs/heads/master/models/mobilenet_v2/model.json');
      console.log("NSFW model loaded successfully");
    } catch (_error) {
      console.log("Failed to load from GitHub, trying default...");
      try {
        const nsfwjs = await import("nsfwjs");
        model = await nsfwjs.load();
        console.log("NSFW model loaded from default source");
      } catch (error2) {
        console.log("Failed to load model:", error2);
        throw new Error("Unable to load NSFW model");
      }
    }
  }
  return model;
}

// Validate image dimensions and file size
function validateImageDimensions(width: number, height: number, fileSize: number): { valid: boolean; error?: string } {
  const MAX_DIMENSION = 640;
  const MIN_FILE_SIZE = 1024; // 1KB minimum
  const MAX_FILE_SIZE = 0.5 * 1024 * 1024; // 0.5MB maximum
  
  // Check dimensions
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    return {
      valid: false,
      error: `Image dimensions exceed maximum allowed size. Current: ${width}x${height}, Maximum: ${MAX_DIMENSION}x${MAX_DIMENSION}`
    };
  }
  
  // Check file size
  if (fileSize < MIN_FILE_SIZE) {
    return {
      valid: false,
      error: `File size too small. Current: ${fileSize} bytes, Minimum: ${MIN_FILE_SIZE} bytes`
    };
  }
  
  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size too large. Current: ${fileSize} bytes, Maximum: ${MAX_FILE_SIZE} bytes`
    };
  }
  
  // Check if file size is reasonable for the dimensions
  // const pixels = width * height;
  // const bytesPerPixel = fileSize / pixels;
  
  // For JPEG, expect roughly 0.5-2 bytes per pixel for reasonable compression
  // if (bytesPerPixel < 0.1) {
  //   return {
  //     valid: false,
  //     error: `File appears to be too compressed or corrupted. File size (${fileSize} bytes) is too small for image dimensions (${width}x${height})`
  //   };
  // }
  
  // if (bytesPerPixel > 10) {
  //   return {
  //     valid: false,
  //     error: `File appears to be uncompressed or corrupted. File size (${fileSize} bytes) is too large for image dimensions (${width}x${height})`
  //   };
  // }
  
  return { valid: true };
}

// Convert image data to tensor for nsfwjs
async function convertImageDataToTensor(imageData: any): Promise<any> {
  const tf = await import("@tensorflow/tfjs");
  
  const width = imageData.width;
  const height = imageData.height;
  
  // Convert to tensor format expected by nsfwjs
  const numChannels = 3;
  const numPixels = width * height;
  const values = new Int32Array(numPixels * numChannels);

  // Extract RGB channels from RGBA data
  for (let i = 0; i < numPixels; i++) {
    for (let c = 0; c < numChannels; c++) {
      values[i * numChannels + c] = imageData.data[i * 4 + c];
    }
  }

  return tf.tensor3d(values, [height, width, numChannels], 'int32');
}

interface NSFWResult {
  className: string;
  probability: number;
}

interface DetectionResponse {
  predictions?: NSFWResult[];
  isNSFW?: boolean;
  isProfanity?: boolean;
  confidence?: number;
  profanity?: string[];
  processingTime: number;
}

// @ts-ignore - Promise constructor available in Deno Deploy runtime
async function handler(req: Request): Promise<Response> {
  const startTime = Date.now();
  
  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ 
          error: "Method not allowed. Use POST to upload images for NSFW detection or text for profanity checking. Visit https://github.com/jmas/nsfw-detector-api for more information." 
        }),
        { 
          status: 405, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    }

    // Parse form data to check for field presence
    const formData = await req.formData();
    const textField = formData.get("text");
    const imageField = formData.get("image");

    // Check if both fields are present
    const hasText = textField && typeof textField === "string";
    const hasImage = imageField && imageField instanceof File;

    if (!hasText && !hasImage) {
      return new Response(
        JSON.stringify({ 
          error: "No valid content provided. Please include either a 'text' field for profanity checking or an 'image' field for NSFW detection." 
        }),
        { 
          status: 400, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    }

    // Handle both image and text checking
    return await handleContentDetection(hasText ? textField as string : null, hasImage ? imageField as File : null, req, startTime);

  } catch (error) {
    console.error("Error processing request:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error during content detection",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
}

// Unified content detection handler
async function handleContentDetection(text: string | null, imageFile: File | null, req: Request, startTime: number): Promise<Response> {
  try {
    let imageResult: any = null;
    let textResult: any = null;

    // Process image if present
    if (imageFile) {
      imageResult = await processImage(imageFile);
    }

    // Process text if present
    if (text) {
      textResult = await processText(text, req);
    }

    const processingTime = Date.now() - startTime;

    const response: DetectionResponse = {
      ...(imageResult && { 
        predictions: imageResult.predictions,
        isNSFW: imageResult.isNSFW,
        confidence: imageResult.confidence 
      }),
      ...(textResult && { 
        isProfanity: textResult.isProfanity,
        profanity: textResult.profanity 
      }),
      processingTime
    };

    return new Response(
      JSON.stringify(response, null, 2),
      { 
        status: 200, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Content-Language"
        } 
      }
    );

  } catch (error) {
    console.error("Error processing content detection:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error during content detection",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
}

// Process image for NSFW detection
async function processImage(imageFile: File): Promise<any> {
  // Validate file type - currently only JPEG is supported
  if (imageFile.type.indexOf("jpeg") === -1 && imageFile.type.indexOf("jpg") === -1) {
    throw new Error("Unsupported file type. Please upload a JPEG image file.");
  }

  // Get image buffer and validate dimensions
  const imageBuffer = await imageFile.arrayBuffer();
  
  // Decode image to get dimensions for validation
  const uint8Array = new Uint8Array(imageBuffer);
  let imageData: any;
  let width: number;
  let height: number;
  
  try {
    // Dynamic import for jpeg-js
    const { decode } = await import("jpeg-js");
    
    if (imageFile.type.indexOf('jpeg') !== -1 || imageFile.type.indexOf('jpg') !== -1) {
      // Decode JPEG using jpeg-js to get dimensions
      imageData = decode(uint8Array, { useTArray: true });
      width = imageData.width;
      height = imageData.height;
    } else {
      throw new Error("Unsupported file type. Please upload a JPEG image file.");
    }
  } catch (error) {
    console.error("Error decoding image for validation:", error);
    throw new Error("Failed to decode image. Please ensure it's a valid JPEG file.");
  }
  
  // Validate image dimensions and file size
  const validation = validateImageDimensions(width, height, imageBuffer.byteLength);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Load the NSFW model
  const nsfwModel = await loadModel();
  
  // Convert the image data to a tensor that nsfwjs can process
  const imageTensor = await convertImageDataToTensor(imageData);

  // Perform NSFW classification
  const predictions = await nsfwModel.classify(imageTensor);
  
  // Clean up the tensor to free memory
  imageTensor.dispose();
  
  // Process results
  const nsfwClasses = ["Porn", "Sexy", "Hentai"];
  const nsfwPredictions = predictions.filter((pred: any) => 
    nsfwClasses.indexOf(pred.className) !== -1
  );
  
  const maxNSFWProbability = nsfwPredictions.length > 0 
    ? Math.max.apply(Math, nsfwPredictions.map((p: any) => p.probability))
    : 0;
  
  const isNSFW = maxNSFWProbability > 0.5; // Threshold for NSFW classification
  const confidence = Math.round(maxNSFWProbability * 100) / 100;
  
  return {
    predictions: predictions.map((pred: any) => ({
      className: pred.className,
      probability: Math.round(pred.probability * 100) / 100
    })),
    isNSFW,
    confidence
  };
}

// Process text for profanity checking
async function processText(text: string, req: Request): Promise<any> {
  // Get language from Content-Language header
  const languageHeader = req.headers.get("content-language");
  if (!languageHeader) {
    throw new Error("Content-Language header is required for text profanity checking.");
  }

  // Extract language code (handle formats like "en", "en-US", "en_US")
  const language = languageHeader.split(/[-_]/)[0].toLowerCase();

  // Validate language support
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    throw new Error(`Unsupported language: ${language}. Supported languages: ${SUPPORTED_LANGUAGES.join(", ")}`);
  }

  // Load profanity list for the language
  const profanityWords = await loadProfanityList(language);

  // Simple profanity checking using loaded word list
  const detectedWords = checkProfanity(text, profanityWords);

  return {
    isProfanity: detectedWords.length > 0,
    profanity: detectedWords
  };
}

Deno.serve(handler);
