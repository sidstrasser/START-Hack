"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface MetricsDataPoint {
  timestamp: number;
  elapsedSeconds: number;
  value: number;
  risk: number;
  outcome: number;
}

interface ActionPoint {
  id: number;
  text: string;
  completed: boolean;
}

interface CallSummaryData {
  callStartTime: number;
  callDuration: number;
  metricsHistory: MetricsDataPoint[];
  finalMetrics: { value: number; risk: number; outcome: number };
  actionPoints: ActionPoint[];
  transcripts: { text: string; speaker_id?: string }[];
  vectorDbId: string;
  goals: string;
}

// Simple line chart component
function MetricsChart({ 
  data, 
  dataKey, 
  color, 
  label 
}: { 
  data: MetricsDataPoint[]; 
  dataKey: "value" | "risk" | "outcome"; 
  color: string;
  label: string;
}) {
  if (data.length < 2) {
    return (
      <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
        Not enough data points
      </div>
    );
  }

  const values = data.map(d => d[dataKey]);
  const maxVal = Math.max(...values, 100);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;
  
  // Calculate points for SVG path
  const width = 100;
  const height = 100;
  const padding = 10;
  
  const points = data.map((d, i) => ({
    x: padding + (i / (data.length - 1)) * (width - 2 * padding),
    y: height - padding - ((d[dataKey] - minVal) / range) * (height - 2 * padding)
  }));
  
  const pathD = points.reduce((path, point, i) => {
    return path + (i === 0 ? `M ${point.x},${point.y}` : ` L ${point.x},${point.y}`);
  }, '');
  
  // Area fill path
  const areaD = pathD + ` L ${points[points.length - 1].x},${height - padding} L ${padding},${height - padding} Z`;

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="ml-auto text-lg font-bold" style={{ color }}>
          {data[data.length - 1][dataKey]}%
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32" preserveAspectRatio="none">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(val => (
          <line
            key={val}
            x1={padding}
            x2={width - padding}
            y1={height - padding - (val / 100) * (height - 2 * padding)}
            y2={height - padding - (val / 100) * (height - 2 * padding)}
            stroke="#e5e7eb"
            strokeWidth="0.5"
          />
        ))}
        {/* Area fill */}
        <path d={areaD} fill={color} fillOpacity="0.1" />
        {/* Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Data points */}
        {points.map((point, i) => (
          <circle key={i} cx={point.x} cy={point.y} r="3" fill={color} />
        ))}
      </svg>
      {/* Time labels */}
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>0:00</span>
        <span>{Math.floor(data[data.length - 1].elapsedSeconds / 60)}:{String(data[data.length - 1].elapsedSeconds % 60).padStart(2, '0')}</span>
      </div>
    </div>
  );
}

