"use client";

interface NextActionsCardProps {
  actions: string[];
  isGenerating: boolean;
}

export default function NextActionsCard({ actions, isGenerating }: NextActionsCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Next Steps</h2>
          <p className="text-sm text-blue-600 font-medium">AI Recommended</p>
        </div>
      </div>
      
      <div className="space-y-3 min-h-[150px]">
        {actions.length > 0 ? (
          <>
            {actions.map((action, index) => (
              <div 
                key={index} 
                className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 hover:shadow-md transition-all animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {index + 1}
                </div>
                <span className="text-sm text-blue-900">{action}</span>
              </div>
            ))}
            {isGenerating && (
              <div className="flex items-center gap-2 p-4 text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
                <span className="text-sm">Loading more...</span>
              </div>
            )}
          </>
        ) : isGenerating ? (
          <div className="flex items-center gap-2 p-4 text-gray-400">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
            <span className="text-sm">Generating action items...</span>
          </div>
        ) : (
          <p className="text-gray-400 p-4">No action items available</p>
        )}
      </div>
    </div>
  );
}

