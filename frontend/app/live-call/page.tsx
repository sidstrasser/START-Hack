"use client";

import { useState, useEffect, useRef } from "react";
import Metric from "../components/Metric";
import ActionButton from "../components/ActionButton";

export default function LiveCall() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionIdRef = useRef<string | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const transcriptPollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [metrics] = useState({
    value: "$125,000",
    risk: "Medium",
    price: "$95,000",
  });

  const isDev = process.env.NODE_ENV === "development";

  const handleRecordingToggle = async () => {
    if (isConnecting) return;

    if (isRecording) {
      // Stop recording
      await stopRecording();
    } else {
      // Start recording
      await startRecording();
    }
  };

  const startRecording = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      audioStreamRef.current = stream;

      // Create AudioContext for processing
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // Connect to ElevenLabs via backend API
      const connectResponse = await fetch("/api/elevenlabs/connect", {
        method: "POST",
      });

      if (!connectResponse.ok) {
        const errorData = await connectResponse.json();
        throw new Error(
          errorData.error || "Failed to connect to transcription service"
        );
      }

      const { sessionId } = await connectResponse.json();
      sessionIdRef.current = sessionId;
      console.log("Connected to ElevenLabs, sessionId:", sessionId);

      // Process audio chunks and send to backend
      processor.onaudioprocess = async (e) => {
        if (!sessionIdRef.current) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);

        // Convert Float32 to Int16 PCM
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Convert to base64 (handle large arrays)
        const uint8Array = new Uint8Array(pcmData.buffer);
        let binary = "";
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const base64Audio = btoa(binary);

        // Send audio to backend API
        try {
          await fetch("/api/elevenlabs/audio", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sessionId: sessionIdRef.current,
              audioBase64: base64Audio,
              sampleRate: 16000,
            }),
          });
        } catch (err) {
          console.error("Error sending audio:", err);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      // Start polling for transcripts
      startTranscriptPolling();

      setIsRecording(true);
      setIsConnecting(false);
      console.log("Recording started - connected to ElevenLabs");
    } catch (err) {
      console.error("Error starting recording:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to start recording. Please check microphone permissions."
      );
      setIsConnecting(false);
      setIsRecording(false);
      await stopRecording();
    }
  };

  const startTranscriptPolling = () => {
    // Poll for transcripts every 500ms
    transcriptPollIntervalRef.current = setInterval(async () => {
      if (!sessionIdRef.current) return;

      try {
        const response = await fetch(
          `/api/elevenlabs/transcripts?sessionId=${sessionIdRef.current}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.transcripts && data.transcripts.length > 0) {
            // Log new transcripts
            data.transcripts.forEach((transcript: string) => {
              console.log("Final transcript:", transcript);
            });
          }
        }
      } catch (err) {
        console.error("Error polling transcripts:", err);
      }
    }, 500);
  };

  const stopRecording = async () => {
    try {
      // Stop transcript polling
      if (transcriptPollIntervalRef.current) {
        clearInterval(transcriptPollIntervalRef.current);
        transcriptPollIntervalRef.current = null;
      }

      // Stop audio processing
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }

      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Stop audio stream
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }

      // Disconnect from ElevenLabs via backend API
      if (sessionIdRef.current) {
        try {
          await fetch("/api/elevenlabs/disconnect", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sessionId: sessionIdRef.current,
            }),
          });
        } catch (err) {
          console.error("Error disconnecting from ElevenLabs:", err);
        }
        sessionIdRef.current = null;
      }

      setIsRecording(false);
      setIsConnecting(false);
      console.log("Recording stopped - disconnected from ElevenLabs");
    } catch (err) {
      console.error("Error stopping recording:", err);
      setIsRecording(false);
      setIsConnecting(false);
    }
  };

  const handleActionButtonClick = async (action: () => void) => {
    // Commit transcript before executing action
    if (sessionIdRef.current && isRecording) {
      try {
        const response = await fetch("/api/elevenlabs/commit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
          }),
        });

        if (response.ok) {
          console.log("Transcript committed");
        } else {
          const errorData = await response.json();
          console.error("Error committing transcript:", errorData.error);
        }
      } catch (err) {
        console.error("Error committing transcript:", err);
      }
    }

    // Execute the action
    action();
  };

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Request access to the user's camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user", // Front-facing camera
          },
          audio: false, // We only need video for now
        });

        // Set the video source to the stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to access camera. Please check permissions."
        );
        setIsLoading(false);
      }
    };

    startCamera();

    // Cleanup function to stop the stream when component unmounts
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup function
      const cleanup = async () => {
        try {
          // Stop transcript polling
          if (transcriptPollIntervalRef.current) {
            clearInterval(transcriptPollIntervalRef.current);
            transcriptPollIntervalRef.current = null;
          }

          // Stop audio processing
          if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
          }

          if (audioContextRef.current) {
            await audioContextRef.current.close();
            audioContextRef.current = null;
          }

          // Stop audio stream
          if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach((track) => track.stop());
            audioStreamRef.current = null;
          }

          // Disconnect from ElevenLabs via backend API
          if (sessionIdRef.current) {
            try {
              await fetch("/api/elevenlabs/disconnect", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  sessionId: sessionIdRef.current,
                }),
              });
            } catch (err) {
              console.error("Error disconnecting during cleanup:", err);
            }
            sessionIdRef.current = null;
          }
        } catch (err) {
          console.error("Error during cleanup:", err);
        }
      };
      cleanup();
    };
  }, []);

  return (
    <main className="min-h-screen flex">
      {/* Left side - Video (2/3 of screen) */}
      <div className="w-2/3 bg-black flex items-center justify-center relative">
        <div className="w-full h-full bg-gray-900 flex items-center justify-center relative">
          {/* Video element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* DEV: Recording Button (top-right corner) */}
          {isDev && (
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={handleRecordingToggle}
                disabled={isConnecting}
                className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
                  isRecording
                    ? "bg-red-600 hover:bg-red-700 animate-pulse"
                    : "bg-gray-700 hover:bg-gray-600"
                } ${isConnecting ? "opacity-50 cursor-not-allowed" : ""}`}
                title={
                  isRecording
                    ? "Stop Recording"
                    : isConnecting
                    ? "Connecting..."
                    : "Start Recording"
                }
              >
                {isRecording ? (
                  // Stop icon (square)
                  <svg
                    className="w-6 h-6 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <rect x="6" y="6" width="12" height="12" rx="1" />
                  </svg>
                ) : (
                  // Record icon (circle)
                  <svg
                    className="w-6 h-6 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="6" />
                  </svg>
                )}
                {/* Recording indicator dot */}
                {isRecording && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-ping" />
                )}
              </button>
              {/* DEV badge */}
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 font-mono bg-gray-800 px-2 py-0.5 rounded">
                DEV
              </div>
            </div>
          )}

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <svg
                  className="w-24 h-24 mx-auto mb-4 animate-pulse"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-lg">Accessing camera...</p>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {error && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
              <div className="text-center text-red-400 max-w-md px-4">
                <svg
                  className="w-24 h-24 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p className="text-lg mb-2">Camera Error</p>
                <p className="text-sm">{error}</p>
                <p className="text-xs mt-4 text-gray-500">
                  Please allow camera access and refresh the page.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right side - Chat bar with metrics and actions (1/3 of screen) */}
      <div className="w-1/3 bg-gray-50 flex flex-col border-l border-gray-200">
        {/* Metrics Section at the top */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <h2 className="text-sm font-semibold mb-3 text-gray-800">Metrics</h2>
          <div className="space-y-2.5">
            <Metric
              label="Value"
              value={metrics.value}
              color="blue"
              fillPercentage={75}
            />
            <Metric
              label="Risk"
              value={metrics.risk}
              color="yellow"
              fillPercentage={50}
            />
            <Metric
              label="Price"
              value={metrics.price}
              color="green"
              fillPercentage={60}
            />
          </div>
        </div>

        {/* Action Buttons at the bottom */}
        <div className="mt-auto p-6 border-t border-gray-200 bg-white">
          <div className="flex items-center justify-center gap-4">
            <ActionButton
              icon={
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              }
              tooltip="Argument"
              color="blue"
              onClick={() => {
                handleActionButtonClick(() => {
                  // Mock action - no functionality yet
                  console.log("Argument button clicked");
                });
              }}
            />
            <ActionButton
              icon={
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              }
              tooltip="Outcome Analysis"
              color="purple"
              onClick={() => {
                handleActionButtonClick(() => {
                  // Mock action - no functionality yet
                  console.log("Outcome Analysis button clicked");
                });
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

