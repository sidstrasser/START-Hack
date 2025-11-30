"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import TranscriptSidebar from "../components/TranscriptSidebar";
import {
  VideoSection,
  MetricsPanel,
  ActionPointsChecklist,
  InsightsPanel,
  ActionButtonsGroup,
} from "./components";
import Toast from "./components/Toast";
import { useEmotionDetection } from "@/lib/hooks/useEmotionDetection";
import { detectFace } from "@/lib/services/faceDetection";

// Backend API base URL
const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface Insight {
  type: "arguments" | "outcome";
  content: string;
  isLoading: boolean;
}

interface Transcript {
  text: string;
  speaker_id?: string;
  timestamp?: number;
}

interface ToastMessage {
  id: number;
  message: string;
  type: "success" | "info" | "warning";
  emotion?: string; // Track emotion type to prevent duplicates
}

interface MetricsDataPoint {
  timestamp: number;
  elapsedSeconds: number;
  value: number;
  risk: number;
  outcome: number;
}

export default function LiveCall() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionIdRef = useRef<string | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const transcriptPollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const metricsPollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const actionItemsPollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const emotionDetectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const faceDetectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const toastIdRef = useRef(0);
  const lastEmotionToastRef = useRef<{ emotion: string; timestamp: number } | null>(null);

  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showTranscripts, setShowTranscripts] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // Data State
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [metrics, setMetrics] = useState({ value: 50, risk: 50, outcome: 50 });
  const [currentInsight, setCurrentInsight] = useState<Insight | null>(null);
  const [vectorDbId, setVectorDbId] = useState<string | null>(null);
  const [goals, setGoals] = useState<string | null>(null);
  const [analyzingAction, setAnalyzingAction] = useState<"arguments" | "outcome" | null>(null);
  
  // Call tracking
  const [callStartTime] = useState<number>(Date.now());
  const [metricsHistory, setMetricsHistory] = useState<MetricsDataPoint[]>([]);
  
  // Action Points
  const [showActionPoints, setShowActionPoints] = useState(true);
  const [actionPoints, setActionPoints] = useState<Array<{ id: number; text: string; completed: boolean; recommended?: boolean }>>([]);

  // Emotion Detection
  const { isModelReady, isLoading: isEmotionModelLoading, error: emotionModelError, detect: detectEmotion } = useEmotionDetection();
  const [topEmotions, setTopEmotions] = useState<Array<{ emotion: string; confidence: number }>>([]);
  const [showEmotions, setShowEmotions] = useState(true);
  const [faceBox, setFaceBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [showFaceBox, setShowFaceBox] = useState(false);

  // Debug logging for emotion detection state
  useEffect(() => {
    console.log('[LiveCall] Emotion detection state changed', {
      isModelReady,
      isEmotionModelLoading,
      emotionModelError,
    });
  }, [isModelReady, isEmotionModelLoading, emotionModelError]);

  const isDev = process.env.NODE_ENV === "development";

  // Toast helper
  const showToast = useCallback((message: string, type: "success" | "info" | "warning" = "success", emotion?: string) => {
    // For "No Face" toasts, only show one at a time
    if (emotion === 'No Face') {
      setToasts(prev => {
        // Check if there's already a "No Face" toast
        if (prev.some(t => t.emotion === 'No Face')) {
          return prev; // Don't add another one
        }
        const id = ++toastIdRef.current;
        return [...prev, { id, message, type, emotion }];
      });
    } else {
    const id = ++toastIdRef.current;
      setToasts(prev => [...prev, { id, message, type, emotion }]);
    }
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Handle end call - store all data and navigate to summary
  const handleEndCall = useCallback(() => {
    const callDuration = Math.floor((Date.now() - callStartTime) / 1000);
    
    // Store call summary data in sessionStorage
    sessionStorage.setItem('callSummaryData', JSON.stringify({
      callStartTime,
      callDuration,
      metricsHistory,
      finalMetrics: metrics,
      actionPoints,
      transcripts,
      vectorDbId,
      goals,
    }));
    
    // Navigate to summary
    router.push('/summary');
  }, [callStartTime, metricsHistory, metrics, actionPoints, transcripts, vectorDbId, goals, router]);

  // Load session data on mount
  useEffect(() => {
    const storedVectorDbId = sessionStorage.getItem('vectorDbId');
    if (storedVectorDbId) setVectorDbId(storedVectorDbId);
    
    let storedGoals = sessionStorage.getItem('negotiationGoals');
    if (!storedGoals) {
      const negotiationInput = sessionStorage.getItem('negotiationInput');
      if (negotiationInput) {
        try {
          storedGoals = JSON.parse(negotiationInput).goals || null;
        } catch (e) { /* ignore */ }
      }
    }
    if (storedGoals) setGoals(storedGoals);

    // Load selected action items from sessionStorage (passed from action-items page)
    const storedActionItems = sessionStorage.getItem('selectedActionItems');
    if (storedActionItems) {
      try {
        const items = JSON.parse(storedActionItems);
        if (Array.isArray(items) && items.length > 0) {
          setActionPoints(items);
        } else {
          console.warn('[LiveCall] No action items found in sessionStorage');
          setActionPoints([]);
        }
      } catch (e) {
        console.error('[LiveCall] Failed to parse selected action items:', e);
        setActionPoints([]);
      }
    } else {
      // No action items selected - user should go through action-items page first
      console.warn('[LiveCall] No action items in sessionStorage - redirecting to action-items page');
      router.push('/action-items');
    }
  }, []);

  // Toggle action point completion
  const toggleActionPoint = useCallback((id: number) => {
    setActionPoints(prev => 
      prev.map(point => point.id === id ? { ...point, completed: !point.completed } : point)
    );
  }, []);

  // Fetch metrics from backend
  const fetchMetrics = useCallback(async () => {
    if (!vectorDbId) return;

    console.log("[Metrics] Fetching...", { vectorDbId, transcriptsCount: transcripts.length });

    try {
      const response = await fetch(`${BACKEND_API_URL}/api/elevenlabs/metrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current || "",
          vectorDbId,
          goals,
          messages: transcripts
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("[Metrics] Received:", data);
        setMetrics({ value: data.value, risk: data.risk, outcome: data.outcome });
        
        // Store metrics in history
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - callStartTime) / 1000);
        setMetricsHistory(prev => [...prev, {
          timestamp: now,
          elapsedSeconds,
          value: data.value,
          risk: data.risk,
          outcome: data.outcome
        }]);
      }
    } catch (err) {
      console.error("[Metrics] Error:", err);
    }
  }, [vectorDbId, goals, transcripts]);

  // Start metrics polling
  useEffect(() => {
    if (!vectorDbId) return;

    console.log("[Metrics] Starting polling interval (20s)");
    fetchMetrics();
    
    metricsPollIntervalRef.current = setInterval(fetchMetrics, 20000);

    return () => {
      if (metricsPollIntervalRef.current) {
        clearInterval(metricsPollIntervalRef.current);
        metricsPollIntervalRef.current = null;
      }
    };
  }, [vectorDbId, fetchMetrics]);

  // Fetch action items completion status from backend
  const fetchActionItemsStatus = useCallback(async () => {
    if (!vectorDbId || transcripts.length === 0) return;

    console.log("[ActionItems] Checking completion status...");

    // Get already completed IDs (these should not be un-completed)
    const alreadyCompletedIds = actionPoints
      .filter(p => p.completed)
      .map(p => p.id);

    try {
      const response = await fetch(`${BACKEND_API_URL}/api/elevenlabs/action-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vectorDbId,
          messages: transcripts,
          actionItems: actionPoints,
          alreadyCompletedIds
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("[ActionItems] Response:", data);

        // Update action points with completed status
        if (data.completedIds && data.completedIds.length > 0) {
          setActionPoints(prev => 
            prev.map(point => ({
              ...point,
              completed: data.completedIds.includes(point.id) || point.completed
            }))
          );
        }

        // Show toast for newly completed items
        if (data.newlyCompletedIds && data.newlyCompletedIds.length > 0) {
          data.newlyCompletedIds.forEach((id: number) => {
            const item = actionPoints.find(p => p.id === id);
            if (item) {
              showToast(`✓ ${item.text}`, "success");
            }
          });
        }
      }
    } catch (err) {
      console.error("[ActionItems] Error:", err);
    }
  }, [vectorDbId, transcripts, actionPoints, showToast]);

  // Start action items polling (every 20 seconds, same as metrics)
  useEffect(() => {
    if (!vectorDbId) return;

    console.log("[ActionItems] Starting polling interval (20s)");
    
    // Initial fetch after a short delay
    const initialTimeout = setTimeout(fetchActionItemsStatus, 2000);
    
    // Then poll every 20 seconds
    actionItemsPollIntervalRef.current = setInterval(fetchActionItemsStatus, 20000);

    return () => {
      clearTimeout(initialTimeout);
      if (actionItemsPollIntervalRef.current) {
        clearInterval(actionItemsPollIntervalRef.current);
        actionItemsPollIntervalRef.current = null;
    }
  };
  }, [vectorDbId, fetchActionItemsStatus]);

  // Recording functions
  const startRecording = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      audioStreamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      const connectResponse = await fetch(`${BACKEND_API_URL}/api/elevenlabs/connect`, { method: "POST" });
      if (!connectResponse.ok) throw new Error("Failed to connect to transcription service");

      const { sessionId } = await connectResponse.json();
      sessionIdRef.current = sessionId;

      processor.onaudioprocess = async (e) => {
        if (!sessionIdRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        const uint8Array = new Uint8Array(pcmData.buffer);
        let binary = "";
        for (let i = 0; i < uint8Array.length; i++) binary += String.fromCharCode(uint8Array[i]);

        try {
          await fetch(`${BACKEND_API_URL}/api/elevenlabs/audio`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: sessionIdRef.current, audioBase64: btoa(binary), sampleRate: 16000 }),
          });
        } catch { /* silent */ }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      // Start transcript polling
      transcriptPollIntervalRef.current = setInterval(async () => {
        if (!sessionIdRef.current) return;
        try {
          await fetch(`${BACKEND_API_URL}/api/elevenlabs/transcripts?sessionId=${sessionIdRef.current}`);
        } catch { /* silent */ }
      }, 500);

      setIsRecording(true);
      setIsConnecting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start recording.");
      setIsConnecting(false);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
      if (transcriptPollIntervalRef.current) {
        clearInterval(transcriptPollIntervalRef.current);
        transcriptPollIntervalRef.current = null;
      }
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }
      if (sessionIdRef.current) {
        try {
          await fetch(`${BACKEND_API_URL}/api/elevenlabs/disconnect`, {
            method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionIdRef.current }),
          });
      } catch { /* silent */ }
        sessionIdRef.current = null;
      }
      setIsRecording(false);
      setIsConnecting(false);
  };

  const handleRecordingToggle = async () => {
    if (isConnecting) return;
    if (isRecording) await stopRecording();
    else await startRecording();
  };

  // Commit transcript and execute action
  const handleActionButtonClick = async (action: () => void) => {
    if (sessionIdRef.current && isRecording) {
      try {
        const response = await fetch(`${BACKEND_API_URL}/api/elevenlabs/commit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionIdRef.current }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.transcripts?.length > 0) {
            const newTranscripts = data.transcripts.map((t: any) => ({
              text: t.text,
              speaker_id: t.speaker_id,
              timestamp: t.timestamp ? (t.timestamp < 10000000000 ? t.timestamp * 1000 : t.timestamp) : Date.now()
            }));
            setTranscripts(prev => [...prev, ...newTranscripts]);
          }
        }
      } catch { /* silent */ }
    }
    action();
  };

  // Analyze conversation
  const analyzeConversation = async (actionType: "arguments" | "outcome") => {
    if (!vectorDbId) {
      setCurrentInsight({ type: actionType, content: "No briefing loaded.", isLoading: false });
      return;
    }

    setAnalyzingAction(actionType);
    setCurrentInsight({ type: actionType, content: "", isLoading: true });

    try {
      const response = await fetch(`${BACKEND_API_URL}/api/elevenlabs/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current || "",
          vectorDbId,
          actionType,
          goals,
          messages: transcripts
        }),
      });

      if (!response.ok) throw new Error("Failed to analyze");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let accumulatedContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "chunk") {
                accumulatedContent += data.content;
                setCurrentInsight({ type: actionType, content: accumulatedContent, isLoading: true });
              } else if (data.type === "complete") {
                setCurrentInsight({ type: actionType, content: data.content || accumulatedContent, isLoading: false });
                setAnalyzingAction(null);
              } else if (data.type === "error") {
                setCurrentInsight({ type: actionType, content: `Error: ${data.message}`, isLoading: false });
                setAnalyzingAction(null);
              }
            } catch { /* skip malformed */ }
          }
        }
      }
      
      setAnalyzingAction(null);
      setCurrentInsight(prev => prev?.isLoading ? { ...prev, isLoading: false } : prev);
    } catch (err) {
      setCurrentInsight({ type: actionType, content: err instanceof Error ? err.message : "Failed", isLoading: false });
      setAnalyzingAction(null);
    }
  };

  // Camera setup
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        setIsLoading(true);
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Handle play() promise to avoid AbortError
          videoRef.current.play().catch((err) => {
            // Ignore AbortError - it's expected when video source changes
            if (err.name !== 'AbortError') {
              console.error('[LiveCall] Video play error:', err);
            }
          });
              setIsLoading(false);
              }
            } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to access camera.");
        setIsLoading(false);
      }
    };

    startCamera();
    return () => { stream?.getTracks().forEach(track => track.stop()); };
  }, []);

  // Emotion detection interval - uses lazy initialization via detect()
  useEffect(() => {
    // Start immediately - detect() will handle model initialization lazily
    console.log('[LiveCall] Starting emotion detection interval (every 2 seconds)');

    const runEmotionDetection = async () => {
      try {
        // Skip if video is not ready
        if (!videoRef.current) {
          return;
        }

        if (videoRef.current.readyState < 2 || videoRef.current.paused) {
          return;
        }

        // detect() will lazily initialize the model if needed
        const result = await detectEmotion(videoRef.current);
        
        // Update top emotions display
        if (result) {
          // Update face box for visualization
          setFaceBox(result.faceBox || null);
          
          if (result.emotion === 'No Face') {
            // Show "No Face" in the overlay
            setTopEmotions([{ emotion: 'No Face', confidence: 0 }]);
            
            // Show gentle toast (with longer cooldown - 10 seconds)
            const now = Date.now();
            const lastToast = lastEmotionToastRef.current;
            if (!lastToast || lastToast.emotion !== 'No Face' || (now - lastToast.timestamp) > 10000) {
              showToast('Position your face in the camera', 'info', 'No Face');
              lastEmotionToastRef.current = { emotion: 'No Face', timestamp: now };
            }
          } else {
            const sorted = Object.entries(result.probabilities)
              .map(([emotion, confidence]) => ({ emotion, confidence }))
              .sort((a, b) => b.confidence - a.confidence)
              .slice(0, 2);
            setTopEmotions(sorted);
            
            // Show warning toast for negative emotions
            if (result.isNegative) {
              const now = Date.now();
              const lastToast = lastEmotionToastRef.current;
              
              // Prevent duplicate toasts for same emotion within 5 seconds
              if (!lastToast || lastToast.emotion !== result.emotion || (now - lastToast.timestamp) > 5000) {
                const emotionMessages: Record<string, string> = {
                  'Sadness': 'Sad emotion detected',
                  'Anger': 'Angry emotion detected',
                  'Disgust': 'Disgusted emotion detected',
                  'Fear': 'Fearful emotion detected',
                };
                
                const message = emotionMessages[result.emotion] || `${result.emotion} detected`;
                showToast(message, 'warning', result.emotion);
                lastEmotionToastRef.current = { emotion: result.emotion, timestamp: now };
              }
            }
          }
        }
      } catch (err) {
        console.error('[LiveCall] Emotion detection error:', err);
      }
    };

    // Run detection every 2 seconds
    emotionDetectionIntervalRef.current = setInterval(runEmotionDetection, 2000);
    
    // Run immediately
    runEmotionDetection();

    return () => {
      if (emotionDetectionIntervalRef.current) {
        clearInterval(emotionDetectionIntervalRef.current);
        emotionDetectionIntervalRef.current = null;
      }
    };
  }, [detectEmotion, showToast]);

  // Fast face detection for visualization (runs every 100ms when showFaceBox is enabled)
  useEffect(() => {
    if (!showFaceBox) {
      // Clear interval when face box is hidden
      if (faceDetectionIntervalRef.current) {
        clearInterval(faceDetectionIntervalRef.current);
        faceDetectionIntervalRef.current = null;
      }
      return;
    }

    const runFaceDetection = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2 || videoRef.current.paused) {
        return;
      }

      try {
        const box = await detectFace(videoRef.current);
        setFaceBox(box);
      } catch (err) {
        // Silently ignore errors in visualization
      }
    };

    // Run face detection every 100ms for smooth visualization
    faceDetectionIntervalRef.current = setInterval(runFaceDetection, 100);
    runFaceDetection();

    return () => {
      if (faceDetectionIntervalRef.current) {
        clearInterval(faceDetectionIntervalRef.current);
        faceDetectionIntervalRef.current = null;
      }
    };
  }, [showFaceBox]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (transcriptPollIntervalRef.current) clearInterval(transcriptPollIntervalRef.current);
      if (metricsPollIntervalRef.current) clearInterval(metricsPollIntervalRef.current);
      if (actionItemsPollIntervalRef.current) clearInterval(actionItemsPollIntervalRef.current);
      if (emotionDetectionIntervalRef.current) clearInterval(emotionDetectionIntervalRef.current);
      if (faceDetectionIntervalRef.current) clearInterval(faceDetectionIntervalRef.current);
      processorRef.current?.disconnect();
      audioContextRef.current?.close();
      audioStreamRef.current?.getTracks().forEach(track => track.stop());
          if (sessionIdRef.current) {
        fetch(`${BACKEND_API_URL}/api/elevenlabs/disconnect`, {
                method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionIdRef.current }),
        }).catch(() => {});
          }
    };
  }, []);

  return (
    <main className="h-screen flex overflow-hidden">
      {/* Left side - Video (2/3 of screen) */}
      <VideoSection
        videoRef={videoRef}
        isLoading={isLoading}
        error={error}
        isRecording={isRecording}
        isConnecting={isConnecting}
        isDev={isDev}
        onRecordingToggle={handleRecordingToggle}
        onEndCall={handleEndCall}
        topEmotions={topEmotions}
        showEmotions={showEmotions}
        onToggleEmotions={() => setShowEmotions(!showEmotions)}
        faceBox={faceBox}
        showFaceBox={showFaceBox}
        onToggleFaceBox={() => setShowFaceBox(!showFaceBox)}
      />

      {/* Right side - Sidebar (1/3 of screen) */}
      <div className="w-1/3 bg-gray-50 flex flex-col border-l border-gray-200 relative overflow-hidden">
        {/* Transcripts View */}
        <div className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
          showTranscripts ? 'translate-x-0' : 'translate-x-full'
        }`}>
          <TranscriptSidebar 
            transcripts={transcripts} 
            onBack={() => setShowTranscripts(false)} 
          />
        </div>

        {/* Metrics View */}
        <div className={`absolute inset-0 pb-16 transition-transform duration-300 ease-in-out ${
          showTranscripts ? '-translate-x-full' : 'translate-x-0'
        }`}>
          <div className="h-full flex flex-col overflow-hidden">
            {/* Fixed header sections */}
            <div className="flex-shrink-0">
              <MetricsPanel 
                metrics={metrics} 
                onShowTranscripts={() => setShowTranscripts(true)} 
              />

              <ActionPointsChecklist
                actionPoints={actionPoints}
                showActionPoints={showActionPoints}
                onToggleShow={() => setShowActionPoints(!showActionPoints)}
                onTogglePoint={toggleActionPoint}
                />
            </div>

            {/* Scrollable insights area */}
            {currentInsight && (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <InsightsPanel 
                  insight={currentInsight} 
                  onClear={() => setCurrentInsight(null)} 
                />
              </div>
            )}
          </div>
        </div>
        
        {/* Action Buttons - Fixed bottom right */}
        <ActionButtonsGroup
          analyzingAction={analyzingAction}
          onArgumentsClick={() => handleActionButtonClick(() => analyzeConversation("arguments"))}
          onOutcomeClick={() => handleActionButtonClick(() => analyzeConversation("outcome"))}
        />
      </div>

      {/* Toast notifications - centered */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-3">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      {/* Emotion model loading indicator (dev only) */}
      {isDev && isEmotionModelLoading && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm shadow-lg z-50">
          Loading emotion model...
        </div>
      )}
      {isDev && emotionModelError && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg text-sm shadow-lg z-50">
          Emotion model error: {emotionModelError}
        </div>
      )}
    </main>
  );
}


