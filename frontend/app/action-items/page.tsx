'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import type { BriefingResult, ActionItem } from '@/lib/types';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface ActionItemWithId extends ActionItem {
  id: number;
  selected: boolean;
}

const categoryLabels: Record<string, string> = {
  price: 'Price & Cost',
  terms: 'Terms & Conditions',
  timeline: 'Timeline & Delivery',
  scope: 'Scope & Features',
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
    console.log('[ActionItemsPage] useEffect triggered');
    const storedJobId = sessionStorage.getItem('jobId');
    console.log('[ActionItemsPage] storedJobId:', storedJobId);
    
    if (!storedJobId) {
      console.log('[ActionItemsPage] No jobId, redirecting to document-upload');
      router.push('/document-upload');
      return;
    }
    setJobId(storedJobId);
    
    // First try to load from sessionStorage (faster)
    const storedActionItems = sessionStorage.getItem('actionItems');
    console.log('[ActionItemsPage] storedActionItems from sessionStorage:', storedActionItems);
    
    if (storedActionItems) {
      try {
        const items: ActionItem[] = JSON.parse(storedActionItems);
        console.log('[ActionItemsPage] Parsed items from sessionStorage:', items);
        console.log('[ActionItemsPage] Items count:', items.length);
        loadActionItems(items);
        setLoading(false);
        return;
      } catch (e) {
        console.error('[ActionItemsPage] Failed to parse stored action items:', e);
      }
    }
    
    // Fallback to API
    console.log('[ActionItemsPage] No items in sessionStorage, fetching from API...');
    fetchBriefing(storedJobId);
  }, [router]);

  const loadActionItems = (items: ActionItem[]) => {
    console.log('[ActionItemsPage] loadActionItems called with:', items);
    const itemsWithIds: ActionItemWithId[] = items.map((item, index) => ({
      ...item,
      id: index + 1,
      selected: false,
    }));
    console.log('[ActionItemsPage] Items with IDs:', itemsWithIds);
    setActionItems(itemsWithIds);
    
    // Check if there are already selected items
    const storedSelected = sessionStorage.getItem('selectedActionItems');
    console.log('[ActionItemsPage] storedSelected:', storedSelected);
    if (storedSelected) {
      try {
        const selected = JSON.parse(storedSelected);
        const selectedIds = new Set(selected.map((s: { id: number }) => s.id));
        const updated = itemsWithIds.map(item => ({
          ...item,
          selected: selectedIds.has(item.id),
        }));
        setActionItems(updated);
        setSelectedCount(updated.filter(i => i.selected).length);
        console.log('[ActionItemsPage] Updated with selections:', updated);
      } catch (e) {
        console.error('[ActionItemsPage] Failed to parse selected action items:', e);
      }
    }
  };

  const fetchBriefing = async (id: string) => {
    try {
      setLoading(true);
      console.log('[ActionItemsPage] Fetching briefing for job:', id);
      const result = await api.getBriefing(id);
      console.log('[ActionItemsPage] Briefing result:', result);
      console.log('[ActionItemsPage] result.briefing:', result.briefing);
      console.log('[ActionItemsPage] result.briefing?.action_items:', result.briefing?.action_items);
      console.log('[ActionItemsPage] Is action_items an array?', Array.isArray(result.briefing?.action_items));
      
      setBriefing(result);
      
      // Handle both array and object with items property
      const actionItems = Array.isArray(result.briefing?.action_items) 
        ? result.briefing.action_items 
        : result.briefing?.action_items?.items;
      
      console.log('[ActionItemsPage] Extracted actionItems:', actionItems);
      
      if (actionItems && actionItems.length > 0) {
        // Store for next time
        console.log('[ActionItemsPage] Storing and loading action items, count:', actionItems.length);
        sessionStorage.setItem('actionItems', JSON.stringify(actionItems));
        loadActionItems(actionItems);
      } else {
        console.log('[ActionItemsPage] No action items found!');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch briefing';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: number) => {
    setActionItems(prev => {
      const item = prev.find(i => i.id === id);
      if (!item) return prev;

      if (!item.selected && selectedCount >= 5) {
        return prev;
      }

      const updated = prev.map(i =>
        i.id === id ? { ...i, selected: !i.selected } : i
      );

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

  useEffect(() => {
    if (!editingItem) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancelEdit();
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSaveEdit();
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

    sessionStorage.setItem('selectedActionItems', JSON.stringify(selectedItems));
    router.push('/live-call');
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0F1A3D] flex items-center justify-center">
          <LoadingSpinner />
      </main>
    );
  }

  if (error || actionItems.length === 0) {
    return (
      <main className="min-h-screen bg-[#0F1A3D] relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-ds-accent-1/20 rounded-full blur-3xl" />
        </div>
        <header className="relative z-10 p-6">
          <Link href="/briefing" className="inline-flex items-center gap-3 group">
            <Image src="/icon-logo.png" alt="Accordia" width={40} height={40} className="h-10 w-auto object-contain" unoptimized />
            <span className="text-white/60 group-hover:text-white transition-colors">← Back to Briefing</span>
          </Link>
        </header>
        <div className="relative z-10 container mx-auto px-6 py-12">
          <div className="max-w-md mx-auto text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">No Action Items Found</h1>
            <p className="text-white/60 mb-6">{error || 'Please generate a briefing first.'}</p>
            <Link href="/briefing" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#0F1A3D] rounded-ds-lg font-medium hover:-translate-y-0.5 transition-transform">
              Go to Briefing
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Group items by category
  const groupedItems = actionItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ActionItemWithId[]>);

  return (
    <main className="min-h-screen bg-[#0F1A3D] relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-ds-accent-1/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-40 w-[500px] h-[500px] bg-ds-accent-2/10 rounded-full blur-3xl" />
      </div>

        {/* Header */}
      <header className="relative z-10 p-6">
        <Link href="/briefing" className="inline-flex items-center gap-3 group">
          <Image src="/icon-logo.png" alt="Accordia" width={40} height={40} className="h-10 w-auto object-contain" unoptimized />
          <span className="text-white/60 group-hover:text-white transition-colors">← Back to Briefing</span>
        </Link>
      </header>

      <div className="relative z-10 container mx-auto px-6 pb-12">
        {/* Title Section */}
        <div className="max-w-4xl mx-auto mb-10">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            Select Action Items
          </h1>
            <p className="text-white/60 text-lg">
              Choose up to 5 items to track during your negotiation
          </p>
          </div>

          {/* Selection Counter */}
          <div className="flex items-center justify-center gap-4">
            <div className={`px-5 py-2.5 rounded-full font-semibold text-sm ${
              selectedCount === 5 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-white/10 text-white border border-white/20'
            }`}>
              {selectedCount} / 5 selected
            </div>
            {selectedCount === 0 && (
              <span className="text-amber-400/80 text-sm">
                Select at least one item to continue
              </span>
            )}
          </div>
        </div>

        {/* Action Items */}
        <div className="max-w-4xl mx-auto space-y-6 mb-10">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-ds-xl overflow-hidden">
                {/* Category Header */}
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="font-semibold text-white">{categoryLabels[category]}</h2>
                <span className="text-white/40 text-sm">{items.length} items</span>
                </div>

              {/* Items */}
              <div className="p-4 space-y-3">
                {items.map((item) => {
                      const isDisabled = !item.selected && selectedCount >= 5;

                      return (
                        <div
                          key={item.id}
                          onClick={() => !isDisabled && toggleSelection(item.id)}
                          className={`
                        relative p-4 rounded-ds-lg border transition-all cursor-pointer
                            ${item.selected 
                          ? 'bg-ds-accent-2/10 border-ds-accent-2/50' 
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                            }
                        ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}
                          `}
                        >
                      <div className="flex items-start gap-4">
                        {/* Checkbox */}
                          <div className={`
                          w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all
                            ${item.selected 
                            ? 'bg-ds-accent-2 border-ds-accent-2' 
                            : 'border-white/30'
                            }
                          `}>
                            {item.selected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {item.recommended && (
                              <span className="text-xs bg-ds-accent-2/20 text-ds-accent-2 px-2 py-0.5 rounded-full font-medium">
                                Recommended
                              </span>
                            )}
                          </div>
                          <p className={`text-sm leading-relaxed ${item.selected ? 'text-white' : 'text-white/80'}`}>
                            {item.action}
                          </p>
                        </div>

                        {/* Edit Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditItem(item);
                          }}
                          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center shrink-0"
                          title="Edit"
                        >
                          <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                </div>
              </div>
            );
          })}
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={handleContinue}
            disabled={selectedCount === 0}
            className="cta-negotiate inline-flex items-center gap-3 px-10 py-5 text-lg font-semibold text-[#0F1A3D] bg-white rounded-ds-xl disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1 transition-transform duration-300"
          >
            Continue to Live Call
            <svg className="arrow-icon w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
          <button
            onClick={() => router.push('/briefing')}
            className="text-white/50 hover:text-white transition-colors text-sm"
          >
            Back to Briefing
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={handleCancelEdit}
        >
          <div
            className="bg-[#1a2a4a] border border-white/20 rounded-ds-xl shadow-2xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <h3 className="text-xl font-bold text-white mb-1">Edit Action Item</h3>
              <p className="text-sm text-white/50">
                {categoryLabels[editingItem.category]}
              </p>
        </div>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full h-32 p-4 bg-white/5 border border-white/20 rounded-ds-md text-white placeholder-white/30 focus:outline-none focus:border-ds-accent-2 resize-none"
              placeholder="Enter action item text..."
              autoFocus
            />
            <p className="text-xs text-white/40 mt-2">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">Cmd/Ctrl + Enter</kbd> to save, <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">Esc</kbd> to cancel
            </p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleCancelEdit}
                className="flex-1 px-4 py-2.5 border border-white/20 rounded-ds-md font-medium text-white/70 hover:text-white hover:border-white/40 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editText.trim()}
                className="flex-1 px-4 py-2.5 bg-ds-accent-2 rounded-ds-md font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-ds-accent-2/90 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
          </div>
        )}
    </main>
  );
}
