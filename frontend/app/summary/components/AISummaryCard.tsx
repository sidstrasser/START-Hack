"use client";

interface AISummaryCardProps {
  summary: string;
  isGenerating: boolean;
}

export default function AISummaryCard({ summary, isGenerating }: AISummaryCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Call Summary</h2>
        {isGenerating && (
          <div className="ml-auto flex items-center gap-2 text-sm text-indigo-600">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>
            Generating...
          </div>
        )}
      </div>
      
      <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed min-h-[100px]">
        {summary ? (
          <>
            {summary.split('\n').filter(p => p.trim()).map((paragraph, i) => (
              <p key={i} className="mb-3">{paragraph}</p>
            ))}
            {isGenerating && (
              <span className="inline-block w-2 h-4 bg-indigo-500 animate-pulse ml-1" />
            )}
          </>
        ) : isGenerating ? (
          <div className="flex items-center gap-2 text-gray-400">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
            <span>Generating summary...</span>
          </div>
        ) : (
          <p className="text-gray-400">No summary available</p>
        )}
      </div>
    </div>
  );
}

