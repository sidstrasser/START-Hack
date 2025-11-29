"use client";

interface ActionPoint {
  id: number;
  text: string;
  completed: boolean;
}

interface ActionPointsChecklistProps {
  actionPoints: ActionPoint[];
  showActionPoints: boolean;
  onToggleShow: () => void;
  onTogglePoint: (id: number) => void;
}

export default function ActionPointsChecklist({
  actionPoints,
  showActionPoints,
  onToggleShow,
  onTogglePoint,
}: ActionPointsChecklistProps) {
  return (
    <div className="border-b border-gray-200 bg-white">
      <button
        onClick={onToggleShow}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-emerald-100">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-800">Action Points</span>
          <span className="text-xs text-gray-500">
            ({actionPoints.filter(p => p.completed).length}/{actionPoints.length})
          </span>
        </div>
        <svg 
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${showActionPoints ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
        showActionPoints ? 'max-h-52' : 'max-h-0'
      }`}>
        <div className="px-4 pb-4 space-y-2">
          {actionPoints.map((point, index) => (
            <button
              key={point.id}
              onClick={() => onTogglePoint(point.id)}
              className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all duration-200 text-left group ${
                point.completed 
                  ? 'bg-emerald-50 hover:bg-emerald-100' 
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                point.completed 
                  ? 'border-emerald-500 bg-emerald-500' 
                  : 'border-gray-300 group-hover:border-emerald-400'
              }`}>
                {point.completed && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`text-sm transition-all duration-200 ${
                point.completed 
                  ? 'text-emerald-700 line-through opacity-70' 
                  : 'text-gray-700'
              }`}>
                {point.text}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

