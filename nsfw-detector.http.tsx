/**
 * NSFW Content Detection API
 * 
 * This Deno Deploy application provides an HTTP endpoint for detecting NSFW content in images
 * using the nsfwjs library. It accepts POST requests with image data and returns
 * classification results.
 * 
 * Usage:
 * POST / with form data containing 'image' field
 * Returns JSON with NSFW classification results
 */

import * as tf from "https://esm.sh/@tensorflow/tfjs@4.15.0";
import { decode } from "https://esm.sh/jpeg-js@0.4.4";
import * as nsfwjs from "https://esm.sh/nsfwjs@2.4.2";

tf.env().set('IS_NODE', false);

// Initialize the NSFW model
let model: any = null;

async function loadModel() {
  if (!model) {
    console.log("Loading NSFW model...");
    try {
      // Try loading with a different model URL that might work in Deno Deploy
      model = await nsfwjs.load('https://raw.githubusercontent.com/infinitered/nsfwjs/refs/heads/master/models/mobilenet_v2/model.json');
      console.log("NSFW model loaded successfully");
    } catch (error) {
      console.log("Failed to load from GitHub, trying default...");
      try {
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
// @ts-ignore - Promise constructor available in Deno Deploy runtime
function convertImageDataToTensor(imageData: any): any {
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
  predictions: NSFWResult[];
  isNSFW: boolean;
  confidence: number;
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
          error: "Method not allowed. Use POST to upload images for NSFW detection. Visit https://github.com/jmas/nsfw-detector-api for more information." 
        }),
        { 
          status: 405, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    }

    // Parse the form data to get the image
    const formData = await req.formData();
    const imageFile = formData.get("image") as File;
    
    if (!imageFile) {
      return new Response(
        JSON.stringify({ 
          error: "No image provided. Please include an 'image' field in your POST request." 
        }),
        { 
          status: 400, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    }

    // Validate file type - currently only JPEG is supported
    if (imageFile.type.indexOf("jpeg") === -1 && imageFile.type.indexOf("jpg") === -1) {
      return new Response(
        JSON.stringify({ 
          error: "Unsupported file type. Please upload a JPEG image file." 
        }),
        { 
          status: 400, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    }

    // Get image buffer and validate dimensions
    const imageBuffer = await imageFile.arrayBuffer();
    
    // Decode image to get dimensions for validation
    const uint8Array = new Uint8Array(imageBuffer);
    let imageData: any;
    let width: number;
    let height: number;
    
    try {
      if (imageFile.type.indexOf('jpeg') !== -1 || imageFile.type.indexOf('jpg') !== -1) {
        // Decode JPEG using jpeg-js to get dimensions
        imageData = decode(uint8Array, { useTArray: true });
        width = imageData.width;
        height = imageData.height;
      } else {
        return new Response(
          JSON.stringify({ 
            error: "Unsupported file type. Please upload a JPEG image file." 
          }),
          { 
            status: 400, 
            headers: { "Content-Type": "application/json" } 
          }
        );
      }
    } catch (error) {
      console.error("Error decoding image for validation:", error);
      return new Response(
        JSON.stringify({ 
          error: "Failed to decode image. Please ensure it's a valid JPEG file." 
        }),
        { 
          status: 400, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    }
    
    // Validate image dimensions and file size
    const validation = validateImageDimensions(width, height, imageBuffer.byteLength);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ 
          error: validation.error 
        }),
        { 
          status: 400, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    }

    // Load the NSFW model
    const nsfwModel = await loadModel();
    
    // Convert the image data to a tensor that nsfwjs can process
    const imageTensor = convertImageDataToTensor(imageData);

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
    
    const processingTime = Date.now() - startTime;
    
    const response: DetectionResponse = {
      predictions: predictions.map((pred: any) => ({
        className: pred.className,
        probability: Math.round(pred.probability * 100) / 100
      })),
      isNSFW,
      confidence,
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
          "Access-Control-Allow-Headers": "Content-Type"
        } 
      }
    );

  } catch (error) {
    console.error("Error processing NSFW detection:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error during NSFW detection",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
}

Deno.serve(handler);
