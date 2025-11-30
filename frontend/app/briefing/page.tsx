'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useSSE } from '@/lib/hooks/useSSE';
import { useParallelAgents } from '@/lib/hooks/useParallelAgents';
import type { ProgressEvent, BriefingResult } from '@/lib/types';
import { ErrorAlert } from '@/components/ErrorAlert';
import AgentProgressCard from '@/components/AgentProgressCard';

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
  const { agents, agentsArray, overallProgress, allComplete } = useParallelAgents(progressHistory);

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
        agentProgress: progressEvent.agentProgress,
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
      // Store vector_db_id for live-call page
      if (result.vector_db_id) {
        sessionStorage.setItem('vectorDbId', result.vector_db_id);
      }
      // Store action items for action-items page
      if (result.briefing?.action_items) {
        sessionStorage.setItem('actionItems', JSON.stringify(result.briefing.action_items));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch briefing');
    }
  };

  const handleViewActionItems = () => {
    router.push('/action-items');
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

  const isComplete = briefing !== null;

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-4xl font-bold mb-8 text-center">
          {isComplete ? 'Briefing Ready' : 'Generating Briefing'}
        </h1>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

        {/* Parallel Agent Progress */}
        {!isComplete && (
          <div className="space-y-6">
            {/* Overall Progress Bar */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold">Overall Progress</h2>
                <span className="text-sm text-gray-600">{Math.round(overallProgress * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${overallProgress * 100}%` }}
                />
              </div>
            </div>

            {/* Agent Progress Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agentsArray.map(agent => (
                <AgentProgressCard
                  key={agent.name}
                  name={agent.name}
                  status={agent.status}
                  message={agent.message}
                  detail={agent.detail}
                  progress={agent.progress}
                />
              ))}
            </div>
          </div>
        )}

        {/* Briefing Display */}
        {isComplete && briefing && briefing.briefing && (
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
                      <p className="text-gray-700">{briefing.briefing.supplier_summary.company_overview.description}</p>
                      {(briefing.briefing.supplier_summary.company_overview.size ||
                        briefing.briefing.supplier_summary.company_overview.location ||
                        briefing.briefing.supplier_summary.company_overview.industry) && (
                        <div className="mt-2 grid md:grid-cols-3 gap-4 text-sm">
                          {briefing.briefing.supplier_summary.company_overview.size && (
                            <div><span className="font-medium">Size:</span> {briefing.briefing.supplier_summary.company_overview.size}</div>
                          )}
                          {briefing.briefing.supplier_summary.company_overview.location && (
                            <div><span className="font-medium">Location:</span> {briefing.briefing.supplier_summary.company_overview.location}</div>
                          )}
                          {briefing.briefing.supplier_summary.company_overview.industry && (
                            <div><span className="font-medium">Industry:</span> {briefing.briefing.supplier_summary.company_overview.industry}</div>
                          )}
                        </div>
                      )}
                    </div>
                    {briefing.briefing.supplier_summary.key_facts && briefing.briefing.supplier_summary.key_facts.length > 0 && (
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">Key Facts</h3>
                        <ul className="list-disc pl-6 space-y-1">
                          {briefing.briefing.supplier_summary.key_facts.map((fact: string, idx: number) => (
                            <li key={idx} className="text-gray-700">{fact}</li>
                          ))}
                        </ul>
                      </div>
                    )}
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
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Alternatives Overview</h3>
                      <p className="text-gray-700">{briefing.briefing.market_analysis.alternatives_overview}</p>
                    </div>
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
                            Confidence: {briefing.briefing.outcome_assessment.confidence}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Negotiation Leverage</h3>
                      <ul className="list-disc pl-6 space-y-1">
                        {(Array.isArray(briefing.briefing.outcome_assessment.negotiation_leverage)
                          ? briefing.briefing.outcome_assessment.negotiation_leverage
                          : [briefing.briefing.outcome_assessment.negotiation_leverage]
                        ).map((item: string, idx: number) => (
                          <li key={idx} className="text-gray-700">{item}</li>
                        ))}
                      </ul>
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
                  <div className="space-y-6">
                    {/* Recommended Items */}
                    {briefing.briefing.action_items.filter((item: any) => item.recommended).length > 0 && (
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-3">
                          Recommended
                        </h3>
                        <div className="space-y-2">
                          {briefing.briefing.action_items
                            .filter((item: any) => item.recommended)
                            .map((item: any, idx: number) => (
                              <div key={idx} className="p-4 rounded-lg border-l-4 bg-blue-50 border-blue-500 shadow-sm">
                                <div className="flex items-start gap-3">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-600 text-white">
                                    Recommended
                                  </span>
                                  <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                                    {item.category.toUpperCase()}
                                  </span>
                                  <p className="flex-1 text-blue-900 font-medium">{item.action}</p>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Other Items */}
                    {briefing.briefing.action_items.filter((item: any) => !item.recommended).length > 0 && (
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-3">
                          Additional Items
                        </h3>
                        <div className="space-y-2">
                          {briefing.briefing.action_items
                            .filter((item: any) => !item.recommended)
                            .map((item: any, idx: number) => (
                              <div key={idx} className="p-3 rounded-lg border-l-4 bg-blue-50 border-blue-500">
                                <div className="flex items-start gap-3">
                                  <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                                    {item.category.toUpperCase()}
                                  </span>
                                  <p className="flex-1 text-blue-900">{item.action}</p>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex gap-4 border-t pt-6">
              <button
                onClick={handleViewActionItems}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
              >
                Select Action Items
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
