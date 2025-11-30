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
              {/* 1. Supplier Summary */}
              {briefing.briefing.supplier_summary && (
                <section>
                  <h2 className="text-3xl font-bold mb-4 text-gray-900 border-b-2 border-blue-600 pb-2">
                    Supplier Summary
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Company Overview</h3>
                      <p className="text-gray-700">{briefing.briefing.supplier_summary.company_overview.business_description}</p>
                      <div className="mt-2 grid md:grid-cols-3 gap-4 text-sm">
                        <div><span className="font-medium">Size:</span> {briefing.briefing.supplier_summary.company_overview.size}</div>
                        <div><span className="font-medium">Location:</span> {briefing.briefing.supplier_summary.company_overview.location}</div>
                        <div><span className="font-medium">Industry:</span> {briefing.briefing.supplier_summary.company_overview.industry}</div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Key Facts</h3>
                      <ul className="list-disc pl-6 space-y-1">
                        {briefing.briefing.supplier_summary.key_facts.map((fact: string, idx: number) => (
                          <li key={idx} className="text-gray-700">{fact}</li>
                        ))}
                      </ul>
                    </div>
                    {briefing.briefing.supplier_summary.recent_news && briefing.briefing.supplier_summary.recent_news.length > 0 && (
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">Recent News</h3>
                        <ul className="list-disc pl-6 space-y-1">
                          {briefing.briefing.supplier_summary.recent_news.map((news: string, idx: number) => (
                            <li key={idx} className="text-gray-700">{news}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {briefing.briefing.supplier_summary.contact_info && (
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">Contact</h3>
                        <p className="text-gray-700">{briefing.briefing.supplier_summary.contact_info}</p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* 2. Market Analysis */}
              {briefing.briefing.market_analysis && (
                <section>
                  <h2 className="text-3xl font-bold mb-4 text-gray-900 border-b-2 border-green-600 pb-2">
                    Market Analysis
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Market Overview</h3>
                      <p className="text-gray-700">{briefing.briefing.market_analysis.alternatives_overview}</p>
                    </div>
                    {briefing.briefing.market_analysis.alternatives_list && briefing.briefing.market_analysis.alternatives_list.length > 0 && (
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">Alternative Suppliers</h3>
                        <div className="space-y-3">
                          {briefing.briefing.market_analysis.alternatives_list.map((alt: any, idx: number) => (
                            <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                              <div className="font-semibold text-gray-900">{alt.supplier_name}</div>
                              <div className="text-sm text-gray-700 mt-1">{alt.product_description}</div>
                              <div className="mt-2 flex gap-4 text-sm">
                                <span><span className="font-medium">Price:</span> {alt.offer_price}</span>
                                <span><span className="font-medium">Model:</span> {alt.pricing_model}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Price Positioning</h3>
                      <p className="text-gray-700">{briefing.briefing.market_analysis.price_positioning}</p>
                    </div>
                    {briefing.briefing.market_analysis.key_risks && briefing.briefing.market_analysis.key_risks.length > 0 && (
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">Key Risks</h3>
                        <ul className="list-disc pl-6 space-y-1">
                          {briefing.briefing.market_analysis.key_risks.map((risk: string, idx: number) => (
                            <li key={idx} className="text-gray-700">{risk}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* 3. Offer Analysis */}
              {briefing.briefing.offer_analysis && (
                <section>
                  <h2 className="text-3xl font-bold mb-4 text-gray-900 border-b-2 border-purple-600 pb-2">
                    Offer Analysis
                  </h2>
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="text-xl font-semibold text-blue-900 mb-2">Completeness Score</h3>
                      <div className="flex items-center gap-4">
                        <span className="text-4xl font-bold text-blue-600">{briefing.briefing.offer_analysis.completeness_score}/10</span>
                        <p className="text-blue-800 flex-1">{briefing.briefing.offer_analysis.completeness_notes}</p>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Price Assessment</h3>
                      <p className="text-gray-700">{briefing.briefing.offer_analysis.price_assessment}</p>
                    </div>
                    {briefing.briefing.offer_analysis.hidden_cost_warnings && briefing.briefing.offer_analysis.hidden_cost_warnings.length > 0 && (
                      <div className="bg-amber-50 p-4 rounded-lg border-l-4 border-amber-500">
                        <h3 className="text-xl font-semibold text-amber-900 mb-2">Hidden Cost Warnings</h3>
                        <ul className="list-disc pl-6 space-y-1">
                          {briefing.briefing.offer_analysis.hidden_cost_warnings.map((warning: string, idx: number) => (
                            <li key={idx} className="text-amber-800">{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* 4. Outcome Assessment */}
              {briefing.briefing.outcome_assessment && (
                <section>
                  <h2 className="text-3xl font-bold mb-4 text-gray-900 border-b-2 border-orange-600 pb-2">
                    Outcome Assessment
                  </h2>
                  <div className="space-y-4">
                    <div className={`p-4 rounded-lg ${briefing.briefing.outcome_assessment.target_achievable ? 'bg-green-50 border-l-4 border-green-500' : 'bg-red-50 border-l-4 border-red-500'}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{briefing.briefing.outcome_assessment.target_achievable ? '✓' : '✗'}</span>
                        <div>
                          <h3 className={`text-xl font-semibold ${briefing.briefing.outcome_assessment.target_achievable ? 'text-green-900' : 'text-red-900'}`}>
                            Target Price {briefing.briefing.outcome_assessment.target_achievable ? 'Achievable' : 'Not Achievable'}
                          </h3>
                          <p className={`text-sm ${briefing.briefing.outcome_assessment.target_achievable ? 'text-green-700' : 'text-red-700'}`}>
                            Confidence: {(briefing.briefing.outcome_assessment.confidence * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Negotiation Leverage</h3>
                      <p className="text-gray-700">{briefing.briefing.outcome_assessment.negotiation_leverage}</p>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Recommended Tactics</h3>
                      <ol className="list-decimal pl-6 space-y-2">
                        {briefing.briefing.outcome_assessment.recommended_tactics.map((tactic: string, idx: number) => (
                          <li key={idx} className="text-gray-700">{tactic}</li>
                        ))}
                      </ol>
                    </div>
                    <div className="bg-indigo-50 p-4 rounded-lg border-l-4 border-indigo-500">
                      <h3 className="text-xl font-semibold text-indigo-900 mb-2">Partnership Recommendation</h3>
                      <p className="text-indigo-800">{briefing.briefing.outcome_assessment.partnership_recommendation}</p>
                    </div>
                  </div>
                </section>
              )}

              {/* 5. Action Items */}
              {briefing.briefing.action_items && briefing.briefing.action_items.length > 0 && (
                <section>
                  <h2 className="text-3xl font-bold mb-4 text-gray-900 border-b-2 border-red-600 pb-2">
                    Action Items
                  </h2>
                  <div className="space-y-4">
                    {['must_have', 'nice_to_have'].map((priority) => {
                      const items = briefing.briefing.action_items.filter((item: any) => item.priority === priority);
                      if (items.length === 0) return null;

                      return (
                        <div key={priority}>
                          <h3 className="text-xl font-semibold text-gray-800 mb-3">
                            {priority === 'must_have' ? 'Must Have' : 'Nice to Have'}
                          </h3>
                          <div className="space-y-2">
                            {items.map((item: any, idx: number) => (
                              <div key={idx} className={`p-3 rounded-lg border-l-4 ${priority === 'must_have' ? 'bg-red-50 border-red-500' : 'bg-blue-50 border-blue-500'}`}>
                                <div className="flex items-start gap-3">
                                  <span className={`px-2 py-1 text-xs font-semibold rounded ${priority === 'must_have' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                    {item.category.toUpperCase()}
                                  </span>
                                  <p className={`flex-1 ${priority === 'must_have' ? 'text-red-900' : 'text-blue-900'}`}>{item.action}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
