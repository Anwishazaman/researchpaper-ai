export type PaperStatus = 'indexed' | 'processing';
export type RetrievalMethod = 'bm25' | 'hybrid';

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: number;
  status: PaperStatus;
  chunk_count: number;
}

export interface SearchRequest {
  query: string;
  method: RetrievalMethod;
  dense_weight: number;
  top_k: number;
}

export interface SearchResult {
  paper_id: string;
  title: string;
  section: string;
  snippet: string;
  score: number;
  rank: number;
}

export interface EvaluationRun {
  method: RetrievalMethod;
  precision_at_k: number;
  recall_at_k: number;
  mrr: number;
}

export interface HealthStatus {
  status: 'ready' | 'degraded';
  corpus_ready: boolean;
}

export interface UploadResult {
  paper_id: string;
  status: 'indexed';
  chunk_count: number;
}