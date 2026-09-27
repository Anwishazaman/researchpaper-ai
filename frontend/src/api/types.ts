import type { AnswerRequest, EvaluationRun, GroundedAnswer, HealthStatus, Paper, SearchRequest, SearchResult, UploadResult } from '../types';

export interface ApiClient {
  getHealth(): Promise<HealthStatus>;
  listPapers(): Promise<Paper[]>;
  uploadPdf(file: File): Promise<UploadResult>;
  search(request: SearchRequest): Promise<SearchResult[]>;
  answer(request: AnswerRequest): Promise<GroundedAnswer>;
  getEvaluation(topK: number): Promise<EvaluationRun[]>;
}