import type { EvaluationRun, HealthStatus, Paper, SearchRequest, SearchResult, UploadResult } from '../types';

export interface ApiClient {
  getHealth(): Promise<HealthStatus>;
  listPapers(): Promise<Paper[]>;
  uploadPdf(file: File): Promise<UploadResult>;
  search(request: SearchRequest): Promise<SearchResult[]>;
  getEvaluation(topK: number): Promise<EvaluationRun[]>;
}