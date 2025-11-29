import { NextRequest, NextResponse } from "next/server";
import { connections } from "../connections";

// Force dynamic rendering since we handle real-time connections
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId" },
        { status: 400 }
      );
    }

    const conn = connections.get(sessionId);
    if (!conn) {
      // Already disconnected or invalid session
      return NextResponse.json({ success: true });
    }

    // Disconnect from ElevenLabs
    try {
      if (conn.connection && typeof conn.connection.disconnect === 'function') {
        await conn.connection.disconnect();
      } else if (conn.connection && typeof (conn.connection as any).close === 'function') {
        await (conn.connection as any).close();
      } else {
        console.warn("Connection object does not have disconnect or close method");
      }
    } catch (err) {
      console.error("Error disconnecting from ElevenLabs:", err);
    }

    // Remove from connections map
    connections.delete(sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in disconnect route:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

