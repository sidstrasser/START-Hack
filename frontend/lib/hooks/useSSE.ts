import { useEffect, useRef, useState } from 'react';

export function useSSE<T>(url: string | null, enabled: boolean = true) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!url || !enabled) return;

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const parsedData = JSON.parse(event.data);
        setData(parsedData);

        // Only close when the entire pipeline is complete (progress = 1.0)
        // or when there's a fatal error
        if (parsedData.status === 'error' || parsedData.progress === 1.0) {
          console.log('[SSE] Closing connection:', parsedData);
          eventSource.close();
          setIsConnected(false);
        }
      } catch (e) {
        console.error('Failed to parse SSE data:', e);
      }
    };

    eventSource.onerror = () => {
      setError(new Error('Connection error'));
      setIsConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [url, enabled]);

  const close = () => {
    eventSourceRef.current?.close();
    setIsConnected(false);
  };

  return { data, error, isConnected, close };
}
