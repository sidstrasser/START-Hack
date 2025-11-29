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
      setProgressHistory(prev => [...prev, progressEvent]);

      // When completed, fetch final briefing
      if (progressEvent.status === 'completed' && jobId) {
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
      sessionStorage.setItem('vectorDbId', result.vector_db_id);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch briefing');
    }
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
            <div className="prose max-w-none">
              {Object.entries(briefing.briefing).map(([key, value]) => (
                <div key={key} className="mb-6">
                  <h2 className="text-2xl font-bold capitalize mb-3 text-gray-900">
                    {key.replace(/_/g, ' ')}
                  </h2>
                  <div className="text-gray-700">
                    {typeof value === 'string' ? (
                      <p className="whitespace-pre-wrap">{value}</p>
                    ) : Array.isArray(value) ? (
                      <ul className="list-disc pl-5 space-y-2">
                        {value.map((item, idx) => (
                          <li key={idx}>
                            {typeof item === 'string' ? item : JSON.stringify(item, null, 2)}
                          </li>
                        ))}
                      </ul>
                    ) : typeof value === 'object' ? (
                      <pre className="bg-gray-50 p-4 rounded overflow-x-auto text-sm">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    ) : (
                      <p>{String(value)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex gap-4">
              <button
                onClick={() => router.push('/live-call')}
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
