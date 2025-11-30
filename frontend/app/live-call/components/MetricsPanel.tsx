"use client";

import Metric from "../../components/Metric";

interface MetricsPanelProps {
  metrics: {
    value: number;
    risk: number;
    outcome: number;
  };
  onShowTranscripts: () => void;
}

// Icons for each metric
const ValueIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const RiskIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const GoalIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);

export default function MetricsPanel({ metrics, onShowTranscripts }: MetricsPanelProps) {
  return (
    <div className="px-4 py-4 border-b border-white/10 bg-white/5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Live Metrics</h2>
        <button
          onClick={onShowTranscripts}
          className="px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 rounded-ds-md transition-colors flex items-center gap-1"
        >
          Transcript
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <div className="space-y-2.5">
        <Metric
          label="Value"
          value={`${metrics.value}%`}
          color="blue"
          fillPercentage={metrics.value}
          icon={<ValueIcon />}
        />
        <Metric
          label="Risk"
          value={`${metrics.risk}%`}
          color="amber"
          fillPercentage={metrics.risk}
          icon={<RiskIcon />}
        />
        <Metric
          label="Goals"
          value={`${metrics.outcome}%`}
          color="purple"
          fillPercentage={metrics.outcome}
          icon={<GoalIcon />}
        />
      </div>
    </div>
  );
}
