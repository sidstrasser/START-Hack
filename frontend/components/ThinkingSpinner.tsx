interface ThinkingSpinnerProps {
  message: string;
  detail?: string;
}

export function ThinkingSpinner({ message, detail }: ThinkingSpinnerProps) {
  return (
    <div className="flex items-start gap-4 p-4 bg-white rounded-lg border border-blue-200 shadow-sm">
      {/* Animated thinking dots */}
      <div className="flex-shrink-0 mt-1">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
          {/* Pulsing ring */}
          <div className="absolute inset-0 border-2 border-blue-300 rounded-full animate-ping opacity-20"></div>
        </div>
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold text-gray-900 mb-1">
          {message}
        </p>
        {detail && (
          <p className="text-sm text-gray-600 italic">
            {detail}
          </p>
        )}
      </div>
    </div>
  );
}
