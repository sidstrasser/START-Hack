'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { useSSE } from '@/lib/hooks/useSSE';
import { useParallelAgents } from '@/lib/hooks/useParallelAgents';
import type { ProgressEvent, BriefingResult } from '@/lib/types';

// Agent configurations with personality
const AGENT_CONFIG = {
  offer: {
    name: 'Offer Analyst',
    description: 'Analyzing offer details and pricing structure',
  },
  supplier: {
    name: 'Supplier Scout',
    description: 'Researching supplier background and reputation',
  },
  market: {
    name: 'Market Analyst',
    description: 'Evaluating market conditions and alternatives',
  },
  outcome: {
    name: 'Strategy Advisor',
    description: 'Predicting outcomes and recommending tactics',
  },
  analyze: {
    name: 'Action Planner',
    description: 'Generating prioritized action items',
  },
};

type AgentKey = keyof typeof AGENT_CONFIG;

interface AgentCardProps {
  agentKey: AgentKey;
  status: 'idle' | 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  message?: string;
  isActive: boolean;
}

function AgentCard({ agentKey, status, progress, message, isActive }: AgentCardProps) {
  const config = AGENT_CONFIG[agentKey];
  
  return (
    <div className={`relative bg-white/5 backdrop-blur-xl border rounded-ds-xl p-5 transition-all duration-500 ${
      isActive ? 'border-ds-accent-2/50 shadow-lg' : 'border-white/10'
    } ${status === 'completed' ? 'opacity-80' : ''}`}>
      {/* Active glow effect */}
      {status === 'running' && (
        <div className="absolute inset-0 rounded-ds-xl bg-ds-accent-2/10 animate-pulse" />
      )}
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-ds-md flex items-center justify-center bg-white/10">
            <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">{config.name}</h3>
            <p className="text-xs text-white/50">{config.description}</p>
          </div>
          {/* Status indicator */}
          <div className="flex items-center gap-2">
            {(status === 'idle' || status === 'pending') && (
              <div className="w-3 h-3 rounded-full bg-white/20" />
            )}
            {status === 'running' && (
              <div className="w-3 h-3 rounded-full bg-ds-accent-2 animate-pulse" />
            )}
            {status === 'completed' && (
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {status === 'error' && (
              <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-ds-accent-1 to-ds-accent-2"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Message */}
        {message && status === 'running' && (
          <p className="mt-2 text-xs text-white/60 truncate">{message}</p>
        )}
      </div>
    </div>
  );
}

export default function Briefing() {
  const router = useRouter();
  const [jobId, setJobId] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<BriefingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressHistory, setProgressHistory] = useState<ProgressEvent[]>([]);

  // SSE connection for progress tracking
  const sseUrl = jobId ? `http://localhost:8000/api/progress/${jobId}` : null;
  const { data: progressEvent, error: sseError } = useSSE<ProgressEvent>(sseUrl, !!jobId);

  // Track parallel agent execution
  const { agents, overallProgress } = useParallelAgents(progressHistory);

  useEffect(() => {
    const storedJobId = sessionStorage.getItem('jobId');
    if (!storedJobId) {
      router.push('/document-upload');
      return;
    }
    setJobId(storedJobId);
  }, [router]);

  useEffect(() => {
    if (progressEvent && progressEvent.status !== 'keepalive') {
      console.log('[BRIEFING PAGE] Progress event received:', {
        agent: progressEvent.agent,
        status: progressEvent.status,
        progress: progressEvent.progress,
        message: progressEvent.message
      });

      setProgressHistory(prev => [...prev, progressEvent]);

      // Fetch briefing when complete
      if (progressEvent.status === 'completed' && progressEvent.progress === 1.0 && jobId) {
        console.log('[BRIEFING PAGE] Pipeline complete, fetching briefing...');
          fetchBriefing(jobId);
      }

      // Handle errors
      if (progressEvent.status === 'error') {
        setError(progressEvent.message || 'An error occurred during briefing generation');
      }
    }
  }, [progressEvent, jobId]);

  const fetchBriefing = async (id: string) => {
    try {
      const result = await api.getBriefing(id);
      setBriefing(result);
      if (result.vector_db_id) {
        sessionStorage.setItem('vectorDbId', result.vector_db_id);
      }
      if (result.briefing?.action_items?.items) {
        sessionStorage.setItem('actionItems', JSON.stringify(result.briefing.action_items.items));
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch briefing';
      setError(errorMessage);
    }
  };

  const handleViewActionItems = () => {
    router.push('/action-items');
  };

  const isComplete = briefing !== null;

  // Get agent status
  const getAgentStatus = (agentKey: string) => {
    const agent = agents[agentKey];
    if (!agent) return { status: 'idle' as const, progress: 0, message: '' };
    return {
      status: agent.status,
      progress: agent.progress,
      message: agent.message || '',
    };
  };

  return (
    <main className="min-h-screen bg-[#0F1A3D] relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-ds-accent-1/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-40 w-[500px] h-[500px] bg-ds-accent-2/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-72 h-72 bg-ds-accent-1/15 rounded-full blur-2xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 p-6">
        <Link href="/negotiation-input" className="inline-flex items-center gap-3 group">
          <Image
            src="/icon-logo.png"
            alt="Accordia"
            width={40}
            height={40}
            className="h-10 w-auto object-contain"
            unoptimized
          />
          <span className="text-white/60 group-hover:text-white transition-colors">← Back</span>
        </Link>
      </header>

      <div className="relative z-10 container mx-auto px-6 pb-12">
        {/* Error Alert */}
        {(error || sseError) && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-red-500/20 border border-red-500/30 rounded-ds-lg p-4 flex items-center gap-3">
              <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-300 text-sm flex-1">{error || 'Lost connection to server'}</p>
              {error && (
                <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Agent Orchestration View */}
        {!isComplete && (
          <div className="max-w-5xl mx-auto">
            {/* Title */}
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                AI Agents at Work
              </h1>
              <p className="text-white/60 text-lg">
                Our specialized agents are analyzing your negotiation
              </p>
            </div>

            {/* Overall Progress */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-ds-xl p-6 mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white font-medium">Overall Progress</span>
                <span className="text-ds-accent-2 font-semibold">{Math.round(overallProgress * 100)}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-ds-accent-1 to-ds-accent-2 transition-all duration-500"
                  style={{ width: `${overallProgress * 100}%` }}
                />
              </div>
            </div>

            {/* Agent Workflow Visualization */}
            <div className="space-y-6">
              {/* Stage 1: Offer Agent */}
              <div className="flex items-center gap-4">
                <div className="w-16 text-center">
                  <div className="w-8 h-8 mx-auto rounded-full bg-white/10 flex items-center justify-center text-white/60 text-sm font-medium">1</div>
                  <div className="w-0.5 h-6 bg-white/10 mx-auto mt-2" />
                </div>
                <div className="flex-1">
                  <AgentCard 
                    agentKey="offer"
                    {...getAgentStatus('offer')}
                    isActive={getAgentStatus('offer').status === 'running'}
                  />
                </div>
              </div>

              {/* Stage 2: Supplier Agent */}
              <div className="flex items-center gap-4">
                <div className="w-16 text-center">
                  <div className="w-8 h-8 mx-auto rounded-full bg-white/10 flex items-center justify-center text-white/60 text-sm font-medium">2</div>
                  <div className="w-0.5 h-6 bg-white/10 mx-auto mt-2" />
                </div>
                <div className="flex-1">
                  <AgentCard 
                    agentKey="supplier"
                    {...getAgentStatus('supplier')}
                    isActive={getAgentStatus('supplier').status === 'running'}
                  />
                </div>
              </div>

              {/* Stage 3: Market + Outcome (Parallel) */}
              <div className="flex items-start gap-4">
                <div className="w-16 text-center pt-5">
                  <div className="w-8 h-8 mx-auto rounded-full bg-white/10 flex items-center justify-center text-white/60 text-sm font-medium">3</div>
                  <div className="w-0.5 h-full bg-white/10 mx-auto mt-2 min-h-[120px]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-0.5 flex-1 bg-gradient-to-r from-white/20 to-transparent" />
                    <span className="text-xs text-white/40 uppercase tracking-wider px-2">Parallel Execution</span>
                    <div className="h-0.5 flex-1 bg-gradient-to-l from-white/20 to-transparent" />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <AgentCard 
                      agentKey="market"
                      {...getAgentStatus('market')}
                      isActive={getAgentStatus('market').status === 'running'}
                    />
                    <AgentCard 
                      agentKey="outcome"
                      {...getAgentStatus('outcome')}
                      isActive={getAgentStatus('outcome').status === 'running'}
                    />
                  </div>
                </div>
              </div>

              {/* Stage 4: Analyze/Action Items Agent */}
              <div className="flex items-center gap-4">
                <div className="w-16 text-center">
                  <div className="w-8 h-8 mx-auto rounded-full bg-white/10 flex items-center justify-center text-white/60 text-sm font-medium">4</div>
                </div>
                <div className="flex-1">
                  <AgentCard 
                    agentKey="analyze"
                    {...getAgentStatus('analyze')}
                    isActive={getAgentStatus('analyze').status === 'running'}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Briefing Display */}
        {isComplete && briefing && briefing.briefing && (
          <div className="max-w-4xl mx-auto">
            {/* Success Header */}
            <div className="text-center mb-12">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Briefing Ready
              </h1>
              <p className="text-white/60 text-lg">
                Your negotiation strategy has been prepared
              </p>
            </div>

            {/* Briefing Content */}
            <div className="space-y-6">
              {/* Supplier Summary */}
              {briefing.briefing.supplier_summary && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-ds-xl p-6">
                  <h2 className="text-xl font-bold text-white mb-4">Supplier Summary</h2>
                  <div className="space-y-4 text-white/80">
                    <p>{briefing.briefing.supplier_summary.company_overview.business_description}</p>
                    {briefing.briefing.supplier_summary.key_facts && (
                      <ul className="list-disc list-inside space-y-1 text-white/60">
                        {briefing.briefing.supplier_summary.key_facts.map((fact: string, idx: number) => (
                          <li key={idx}>{fact}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* Market Analysis */}
              {briefing.briefing.market_analysis && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-ds-xl p-6">
                  <h2 className="text-xl font-bold text-white mb-4">Market Analysis</h2>
                  <div className="space-y-4 text-white/80">
                    <p>{briefing.briefing.market_analysis.alternatives_overview}</p>
                    <p>{briefing.briefing.market_analysis.price_positioning}</p>
                    {briefing.briefing.market_analysis.key_risks && briefing.briefing.market_analysis.key_risks.length > 0 && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-ds-md p-4">
                        <h3 className="text-amber-400 font-medium mb-2">Key Risks</h3>
                        <ul className="list-disc list-inside space-y-1 text-amber-300/80">
                          {briefing.briefing.market_analysis.key_risks.map((risk: string, idx: number) => (
                            <li key={idx}>{risk}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Offer Analysis */}
              {briefing.briefing.offer_analysis && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-ds-xl p-6">
                  <h2 className="text-xl font-bold text-white mb-4">Offer Analysis</h2>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 bg-ds-accent-2/10 border border-ds-accent-2/20 rounded-ds-md p-4">
                      <div className="text-4xl font-bold text-ds-accent-2">{briefing.briefing.offer_analysis.completeness_score}/10</div>
                      <div>
                        <p className="text-white font-medium">Completeness Score</p>
                        <p className="text-white/60 text-sm">{briefing.briefing.offer_analysis.completeness_notes}</p>
                      </div>
                    </div>
                    <p className="text-white/80">{briefing.briefing.offer_analysis.price_assessment}</p>
                  </div>
                </div>
              )}

              {/* Outcome Assessment */}
              {briefing.briefing.outcome_assessment && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-ds-xl p-6">
                  <h2 className="text-xl font-bold text-white mb-4">Strategy & Tactics</h2>
                  <div className="space-y-4">
                    <div className={`rounded-ds-md p-4 ${briefing.briefing.outcome_assessment.target_achievable ? 'bg-green-500/10 border border-green-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${briefing.briefing.outcome_assessment.target_achievable ? 'bg-green-500/20' : 'bg-amber-500/20'}`}>
                          {briefing.briefing.outcome_assessment.target_achievable ? (
                            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className={`font-medium ${briefing.briefing.outcome_assessment.target_achievable ? 'text-green-400' : 'text-amber-400'}`}>
                            Target Price {briefing.briefing.outcome_assessment.target_achievable ? 'Achievable' : 'Challenging'}
                          </p>
                          <p className="text-white/60 text-sm">Confidence: {briefing.briefing.outcome_assessment.confidence}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-white font-medium mb-2">Recommended Tactics</h3>
                      <ol className="list-decimal list-inside space-y-1 text-white/70">
                        {briefing.briefing.outcome_assessment.recommended_tactics.map((tactic: string, idx: number) => (
                          <li key={idx}>{tactic}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Items Preview */}
              {briefing.briefing.action_items && briefing.briefing.action_items.items && briefing.briefing.action_items.items.length > 0 && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-ds-xl p-6">
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                    Action Items
                    <span className="text-sm font-normal text-white/50">({briefing.briefing.action_items.items.length} items)</span>
                  </h2>
                        <div className="space-y-2">
                    {briefing.briefing.action_items.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className={`p-3 rounded-ds-md ${item.recommended ? 'bg-ds-accent-2/10 border border-ds-accent-2/20' : 'bg-white/5'}`}>
                        <div className="flex items-center gap-2">
                          {item.recommended && (
                            <span className="text-xs bg-ds-accent-2 text-white px-2 py-0.5 rounded-full">Recommended</span>
                          )}
                          <span className="text-xs text-white/40 uppercase">{item.category}</span>
                        </div>
                        <p className="text-white/80 mt-1">{item.action}</p>
                              </div>
                            ))}
                    {briefing.briefing.action_items.items.length > 3 && (
                      <p className="text-white/40 text-sm text-center py-2">
                        +{briefing.briefing.action_items.items.length - 3} more items
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col items-center gap-4 mt-10">
              <button
                onClick={handleViewActionItems}
                className="cta-negotiate inline-flex items-center gap-3 px-10 py-5 text-lg font-semibold text-[#0F1A3D] bg-white rounded-ds-xl hover:-translate-y-1 transition-transform duration-300"
              >
                Select Action Items
                <svg className="arrow-icon w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
              <button
                onClick={() => window.print()}
                className="text-white/50 hover:text-white transition-colors text-sm"
              >
                Print Briefing
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
