// TypeScript types matching backend Pydantic models

export interface ExtractedData {
  raw_text: string;
  supplier: string | null;
  total_price: string | null;
  delivery_time: string | null;
  contact_person: string | null;
  line_items: string[];
  payment_terms: string | null;
  validity_period: string | null;
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
  status: 'running' | 'completed' | 'error' | 'keepalive';
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
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}
