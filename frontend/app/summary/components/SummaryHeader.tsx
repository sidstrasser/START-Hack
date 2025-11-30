"use client";

interface SummaryHeaderProps {
  callDuration: number;
  callStartTime: number;
  onExport: (platform: "salesforce" | "hubspot") => void;
}

export default function SummaryHeader({ callDuration, callStartTime, onExport }: SummaryHeaderProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Call Summary
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Duration: {formatDuration(callDuration)} • {new Date(callStartTime).toLocaleString()}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => onExport("salesforce")}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#00A1E0] text-white rounded-lg font-medium hover:bg-[#0089C2] transition-all hover:scale-105 shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.09 2.41C10.58 2.41 9.22 3.02 8.22 4.02C7.5 3.37 6.54 2.97 5.5 2.97C3.29 2.97 1.5 4.76 1.5 6.97C1.5 7.97 1.87 8.89 2.47 9.6C1.56 10.38 1 11.62 1 13C1 15.76 3.24 18 6 18C6.42 18 6.83 17.94 7.22 17.84C7.67 19.66 9.33 21 11.28 21C12.77 21 14.09 20.25 14.89 19.12C15.5 19.36 16.16 19.5 16.85 19.5C19.7 19.5 22 17.2 22 14.35C22 13.76 21.9 13.2 21.72 12.68C22.54 11.94 23 10.87 23 9.71C23 7.6 21.4 5.88 19.35 5.64C18.69 3.68 16.84 2.29 14.67 2.29C13.76 2.29 12.88 2.53 12.09 2.97V2.41Z"/>
              </svg>
              Export to Salesforce
            </button>
            <button
              onClick={() => onExport("hubspot")}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#FF7A59] text-white rounded-lg font-medium hover:bg-[#E56B4A] transition-all hover:scale-105 shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.15 7.35V4.68c.86-.43 1.45-1.32 1.45-2.35C19.6 1.05 18.55 0 17.27 0c-1.28 0-2.32 1.05-2.32 2.33 0 1.03.59 1.92 1.45 2.35v2.67c-1.16.28-2.18.88-2.96 1.72l-8.13-6.33c.05-.21.08-.43.08-.66C5.39.93 4.46 0 3.31 0 2.16 0 1.23.93 1.23 2.08s.93 2.08 2.08 2.08c.5 0 .95-.18 1.31-.47l7.94 6.19c-.52.84-.83 1.83-.83 2.89 0 1.05.31 2.04.83 2.88l-2.54 2.54c-.26-.09-.54-.14-.83-.14-1.52 0-2.76 1.24-2.76 2.76S7.67 24 9.19 24s2.76-1.24 2.76-2.76c0-.29-.05-.56-.14-.82l2.54-2.55c.84.52 1.84.83 2.92.83 2.99 0 5.42-2.43 5.42-5.42 0-2.99-2.43-5.42-5.42-5.42-.4 0-.79.05-1.17.14l.05-.01zm-.88 8.28c-1.65 0-2.99-1.34-2.99-2.99s1.34-2.99 2.99-2.99 2.99 1.34 2.99 2.99-1.34 2.99-2.99 2.99z"/>
              </svg>
              Export to HubSpot
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

