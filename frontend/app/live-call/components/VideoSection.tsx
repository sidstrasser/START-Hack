"use client";

import { RefObject } from "react";

interface EmotionDisplay {
  emotion: string;
  confidence: number;
}

interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface VideoSectionProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  isLoading: boolean;
  error: string | null;
  isRecording: boolean;
  isConnecting: boolean;
  isDev: boolean;
  onRecordingToggle: () => void;
  onEndCall: () => void;
  topEmotions?: EmotionDisplay[];
  showEmotions: boolean;
  onToggleEmotions: () => void;
  faceBox?: FaceBox | null;
  showFaceBox: boolean;
  onToggleFaceBox: () => void;
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
  topEmotions,
  showEmotions,
  onToggleEmotions,
  faceBox,
  showFaceBox,
  onToggleFaceBox,
}: VideoSectionProps) {

  return (
    <div className="w-2/3 bg-[#0F1A3D] flex items-center justify-center relative p-4">
      <div className="w-full h-full bg-[#0a1029] rounded-ds-xl overflow-hidden flex items-center justify-center relative border border-white/10 shadow-2xl">
        {/* Video element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* Face Detection Box Overlay */}
        {showFaceBox && faceBox && videoRef.current && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox={`0 0 ${videoRef.current.videoWidth || 1280} ${videoRef.current.videoHeight || 720}`}
            preserveAspectRatio="xMidYMid slice"
          >
            <rect
              x={faceBox.x}
              y={faceBox.y}
              width={faceBox.width}
              height={faceBox.height}
              fill="none"
              stroke="#7B5BF1"
              strokeWidth="3"
              rx="8"
            />
            <text
              x={faceBox.x + 4}
              y={faceBox.y - 8}
              fill="#7B5BF1"
              fontSize="14"
              fontWeight="bold"
            >
              Face
            </text>
          </svg>
        )}

        {/* Face Box Toggle Button (bottom-left) */}
        <button
          onClick={onToggleFaceBox}
          className={`absolute bottom-4 left-4 z-10 px-3 py-2 text-xs font-medium rounded-ds-md backdrop-blur-xl transition-all flex items-center gap-2 ${
            showFaceBox 
              ? 'bg-ds-accent-2/30 text-white border border-ds-accent-2/50' 
              : 'bg-white/10 text-white/70 hover:text-white border border-white/20 hover:border-white/40'
          }`}
          title={showFaceBox ? "Hide face box" : "Show face box"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M4 5a1 1 0 011-1h4a1 1 0 010 2H6v3a1 1 0 01-2 0V5zM4 19a1 1 0 001 1h4a1 1 0 100-2H6v-3a1 1 0 10-2 0v4zM16 4a1 1 0 100 2h3v3a1 1 0 102 0V5a1 1 0 00-1-1h-4zM19 16a1 1 0 10-2 0v3h-3a1 1 0 100 2h4a1 1 0 001-1v-4z"
            />
          </svg>
          {showFaceBox ? "Hide Box" : "Show Box"}
        </button>

        {/* Emotion Display Overlay (top-left) */}
        <div className="absolute top-4 left-4 z-10">
          {/* Toggle button */}
          <button
            onClick={onToggleEmotions}
            className={`mb-2 px-3 py-2 text-xs font-medium rounded-ds-md backdrop-blur-xl transition-all flex items-center gap-2 ${
              showEmotions 
                ? 'bg-ds-accent-2/30 text-white border border-ds-accent-2/50' 
                : 'bg-white/10 text-white/70 hover:text-white border border-white/20 hover:border-white/40'
            }`}
            title={showEmotions ? "Hide emotions" : "Show emotions"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d={showEmotions 
                  ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                } 
              />
            </svg>
            {showEmotions ? "Hide" : "Show"}
          </button>

          {/* Emotion display */}
          {showEmotions && topEmotions && topEmotions.length > 0 && (
            <div className="bg-[#0F1A3D]/80 backdrop-blur-xl rounded-ds-lg px-4 py-3 min-w-[160px] border border-white/10">
              {topEmotions[0]?.emotion === 'No Face' ? (
                <div className="text-white/50 text-sm flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  No face detected
                </div>
              ) : (
                <>
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2 font-medium">Detected Emotions</div>
                  {topEmotions.map((item, index) => (
                    <div key={item.emotion} className="flex items-center justify-between gap-3 mb-2 last:mb-0">
                      <span className={`text-sm font-medium ${index === 0 ? 'text-white' : 'text-white/60'}`}>
                        {item.emotion}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              index === 0 ? 'bg-ds-accent-2' : 'bg-white/30'
                            }`}
                            style={{ width: `${Math.min(item.confidence * 100, 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs tabular-nums ${index === 0 ? 'text-ds-accent-2' : 'text-white/40'}`}>
                          {(item.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* DEV: Recording Button (top-right corner) */}
        {isDev && (
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={onRecordingToggle}
              disabled={isConnecting}
              className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
                isRecording
                  ? "bg-red-500 hover:bg-red-600 animate-pulse"
                  : "bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20"
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
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full border-2 border-white animate-ping" />
              )}
            </button>
            {/* DEV badge */}
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-[10px] text-white/50 font-mono bg-white/10 backdrop-blur-sm px-2 py-0.5 rounded-full">
              DEV
            </div>
          </div>
        )}

        {/* DEV: End Call Button (bottom-right corner) */}
        {isDev && (
          <button
            onClick={onEndCall}
            className="absolute bottom-4 right-4 z-10 w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-lg hover:scale-110"
            title="End Call"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 01-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28-.79-.73-1.68-1.36-2.66-1.85a.996.996 0 01-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
            </svg>
          </button>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-[#0a1029] flex items-center justify-center">
            <div className="text-center text-white/50">
              <svg
                className="w-24 h-24 mx-auto mb-4 animate-pulse text-ds-accent-2/50"
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
              <p className="text-lg font-medium text-white/70">Accessing camera...</p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 bg-[#0a1029] flex items-center justify-center">
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
              <p className="text-lg font-medium mb-2">Camera Error</p>
              <p className="text-sm text-red-300/80">{error}</p>
              <p className="text-xs mt-4 text-white/40">
                Please allow camera access and refresh the page.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
