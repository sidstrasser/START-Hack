"use client";

import { useState } from "react";
import Metric from "../components/Metric";

export default function LiveCall() {
  const [metrics] = useState({
    value: "$125,000",
    risk: "Medium",
    price: "$95,000",
  });

  return (
    <main className="min-h-screen flex">
      {/* Left side - Video (2/3 of screen) */}
      <div className="w-2/3 bg-black flex items-center justify-center relative">
        <div className="w-full h-full bg-gray-900 flex items-center justify-center">
          {/* Video placeholder - can be replaced with actual video element */}
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center text-gray-400">
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
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <p className="text-lg">Camera Feed</p>
            </div>
          </div>
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
            {/* Argument Button */}
            <div className="relative group">
              <button
                onClick={() => {
                  // Mock action - no functionality yet
                  console.log("Argument button clicked");
                }}
                className="w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors duration-200 shadow-md hover:shadow-lg"
              >
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
              </button>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                Argument
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                  <div className="border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </div>

            {/* Outcome Analysis Button */}
            <div className="relative group">
              <button
                onClick={() => {
                  // Mock action - no functionality yet
                  console.log("Outcome Analysis button clicked");
                }}
                className="w-16 h-16 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center transition-colors duration-200 shadow-md hover:shadow-lg"
              >
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
              </button>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                Outcome Analysis
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                  <div className="border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

