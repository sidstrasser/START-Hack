import { useState, useCallback, useRef } from 'react';
import {
  initializeEmotionModel,
  detectEmotion,
  isSessionReady,
  EmotionResult,
} from '../services/emotionDetection';

interface UseEmotionDetectionReturn {
  isModelReady: boolean;
  isLoading: boolean;
  error: string | null;
  detect: (videoElement: HTMLVideoElement | null) => Promise<EmotionResult | null>;
}

/**
 * Hook for emotion detection using ONNX Runtime Web
 * Uses lazy initialization - model is loaded on first detect() call
 */
export function useEmotionDetection(): UseEmotionDetectionReturn {
  const [isModelReady, setIsModelReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Store the initialization promise to prevent concurrent init attempts
  const initPromiseRef = useRef<Promise<boolean> | null>(null);

  /**
   * Ensure the model is initialized before detection
   * Returns true if session is ready, false if initialization failed
   */
  const ensureInitialized = useCallback(async (): Promise<boolean> => {
    // Fast path: session already exists
    if (isSessionReady()) {
      if (!isModelReady) {
        setIsModelReady(true);
        setIsLoading(false);
      }
      return true;
    }

    // If already initializing, wait for that to complete
    if (initPromiseRef.current) {
      console.log('[useEmotionDetection] Waiting for existing initialization...');
      return initPromiseRef.current;
    }

    // Start new initialization
    console.log('[useEmotionDetection] Starting lazy initialization...');
    setIsLoading(true);
    setError(null);
    setIsModelReady(false);

    initPromiseRef.current = (async () => {
      try {
        const startTime = performance.now();
        await initializeEmotionModel();
        const loadTime = performance.now() - startTime;

        // Verify session was created
        if (isSessionReady()) {
          console.log('[useEmotionDetection] ✅ Initialization successful', {
            loadTime: `${loadTime.toFixed(2)}ms`,
          });
          setIsModelReady(true);
          setIsLoading(false);
          setError(null);
          return true;
        } else {
          console.error('[useEmotionDetection] ❌ Initialization completed but session not available');
          setError('Model loaded but session not available');
          setIsLoading(false);
          setIsModelReady(false);
          return false;
        }
      } catch (err) {
        console.error('[useEmotionDetection] ❌ Initialization error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load emotion model';
        setError(errorMessage);
        setIsLoading(false);
        setIsModelReady(false);
        return false;
      } finally {
        // Clear the promise ref so future calls can retry if needed
        initPromiseRef.current = null;
      }
    })();

    return initPromiseRef.current;
  }, [isModelReady]);

  /**
   * Detect emotion from video element
   * Automatically initializes the model if needed (lazy initialization)
   */
  const detect = useCallback(
    async (videoElement: HTMLVideoElement | null): Promise<EmotionResult | null> => {
      // Validate video element first
      if (!videoElement) {
        console.warn('[useEmotionDetection] No video element provided');
        return null;
      }

      // Ensure model is initialized (lazy init)
      const ready = await ensureInitialized();
      if (!ready) {
        console.error('[useEmotionDetection] Model not ready after initialization attempt');
        return null;
      }

      // Double-check session is still available (could have been cleared)
      if (!isSessionReady()) {
        console.error('[useEmotionDetection] Session disappeared after initialization');
        setIsModelReady(false);
        return null;
      }

      // Run detection
      console.log('[useEmotionDetection] Running detection...');
      const result = await detectEmotion(videoElement);
      console.log('[useEmotionDetection] Detection result:', result);
      return result;
    },
    [ensureInitialized]
  );

  return {
    isModelReady,
    isLoading,
    error,
    detect,
  };
}
