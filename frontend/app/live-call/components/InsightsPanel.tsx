"use client";

interface Insight {
  type: "arguments" | "outcome";
  content: string;
  isLoading: boolean;
}

interface InsightsPanelProps {
  insight: Insight;
  onClear: () => void;
}

export default function InsightsPanel({ insight, onClear }: InsightsPanelProps) {
  return (
    <div className="p-3 animate-in slide-in-from-bottom-4 duration-300">
      <div className={`rounded-lg p-3 shadow-sm backdrop-blur-sm transition-all duration-300 ${
        insight.type === "arguments" 
          ? "bg-gradient-to-br from-blue-50/90 to-blue-100/50 border border-blue-200/60" 
          : "bg-gradient-to-br from-purple-50/90 to-purple-100/50 border border-purple-200/60"
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${
              insight.type === "arguments" ? "bg-blue-500/10" : "bg-purple-500/10"
            }`}>
              {insight.type === "arguments" ? (
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              )}
            </div>
            <h3 className={`font-semibold text-sm tracking-tight ${
              insight.type === "arguments" ? "text-blue-900" : "text-purple-900"
            }`}>
              {insight.type === "arguments" ? "Arguments" : "Outcome"}
            </h3>
          </div>
          <button
            onClick={onClear}
            className={`p-1 rounded-full transition-all duration-200 hover:scale-110 ${
              insight.type === "arguments" 
                ? "text-blue-400 hover:text-blue-600 hover:bg-blue-100" 
                : "text-purple-400 hover:text-purple-600 hover:bg-purple-100"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className={`space-y-2 ${
          insight.type === "arguments" ? "text-blue-800" : "text-purple-800"
        }`}>
          {insight.content.split('\n').filter(line => line.trim()).map((line, index) => (
            <div 
              key={index} 
              className={`flex items-start gap-2 text-sm leading-relaxed animate-in fade-in slide-in-from-left-2 duration-300`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {line.trim().startsWith('•') ? (
                <>
                  <span className={`mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full ${
                    insight.type === "arguments" ? "bg-blue-500" : "bg-purple-500"
                  }`} />
                  <span className="font-medium">{line.trim().replace(/^•\s*/, '')}</span>
                </>
              ) : (
                <span className="font-medium">{line.trim()}</span>
              )}
            </div>
          ))}
          {insight.isLoading && (
            <div className="flex items-center gap-1 mt-3">
              <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${
                insight.type === "arguments" ? "bg-blue-400" : "bg-purple-400"
              }`} style={{ animationDelay: '0ms' }} />
              <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${
                insight.type === "arguments" ? "bg-blue-400" : "bg-purple-400"
              }`} style={{ animationDelay: '150ms' }} />
              <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${
                insight.type === "arguments" ? "bg-blue-400" : "bg-purple-400"
              }`} style={{ animationDelay: '300ms' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

