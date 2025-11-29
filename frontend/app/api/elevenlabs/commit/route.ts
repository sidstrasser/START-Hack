import { NextRequest, NextResponse } from "next/server";
import { connections } from "../connections";

// Force dynamic rendering since we handle real-time connections
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 404 }
      );
    }

    // Update last activity
    conn.lastActivity = Date.now();

    // Commit transcript
    try {
      await conn.connection.commit();
      return NextResponse.json({ success: true });
    } catch (err) {
      console.error("Error committing transcript:", err);
      return NextResponse.json(
        {
          error:
            err instanceof Error ? err.message : "Failed to commit transcript",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in commit route:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

