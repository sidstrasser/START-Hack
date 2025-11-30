"use client";

import MetricsChart from "./MetricsChart";

interface MetricsDataPoint {
  timestamp: number;
  elapsedSeconds: number;
  value: number;
  risk: number;
  outcome: number;
}

interface PerformanceChartsCardProps {
  metricsHistory: MetricsDataPoint[];
  finalMetrics: { value: number; risk: number; outcome: number };
}

export default function PerformanceChartsCard({ metricsHistory, finalMetrics }: PerformanceChartsCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Performance Over Time</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
          <MetricsChart 
            data={metricsHistory} 
            dataKey="value" 
            color="#f59e0b" 
            label="Value"
          />
        </div>
        <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-4 border border-red-100">
          <MetricsChart 
            data={metricsHistory} 
            dataKey="risk" 
            color="#ef4444" 
            label="Risk"
          />
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
          <MetricsChart 
            data={metricsHistory} 
            dataKey="outcome" 
            color="#10b981" 
            label="Goals"
          />
        </div>
      </div>
      
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold text-amber-500">{finalMetrics.value}%</p>
            <p className="text-sm text-gray-500">Final Value</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-red-500">{finalMetrics.risk}%</p>
            <p className="text-sm text-gray-500">Final Risk</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-emerald-500">{finalMetrics.outcome}%</p>
            <p className="text-sm text-gray-500">Goal Achievement</p>
          </div>
        </div>
      </div>
    </div>
  );
}

