"use client";

interface ActionPoint {
  id: number;
  text: string;
  completed: boolean;
}

interface CompletedActionsCardProps {
  actionPoints: ActionPoint[];
}

export default function CompletedActionsCard({ actionPoints }: CompletedActionsCardProps) {
  const completedActions = actionPoints.filter(a => a.completed);
  const incompletedActions = actionPoints.filter(a => !a.completed);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Completed Actions</h2>
          <p className="text-sm text-emerald-600 font-medium">{completedActions.length} of {actionPoints.length}</p>
        </div>
      </div>
      
      <div className="space-y-2">
        {completedActions.map((action) => (
          <div key={action.id} className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl">
            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm text-emerald-800">{action.text}</span>
          </div>
        ))}
        
        {incompletedActions.length > 0 && (
          <>
            <div className="border-t border-gray-200 my-3 pt-3">
              <p className="text-xs text-gray-500 uppercase font-medium mb-2">Not Completed</p>
            </div>
            {incompletedActions.map((action) => (
              <div key={action.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl opacity-60">
                <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-600">{action.text}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

