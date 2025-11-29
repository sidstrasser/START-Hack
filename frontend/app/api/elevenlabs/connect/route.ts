import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient, AudioFormat, CommitStrategy } from "@elevenlabs/elevenlabs-js";
import { v4 as uuidv4 } from "uuid";
import { connections, ConnectionData } from "../connections";

// Force dynamic rendering since we handle real-time connections
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ELEVENLABS_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Initialize ElevenLabs client
    const elevenlabs = new ElevenLabsClient({
      apiKey: apiKey,
    });

    // Create connection
    const connection = await elevenlabs.speechToText.realtime.connect({
      modelId: "scribe_v2_realtime",
      languageCode: "en",
      audioFormat: AudioFormat.PCM_16000,
      sampleRate: 16000,
      commitStrategy: CommitStrategy.VAD,
      vadSilenceThresholdSecs: 1.5,
      vadThreshold: 0.4,
      minSpeechDurationMs: 100,
      minSilenceDurationMs: 100,
      includeTimestamps: false,
    });

    // Generate session ID first
    const sessionId = uuidv4();

    // Debug: Inspect connection object
    console.log("[CONNECT ROUTE] Connection object type:", typeof connection);
    console.log("[CONNECT ROUTE] Connection has 'on' method:", typeof (connection as any).on === 'function');
    console.log("[CONNECT ROUTE] Connection methods:", Object.keys(connection || {}));
    console.log("[CONNECT ROUTE] Connection prototype methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(connection || {})));

    // Store connection first
    const connectionData: ConnectionData = {
      connection,
      transcripts: [] as string[],
      lastActivity: Date.now(),
      lastPartialTranscript: undefined,
      lastPartialTranscriptTime: undefined,
    };
    connections.set(sessionId, connectionData);
    console.log("[CONNECT ROUTE] Connection stored. SessionId:", sessionId);
    console.log("[CONNECT ROUTE] Total connections after store:", connections.size);
    console.log("[CONNECT ROUTE] All connection keys:", Array.from(connections.keys()));

    // Set up event handlers (now we have sessionId)
    // Based on ElevenLabs SDK: RealtimeEvents.COMMITTED_TRANSCRIPT = "committed_transcript"
    if (typeof (connection as any).on === 'function') {
      console.log("[CONNECT ROUTE] Setting up event handlers...");
      
      // Listen for partial transcripts (interim results)
      (connection as any).on("partial_transcript", (data: any) => {
        console.log("[EVENT: partial_transcript] Received partial transcript");
        console.log("[EVENT: partial_transcript] Data:", JSON.stringify(data, null, 2));
        if (data?.text && typeof data.text === "string" && data.text.trim().length > 0) {
          console.log("[EVENT: partial_transcript] Text:", data.text);
          // Store the last partial transcript - we'll use it if commit is empty
          connectionData.lastPartialTranscript = data.text;
          connectionData.lastPartialTranscriptTime = Date.now();
          console.log("[EVENT: partial_transcript] Stored as last partial transcript");
        }
        connectionData.lastActivity = Date.now();
      });

      // Listen for committed transcripts (final results) - THIS IS WHAT WE NEED!
      (connection as any).on("committed_transcript", (data: any) => {
        console.log("[EVENT: committed_transcript] Received committed transcript!");
        console.log("[EVENT: committed_transcript] Data:", JSON.stringify(data, null, 2));
        console.log("[EVENT: committed_transcript] Data type:", typeof data);
        console.log("[EVENT: committed_transcript] Data keys:", data ? Object.keys(data) : 'null');
        
        // Extract text from the data object
        let text: string | null = null;
        if (typeof data === 'string') {
          text = data;
        } else if (data?.text && typeof data.text === "string") {
          text = data.text;
        }
        
        // If committed transcript is empty but we have a recent partial transcript, use that
        if ((!text || text.trim().length === 0) && connectionData.lastPartialTranscript) {
          const timeSincePartial = Date.now() - (connectionData.lastPartialTranscriptTime || 0);
          // Use partial transcript if it's recent (within last 2 seconds)
          if (timeSincePartial < 2000) {
            text = connectionData.lastPartialTranscript;
            console.log("[EVENT: committed_transcript] Using last partial transcript (commit was empty):", text);
            // Clear the partial transcript after using it
            connectionData.lastPartialTranscript = undefined;
            connectionData.lastPartialTranscriptTime = undefined;
          }
        }
        
        if (text && text.trim().length > 0) {
          console.log("[EVENT: committed_transcript] Extracted text:", text);
          console.log("[EVENT: committed_transcript] Current transcripts count before:", connectionData.transcripts.length);
          
          // Store the committed transcript
          connectionData.transcripts.push(text);
          
          console.log("[EVENT: committed_transcript] Stored transcript. New count:", connectionData.transcripts.length);
          console.log("[EVENT: committed_transcript] All transcripts:", connectionData.transcripts);
        } else {
          console.warn("[EVENT: committed_transcript] No valid text found in data:", data);
          console.warn("[EVENT: committed_transcript] Last partial transcript:", connectionData.lastPartialTranscript);
        }
        
        connectionData.lastActivity = Date.now();
      });

      // Listen for committed transcripts with timestamps (if includeTimestamps is true)
      (connection as any).on("committed_transcript_with_timestamps", (data: any) => {
        console.log("[EVENT: committed_transcript_with_timestamps] Received transcript with timestamps");
        console.log("[EVENT: committed_transcript_with_timestamps] Data:", JSON.stringify(data, null, 2));
        if (data?.text && typeof data.text === "string") {
          console.log("[EVENT: committed_transcript_with_timestamps] Text:", data.text);
          // Store this as well if we want timestamps
          connectionData.transcripts.push(data.text);
          console.log("[EVENT: committed_transcript_with_timestamps] Stored transcript. New count:", connectionData.transcripts.length);
        }
        connectionData.lastActivity = Date.now();
      });

      // Listen for session started
      (connection as any).on("session_started", (data: any) => {
        console.log("[EVENT: session_started] Session started:", JSON.stringify(data, null, 2));
        connectionData.lastActivity = Date.now();
      });

      // Listen for errors
      (connection as any).on("error", (error: any) => {
        console.error("[EVENT: error] ElevenLabs connection error:", error);
        console.error("[EVENT: error] Error details:", JSON.stringify(error, null, 2));
      });

      (connection as any).on("auth_error", (error: any) => {
        console.error("[EVENT: auth_error] Authentication error:", error);
      });

      (connection as any).on("quota_exceeded", (error: any) => {
        console.error("[EVENT: quota_exceeded] Quota exceeded:", error);
      });

      console.log("[CONNECT ROUTE] Event handlers registered successfully");
      console.log("[CONNECT ROUTE] Listening for: partial_transcript, committed_transcript, committed_transcript_with_timestamps");
    } else {
      console.error("[CONNECT ROUTE] Connection object does not have 'on' method!");
      console.error("[CONNECT ROUTE] Connection object:", connection);
      
      // Try alternative event systems
      if (typeof (connection as any).addEventListener === 'function') {
        console.log("[CONNECT ROUTE] Connection has addEventListener method, trying that...");
        (connection as any).addEventListener("transcript_complete", (data: any) => {
          console.log("[EVENT: transcript_complete via addEventListener] Data:", data);
        });
      }
      
      if (typeof (connection as any).once === 'function') {
        console.log("[CONNECT ROUTE] Connection has once method");
      }
    }

    return NextResponse.json({ sessionId });
  } catch (error) {
    console.error("Error connecting to ElevenLabs:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to connect to ElevenLabs",
      },
      { status: 500 }
    );
  }
}

