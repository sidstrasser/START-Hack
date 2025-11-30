'use client';

import type { BriefingData } from '@/lib/types';

interface BriefingDisplayProps {
  briefing: BriefingData;
  onSelectActionItems: () => void;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-ds-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/10">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="text-white/50 text-sm min-w-[120px]">{label}</span>
      <span className="text-white/90 text-sm flex-1">{value}</span>
    </div>
  );
}

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'accent' }) {
  const variants = {
    default: 'bg-white/10 text-white/70',
    success: 'bg-green-500/20 text-green-400',
    warning: 'bg-amber-500/20 text-amber-400',
    accent: 'bg-ds-accent-2/20 text-ds-accent-2',
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}

export default function BriefingDisplay({ briefing, onSelectActionItems }: BriefingDisplayProps) {
  return (
    <div className="max-w-5xl mx-auto">
      {/* Success Header */}
      <div className="text-center mb-12">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
          Briefing Ready
        </h1>
        <p className="text-white/60 text-lg">
          Your negotiation strategy has been prepared
        </p>
      </div>

      {/* Main Grid Layout */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Supplier Summary */}
        {briefing.supplier_summary && (
          <SectionCard title="Supplier Summary">
            <div className="space-y-4">
              <p className="text-white/80 leading-relaxed">
                {briefing.supplier_summary.company_overview.business_description}
              </p>
              
              <div className="grid grid-cols-2 gap-3 pt-2">
                {briefing.supplier_summary.company_overview.size && (
                  <div className="bg-white/5 rounded-ds-md p-3">
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Size</p>
                    <p className="text-white/90 text-sm">{briefing.supplier_summary.company_overview.size}</p>
                  </div>
                )}
                {briefing.supplier_summary.company_overview.industry && (
                  <div className="bg-white/5 rounded-ds-md p-3">
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Industry</p>
                    <p className="text-white/90 text-sm">{briefing.supplier_summary.company_overview.industry}</p>
                  </div>
                )}
                {briefing.supplier_summary.company_overview.location && (
                  <div className="bg-white/5 rounded-ds-md p-3 col-span-2">
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Location</p>
                    <p className="text-white/90 text-sm">{briefing.supplier_summary.company_overview.location}</p>
                  </div>
                )}
              </div>

              {briefing.supplier_summary.key_facts && briefing.supplier_summary.key_facts.length > 0 && (
                <div className="pt-2">
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Key Facts</p>
                  <ul className="space-y-2">
                    {briefing.supplier_summary.key_facts.map((fact, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-white/70 text-sm">
                        <span className="text-ds-accent-2 mt-1">•</span>
                        {fact}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Market Analysis */}
        {briefing.market_analysis && (
          <SectionCard title="Market Analysis">
            <div className="space-y-4">
              <p className="text-white/80 leading-relaxed">
                {briefing.market_analysis.alternatives_overview}
              </p>
              
              <div className="bg-white/5 rounded-ds-md p-4">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Price Positioning</p>
                <p className="text-white/90 text-sm">{briefing.market_analysis.price_positioning}</p>
              </div>

              {briefing.market_analysis.key_risks && briefing.market_analysis.key_risks.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-ds-md p-4">
                  <p className="text-amber-400 text-xs uppercase tracking-wider mb-2 font-medium">Key Risks</p>
                  <ul className="space-y-2">
                    {briefing.market_analysis.key_risks.map((risk, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-amber-300/80 text-sm">
                        <svg className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </SectionCard>
        )}
      </div>

      {/* Full Width Sections */}
      <div className="space-y-6 mb-8">
        {/* Offer Analysis */}
        {briefing.offer_analysis && (
          <SectionCard title="Offer Analysis">
            <div className="space-y-4">
              {/* Score - Compact */}
              <div className="flex items-center gap-4 bg-gradient-to-r from-ds-accent-1/10 to-ds-accent-2/10 border border-ds-accent-2/20 rounded-ds-md px-4 py-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">{briefing.offer_analysis.completeness_score}</span>
                  <span className="text-white/40 text-sm">/10</span>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <p className="text-white/70 text-sm flex-1">{briefing.offer_analysis.completeness_notes}</p>
              </div>
              
              {/* Price Assessment */}
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Price Assessment</p>
                <p className="text-white/80 text-sm leading-relaxed">{briefing.offer_analysis.price_assessment}</p>
              </div>
                
              {briefing.offer_analysis.hidden_cost_warnings && briefing.offer_analysis.hidden_cost_warnings.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-ds-md p-3">
                  <p className="text-amber-400 text-xs font-medium mb-1">Hidden Cost Warnings</p>
                  <ul className="space-y-1">
                    {briefing.offer_analysis.hidden_cost_warnings.map((warning, idx) => (
                      <li key={idx} className="text-amber-300/80 text-sm">• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Strategy & Tactics */}
        {briefing.outcome_assessment && (
          <SectionCard title="Strategy & Tactics">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Target Assessment */}
              <div>
                <div className={`rounded-ds-lg p-5 mb-4 ${
                  briefing.outcome_assessment.target_achievable 
                    ? 'bg-green-500/10 border border-green-500/20' 
                    : 'bg-amber-500/10 border border-amber-500/20'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      briefing.outcome_assessment.target_achievable ? 'bg-green-500/20' : 'bg-amber-500/20'
                    }`}>
                      {briefing.outcome_assessment.target_achievable ? (
                        <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className={`font-semibold ${
                        briefing.outcome_assessment.target_achievable ? 'text-green-400' : 'text-amber-400'
                      }`}>
                        Target Price {briefing.outcome_assessment.target_achievable ? 'Achievable' : 'Challenging'}
                      </p>
                      <p className="text-white/50 text-sm">Confidence: {briefing.outcome_assessment.confidence}</p>
                    </div>
                  </div>
                </div>

                {briefing.outcome_assessment.negotiation_leverage && (
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Negotiation Leverage</p>
                    <ul className="space-y-2">
                      {briefing.outcome_assessment.negotiation_leverage.map((leverage, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-white/70 text-sm">
                          <span className="text-ds-accent-2 mt-1">•</span>
                          {leverage}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Tactics */}
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Recommended Tactics</p>
                <ol className="space-y-3">
                  {briefing.outcome_assessment.recommended_tactics.map((tactic, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-ds-accent-2/20 text-ds-accent-2 text-xs flex items-center justify-center shrink-0 font-medium">
                        {idx + 1}
                      </span>
                      <span className="text-white/80 text-sm pt-0.5">{tactic}</span>
                    </li>
                  ))}
                </ol>

                {briefing.outcome_assessment.partnership_recommendation && (
                  <div className="mt-4 bg-ds-accent-2/10 border border-ds-accent-2/20 rounded-ds-md p-4">
                    <p className="text-ds-accent-2 text-xs font-medium mb-1">Partnership Recommendation</p>
                    <p className="text-white/80 text-sm">{briefing.outcome_assessment.partnership_recommendation}</p>
                  </div>
                )}
              </div>
            </div>
          </SectionCard>
        )}

        {/* Action Items Preview */}
        {(() => {
          // Handle both array and object with items property
          console.log('[BriefingDisplay] briefing.action_items:', briefing.action_items);
          console.log('[BriefingDisplay] Is array?', Array.isArray(briefing.action_items));
          
          const items = Array.isArray(briefing.action_items) 
            ? briefing.action_items 
            : briefing.action_items?.items;
          
          console.log('[BriefingDisplay] Extracted items:', items);
          
          if (!items || items.length === 0) {
            console.log('[BriefingDisplay] No items to display');
            return null;
          }
          
          console.log('[BriefingDisplay] Displaying', items.length, 'items');
          
          return (
            <SectionCard title={`Action Items (${items.length})`}>
              <div className="space-y-3">
                {items.slice(0, 4).map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`flex items-start gap-4 p-4 rounded-ds-md transition-colors ${
                      item.recommended 
                        ? 'bg-ds-accent-2/10 border border-ds-accent-2/20' 
                        : 'bg-white/5 border border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 shrink-0">
                      {item.recommended && (
                        <Badge variant="accent">Recommended</Badge>
                      )}
                      <Badge>{item.category}</Badge>
                    </div>
                    <p className="text-white/80 text-sm flex-1">{item.action}</p>
                  </div>
                ))}
              
                {items.length > 4 && (
                  <p className="text-white/40 text-sm text-center py-2">
                    +{items.length - 4} more items
                  </p>
                )}
              </div>
            </SectionCard>
          );
        })()}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={onSelectActionItems}
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
  );
}

