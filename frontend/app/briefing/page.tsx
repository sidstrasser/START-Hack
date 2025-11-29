'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useSSE } from '@/lib/hooks/useSSE';
import type { ProgressEvent, BriefingResult } from '@/lib/types';
import { ProgressBar } from '@/components/ProgressBar';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorAlert } from '@/components/ErrorAlert';

export default function Briefing() {
  const router = useRouter();
  const [jobId, setJobId] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<BriefingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressHistory, setProgressHistory] = useState<ProgressEvent[]>([]);

  // SSE connection for progress tracking
  const sseUrl = jobId ? `http://localhost:8000/api/progress/${jobId}` : null;
  const { data: progressEvent, error: sseError } = useSSE<ProgressEvent>(sseUrl, !!jobId);

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

      // Only fetch briefing when the entire pipeline is complete (progress = 1.0)
      if (progressEvent.status === 'completed' && jobId) {
        console.log('[BRIEFING PAGE] Checking if should fetch briefing:', {
          progress: progressEvent.progress,
          agent: progressEvent.agent,
          shouldFetch: progressEvent.progress === 1.0
        });

        if (progressEvent.progress === 1.0) {
          console.log('[BRIEFING PAGE] Fetching briefing...');
          fetchBriefing(jobId);
        }
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
      // Store vector_db_id for live-call page
      sessionStorage.setItem('vectorDbId', result.vector_db_id);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch briefing');
    }
  };

  const handleUseInLiveCall = () => {
    // Navigate directly to live call page
    router.push('/live-call');
  };

  if (sseError) {
    return (
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <ErrorAlert message="Lost connection to server" />
        </div>
      </main>
    );
  }

  const latestProgress = progressHistory[progressHistory.length - 1];
  const isComplete = briefing !== null;
  const currentProgress = latestProgress?.progress || 0;

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-center">
          {isComplete ? 'Briefing Ready' : 'Generating Briefing'}
        </h1>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

        {/* Progress Section */}
        {!isComplete && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <ProgressBar
              progress={currentProgress}
              label={latestProgress?.message || 'Starting...'}
            />

            <div className="mt-8 space-y-4">
              {progressHistory.map((event, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div
                    className={`mt-1 rounded-full p-1 flex-shrink-0 ${
                      event.status === 'completed'
                        ? 'bg-green-100'
                        : event.status === 'error'
                        ? 'bg-red-100'
                        : 'bg-blue-100'
                    }`}
                  >
                    {event.status === 'completed' ? (
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : event.status === 'error' ? (
                      <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <LoadingSpinner size="sm" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 capitalize">
                      {event.agent.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-gray-600">{event.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Briefing Display */}
        {isComplete && briefing && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="space-y-8">
              {/* Executive Summary */}
              {briefing.briefing.executive_summary && (
                <section>
                  <h2 className="text-3xl font-bold mb-4 text-gray-900 border-b-2 border-blue-600 pb-2">
                    Executive Summary
                  </h2>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {briefing.briefing.executive_summary}
                  </p>
                </section>
              )}

              {/* Supplier Overview */}
              {briefing.briefing.supplier_overview && (
                <section>
                  <h2 className="text-3xl font-bold mb-4 text-gray-900 border-b-2 border-blue-600 pb-2">
                    Supplier Overview
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Company</h3>
                      <p className="text-gray-700">{briefing.briefing.supplier_overview.name}</p>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Background</h3>
                      <p className="text-gray-700">{briefing.briefing.supplier_overview.background}</p>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Strengths</h3>
                      <ul className="list-disc pl-6 space-y-1">
                        {briefing.briefing.supplier_overview.strengths.map((strength: string, idx: number) => (
                          <li key={idx} className="text-gray-700">{strength}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Weaknesses & Risks</h3>
                      <ul className="list-disc pl-6 space-y-1">
                        {briefing.briefing.supplier_overview.weaknesses.map((weakness: string, idx: number) => (
                          <li key={idx} className="text-gray-700">{weakness}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>
              )}

              {/* Offer Analysis */}
              {briefing.briefing.offer_analysis && (
                <section>
                  <h2 className="text-3xl font-bold mb-4 text-gray-900 border-b-2 border-blue-600 pb-2">
                    Offer Analysis
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Total Value</h3>
                      <p className="text-gray-700 text-2xl font-bold text-blue-600">
                        {briefing.briefing.offer_analysis.total_value}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Key Items</h3>
                      <ul className="list-disc pl-6 space-y-1">
                        {briefing.briefing.offer_analysis.key_items.map((item: string, idx: number) => (
                          <li key={idx} className="text-gray-700">{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Assessment</h3>
                      <p className="text-gray-700">{briefing.briefing.offer_analysis.assessment}</p>
                    </div>
                  </div>
                </section>
              )}

              {/* Negotiation Strategy */}
              {briefing.briefing.negotiation_strategy && (
                <section>
                  <h2 className="text-3xl font-bold mb-4 text-gray-900 border-b-2 border-blue-600 pb-2">
                    Negotiation Strategy
                  </h2>
                  <div className="space-y-4">
                    <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                      <h3 className="text-xl font-semibold text-green-900 mb-2">Opening Position</h3>
                      <p className="text-green-800">{briefing.briefing.negotiation_strategy.opening_position}</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                      <h3 className="text-xl font-semibold text-blue-900 mb-2">Target Position</h3>
                      <p className="text-blue-800">{briefing.briefing.negotiation_strategy.target_position}</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
                      <h3 className="text-xl font-semibold text-red-900 mb-2">Walkaway Point</h3>
                      <p className="text-red-800">{briefing.briefing.negotiation_strategy.walkaway_point}</p>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Recommended Sequence</h3>
                      <ol className="list-decimal pl-6 space-y-2">
                        {briefing.briefing.negotiation_strategy.recommended_sequence.map((step: string, idx: number) => (
                          <li key={idx} className="text-gray-700">{step}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </section>
              )}

              {/* Key Talking Points */}
              {briefing.briefing.key_talking_points && briefing.briefing.key_talking_points.length > 0 && (
                <section>
                  <h2 className="text-3xl font-bold mb-4 text-gray-900 border-b-2 border-blue-600 pb-2">
                    Key Talking Points
                  </h2>
                  <div className="space-y-4">
                    {briefing.briefing.key_talking_points.map((tp: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{tp.point}</h3>
                        <p className="text-gray-700 mb-2"><strong>Rationale:</strong> {tp.rationale}</p>
                        <p className="text-gray-600 text-sm"><strong>Timing:</strong> {tp.timing}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Leverage Points */}
              {briefing.briefing.leverage_points && briefing.briefing.leverage_points.length > 0 && (
                <section>
                  <h2 className="text-3xl font-bold mb-4 text-gray-900 border-b-2 border-blue-600 pb-2">
                    Leverage Points
                  </h2>
                  <div className="space-y-4">
                    {briefing.briefing.leverage_points.map((lp: any, idx: number) => (
                      <div key={idx} className="bg-amber-50 p-4 rounded-lg border-l-4 border-amber-500">
                        <h3 className="text-lg font-semibold text-amber-900 mb-2">{lp.lever}</h3>
                        <p className="text-amber-800"><strong>How to use:</strong> {lp.how_to_use}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Potential Objections */}
              {briefing.briefing.potential_objections && briefing.briefing.potential_objections.length > 0 && (
                <section>
                  <h2 className="text-3xl font-bold mb-4 text-gray-900 border-b-2 border-blue-600 pb-2">
                    Potential Objections & Counters
                  </h2>
                  <div className="space-y-4">
                    {briefing.briefing.potential_objections.map((obj: any, idx: number) => (
                      <div key={idx} className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <h3 className="text-lg font-semibold text-purple-900 mb-2">
                          Objection: {obj.objection}
                        </h3>
                        <p className="text-purple-800"><strong>Counter:</strong> {obj.counter}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Risk Assessment */}
              {briefing.briefing.risk_assessment && (
                <section>
                  <h2 className="text-3xl font-bold mb-4 text-gray-900 border-b-2 border-blue-600 pb-2">
                    Risk Assessment
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Potential Risks</h3>
                      <ul className="list-disc pl-6 space-y-1">
                        {briefing.briefing.risk_assessment.risks.map((risk: string, idx: number) => (
                          <li key={idx} className="text-gray-700">{risk}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Mitigation Strategies</h3>
                      <ul className="list-disc pl-6 space-y-1">
                        {briefing.briefing.risk_assessment.mitigation.map((mit: string, idx: number) => (
                          <li key={idx} className="text-gray-700">{mit}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>
              )}

              {/* Timeline Recommendations */}
              {briefing.briefing.timeline_recommendations && (
                <section>
                  <h2 className="text-3xl font-bold mb-4 text-gray-900 border-b-2 border-blue-600 pb-2">
                    Timeline Recommendations
                  </h2>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {briefing.briefing.timeline_recommendations}
                  </p>
                </section>
              )}

              {/* Success Metrics */}
              {briefing.briefing.success_metrics && briefing.briefing.success_metrics.length > 0 && (
                <section>
                  <h2 className="text-3xl font-bold mb-4 text-gray-900 border-b-2 border-blue-600 pb-2">
                    Success Metrics
                  </h2>
                  <ul className="list-disc pl-6 space-y-2">
                    {briefing.briefing.success_metrics.map((metric: string, idx: number) => (
                      <li key={idx} className="text-gray-700">{metric}</li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <div className="mt-8 flex gap-4">
              <button
                onClick={handleUseInLiveCall}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
              >
                Use in Live Call
              </button>
              <button
                onClick={() => window.print()}
                className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
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
