// Shared in-memory store for ElevenLabs connections
// Note: In Next.js, this Map persists across requests in the same Node.js process
// but may be reset in serverless environments or after deployments

export interface ConnectionData {
  connection: any;
  transcripts: string[];
  lastActivity: number;
  lastPartialTranscript?: string; // Track the last partial transcript with text
  lastPartialTranscriptTime?: number; // Timestamp of last partial transcript
}

// Use a global variable to ensure the Map persists
// This is a workaround for Next.js module re-instantiation issues
declare global {
  // eslint-disable-next-line no-var
  var __elevenlabs_connections: Map<string, ConnectionData> | undefined;
}

export const connections = 
  global.__elevenlabs_connections ?? new Map<string, ConnectionData>();

if (!global.__elevenlabs_connections) {
  global.__elevenlabs_connections = connections;
  console.log("[CONNECTIONS] Initialized global connections map");
} else {
  console.log("[CONNECTIONS] Using existing global connections map, size:", connections.size);
}

// Clean up old connections (older than 5 minutes)
// This function is called on-demand instead of using setInterval
export async function cleanupOldConnections() {
  const now = Date.now();
  const timeout = 5 * 60 * 1000; // 5 minutes
  
  for (const [sessionId, conn] of connections.entries()) {
    if (now - conn.lastActivity > timeout) {
      try {
        if (conn.connection && typeof conn.connection.disconnect === 'function') {
          await conn.connection.disconnect();
        } else if (conn.connection && typeof (conn.connection as any).close === 'function') {
          await (conn.connection as any).close();
        }
      } catch (err) {
        console.error("Error disconnecting old connection:", err);
      }
      connections.delete(sessionId);
      console.log(`Cleaned up expired connection: ${sessionId}`);
    }
  }
}

