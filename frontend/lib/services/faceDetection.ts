import * as faceapi from 'face-api.js';

let isModelLoaded = false;
let loadPromise: Promise<void> | null = null;

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Check if face detection model is loaded
 */
export function isFaceModelReady(): boolean {
  return isModelLoaded;
}

/**
 * Initialize face detection model (TinyFaceDetector)
 */
export async function initializeFaceDetection(): Promise<void> {
  if (isModelLoaded) {
    return;
  }

  if (loadPromise) {
    return loadPromise;
  }

  console.log('[FaceDetection] Loading TinyFaceDetector model...');

  loadPromise = (async () => {
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      isModelLoaded = true;
      console.log('[FaceDetection] ✅ Model loaded successfully');
    } catch (error) {
      console.error('[FaceDetection] ❌ Failed to load model:', error);
      throw error;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

/**
 * Detect face in video element and return bounding box
 * Returns null if no face detected
 */
export async function detectFace(videoElement: HTMLVideoElement): Promise<FaceBox | null> {
  if (!isModelLoaded) {
    await initializeFaceDetection();
  }

  if (!videoElement || videoElement.readyState < 2) {
    return null;
  }

  try {
    const detection = await faceapi.detectSingleFace(
      videoElement,
      new faceapi.TinyFaceDetectorOptions({
        inputSize: 224,
        scoreThreshold: 0.5,
      })
    );

    if (!detection) {
      return null;
    }

    const box = detection.box;
    
    // Add some padding around the face (20%)
    const padding = 0.2;
    const paddingX = box.width * padding;
    const paddingY = box.height * padding;

    // Calculate padded box coordinates
    const x = Math.max(0, box.x - paddingX);
    const y = Math.max(0, box.y - paddingY);
    const width = Math.min(box.width + paddingX * 2, videoElement.videoWidth - x);
    const height = Math.min(box.height + paddingY * 2, videoElement.videoHeight - y);

    return { x, y, width, height };
  } catch (error) {
    console.error('[FaceDetection] Detection error:', error);
    return null;
  }
}

/**
 * Cleanup face detection resources
 */
export function cleanupFaceDetection(): void {
  isModelLoaded = false;
}

