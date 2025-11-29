import { NextRequest, NextResponse } from "next/server";
import { connections, cleanupOldConnections } from "../connections";

// Force dynamic rendering since we handle real-time connections
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  console.log("[AUDIO ROUTE] Request received");
  console.log("[AUDIO ROUTE] Connections BEFORE cleanup:", connections.size, Array.from(connections.keys()));
  try {
    // Clean up old connections periodically
    await cleanupOldConnections();
    console.log("[AUDIO ROUTE] Connections AFTER cleanup:", connections.size, Array.from(connections.keys()));
    
    console.log("[AUDIO ROUTE] Parsing request body");
    const body = await request.json();
    console.log("[AUDIO ROUTE] Body parsed:", { sessionId: body.sessionId, hasAudio: !!body.audioBase64 });
    const { sessionId, audioBase64, sampleRate } = body;

    if (!sessionId || !audioBase64) {
      console.log("[AUDIO ROUTE] Missing required fields");
      return NextResponse.json(
        { error: "Missing sessionId or audioBase64" },
        { status: 400 }
      );
    }

    console.log("[AUDIO ROUTE] Looking up connection. Total connections:", connections.size);
    console.log("[AUDIO ROUTE] Connection keys:", Array.from(connections.keys()));
    const conn = connections.get(sessionId);
    if (!conn) {
      console.log("[AUDIO ROUTE] Connection not found for sessionId:", sessionId);
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 404 }
      );
    }
    console.log("[AUDIO ROUTE] Connection found, sending audio");

    // Update last activity
    conn.lastActivity = Date.now();

    // Send audio to ElevenLabs
    try {
      // Check if connection has send method
      if (!conn.connection || typeof conn.connection.send !== 'function') {
        console.error("[AUDIO ROUTE] Connection object invalid or missing send method");
        return NextResponse.json(
          { error: "Connection invalid" },
          { status: 500 }
        );
      }

      const audioDataSize = audioBase64 ? Buffer.from(audioBase64, 'base64').length : 0;
      console.log("[AUDIO ROUTE] Sending audio chunk. Size:", audioDataSize, "bytes, Sample rate:", sampleRate || 16000);
      
      await conn.connection.send({
        audioBase64,
        sampleRate: sampleRate || 16000,
      });

      console.log("[AUDIO ROUTE] Audio sent successfully. Current transcripts count:", conn.transcripts.length);
      return NextResponse.json({ success: true });
    } catch (err) {
      console.error("Error sending audio to ElevenLabs:", err);
      // If it's a bufferutil error, log it but don't fail the request
      // The connection might still work without bufferutil optimizations
      if (err instanceof Error && err.message.includes('bufferUtil')) {
        console.warn("[AUDIO ROUTE] bufferUtil error (non-critical, continuing)");
        // Still return success as the connection might work without bufferutil
        return NextResponse.json({ success: true, warning: "bufferUtil not available" });
      }
      return NextResponse.json(
        {
          error:
            err instanceof Error ? err.message : "Failed to send audio",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in audio route:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

