'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ActionItem } from '@/lib/types';
import { ErrorAlert } from '@/components/ErrorAlert';

export default function ActionItems() {
  const router = useRouter();
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load action items from sessionStorage
    const storedActionItems = sessionStorage.getItem('actionItems');
    if (!storedActionItems) {
      setError('No action items found. Please generate a briefing first.');
      return;
    }

    try {
      const items = JSON.parse(storedActionItems);
      setActionItems(items);
    } catch (err) {
      setError('Failed to load action items');
    }
  }, []);

  const handleBackToBriefing = () => {
    router.push('/briefing');
  };

  const handleUseInLiveCall = () => {
    router.push('/live-call');
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6">
          <button
            onClick={handleBackToBriefing}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Briefing
          </button>
        </div>

        <h1 className="text-4xl font-bold mb-8 text-center text-gray-900">
          Action Items
        </h1>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

        {actionItems.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mb-6">
              <p className="text-gray-600 text-center">
                Here are the 5 most important actions to take for this negotiation
              </p>
            </div>

            <div className="space-y-4">
              {actionItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-lg border-l-4 border-red-500 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                        {item.id}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-lg text-gray-900 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex gap-4">
              <button
                onClick={handleBackToBriefing}
                className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700"
              >
                Back to Briefing
              </button>
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
                Print
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
