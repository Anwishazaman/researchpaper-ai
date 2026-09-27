import type { EvaluationRun, HealthStatus, Paper, SearchRequest, SearchResult, UploadResult } from '../types';
import type { ApiClient } from './types';

interface ApiErrorResponse {
  error?: {
    message?: string;
  };
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, init);
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json() as ApiErrorResponse;
      message = body.error?.message ?? message;
    } catch {
      // Keep the status-based message when the server response is not JSON.
    }
    throw new Error(message);
  }
  return await response.json() as T;
}

const liveClient: ApiClient = {
  async getHealth(): Promise<HealthStatus> {
    return request<HealthStatus>('/api/health');
  },
  async listPapers(): Promise<Paper[]> {
    const response = await request<{ items: Paper[] }>('/api/papers');
    return response.items;
  },
  async uploadPdf(file: File): Promise<UploadResult> {
    const body = new FormData();
    body.append('file', file);
    return request<UploadResult>('/api/papers/upload', { method: 'POST', body });
  },
  async search(searchRequest: SearchRequest): Promise<SearchResult[]> {
    const response = await request<{ results: SearchResult[] }>('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchRequest),
    });
    return response.results;
  },
  async getEvaluation(topK: number): Promise<EvaluationRun[]> {
    const response = await request<{ runs: EvaluationRun[] }>(`/api/evaluation?top_k=${topK}`);
    return response.runs;
  },
};

export { liveClient };