'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { useSSE } from '@/lib/hooks/useSSE';
import { useParallelAgents } from '@/lib/hooks/useParallelAgents';
import type { ProgressEvent, BriefingResult } from '@/lib/types';
import AgentOrchestration from './components/AgentOrchestration';
import BriefingDisplay from './components/BriefingDisplay';

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
      console.log('[BriefingPage] Fetching briefing for job:', id);
      const result = await api.getBriefing(id);
      console.log('[BriefingPage] Briefing result:', result);
      console.log('[BriefingPage] result.briefing:', result.briefing);
      console.log('[BriefingPage] result.briefing?.action_items:', result.briefing?.action_items);
      console.log('[BriefingPage] Is action_items an array?', Array.isArray(result.briefing?.action_items));
      
      setBriefing(result);
      if (result.vector_db_id) {
        sessionStorage.setItem('vectorDbId', result.vector_db_id);
      }
      // Handle both array and object with items property
      const actionItems = Array.isArray(result.briefing?.action_items) 
        ? result.briefing.action_items 
        : result.briefing?.action_items?.items;
      
      console.log('[BriefingPage] Extracted actionItems:', actionItems);
      
      if (actionItems) {
        console.log('[BriefingPage] Storing actionItems to sessionStorage, count:', actionItems.length);
        sessionStorage.setItem('actionItems', JSON.stringify(actionItems));
      } else {
        console.log('[BriefingPage] No action items found to store!');
      }
    } catch (err: unknown) {
      console.error('[BriefingPage] Error fetching briefing:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch briefing';
      setError(errorMessage);
    }
  };

  const handleViewActionItems = () => {
    router.push('/action-items');
  };

  const isComplete = briefing !== null && briefing.briefing !== null;

  // Get agent status helper
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
          <AgentOrchestration 
            overallProgress={overallProgress}
            getAgentStatus={getAgentStatus}
          />
        )}

        {/* Briefing Display */}
        {isComplete && briefing && briefing.briefing && (
          <BriefingDisplay 
            briefing={briefing.briefing}
            onSelectActionItems={handleViewActionItems}
          />
        )}
      </div>
    </main>
  );
}
