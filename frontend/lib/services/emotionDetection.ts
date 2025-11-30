import * as ort from 'onnxruntime-web';
import { detectFace, initializeFaceDetection, FaceBox } from './faceDetection';

// FERPlus emotion labels (12 classes)
// The model outputs probabilities for these emotions in order
const EMOTION_LABELS = [
  'Neutral',
  'Happiness',
  'Surprise',
  'Sadness',
  'Anger',
  'Disgust',
  'Fear',
  'Contempt',
  'Unknown',
  'NF', // Not a Face
  'Uncertain',
  'Non-Face'
];

// Negative emotions we want to detect
export const NEGATIVE_EMOTIONS = ['Sadness', 'Anger', 'Disgust', 'Fear'];

export interface EmotionResult {
  emotion: string;
  confidence: number;
  probabilities: Record<string, number>;
  isNegative: boolean;
  faceBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

let session: ort.InferenceSession | null = null;
let isInitialized = false;
let isRunning = false; // Mutex to prevent concurrent inference
let initPromise: Promise<void> | null = null; // Prevent concurrent initialization

/**
 * Apply softmax to convert logits to probabilities
 */
function softmax(logits: number[]): number[] {
  const maxLogit = Math.max(...logits);
  const exps = logits.map(x => Math.exp(x - maxLogit)); // Subtract max for numerical stability
  const sumExps = exps.reduce((a, b) => a + b, 0);
  return exps.map(x => x / sumExps);
}

/**
 * Quick check if session is ready for inference
 */
export function isSessionReady(): boolean {
  return session !== null && isInitialized;
}

// Debug function to check session state (for debugging only)
export function getSessionState() {
  return {
    hasSession: !!session,
    isInitialized,
    sessionInputNames: session?.inputNames || [],
    sessionOutputNames: session?.outputNames || [],
  };
}

/**
 * Initialize the ONNX emotion detection model
 * Can be called multiple times safely - will skip if already initialized
 */
export async function initializeEmotionModel(): Promise<void> {
  // If already initialized and session exists, skip
  if (isInitialized && session) {
    return;
  }

  // If already initializing, wait for that to complete
  if (initPromise) {
    return initPromise;
  }

  console.log('[EmotionDetection] Starting initialization...');

  initPromise = (async () => {
    // Clear any stale state
    session = null;
    isInitialized = false;

    try {
      // Initialize face detection first
      console.log('[EmotionDetection] Loading face detection model...');
      await initializeFaceDetection();
      
      // Try execution providers in order: WebGPU -> WebGL -> WASM
      // ONNX Runtime will automatically fallback if a provider is not available
      const executionProviders = ['webgpu', 'webgl', 'wasm'];
      
      console.log('[EmotionDetection] Loading emotion model...');
      const startTime = performance.now();
      session = await ort.InferenceSession.create('/models/emotion-ferplus-12-int8.onnx', {
        executionProviders: executionProviders as ort.ExecutionProvider[],
      });
      const loadTime = performance.now() - startTime;

      if (!session) {
        throw new Error('Session creation returned null');
      }

      isInitialized = true;
      console.log('[EmotionDetection] ✅ All models loaded successfully', {
        emotionLoadTime: `${loadTime.toFixed(2)}ms`,
        inputs: session.inputNames,
        outputs: session.outputNames,
      });
    } catch (error) {
      session = null;
      isInitialized = false;
      console.error('[EmotionDetection] ❌ Failed to load models:', error);
      throw new Error(`Failed to initialize emotion detection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

/**
 * Preprocess video frame for emotion detection
 * Converts video frame to model input format: [1, 1, 64, 64] (grayscale, normalized)
 * If faceBox is provided, crops to that region first
 */
function preprocessFrame(videoElement: HTMLVideoElement, faceBox?: FaceBox | null): ort.Tensor {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // FERPlus model expects 64x64 grayscale input
  canvas.width = 64;
  canvas.height = 64;

  if (faceBox) {
    // Draw only the face region, scaled to 64x64
    ctx.drawImage(
      videoElement,
      faceBox.x, faceBox.y, faceBox.width, faceBox.height, // Source (face region)
      0, 0, canvas.width, canvas.height // Destination (64x64 canvas)
    );
  } else {
    // Draw full video frame (fallback)
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  }

  // Get image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Convert to grayscale and normalize to [0, 1]
  const grayscale = new Float32Array(canvas.width * canvas.height);
  
  for (let i = 0; i < data.length; i += 4) {
    // Convert RGB to grayscale using standard weights
    const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255.0;
    grayscale[i / 4] = gray;
  }

  // Model expects shape: [1, 1, 64, 64] (batch, channels, height, width)
  return new ort.Tensor('float32', grayscale, [1, 1, 64, 64]);
}

/**
 * Detect emotion from video frame
 * First detects face, then runs emotion inference on cropped face region
 */
export async function detectEmotion(videoElement: HTMLVideoElement | null): Promise<EmotionResult | null> {
  if (!videoElement) {
    return null;
  }

  if (!session || !isInitialized) {
    console.warn('[EmotionDetection] Session not ready');
    return null;
  }

  // Prevent concurrent inference (ONNX Runtime doesn't support it)
  if (isRunning) {
    return null;
  }

  isRunning = true;
  try {
    // First, detect face
    const faceBox = await detectFace(videoElement);
    
    if (!faceBox) {
      // No face detected - return special result
      return {
        emotion: 'No Face',
        confidence: 0,
        probabilities: {},
        isNegative: false,
      };
    }

    console.log('[EmotionDetection] Face detected:', {
      x: faceBox.x.toFixed(0),
      y: faceBox.y.toFixed(0),
      width: faceBox.width.toFixed(0),
      height: faceBox.height.toFixed(0),
    });

    // Preprocess frame with face cropping
    const inputTensor = preprocessFrame(videoElement, faceBox);
    
    // Debug: Check if input is changing
    const data = inputTensor.data as Float32Array;
    const checksum = data[0] + data[100] + data[1000] + data[2000];
    console.log('[EmotionDetection] Input checksum:', checksum.toFixed(6));

    // Run inference
    const feeds: Record<string, ort.Tensor> = {};
    feeds[session.inputNames[0]] = inputTensor;
    
    const results = await session.run(feeds);
    const output = results[session.outputNames[0]];

    // Get raw logits and apply softmax to convert to probabilities
    const logits = Array.from(output.data as Float32Array);
    const probabilities = softmax(logits);

    // Create probability map
    const probabilityMap: Record<string, number> = {};
    EMOTION_LABELS.forEach((label, index) => {
      probabilityMap[label] = probabilities[index] || 0;
    });

    // Find emotion with highest probability
    let maxIndex = 0;
    let maxProb = probabilities[0];
    for (let i = 1; i < probabilities.length; i++) {
      if (probabilities[i] > maxProb) {
        maxProb = probabilities[i];
        maxIndex = i;
      }
    }

    const detectedEmotion = EMOTION_LABELS[maxIndex];
    const isNegative = NEGATIVE_EMOTIONS.includes(detectedEmotion);
    
    return {
      emotion: detectedEmotion,
      confidence: maxProb,
      probabilities: probabilityMap,
      isNegative,
      faceBox,
    };
  } catch (error) {
    console.error('[EmotionDetection] Detection error:', error);
    return null;
  } finally {
    isRunning = false;
  }
}

/**
 * Cleanup resources
 */
export function cleanupEmotionModel(): void {
  if (session) {
    // ONNX Runtime Web doesn't have explicit cleanup, but we can null the reference
    session = null;
    isInitialized = false;
  }
}

