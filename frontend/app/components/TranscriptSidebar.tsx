"use client";

interface Transcript {
  text: string;
  speaker_id?: string;
  timestamp?: number;
}

interface TranscriptSidebarProps {
  transcripts: Transcript[];
  onBack: () => void;
}

export default function TranscriptSidebar({ transcripts, onBack }: TranscriptSidebarProps) {
  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with back button */}
      <div className="p-4 border-b border-gray-200 bg-white flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Back to metrics"
        >
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h2 className="text-sm font-semibold text-gray-800">Conversation</h2>
      </div>

      {/* Chat bubbles */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {transcripts.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">
            <svg
              className="w-12 h-12 mx-auto mb-2 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <p>No transcripts yet</p>
            <p className="text-xs mt-1">Click an action button to commit audio</p>
          </div>
        ) : (
          transcripts.map((transcript, index) => {
            const speakerId = transcript.speaker_id || 'unknown';
            // Handle both "0"/"1" and "speaker_0"/"speaker_1" formats
            const isSpeaker0 = speakerId === '0' || speakerId === 'speaker_0' || (speakerId?.includes('0') && !speakerId?.includes('1') && !speakerId?.includes('2'));
            const isSpeaker1 = speakerId === '1' || speakerId === 'speaker_1' || (speakerId?.includes('1') && !speakerId?.includes('0') && !speakerId?.includes('2'));
            const isSpeaker2 = speakerId === '2' || speakerId === 'speaker_2' || (speakerId?.includes('2') && !speakerId?.includes('0') && !speakerId?.includes('1'));
            
            // WhatsApp-style: Speaker 0 and 2 on left, Speaker 1 on right
            const isRightSide = isSpeaker1;
            
            // Different colors for each speaker
            const bubbleColor = isSpeaker0
              ? 'bg-gray-100 text-gray-900' // Speaker 0 - light grey (left)
              : isSpeaker1
              ? 'bg-blue-500 text-white' // Speaker 1 - blue (right, like WhatsApp)
              : isSpeaker2
              ? 'bg-purple-100 text-purple-900' // Speaker 2 - purple (left)
              : 'bg-gray-200 text-gray-800'; // Unknown - darker grey
            
            // Rounded corners with tail effect
            const roundedCorners = isRightSide
              ? 'rounded-2xl rounded-tr-none' // Right side: tail on top-right
              : 'rounded-2xl rounded-tl-none'; // Left side: tail on top-left
            
            return (
              <div
                key={index}
                className={`flex ${isRightSide ? 'justify-end' : 'justify-start'} mb-1`}
              >
                <div className={`max-w-[75%] ${roundedCorners} px-4 py-2.5 ${bubbleColor} shadow-sm relative`}>
                  {/* Tail/pointer using SVG for better shape */}
                  {isRightSide ? (
                    <svg
                      className="absolute -right-2 top-0 w-3 h-4 text-blue-500"
                      viewBox="0 0 8 13"
                      fill="currentColor"
                    >
                      <path d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z"/>
                    </svg>
                  ) : isSpeaker2 ? (
                    <svg
                      className="absolute -left-2 top-0 w-3 h-4 text-purple-100"
                      viewBox="0 0 8 13"
                      fill="currentColor"
                    >
                      <path d="M1.533 3.568L8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z"/>
                    </svg>
                  ) : (
                    <svg
                      className="absolute -left-2 top-0 w-3 h-4 text-gray-100"
                      viewBox="0 0 8 13"
                      fill="currentColor"
                    >
                      <path d="M1.533 3.568L8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z"/>
                    </svg>
                  )}
                  
                  <div className="relative z-10">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {transcript.text}
                    </p>
                    <div className={`flex items-center gap-1 mt-1.5 ${isRightSide ? 'justify-end' : 'justify-start'}`}>
                      <span className={`text-xs ${isRightSide ? 'text-blue-50' : 'text-gray-600'}`}>
                        {transcript.timestamp 
                          ? new Date(transcript.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isRightSide && (
                        <svg className="w-3 h-3 text-blue-50" fill="currentColor" viewBox="0 0 16 15">
                          <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

