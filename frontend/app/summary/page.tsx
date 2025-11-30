"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

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

interface HubSpotContact {
  id: string;
  name: string;
  email?: string;
  company?: string;
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
      <div className="h-32 flex items-center justify-center text-white/40 text-sm">
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
        <span className="text-sm font-medium text-white/70">{label}</span>
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
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="0.5"
          />
        ))}
        {/* Area fill */}
        <path d={areaD} fill={color} fillOpacity="0.2" />
        {/* Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Data points */}
        {points.map((point, i) => (
          <circle key={i} cx={point.x} cy={point.y} r="3" fill={color} />
        ))}
      </svg>
      {/* Time labels */}
      <div className="flex justify-between text-xs text-white/40 mt-1">
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
  
  // HubSpot export state
  const [showHubSpotModal, setShowHubSpotModal] = useState(false);
  const [hubspotContacts, setHubspotContacts] = useState<HubSpotContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<HubSpotContact | null>(null);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [contactSearch, setContactSearch] = useState("");

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

  // Fetch HubSpot contacts
  const fetchHubSpotContacts = async (search?: string) => {
    setIsLoadingContacts(true);
    try {
      const url = search 
        ? `${BACKEND_API_URL}/api/hubspot/contacts?search=${encodeURIComponent(search)}`
        : `${BACKEND_API_URL}/api/hubspot/contacts`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setHubspotContacts(data.contacts);
      } else {
        console.error("Failed to fetch contacts:", await response.text());
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  // Export to HubSpot
  const exportToHubSpot = async () => {
    if (!selectedContact || !callData) return;
    
    setIsExporting(true);
    setExportSuccess(null);
    
    try {
      const response = await fetch(`${BACKEND_API_URL}/api/hubspot/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selectedContact.id,
          summary: aiSummary,
          nextActions: nextActions,
          completedActions: callData.actionPoints.filter(a => a.completed).map(a => a.text),
          callDuration: callData.callDuration,
          metrics: callData.finalMetrics
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setExportSuccess(data.message);
        setTimeout(() => {
          setShowHubSpotModal(false);
          setExportSuccess(null);
          setSelectedContact(null);
        }, 2000);
      } else {
        const error = await response.text();
        alert(`Export failed: ${error}`);
      }
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export to HubSpot");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = (platform: "salesforce" | "hubspot") => {
    if (platform === "hubspot") {
      setShowHubSpotModal(true);
      fetchHubSpotContacts();
    } else {
      // Salesforce - show coming soon
      alert("Salesforce integration coming soon!\n\nHubSpot integration is available now.");
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#0F1A3D] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ds-accent-2"></div>
      </main>
    );
  }

  if (!callData) {
    return (
      <main className="min-h-screen bg-[#0F1A3D] relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-ds-accent-1/20 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen gap-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-2">No Call Data Found</h1>
            <p className="text-white/60 mb-6">Start a call first to see the summary.</p>
            <button
              onClick={() => router.push('/briefing')}
              className="px-6 py-3 bg-white text-[#0F1A3D] rounded-ds-xl font-medium hover:-translate-y-0.5 transition-transform"
            >
              Start New Call
            </button>
          </div>
        </div>
      </main>
    );
  }

  const completedActions = callData.actionPoints.filter(a => a.completed);
  const incompletedActions = callData.actionPoints.filter(a => !a.completed);

  return (
    <main className="min-h-screen bg-[#0F1A3D] relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-ds-accent-1/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-40 w-[500px] h-[500px] bg-ds-accent-2/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-72 h-72 bg-ds-accent-1/15 rounded-full blur-2xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 p-6 border-b border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/live-call" className="inline-flex items-center gap-3 group">
                <Image
                  src="/icon-logo.png"
                  alt="Accordia"
                  width={40}
                  height={40}
                  className="h-10 w-auto object-contain"
                  unoptimized
                />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Call Summary
                </h1>
                <p className="text-sm text-white/50 mt-0.5">
                  Duration: {formatDuration(callData.callDuration)} • {new Date(callData.callStartTime).toLocaleString()}
                </p>
              </div>
            </div>
            
            {/* Export Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleExport("salesforce")}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#00A1E0]/20 border border-[#00A1E0]/30 text-[#00A1E0] rounded-ds-lg font-medium hover:bg-[#00A1E0]/30 transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.09 2.41C10.58 2.41 9.22 3.02 8.22 4.02C7.5 3.37 6.54 2.97 5.5 2.97C3.29 2.97 1.5 4.76 1.5 6.97C1.5 7.97 1.87 8.89 2.47 9.6C1.56 10.38 1 11.62 1 13C1 15.76 3.24 18 6 18C6.42 18 6.83 17.94 7.22 17.84C7.67 19.66 9.33 21 11.28 21C12.77 21 14.09 20.25 14.89 19.12C15.5 19.36 16.16 19.5 16.85 19.5C19.7 19.5 22 17.2 22 14.35C22 13.76 21.9 13.2 21.72 12.68C22.54 11.94 23 10.87 23 9.71C23 7.6 21.4 5.88 19.35 5.64C18.69 3.68 16.84 2.29 14.67 2.29C13.76 2.29 12.88 2.53 12.09 2.97V2.41Z"/>
                </svg>
                Salesforce
              </button>
              <button
                onClick={() => handleExport("hubspot")}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#FF7A59]/20 border border-[#FF7A59]/30 text-[#FF7A59] rounded-ds-lg font-medium hover:bg-[#FF7A59]/30 transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.15 7.35V4.68c.86-.43 1.45-1.32 1.45-2.35C19.6 1.05 18.55 0 17.27 0c-1.28 0-2.32 1.05-2.32 2.33 0 1.03.59 1.92 1.45 2.35v2.67c-1.16.28-2.18.88-2.96 1.72l-8.13-6.33c.05-.21.08-.43.08-.66C5.39.93 4.46 0 3.31 0 2.16 0 1.23.93 1.23 2.08s.93 2.08 2.08 2.08c.5 0 .95-.18 1.31-.47l7.94 6.19c-.52.84-.83 1.83-.83 2.89 0 1.05.31 2.04.83 2.88l-2.54 2.54c-.26-.09-.54-.14-.83-.14-1.52 0-2.76 1.24-2.76 2.76S7.67 24 9.19 24s2.76-1.24 2.76-2.76c0-.29-.05-.56-.14-.82l2.54-2.55c.84.52 1.84.83 2.92.83 2.99 0 5.42-2.43 5.42-5.42 0-2.99-2.43-5.42-5.42-5.42-.4 0-.79.05-1.17.14l.05-.01zm-.88 8.28c-1.65 0-2.99-1.34-2.99-2.99s1.34-2.99 2.99-2.99 2.99 1.34 2.99 2.99-1.34 2.99-2.99 2.99z"/>
                </svg>
                HubSpot
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Top Row: Completed Actions + Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Completed Action Items */}
          <div className="lg:col-span-1 bg-white/10 backdrop-blur-xl border border-white/20 rounded-ds-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-ds-lg bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Completed Actions</h2>
                <p className="text-sm text-emerald-400 font-medium">{completedActions.length} of {callData.actionPoints.length}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              {completedActions.map((action) => (
                <div key={action.id} className="flex items-start gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-ds-md">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-emerald-300">{action.text}</span>
                </div>
              ))}
              
              {incompletedActions.length > 0 && (
                <>
                  <div className="border-t border-white/10 my-3 pt-3">
                    <p className="text-xs text-white/40 uppercase font-medium mb-2">Not Completed</p>
                  </div>
                  {incompletedActions.map((action) => (
                    <div key={action.id} className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded-ds-md opacity-60">
                      <div className="w-5 h-5 rounded-full border-2 border-white/30 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-white/60">{action.text}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* AI Summary */}
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-ds-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-ds-lg bg-ds-accent-2/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-ds-accent-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white">Call Summary</h2>
              {isGeneratingSummary && (
                <div className="ml-auto flex items-center gap-2 text-sm text-ds-accent-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-ds-accent-2 border-t-transparent"></div>
                  Generating...
                </div>
              )}
            </div>
            
            <div className="prose prose-sm max-w-none text-white/80 leading-relaxed min-h-[100px]">
              {aiSummary ? (
                <>
                  {aiSummary.split('\n').filter(p => p.trim()).map((paragraph, i) => (
                    <p key={i} className="mb-3">{paragraph}</p>
                  ))}
                  {isGeneratingSummary && (
                    <span className="inline-block w-2 h-4 bg-ds-accent-2 animate-pulse ml-1" />
                  )}
                </>
              ) : isGeneratingSummary ? (
                <div className="flex items-center gap-2 text-white/40">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-transparent"></div>
                  <span>Generating summary...</span>
                </div>
              ) : (
                <p className="text-white/40">No summary available</p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Row: Graphs + Next Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Metrics Charts */}
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-ds-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-ds-lg bg-ds-accent-1/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-ds-accent-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white">Performance Over Time</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-ds-lg p-4">
                <MetricsChart 
                  data={callData.metricsHistory} 
                  dataKey="value" 
                  color="#3b82f6" 
                  label="Value"
                />
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-ds-lg p-4">
                <MetricsChart 
                  data={callData.metricsHistory} 
                  dataKey="risk" 
                  color="#f59e0b" 
                  label="Risk"
                />
              </div>
              <div className="bg-ds-accent-2/10 border border-ds-accent-2/20 rounded-ds-lg p-4">
                <MetricsChart 
                  data={callData.metricsHistory} 
                  dataKey="outcome" 
                  color="#7B5BF1" 
                  label="Goals"
                />
              </div>
            </div>
            
            {/* Final Metrics Summary */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-3xl font-bold text-blue-400">{callData.finalMetrics.value}%</p>
                  <p className="text-sm text-white/50">Final Value</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-amber-400">{callData.finalMetrics.risk}%</p>
                  <p className="text-sm text-white/50">Final Risk</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-ds-accent-2">{callData.finalMetrics.outcome}%</p>
                  <p className="text-sm text-white/50">Goal Achievement</p>
                </div>
              </div>
            </div>
          </div>

          {/* Next Action Items */}
          <div className="lg:col-span-1 bg-white/10 backdrop-blur-xl border border-white/20 rounded-ds-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-ds-lg bg-blue-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Next Steps</h2>
                <p className="text-sm text-blue-400 font-medium">AI Recommended</p>
              </div>
            </div>
            
            <div className="space-y-3 min-h-[150px]">
              {nextActions.length > 0 ? (
                <>
                  {nextActions.map((action, index) => (
                    <div 
                      key={index} 
                      className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-ds-lg animate-in fade-in slide-in-from-bottom-2 duration-300"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <span className="text-sm text-blue-200">{action}</span>
                    </div>
                  ))}
                  {isGeneratingSummary && (
                    <div className="flex items-center gap-2 p-4 text-white/40">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-transparent"></div>
                      <span className="text-sm">Loading more...</span>
                    </div>
                  )}
                </>
              ) : isGeneratingSummary ? (
                <div className="flex items-center gap-2 p-4 text-white/40">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-transparent"></div>
                  <span className="text-sm">Generating action items...</span>
                </div>
              ) : (
                <p className="text-white/40 p-4">No action items available</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => router.push('/briefing')}
            className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-ds-xl font-medium hover:bg-white/20 transition-colors"
          >
            New Briefing
          </button>
          <button
            onClick={() => router.push('/live-call')}
            className="cta-negotiate px-6 py-3 bg-white text-[#0F1A3D] rounded-ds-xl font-medium hover:-translate-y-0.5 transition-transform"
          >
            Start New Call
          </button>
        </div>
      </div>

      {/* HubSpot Export Modal */}
      {showHubSpotModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0F1A3D] border border-white/20 rounded-ds-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#FF7A59]/10">
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 text-[#FF7A59]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.15 7.35V4.68c.86-.43 1.45-1.32 1.45-2.35C19.6 1.05 18.55 0 17.27 0c-1.28 0-2.32 1.05-2.32 2.33 0 1.03.59 1.92 1.45 2.35v2.67c-1.16.28-2.18.88-2.96 1.72l-8.13-6.33c.05-.21.08-.43.08-.66C5.39.93 4.46 0 3.31 0 2.16 0 1.23.93 1.23 2.08s.93 2.08 2.08 2.08c.5 0 .95-.18 1.31-.47l7.94 6.19c-.52.84-.83 1.83-.83 2.89 0 1.05.31 2.04.83 2.88l-2.54 2.54c-.26-.09-.54-.14-.83-.14-1.52 0-2.76 1.24-2.76 2.76S7.67 24 9.19 24s2.76-1.24 2.76-2.76c0-.29-.05-.56-.14-.82l2.54-2.55c.84.52 1.84.83 2.92.83 2.99 0 5.42-2.43 5.42-5.42 0-2.99-2.43-5.42-5.42-5.42-.4 0-.79.05-1.17.14l.05-.01zm-.88 8.28c-1.65 0-2.99-1.34-2.99-2.99s1.34-2.99 2.99-2.99 2.99 1.34 2.99 2.99-1.34 2.99-2.99 2.99z"/>
                </svg>
                <div>
                  <h3 className="text-lg font-bold text-white">Export to HubSpot</h3>
                  <p className="text-sm text-white/60">Select a contact to attach the summary</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowHubSpotModal(false);
                  setSelectedContact(null);
                  setExportSuccess(null);
                }}
                className="text-white/60 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {exportSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">Export Successful!</h4>
                  <p className="text-white/60">{exportSuccess}</p>
                </div>
              ) : (
                <>
                  {/* Search */}
                  <div className="mb-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search contacts..."
                        value={contactSearch}
                        onChange={(e) => {
                          setContactSearch(e.target.value);
                          // Debounce search
                          clearTimeout((window as unknown as { searchTimeout?: NodeJS.Timeout }).searchTimeout);
                          (window as unknown as { searchTimeout?: NodeJS.Timeout }).searchTimeout = setTimeout(() => {
                            fetchHubSpotContacts(e.target.value || undefined);
                          }, 300);
                        }}
                        className="w-full px-4 py-3 pl-10 bg-white/10 border border-white/20 rounded-ds-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FF7A59] focus:border-transparent outline-none"
                      />
                      <svg className="w-5 h-5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>

                  {/* Contacts List */}
                  <div className="space-y-2 mb-6">
                    {isLoadingContacts ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#FF7A59] border-t-transparent"></div>
                      </div>
                    ) : hubspotContacts.length === 0 ? (
                      <div className="text-center py-8 text-white/50">
                        No contacts found
                      </div>
                    ) : (
                      hubspotContacts.map((contact) => (
                        <button
                          key={contact.id}
                          onClick={() => setSelectedContact(contact)}
                          className={`w-full flex items-center gap-3 p-3 rounded-ds-lg border transition-all text-left ${
                            selectedContact?.id === contact.id
                              ? "border-[#FF7A59] bg-[#FF7A59]/10"
                              : "border-white/20 hover:border-white/30 hover:bg-white/5"
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF7A59] to-[#FF957A] flex items-center justify-center text-white font-semibold">
                            {contact.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">{contact.name}</p>
                            <p className="text-sm text-white/50 truncate">
                              {contact.email || contact.company || "No email"}
                            </p>
                          </div>
                          {selectedContact?.id === contact.id && (
                            <svg className="w-5 h-5 text-[#FF7A59]" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                            </svg>
                          )}
                        </button>
                      ))
                    )}
                  </div>

                  {/* Preview */}
                  {selectedContact && (
                    <div className="bg-white/5 border border-white/10 rounded-ds-lg p-4 mb-4">
                      <h4 className="text-sm font-semibold text-white/70 mb-2">Will create:</h4>
                      <ul className="space-y-1 text-sm text-white/60">
                        <li className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          1 Note with call summary
                        </li>
                        <li className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {nextActions.length} Tasks for follow-up
                        </li>
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            {!exportSuccess && (
              <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowHubSpotModal(false);
                    setSelectedContact(null);
                  }}
                  className="px-4 py-2 text-white/70 hover:bg-white/10 rounded-ds-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={exportToHubSpot}
                  disabled={!selectedContact || isExporting}
                  className="px-6 py-2 bg-[#FF7A59] text-white rounded-ds-lg font-medium hover:bg-[#E56B4A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isExporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Export to HubSpot
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
