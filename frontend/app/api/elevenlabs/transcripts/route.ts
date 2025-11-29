import { NextRequest, NextResponse } from "next/server";
import { connections, cleanupOldConnections } from "../connections";

// Force dynamic rendering since we use searchParams
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  console.log("[TRANSCRIPTS ROUTE] Request received");
  try {
    // Clean up old connections periodically
    await cleanupOldConnections();
    
    console.log("[TRANSCRIPTS ROUTE] Getting search params");
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get("sessionId");
    console.log("[TRANSCRIPTS ROUTE] SessionId from params:", sessionId);

    if (!sessionId) {
      console.log("[TRANSCRIPTS ROUTE] Missing sessionId");
      return NextResponse.json(
        { error: "Missing sessionId" },
        { status: 400 }
      );
    }

    console.log("[TRANSCRIPTS ROUTE] Looking up connection. Total connections:", connections.size);
    console.log("[TRANSCRIPTS ROUTE] Connection keys:", Array.from(connections.keys()));
    const conn = connections.get(sessionId);
    if (!conn) {
      console.log("[TRANSCRIPTS ROUTE] Connection not found for sessionId:", sessionId);
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 404 }
      );
    }
    console.log("[TRANSCRIPTS ROUTE] Connection found, returning transcripts");
    console.log("[TRANSCRIPTS ROUTE] Transcripts array:", conn.transcripts);
    console.log("[TRANSCRIPTS ROUTE] Transcripts count:", conn.transcripts.length);
    console.log("[TRANSCRIPTS ROUTE] Last activity:", new Date(conn.lastActivity).toISOString());
    console.log("[TRANSCRIPTS ROUTE] Connection object type:", typeof conn.connection);
    console.log("[TRANSCRIPTS ROUTE] Connection has 'on' method:", typeof (conn.connection as any).on === 'function');

    // Update last activity
    conn.lastActivity = Date.now();

    // Return transcripts
    return NextResponse.json({
      transcripts: conn.transcripts,
      count: conn.transcripts.length,
    });
  } catch (error) {
    console.error("Error in transcripts route:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

