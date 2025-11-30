// TypeScript types matching backend Pydantic models

// Form data extracted from supplier offer PDF
export interface ExtractedData {
  supplier_name: string;
  supplier_contact: string | null;
  product_description: string;
  product_type: "software" | "hardware" | "service";
  offer_price: string;
  pricing_model: "yearly" | "monthly" | "one-time";
  max_price: string;
  target_price: string;
  value_assessment: "urgent" | "high_impact" | "medium_impact" | "low_impact";
}

// User-provided form data (same structure as ExtractedData)
export interface FormDataInput {
  supplier_name: string;
  supplier_contact: string | null;
  product_description: string;
  product_type: "software" | "hardware" | "service";
  offer_price: string;
  pricing_model: "yearly" | "monthly" | "one-time";
  max_price: string;
  target_price: string;
  value_assessment: "urgent" | "high_impact" | "medium_impact" | "low_impact";
}

export interface UploadResponse {
  document_id: string;
  extracted_data: ExtractedData;
}

export interface BriefingRequest {
  document_id: string;
  form_data: FormDataInput;
  additional_context?: string;
}

export interface BriefingResponse {
  job_id: string;
}

export interface ProgressEvent {
  agent: string;
  status: "running" | "completed" | "error" | "keepalive";
  message: string;
  detail?: string; // Optional detailed description of what's happening
  progress: number; // 0.0 to 1.0 (overall pipeline progress)
  agentProgress?: number; // 0.0 to 1.0 (individual agent progress)
}

export interface AgentStatus {
  name: string;
  status: "pending" | "running" | "completed" | "error";
  message: string;
  detail?: string;
  progress: number; // 0-1
}

// New 5-section briefing structure
export interface CompanyOverview {
  business_description: string;
  size: string;
  location: string;
  industry: string;
}

export interface SupplierSummary {
  company_overview: CompanyOverview;
  key_facts: string[]; // max 5
  recent_news: string[]; // max 3
  contact_info: string | null;
}

export interface AlternativeSupplier {
  supplier_name: string;
  product_description: string;
  offer_price: string;
  pricing_model: string;
}

export interface MarketAnalysis {
  alternatives_overview: string;
  alternatives_list: AlternativeSupplier[];
  price_positioning: string;
  key_risks: string[]; // max 3
}

export interface OfferAnalysis {
  completeness_score: number; // 1-10
  completeness_notes: string;
  price_assessment: string;
  hidden_cost_warnings: string[];
}

export interface OutcomeAssessment {
  target_achievable: boolean;
  confidence: string; // "High", "Medium", or "Low"
  negotiation_leverage: string[];
  recommended_tactics: string[]; // 3-5 items
  partnership_recommendation: string;
}

export interface ActionItem {
  category: "price" | "terms" | "timeline" | "scope";
  action: string;
  recommended?: boolean;
}

export interface ActionItemsList {
  items: ActionItem[];
}

export interface BriefingData {
  supplier_summary: SupplierSummary;
  market_analysis: MarketAnalysis;
  offer_analysis: OfferAnalysis;
  outcome_assessment: OutcomeAssessment;
  action_items: ActionItemsList;
}

export interface BriefingResult {
  briefing: BriefingData | null;
  status: string;
  vector_db_id: string | null;
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
