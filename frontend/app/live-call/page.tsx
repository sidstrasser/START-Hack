"use client";

import { useState, useEffect, useRef } from "react";
import Metric from "../components/Metric";
import ActionButton from "../components/ActionButton";

export default function LiveCall() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics] = useState({
    value: "$125,000",
    risk: "Medium",
    price: "$95,000",
  });

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
                // Mock action - no functionality yet
                console.log("Argument button clicked");
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
                // Mock action - no functionality yet
                console.log("Outcome Analysis button clicked");
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

