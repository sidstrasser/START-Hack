// TypeScript types matching backend Pydantic models

export interface ExtractedData {
  raw_text: string;
  supplier: string | null;

  // Cost & Savings
  offer_price: string | null;
  pricing_model: string | null;
  desired_price: string | null;
  is_substitute: boolean;
  current_price: string | null;

  // Value / Requirements (1-10)
  added_value: number | null;
  need: number | null;

  // Risk / Contract (1-10)
  impact_of_outage: number | null;
  risk_aversion: number | null;
  target_support_availability: number | null;
  compliance_relevance: number | null;
}

export interface UploadResponse {
  document_id: string;
  extracted_data: ExtractedData;
}

export interface BriefingRequest {
  document_id: string;
  additional_context?: Record<string, any>;
}

export interface BriefingResponse {
  job_id: string;
}

export interface ProgressEvent {
  agent: string;
  status: "running" | "completed" | "error" | "keepalive";
  message: string;
  progress: number; // 0.0 to 1.0
}

export interface BriefingResult {
  briefing: Record<string, any>;
  status: string;
  vector_db_id: string;
}

export interface QueryBriefingRequest {
  vector_db_id: string;
  query: string;
}

export interface QueryBriefingResponse {
  answer: string;
  sources: string[];
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}
