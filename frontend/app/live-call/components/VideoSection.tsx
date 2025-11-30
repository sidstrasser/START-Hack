"use client";

import { RefObject } from "react";

interface VideoSectionProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  isLoading: boolean;
  error: string | null;
  isRecording: boolean;
  isConnecting: boolean;
  isDev: boolean;
  onRecordingToggle: () => void;
  onEndCall: () => void;
}

export default function VideoSection({
  videoRef,
  isLoading,
  error,
  isRecording,
  isConnecting,
  isDev,
  onRecordingToggle,
  onEndCall,
}: VideoSectionProps) {

  return (
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
              onClick={onRecordingToggle}
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

        {/* DEV: End Call Button (bottom-right corner) */}
        {isDev && (
          <button
            onClick={onEndCall}
            className="absolute bottom-4 right-4 z-10 w-12 h-12 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-lg hover:scale-110"
            title="End Call"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 01-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28-.79-.73-1.68-1.36-2.66-1.85a.996.996 0 01-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
            </svg>
          </button>
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
  );
}

