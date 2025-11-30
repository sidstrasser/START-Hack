'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { BriefingResult, ActionItem } from '@/lib/types';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorAlert } from '@/components/ErrorAlert';
import StepIndicator from '@/components/StepIndicator';

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
  const [editingItem, setEditingItem] = useState<ActionItemWithId | null>(null);
  const [editText, setEditText] = useState('');

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
        
        // Check if there are already selected items in sessionStorage
        const storedSelected = sessionStorage.getItem('selectedActionItems');
        if (storedSelected) {
          try {
            const selected = JSON.parse(storedSelected);
            const selectedIds = new Set(selected.map((s: any) => s.id));
            const updated = itemsWithIds.map(item => ({
              ...item,
              selected: selectedIds.has(item.id),
            }));
            setActionItems(updated);
            setSelectedCount(updated.filter(i => i.selected).length);
          } catch (e) {
            console.error('Failed to parse stored action items:', e);
          }
        }
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

  const handleEditItem = (item: ActionItemWithId) => {
    setEditingItem(item);
    setEditText(item.action);
  };

  const handleSaveEdit = () => {
    if (editingItem && editText.trim()) {
      setActionItems(prev =>
        prev.map(item =>
          item.id === editingItem.id
            ? { ...item, action: editText.trim() }
            : item
        )
      );
      setEditingItem(null);
      setEditText('');
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditText('');
  };

  // Handle keyboard shortcuts in edit modal
  useEffect(() => {
    if (!editingItem) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingItem(null);
        setEditText('');
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (editText.trim()) {
          setActionItems(prev =>
            prev.map(item =>
              item.id === editingItem.id
                ? { ...item, action: editText.trim() }
                : item
            )
          );
          setEditingItem(null);
          setEditText('');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingItem, editText]);

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

  // Step indicator data
  const steps = [
    { id: 1, name: 'Document Upload', path: '/document-upload', completed: true, current: false },
    { id: 2, name: 'Briefing', path: '/briefing', completed: true, current: false },
    { id: 3, name: 'Action Items', path: '/action-items', completed: selectedCount > 0, current: selectedCount === 0 },
    { id: 4, name: 'Live Call', path: '/live-call', completed: false, current: false },
  ];

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
        {/* Step Indicator */}
        <StepIndicator steps={steps} />

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
            {selectedCount === 0 && (
              <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Please select at least one action item to continue
              </div>
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

                          {/* Selection Indicator and Edit Button */}
                          <div className="absolute top-4 right-4 flex items-center gap-2">
                            {/* Edit Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditItem(item);
                              }}
                              className="w-6 h-6 rounded-full bg-white hover:bg-gray-100 transition-colors shadow-sm flex items-center justify-center"
                              title="Edit action item"
                            >
                              <svg className="w-4.5 h-4.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>

                          {/* Selection Indicator */}
                          <div className={`
                              w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
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
                          </div>

                          {/* Action Text */}
                          <p className={`font-medium text-base mb-3 pr-24 ${
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

        {/* Edit Modal */}
        {editingItem && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 transition-opacity duration-200"
            onClick={handleCancelEdit}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 transform transition-all duration-200 scale-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Edit Action Item</h3>
                <p className="text-sm text-gray-600">
                  Category: <span className="font-semibold">{categoryLabels[editingItem.category]}</span>
                </p>
              </div>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Enter action item text..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSaveEdit();
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-2">
                Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Cmd/Ctrl + Enter</kbd> to save, <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Esc</kbd> to cancel
              </p>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editText.trim()}
                  className={`
                    flex-1 px-4 py-2 rounded-lg font-semibold text-white transition-colors
                    ${editText.trim()
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-300 cursor-not-allowed'
                    }
                  `}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

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

