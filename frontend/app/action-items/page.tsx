'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { BriefingResult, ActionItem } from '@/lib/types';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorAlert } from '@/components/ErrorAlert';

interface ActionItemWithId extends ActionItem {
  id: number;
  selected: boolean;
}

// Consistent colors for all items
const itemColors = {
  bg: 'bg-blue-50',
  border: 'border-blue-300',
  text: 'text-blue-800',
  headerBg: 'bg-blue-100',
  selectedBg: 'bg-blue-100',
  selectedBorder: 'border-blue-500',
};

const categoryLabels: Record<string, string> = {
  price: 'Price & Cost',
  terms: 'Terms & Conditions',
  timeline: 'Timeline & Delivery',
  scope: 'Scope & Features',
};

const categoryIcons: Record<string, string> = {
  price: '💰',
  terms: '📋',
  timeline: '⏰',
  scope: '🎯',
};

export default function ActionItems() {
  const router = useRouter();
  const [jobId, setJobId] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<BriefingResult | null>(null);
  const [actionItems, setActionItems] = useState<ActionItemWithId[]>([]);
  const [selectedCount, setSelectedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedJobId = sessionStorage.getItem('jobId');
    if (!storedJobId) {
      router.push('/document-upload');
      return;
    }
    setJobId(storedJobId);
    fetchBriefing(storedJobId);
  }, [router]);

  const fetchBriefing = async (id: string) => {
    try {
      setLoading(true);
      const result = await api.getBriefing(id);
      setBriefing(result);
      
      if (result.briefing?.action_items) {
        const itemsWithIds: ActionItemWithId[] = result.briefing.action_items.map(
          (item, index) => ({
            ...item,
            id: index + 1,
            selected: false,
          })
        );
        setActionItems(itemsWithIds);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch briefing');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: number) => {
    setActionItems(prev => {
      const item = prev.find(i => i.id === id);
      if (!item) return prev;

      // If trying to select and already have 5 selected, don't allow
      if (!item.selected && selectedCount >= 5) {
        return prev;
      }

      // Toggle selection
      const updated = prev.map(i =>
        i.id === id ? { ...i, selected: !i.selected } : i
      );

      // Update selected count
      const newCount = updated.filter(i => i.selected).length;
      setSelectedCount(newCount);

      return updated;
    });
  };

  const handleContinue = () => {
    const selectedItems = actionItems
      .filter(item => item.selected)
      .map(item => ({
        id: item.id,
        text: item.action,
        completed: false,
        recommended: item.recommended || false,
      }));

    // Store selected action items for live-call page
    sessionStorage.setItem('selectedActionItems', JSON.stringify(selectedItems));
    
    // Navigate to live-call page
    router.push('/live-call');
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <LoadingSpinner />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <ErrorAlert message={error} />
        </div>
      </main>
    );
  }

  if (!briefing || actionItems.length === 0) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <ErrorAlert message="No action items found in briefing" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-gray-900">
            Select Action Items
          </h1>
          <p className="text-lg text-gray-600">
            Choose up to 5 action items to track during your negotiation call
          </p>
          <div className="mt-4 flex items-center gap-4">
            <div className={`px-4 py-2 rounded-lg font-semibold ${
              selectedCount === 5 
                ? 'bg-green-100 text-green-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {selectedCount} / 5 selected
            </div>
            {selectedCount === 5 && (
              <span className="text-sm text-gray-600">
                ✓ Maximum items selected
              </span>
            )}
          </div>
        </div>

        {/* Action Items by Category */}
        <div className="space-y-8 mb-8">
          {['price', 'terms', 'timeline', 'scope'].map((category) => {
            const categoryItems = actionItems.filter(item => item.category === category);
            if (categoryItems.length === 0) return null;

            return (
              <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Category Header */}
                <div className={`${itemColors.headerBg} ${itemColors.border} border-b-2 px-6 py-4`}>
                  <h2 className={`text-2xl font-bold ${itemColors.text} flex items-center gap-3`}>
                    <span className="text-3xl">{categoryIcons[category]}</span>
                    {categoryLabels[category]}
                    <span className="text-base font-normal text-gray-600 ml-2">
                      ({categoryItems.length} {categoryItems.length === 1 ? 'item' : 'items'})
                    </span>
                  </h2>
                </div>

                {/* Category Items Grid */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categoryItems.map((item) => {
                      const isDisabled = !item.selected && selectedCount >= 5;
                      const isRecommended = item.recommended || false;

                      return (
                        <div
                          key={item.id}
                          onClick={() => !isDisabled && toggleSelection(item.id)}
                          className={`
                            relative p-5 rounded-lg border-2 cursor-pointer transition-all duration-200
                            ${item.selected 
                              ? `${itemColors.selectedBorder} ${itemColors.selectedBg} shadow-md scale-[1.01]` 
                              : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:shadow-sm'
                            }
                            ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                          `}
                        >
                          {/* Recommended Badge */}
                          {isRecommended && (
                            <div className="absolute top-2 left-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-600 text-white">
                                Recommended
                              </span>
                            </div>
                          )}

                          {/* Selection Indicator */}
                          <div className={`
                            absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                            ${item.selected 
                              ? 'bg-blue-600 border-blue-600 shadow-sm' 
                              : 'border-gray-300 bg-white'
                            }
                          `}>
                            {item.selected && (
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>

                          {/* Action Text */}
                          <p className={`font-medium text-base mb-3 pr-10 ${
                            item.selected ? itemColors.text : 'text-gray-900'
                          } ${isRecommended ? 'mt-6' : ''}`}>
                            {item.action}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Continue Button */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => router.push('/briefing')}
            className="px-6 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors"
          >
            Back to Briefing
          </button>
          <button
            onClick={handleContinue}
            disabled={selectedCount === 0}
            className={`
              px-8 py-3 rounded-lg font-semibold text-white transition-all
              ${selectedCount === 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105'
              }
            `}
          >
            Continue to Live Call {selectedCount > 0 && `(${selectedCount} selected)`}
          </button>
        </div>

        {/* Help Text */}
        {selectedCount === 0 && (
          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm">
              Select at least one action item to continue
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

