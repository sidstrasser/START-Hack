'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import type { Message } from '@/lib/types';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorAlert } from '@/components/ErrorAlert';

export default function LiveCall() {
  const [vectorDbId, setVectorDbId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedVectorDbId = sessionStorage.getItem('vectorDbId');
    if (!storedVectorDbId) {
      setError('No briefing found. Please generate a briefing first.');
      return;
    }
    setVectorDbId(storedVectorDbId);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !vectorDbId) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await api.queryBriefing({
        vector_db_id: vectorDbId,
        query: input,
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      setError(err.message || 'Failed to query briefing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-6 text-center">Live Call Assistant</h1>
        <p className="text-center text-gray-600 mb-8">
          Ask questions about your negotiation briefing during the call
        </p>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

        {/* Chat Container */}
        <div
          className="bg-white rounded-lg shadow-lg flex flex-col"
          style={{ height: 'calc(100vh - 300px)' }}
        >
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-8">
                <p>No messages yet. Ask a question about your briefing!</p>
                <div className="mt-4 space-y-2 text-left max-w-md mx-auto">
                  <p className="text-sm font-medium">Example questions:</p>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• What are the key leverage points?</li>
                    <li>• What should I avoid in this negotiation?</li>
                    <li>• What&apos;s the supplier&apos;s background?</li>
                  </ul>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-300">
                      <p className="text-xs text-gray-600">
                        Sources: {msg.sources.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-4">
                  <LoadingSpinner size="sm" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="border-t p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                disabled={loading || !vectorDbId}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={loading || !input.trim() || !vectorDbId}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