export default function Summary() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [callData, setCallData] = useState<CallSummaryData | null>(null);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [nextActions, setNextActions] = useState<string[]>([]);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  
  // Prevent double-fetch in React Strict Mode
  const hasFetchedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load call data from sessionStorage
  useEffect(() => {
    // Prevent double-fetch in React Strict Mode
    if (hasFetchedRef.current) return;
    
    const storedData = sessionStorage.getItem('callSummaryData');
    console.log("[Summary] Loading stored data:", storedData ? "found" : "not found");
    
    if (storedData) {
      const parsed = JSON.parse(storedData);
      console.log("[Summary] Parsed data:", {
        callStartTime: parsed.callStartTime,
        callDuration: parsed.callDuration,
        metricsHistoryCount: parsed.metricsHistory?.length,
        actionPointsCount: parsed.actionPoints?.length,
        transcriptsCount: parsed.transcripts?.length,
        vectorDbId: parsed.vectorDbId,
        goals: parsed.goals,
      });
      
      setCallData(parsed);
      setIsLoading(false);
      
      // Validate required data before generating summary
      if (!parsed.vectorDbId) {
        console.error("[Summary] Missing vectorDbId!");
        setAiSummary("Unable to generate summary: missing briefing data.");
        return;
      }
      
      // Generate AI summary - set flag BEFORE calling to prevent race conditions
      hasFetchedRef.current = true;
      generateSummary(parsed);
    } else {
      console.log("[Summary] No call data found in sessionStorage");
      setIsLoading(false);
    }
    
    // Note: We intentionally don't abort on cleanup to prevent React Strict Mode
    // from cancelling our request. The hasFetchedRef prevents duplicate requests.
  }, []);

  const generateSummary = async (data: CallSummaryData) => {
    // Cancel any previous request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    
    setIsGeneratingSummary(true);
    setAiSummary("");
    setNextActions([]);
    
    console.log("[Summary] Starting stream request with data:", {
      vectorDbId: data.vectorDbId,
      transcriptsCount: data.transcripts?.length,
      actionPointsCount: data.actionPoints?.length,
      goals: data.goals,
      callDuration: data.callDuration,
    });
    
    try {
      const response = await fetch(`${BACKEND_API_URL}/api/elevenlabs/stream-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vectorDbId: data.vectorDbId,
          transcripts: data.transcripts,
          actionPoints: data.actionPoints,
          goals: data.goals,
          callDuration: data.callDuration,
        }),
        signal: abortControllerRef.current.signal,
      });

      console.log("[Summary] Response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Summary] Error response:", errorText);
        throw new Error(`Failed to start streaming: ${response.status} ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No reader available");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("[Summary] Stream ended. Remaining buffer:", buffer);
          break;
        }

        const decoded = decoder.decode(value, { stream: true });
        buffer += decoded;
        
        // Process complete SSE messages
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || ""; // Keep incomplete message in buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const chunk = line.slice(6); // Remove "data: " prefix
            
            if (chunk.startsWith("[SUMMARY]")) {
              const content = chunk.slice(9); // Remove "[SUMMARY]" prefix
              setAiSummary(prev => prev + content);
            } else if (chunk.startsWith("[ACTION]")) {
              const actionText = chunk.slice(8).trim(); // Remove "[ACTION]" prefix
              console.log("[Summary] Received action:", actionText);
              if (actionText) {
                // Prevent duplicates
                setNextActions(prev => {
                  if (prev.includes(actionText)) return prev;
                  return [...prev, actionText];
                });
              }
            } else if (chunk === "[DONE]") {
              console.log("[Summary] Stream complete");
            } else if (chunk.startsWith("[ERROR]")) {
              console.error("[Summary] Stream error:", chunk.slice(7));
            }
          }
        }
      }
    } catch (error) {
      // Ignore abort errors (from React Strict Mode cleanup)
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error("Failed to generate summary:", error);
      setAiSummary("Unable to generate summary. Please try again.");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const handleExport = (platform: "salesforce" | "hubspot") => {
    // Mock export functionality
    alert(`Exporting to ${platform === "salesforce" ? "Salesforce" : "HubSpot"}...\n\nThis would integrate with your ${platform === "salesforce" ? "Salesforce" : "HubSpot"} CRM to create a call log with the summary and action items.`);
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </main>
    );
  }

  if (!callData) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col items-center justify-center gap-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Call Data Found</h1>
          <p className="text-gray-600 mb-6">Start a call first to see the summary.</p>
          <button
            onClick={() => router.push('/briefing')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            Start New Call
          </button>
        </div>
      </main>
    );
  }

  const completedActions = callData.actionPoints.filter(a => a.completed);
  const incompletedActions = callData.actionPoints.filter(a => !a.completed);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Call Summary
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Duration: {formatDuration(callData.callDuration)} • {new Date(callData.callStartTime).toLocaleString()}
              </p>
            </div>
            
            {/* Export Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleExport("salesforce")}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#00A1E0] text-white rounded-lg font-medium hover:bg-[#0089C2] transition-all hover:scale-105 shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.09 2.41C10.58 2.41 9.22 3.02 8.22 4.02C7.5 3.37 6.54 2.97 5.5 2.97C3.29 2.97 1.5 4.76 1.5 6.97C1.5 7.97 1.87 8.89 2.47 9.6C1.56 10.38 1 11.62 1 13C1 15.76 3.24 18 6 18C6.42 18 6.83 17.94 7.22 17.84C7.67 19.66 9.33 21 11.28 21C12.77 21 14.09 20.25 14.89 19.12C15.5 19.36 16.16 19.5 16.85 19.5C19.7 19.5 22 17.2 22 14.35C22 13.76 21.9 13.2 21.72 12.68C22.54 11.94 23 10.87 23 9.71C23 7.6 21.4 5.88 19.35 5.64C18.69 3.68 16.84 2.29 14.67 2.29C13.76 2.29 12.88 2.53 12.09 2.97V2.41Z"/>
                </svg>
                Export to Salesforce
              </button>
              <button
                onClick={() => handleExport("hubspot")}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#FF7A59] text-white rounded-lg font-medium hover:bg-[#E56B4A] transition-all hover:scale-105 shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.15 7.35V4.68c.86-.43 1.45-1.32 1.45-2.35C19.6 1.05 18.55 0 17.27 0c-1.28 0-2.32 1.05-2.32 2.33 0 1.03.59 1.92 1.45 2.35v2.67c-1.16.28-2.18.88-2.96 1.72l-8.13-6.33c.05-.21.08-.43.08-.66C5.39.93 4.46 0 3.31 0 2.16 0 1.23.93 1.23 2.08s.93 2.08 2.08 2.08c.5 0 .95-.18 1.31-.47l7.94 6.19c-.52.84-.83 1.83-.83 2.89 0 1.05.31 2.04.83 2.88l-2.54 2.54c-.26-.09-.54-.14-.83-.14-1.52 0-2.76 1.24-2.76 2.76S7.67 24 9.19 24s2.76-1.24 2.76-2.76c0-.29-.05-.56-.14-.82l2.54-2.55c.84.52 1.84.83 2.92.83 2.99 0 5.42-2.43 5.42-5.42 0-2.99-2.43-5.42-5.42-5.42-.4 0-.79.05-1.17.14l.05-.01zm-.88 8.28c-1.65 0-2.99-1.34-2.99-2.99s1.34-2.99 2.99-2.99 2.99 1.34 2.99 2.99-1.34 2.99-2.99 2.99z"/>
                </svg>
                Export to HubSpot
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Top Row: Completed Actions + Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Completed Action Items */}
          <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Completed Actions</h2>
                <p className="text-sm text-emerald-600 font-medium">{completedActions.length} of {callData.actionPoints.length}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              {completedActions.map((action) => (
                <div key={action.id} className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-emerald-800">{action.text}</span>
                </div>
              ))}
              
              {incompletedActions.length > 0 && (
                <>
                  <div className="border-t border-gray-200 my-3 pt-3">
                    <p className="text-xs text-gray-500 uppercase font-medium mb-2">Not Completed</p>
                  </div>
                  {incompletedActions.map((action) => (
                    <div key={action.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl opacity-60">
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-600">{action.text}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* AI Summary */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Call Summary</h2>
              {isGeneratingSummary && (
                <div className="ml-auto flex items-center gap-2 text-sm text-indigo-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>
                  Generating...
                </div>
              )}
            </div>
            
            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed min-h-[100px]">
              {aiSummary ? (
                <>
                  {aiSummary.split('\n').filter(p => p.trim()).map((paragraph, i) => (
                    <p key={i} className="mb-3">{paragraph}</p>
                  ))}
                  {isGeneratingSummary && (
                    <span className="inline-block w-2 h-4 bg-indigo-500 animate-pulse ml-1" />
                  )}
                </>
              ) : isGeneratingSummary ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
                  <span>Generating summary...</span>
                </div>
              ) : (
                <p className="text-gray-400">No summary available</p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Row: Graphs + Next Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Metrics Charts */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Performance Over Time</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                <MetricsChart 
                  data={callData.metricsHistory} 
                  dataKey="value" 
                  color="#f59e0b" 
                  label="Value"
                />
              </div>
              <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-4 border border-red-100">
                <MetricsChart 
                  data={callData.metricsHistory} 
                  dataKey="risk" 
                  color="#ef4444" 
                  label="Risk"
                />
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
                <MetricsChart 
                  data={callData.metricsHistory} 
                  dataKey="outcome" 
                  color="#10b981" 
                  label="Goals"
                />
              </div>
            </div>
            
            {/* Final Metrics Summary */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-3xl font-bold text-amber-500">{callData.finalMetrics.value}%</p>
                  <p className="text-sm text-gray-500">Final Value</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-red-500">{callData.finalMetrics.risk}%</p>
                  <p className="text-sm text-gray-500">Final Risk</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-emerald-500">{callData.finalMetrics.outcome}%</p>
                  <p className="text-sm text-gray-500">Goal Achievement</p>
                </div>
              </div>
            </div>
          </div>

          {/* Next Action Items */}
          <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Next Steps</h2>
                <p className="text-sm text-blue-600 font-medium">AI Recommended</p>
              </div>
            </div>
            
            <div className="space-y-3 min-h-[150px]">
              {nextActions.length > 0 ? (
                <>
                  {nextActions.map((action, index) => (
                    <div 
                      key={index} 
                      className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 hover:shadow-md transition-all animate-in fade-in slide-in-from-bottom-2 duration-300"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <span className="text-sm text-blue-900">{action}</span>
                    </div>
                  ))}
                  {isGeneratingSummary && (
                    <div className="flex items-center gap-2 p-4 text-gray-400">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
                      <span className="text-sm">Loading more...</span>
                    </div>
                  )}
                </>
              ) : isGeneratingSummary ? (
                <div className="flex items-center gap-2 p-4 text-gray-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
                  <span className="text-sm">Generating action items...</span>
                </div>
              ) : (
                <p className="text-gray-400 p-4">No action items available</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => router.push('/briefing')}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            New Briefing
          </button>
          <button
            onClick={() => router.push('/live-call')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            Start New Call
          </button>
        </div>
      </div>
    </main>
  );
}
