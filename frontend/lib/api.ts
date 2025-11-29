import type {
  UploadResponse,
  BriefingRequest,
  BriefingResponse,
  BriefingResult,
  QueryBriefingRequest,
  QueryBriefingResponse,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

async function fetchJSON<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
    throw new APIError(
      response.status,
      error.detail || error.message || 'An error occurred'
    );
  }

  return response.json();
}

export const api = {
  uploadPDF: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/upload-pdf`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new APIError(
        response.status,
        error.detail || error.message || 'Upload failed'
      );
    }

    return response.json();
  },

  generateBriefing: (request: BriefingRequest): Promise<BriefingResponse> => {
    return fetchJSON('/api/generate-briefing', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  getBriefing: (jobId: string): Promise<BriefingResult> => {
    return fetchJSON(`/api/briefing/${jobId}`);
  },

  queryBriefing: (request: QueryBriefingRequest): Promise<QueryBriefingResponse> => {
    return fetchJSON('/api/query-briefing', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },
};
