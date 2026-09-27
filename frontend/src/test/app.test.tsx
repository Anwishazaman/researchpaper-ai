import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

const demoPapers = [
  { id: 'attention-is-all-you-need', title: 'Attention Is All You Need', authors: ['Vaswani et al.'], year: 2017, status: 'indexed', chunk_count: 3 },
  { id: 'bert-pretraining', title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding', authors: ['Devlin et al.'], year: 2019, status: 'indexed', chunk_count: 3 },
  { id: 'retrieval-augmented-generation', title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks', authors: ['Lewis et al.'], year: 2020, status: 'indexed', chunk_count: 3 },
];

const searchResults = [
  { paper_id: 'attention-is-all-you-need', title: 'Attention Is All You Need', section: 'Multi-head self-attention', snippet: 'Attention allows the model to focus on relevant positions in the sequence.', score: 0.94, rank: 1 },
  { paper_id: 'bert-pretraining', title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding', section: 'Masked language modeling', snippet: 'The model predicts masked tokens from both left and right context.', score: 0.89, rank: 2 },
];

const evaluationRuns = [
  { method: 'bm25', precision_at_k: 0.5, recall_at_k: 0.75, mrr: 0.8 },
  { method: 'hybrid', precision_at_k: 0.75, recall_at_k: 0.9, mrr: 0.95 },
];

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function installApiResponses(): void {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
    const url = new URL(String(input), window.location.origin);
    if (url.pathname === '/api/health') return jsonResponse({ status: 'ready', corpus_ready: true });
    if (url.pathname === '/api/papers') return jsonResponse({ items: demoPapers });
    if (url.pathname === '/api/search') return jsonResponse({ results: searchResults });
    if (url.pathname === '/api/evaluation') return jsonResponse({ runs: evaluationRuns });
    return jsonResponse({ error: { message: 'Not found' } }, 404);
  }));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/');
});

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
  installApiResponses();
});

describe('ResearchPaper AI frontend', () => {
  it('renders ranked evidence returned by the search API', async () => {
    render(<App />);
    expect(screen.getByText('How does attention improve sequence modeling?')).toBeInTheDocument();
    expect(await screen.findByText('Multi-head self-attention')).toBeInTheDocument();
    expect(screen.getByText('Masked language modeling')).toBeInTheDocument();
  });

  it('shows papers and metadata returned by the library API', async () => {
    window.history.replaceState({}, '', '/library');
    render(<App />);
    expect(await screen.findByText('Vaswani et al.')).toBeInTheDocument();
    expect(screen.getByText('Attention Is All You Need')).toBeInTheDocument();
    expect(screen.getByText('2017')).toBeInTheDocument();
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
  });

  it('renders metrics returned by the evaluation API', async () => {
    window.history.replaceState({}, '', '/evaluation');
    render(<App />);
    expect(await screen.findByText('HYBRID')).toBeInTheDocument();
    expect(screen.getAllByText('0.75').length).toBeGreaterThan(0);
    expect(screen.getAllByText('0.95').length).toBeGreaterThan(0);
  });

  it('rejects a non-PDF before calling the upload API', async () => {
    window.history.replaceState({}, '', '/library');
    const user = userEvent.setup({ applyAccept: false });
    render(<App />);
    await screen.findByText('Attention Is All You Need');
    await user.upload(screen.getByLabelText('Upload a PDF file'), new File(['paper'], 'notes.txt', { type: 'text/plain' }));
    expect(await screen.findByText('Choose a PDF file to add it to the local corpus.')).toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls.some(([input]) => String(input).includes('/api/papers/upload'))).toBe(false);
  });

  it('rejects PDFs larger than 10 MB before calling the upload API', async () => {
    window.history.replaceState({}, '', '/library');
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Attention Is All You Need');
    const oversizedPdf = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText('Upload a PDF file'), oversizedPdf);
    expect(await screen.findByText('This PDF is larger than the 10 MB upload limit.')).toBeInTheDocument();
  });
});