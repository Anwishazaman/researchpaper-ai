import {
  Badge,
  Body1,
  Button,
  Card,
  Caption1,
  Field,
  FluentProvider,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Option,
  ProgressBar,
  Select,
  Skeleton,
  SkeletonItem,
  Slider,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Tab,
  TabList,
  Textarea,
  Title1,
  Title2,
  Title3,
  useId,
} from '@fluentui/react-components';
import {
  AddRegular,
  ArrowClockwiseRegular,
  ArrowDownloadRegular,
  BookRegular,
  ChartMultipleRegular,
  CheckmarkCircleRegular,
  DocumentRegular,
  ErrorCircleRegular,
  SearchRegular,
  WeatherMoonRegular,
  WeatherSunnyRegular,
} from '@fluentui/react-icons';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { type ChangeEvent, type FormEvent, type ReactElement, useEffect, useRef, useState } from 'react';
import { api } from './api';
import type { EvaluationRun, GroundedAnswer, HealthStatus, Paper, SearchRequest, SearchResult } from './types';
import { darkTheme, lightTheme, readThemeMode, type ThemeMode } from './theme';

type Page = 'search' | 'library' | 'evaluation';
type LoadStatus = 'loading' | 'error' | 'empty' | 'data';

const searchDefault = 'How does attention improve sequence modeling?';

function pageFromPath(path: string): Page {
  if (path === '/library') return 'library';
  if (path === '/evaluation') return 'evaluation';
  return 'search';
}

function useCurrentPage(): [Page, (page: Page) => void] {
  const [page, setPage] = useState(() => pageFromPath(window.location.pathname));

  useEffect(() => {
    const onPopState = () => setPage(pageFromPath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (nextPage: Page) => {
    const paths: Record<Page, string> = { search: '/', library: '/library', evaluation: '/evaluation' };
    window.history.pushState({}, '', paths[nextPage]);
    setPage(nextPage);
  };

  return [page, navigate];
}

function useColorScheme(): [boolean, ThemeMode, () => void] {
  const [mode, setMode] = useState<ThemeMode>(readThemeMode);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const isDark = mode === 'dark' || (mode === 'system' && systemDark);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const toggle = () => {
    const nextMode: ThemeMode = isDark ? 'light' : 'dark';
    window.localStorage.setItem('app-theme', nextMode);
    setMode(nextMode);
  };

  return [isDark, mode, toggle];
}

function App() {
  const [page, navigate] = useCurrentPage();
  const [isDark, , toggleTheme] = useColorScheme();
  const prefersReducedMotion = useReducedMotion();
  const activeTheme = isDark ? darkTheme : lightTheme;
  const transition = prefersReducedMotion ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    document.title = `${page === 'search' ? 'Search' : page === 'library' ? 'Library' : 'Evaluation'} | ResearchPaper AI`;
  }, [isDark, page]);

  const healthId = useId('health');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  useEffect(() => {
    api.getHealth().then(setHealth).catch(() => setHealth(null));
  }, []);

  return (
    <FluentProvider theme={activeTheme} className="app-provider">
      <div className="app-frame">
        <header className="topbar">
          <button className="brand-lockup" type="button" onClick={() => navigate('search')} aria-label="ResearchPaper AI home">
            <span className="brand-mark"><BookRegular /></span>
            <span>ResearchPaper <strong>AI</strong></span>
          </button>
          <div className="topbar-actions">
            <Badge appearance="tint" color={health?.corpus_ready ? 'success' : 'informative'} icon={<CheckmarkCircleRegular />}>
              <span id={healthId}>{health?.corpus_ready ? 'Local corpus ready' : 'Local research workspace'}</span>
            </Badge>
            <Button
              appearance="subtle"
              icon={isDark ? <WeatherSunnyRegular /> : <WeatherMoonRegular />}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              onClick={toggleTheme}
            />
          </div>
        </header>

        <nav className="primary-nav" aria-label="Primary navigation">
          <TabList selectedValue={page} onTabSelect={(_, data) => navigate(data.value as Page)}>
            <Tab value="search" icon={<SearchRegular />}>Search</Tab>
            <Tab value="library" icon={<BookRegular />}>Library</Tab>
            <Tab value="evaluation" icon={<ChartMultipleRegular />}>Evaluation</Tab>
          </TabList>
        </nav>

        <AnimatePresence mode="wait">
          <motion.main key={page} className="page-content" {...transition} transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}>
            {page === 'search' && <SearchPage />}
            {page === 'library' && <LibraryPage />}
            {page === 'evaluation' && <EvaluationPage />}
          </motion.main>
        </AnimatePresence>

        <footer className="app-footer">
          <Caption1>ResearchPaper AI · Local research workspace</Caption1>
          <Caption1>No cloud account required</Caption1>
        </footer>
      </div>
    </FluentProvider>
  );
}

function PageHero({ eyebrow, title, subtitle, primaryAction, secondaryAction }: {
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryAction: { label: string; icon: ReactElement; onClick: () => void };
  secondaryAction: { label: string; icon: ReactElement; onClick: () => void };
}) {
  return (
    <Card className="page-hero" appearance="filled-alternative">
      <svg className="hero-mesh" aria-hidden="true" viewBox="0 0 800 400" preserveAspectRatio="none">
        <defs>
          <radialGradient id="mesh-accent" cx="0%" cy="0%" r="80%">
            <stop offset="0%" stopColor="var(--brand-accent)" stopOpacity="0.58" />
            <stop offset="100%" stopColor="var(--brand-accent)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mesh-primary" cx="100%" cy="100%" r="80%">
            <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="800" height="400" fill="url(#mesh-accent)" />
        <rect width="800" height="400" fill="url(#mesh-primary)" />
      </svg>
      <div className="hero-copy">
        <span className="hero-eyebrow"><span />{eyebrow}</span>
        <Title1 as="h1">{title}</Title1>
        <Body1>{subtitle}</Body1>
        <div className="hero-actions">
          <Button appearance="primary" icon={primaryAction.icon} onClick={primaryAction.onClick}>{primaryAction.label}</Button>
          <Button appearance="secondary" icon={secondaryAction.icon} onClick={secondaryAction.onClick}>{secondaryAction.label}</Button>
        </div>
      </div>
      <div className="hero-index" aria-hidden="true"><DocumentRegular /></div>
    </Card>
  );
}

function SectionHeading({ icon, title, detail }: { icon: ReactElement; title: string; detail?: string }) {
  return (
    <div className="section-heading">
      <div className="section-title-wrap"><span className="section-icon">{icon}</span><Title2 as="h2">{title}</Title2></div>
      {detail && <Caption1>{detail}</Caption1>}
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <Card className="state-panel" aria-label={`Loading ${label}`}>
      <Skeleton aria-hidden="true">
        <SkeletonItem className="skeleton-heading" />
        <SkeletonItem className="skeleton-line" />
        <SkeletonItem className="skeleton-line short" />
        <SkeletonItem className="skeleton-block" />
      </Skeleton>
      <Caption1>Loading {label}…</Caption1>
    </Card>
  );
}

function ErrorState({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <MessageBar intent="error" className="error-state">
      <ErrorCircleRegular />
      <MessageBarBody>
        <MessageBarTitle>{title}</MessageBarTitle>
        The local API is unavailable. Your demo corpus remains on this device.
      </MessageBarBody>
      <Button appearance="secondary" icon={<ArrowClockwiseRegular />} onClick={onRetry}>Retry</Button>
    </MessageBar>
  );
}

function EmptyState({ title, body, action, onAction }: { title: string; body: string; action: string; onAction: () => void }) {
  return (
    <Card className="empty-state">
      <span className="empty-art"><DocumentRegular /></span>
      <Title3 as="h2">{title}</Title3>
      <Body1>{body}</Body1>
      <Button appearance="primary" icon={<SearchRegular />} onClick={onAction}>{action}</Button>
    </Card>
  );
}

function SearchPage() {
  const [query, setQuery] = useState(searchDefault);
  const [method, setMethod] = useState<'hybrid' | 'bm25'>('hybrid');
  const [weight, setWeight] = useState(0.55);
  const [topK, setTopK] = useState(5);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [groundedAnswer, setGroundedAnswer] = useState<GroundedAnswer | null>(null);
  const [answerError, setAnswerError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    const request: SearchRequest = { query: searchDefault, method: 'hybrid', dense_weight: 0.55, top_k: 5 };
    api.search(request).then((items) => {
      if (active) {
        setResults(items);
        setStatus(items.length ? 'data' : 'empty');
        setError('');
      }
    }).catch((reason: unknown) => {
      if (active) {
        setError(reason instanceof Error ? reason.message : 'Search failed.');
        setStatus('error');
      }
    });
    return () => { active = false; };
  }, [retry]);

  const runSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGroundedAnswer(null);
    setAnswerError('');
    if (!query.trim()) {
      setError('Enter a research question before searching.');
      setStatus('error');
      return;
    }
    setStatus('loading');
    try {
      const items = await api.search({ query, method, dense_weight: weight, top_k: topK });
      setResults(items);
      setStatus(items.length ? 'data' : 'empty');
      setError('');
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Search failed.');
      setStatus('error');
    }
  };

  const generateAnswer = async () => {
    if (query.trim().length < 3) {
      setAnswerError('Enter a research question with at least 3 characters.');
      return;
    }
    setIsGenerating(true);
    setGroundedAnswer(null);
    setAnswerError('');
    try {
      setGroundedAnswer(await api.answer({ question: query, dense_weight: weight, top_k: topK }));
    } catch (reason: unknown) {
      setAnswerError(reason instanceof Error ? reason.message : 'Grounded answer generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <PageHero
        eyebrow="Local paper search"
        title="Find the evidence behind your next idea."
        subtitle="Search a focused paper corpus with keyword BM25 or hybrid semantic retrieval. Your papers and indexes stay local."
        primaryAction={{ label: 'Search papers', icon: <SearchRegular />, onClick: () => document.getElementById('research-query')?.focus() }}
        secondaryAction={{ label: 'Browse library', icon: <BookRegular />, onClick: () => { window.history.pushState({}, '', '/library'); window.dispatchEvent(new PopStateEvent('popstate')); } }}
      />
      <div className="search-layout">
        <form className="query-panel" onSubmit={runSearch}>
          <SectionHeading icon={<SearchRegular />} title="Search setup" detail="BM25 + semantic" />
          <Field label="Research question" validationState={query.trim() ? 'none' : 'warning'} validationMessage={query.trim() ? undefined : 'A question is required.'}>
            <Textarea id="research-query" resize="vertical" rows={4} value={query} onChange={(_, data) => setQuery(data.value)} />
          </Field>
          <Field label="Retrieval method">
            <Select value={method} onChange={(_, data) => setMethod(data.value as 'hybrid' | 'bm25')}>
              <Option value="hybrid">Hybrid · BM25 + semantic</Option>
              <Option value="bm25">Keyword · BM25 only</Option>
            </Select>
          </Field>
          <Field label={`Semantic weight · ${weight.toFixed(2)}`} validationState="warning" validationMessage="Higher values emphasize semantic similarity.">
            <Slider min={0} max={1} step={0.05} value={weight} onChange={(_, data) => setWeight(data.value)} disabled={method === 'bm25'} />
          </Field>
          <Field label="Ranked results">
            <Select value={String(topK)} onChange={(_, data) => setTopK(Number(data.value))}>
              <Option value="5">5 results</Option>
              <Option value="10">10 results</Option>
            </Select>
          </Field>
          <div className="form-footnote"><Caption1>Questions and evidence are processed on this machine.</Caption1></div>
          <Button type="submit" appearance="primary" icon={<SearchRegular />} className="full-button">Search papers</Button>
          <Button type="button" appearance="secondary" icon={<DocumentRegular />} className="full-button" disabled={isGenerating} onClick={generateAnswer}>
            {isGenerating ? 'Generating grounded answer…' : 'Generate grounded answer'}
          </Button>
        </form>

        <section className="results-column" aria-labelledby="results-heading">
          <SectionHeading icon={<DocumentRegular />} title="Ranked evidence" detail={`${method} · top ${topK}`} />
          {status === 'loading' && <LoadingState label="ranked evidence" />}
          {status === 'error' && <ErrorState title={error || 'Search could not be completed'} onRetry={() => setRetry((value) => value + 1)} />}
          {status === 'empty' && <EmptyState title="No matching evidence yet" body="Try a broader research question or add papers to your local corpus." action="Browse the library" onAction={() => { window.history.pushState({}, '', '/library'); window.dispatchEvent(new PopStateEvent('popstate')); }} />}
          {isGenerating && <Card className="answer-progress"><ProgressBar /><Body1>Loading the local answer model and grounding a response in retrieved passages…</Body1></Card>}
          {answerError && <MessageBar intent="error" className="error-state"><ErrorCircleRegular /><MessageBarBody><MessageBarTitle>Grounded answer unavailable</MessageBarTitle>{answerError}</MessageBarBody></MessageBar>}
          {groundedAnswer && <GroundedAnswerPanel result={groundedAnswer} />}
          {status === 'data' && (
            <div className="evidence-list" id="results-heading">
              {results.slice(0, topK).map((result) => <EvidenceCard key={`${result.paper_id}-${result.rank}`} result={result} />)}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function GroundedAnswerPanel({ result }: { result: GroundedAnswer }) {
  return (
    <Card className="grounded-answer" aria-labelledby="grounded-answer-heading">
      <SectionHeading icon={<DocumentRegular />} title="Evidence-grounded answer" detail={result.model} />
      <Body1 className="grounded-answer-text">{result.answer}</Body1>
      <div className="answer-sources" aria-label="Retrieved sources">
        {result.sources.map((source) => (
          <div className="answer-source" key={`${source.paper_id}-${source.rank}`}>
            <Badge appearance="tint" color="informative">[S{source.rank}]</Badge>
            <div>
              <strong>{source.title}</strong>
              <Caption1>{source.section} · {source.snippet}</Caption1>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function EvidenceCard({ result }: { result: SearchResult }) {
  return (
    <Card className="evidence-card">
      <div className="evidence-meta">
        <Badge appearance="tint" color={result.rank === 1 ? 'success' : 'informative'}>{result.rank} · {result.score.toFixed(2)}</Badge>
        <span className="paper-citation">{result.title}</span>
      </div>
      <Title3 as="h3">{result.section}</Title3>
      <blockquote>“{result.snippet}”</blockquote>
      <div className="citation-line"><Caption1>Paper ID {result.paper_id}</Caption1></div>
    </Card>
  );
}

function LibraryPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadError, setUploadError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    api.listPapers().then((items) => {
      if (active) {
        setPapers(items);
        setStatus(items.length ? 'data' : 'empty');
        setError('');
      }
    }).catch((reason: unknown) => {
      if (active) {
        setError(reason instanceof Error ? reason.message : 'Library could not be loaded.');
        setStatus('error');
      }
    });
    return () => { active = false; };
  }, [retry]);

  const uploadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    setUploadError('');
    setUploadMessage('');
    if (!file) return;
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Choose a PDF file to add it to the local corpus.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('This PDF is larger than the 10 MB upload limit.');
      return;
    }

    setIsUploading(true);
    try {
      const upload = await api.uploadPdf(file);
      setUploadMessage(`Added to local index · ${upload.chunk_count} chunks`);
      const updatedPapers = await api.listPapers();
      setPapers(updatedPapers);
      setStatus(updatedPapers.length ? 'data' : 'empty');
    } catch (reason: unknown) {
      setUploadError(reason instanceof Error ? reason.message : 'Upload failed. Try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <PageHero
        eyebrow="Your local collection"
        title="A library built for close reading."
        subtitle="Keep the demo corpus and your own PDFs together. Extracted text, chunks, and retrieval indexes remain on this device."
        primaryAction={{ label: 'Upload a PDF', icon: <AddRegular />, onClick: () => fileInput.current?.click() }}
        secondaryAction={{ label: 'Search papers', icon: <SearchRegular />, onClick: () => { window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); } }}
      />
      <input ref={fileInput} className="visually-hidden" type="file" accept="application/pdf,.pdf" onChange={uploadFile} aria-label="Upload a PDF file" />
      {isUploading && <Card className="upload-progress"><div className="upload-progress-heading"><DocumentRegular /><Body1>Indexing PDF</Body1></div><ProgressBar /><Caption1>Uploading PDF and preparing searchable chunks…</Caption1></Card>}
      {uploadMessage && <MessageBar intent="success" className="upload-message"><MessageBarBody><MessageBarTitle>Paper indexed</MessageBarTitle>{uploadMessage}</MessageBarBody></MessageBar>}
      {uploadError && <MessageBar intent="error" className="upload-message"><MessageBarBody><MessageBarTitle>Upload not completed</MessageBarTitle>{uploadError}</MessageBarBody></MessageBar>}

      {status === 'loading' && <LoadingState label="paper library" />}
      {status === 'error' && <ErrorState title={error || 'The paper library could not be loaded'} onRetry={() => setRetry((value) => value + 1)} />}
      {status === 'empty' && <EmptyState title="Your library is ready for papers" body="Add a research PDF to start building a local, searchable collection." action="Choose a PDF" onAction={() => fileInput.current?.click()} />}
      {status === 'data' && <>
        <section aria-labelledby="paper-library-heading">
          <SectionHeading icon={<BookRegular />} title="Research papers" detail={`${papers.length} papers · local index`} />
          <PaperTable papers={papers} />
        </section>
        <div className="library-bottom-grid">
          <Card className="saved-empty-card">
            <span className="empty-art small"><BookRegular /></span>
            <Title3 as="h2">No saved papers yet</Title3>
            <Body1>Save a useful result from Search to keep it close while you explore the literature.</Body1>
            <Button appearance="secondary" icon={<SearchRegular />} onClick={() => { window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); }}>Find a paper</Button>
          </Card>
          <Card className="local-files-card">
            <SectionHeading icon={<DocumentRegular />} title="Local files" detail="Private to this device" />
            <Body1>Uploaded PDFs and generated indexes stay in the project’s local data directory. Nothing is sent to a cloud service.</Body1>
            <div className="file-process-row"><span><DocumentRegular /></span><Caption1>PDF · extracted text · retrieval index</Caption1></div>
          </Card>
        </div>
      </>}
    </>
  );
}

function PaperTable({ papers }: { papers: Paper[] }) {
  return (
    <div className="table-scroll">
      <Table aria-label="Research paper library" className="paper-table">
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Paper</TableHeaderCell>
            <TableHeaderCell>Authors</TableHeaderCell>
            <TableHeaderCell>Year</TableHeaderCell>
            <TableHeaderCell>Chunks</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {papers.map((paper) => (
            <TableRow key={paper.id}>
              <TableCell><strong>{paper.title}</strong></TableCell>
              <TableCell>{paper.authors.join(', ') || 'Local upload'}</TableCell>
              <TableCell>{paper.year}</TableCell>
              <TableCell>{paper.chunk_count}</TableCell>
              <TableCell><Badge appearance="tint" color={paper.status === 'indexed' ? 'success' : 'warning'}>{paper.status}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function EvaluationPage() {
  const [runs, setRuns] = useState<EvaluationRun[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [topK, setTopK] = useState(5);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    api.getEvaluation(topK).then((items) => {
      if (active) {
        setRuns(items);
        setStatus(items.length ? 'data' : 'empty');
        setError('');
      }
    }).catch((reason: unknown) => {
      if (active) {
        setError(reason instanceof Error ? reason.message : 'Evaluation could not be loaded.');
        setStatus('error');
      }
    });
    return () => { active = false; };
  }, [retry, topK]);

  const runBenchmark = async () => {
    setStatus('loading');
    try {
      const nextRuns = await api.getEvaluation(topK);
      setRuns(nextRuns);
      setStatus(nextRuns.length ? 'data' : 'empty');
      setError('');
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Evaluation could not be loaded.');
      setStatus('error');
    }
  };

  const hybridMethodRun = runs.find((run) => run.method === 'hybrid');
  const baselineRun = runs.find((run) => run.method === 'bm25');

  return (
    <>
      <div className="page-heading">
        <SectionHeading icon={<ChartMultipleRegular />} title="Retrieval quality" detail="Higher scores indicate stronger ranking" />
        <Badge appearance="tint" color="informative">Bundled benchmark</Badge>
      </div>
      {status === 'loading' && <LoadingState label="evaluation runs" />}
      {status === 'error' && <ErrorState title={error || 'Evaluation data is temporarily unavailable'} onRetry={() => setRetry((value) => value + 1)} />}
      {status === 'empty' && <EmptyState title="No benchmark runs found" body="Run the bundled evaluation to compare keyword and hybrid retrieval." action="Run benchmark" onAction={runBenchmark} />}
      {status === 'data' && <>
        <div className="metric-grid">
          <MetricCard label={`Hybrid · Precision@${topK}`} value={hybridMethodRun?.precision_at_k.toFixed(2) ?? '—'} delta={baselineRun && hybridMethodRun ? `${(hybridMethodRun.precision_at_k - baselineRun.precision_at_k >= 0 ? '+' : '')}${(hybridMethodRun.precision_at_k - baselineRun.precision_at_k).toFixed(2)} vs BM25` : 'Measured by local API'} icon={<CheckmarkCircleRegular />} />
          <MetricCard label={`Hybrid · Recall@${topK}`} value={hybridMethodRun?.recall_at_k.toFixed(2) ?? '—'} delta={baselineRun && hybridMethodRun ? `${(hybridMethodRun.recall_at_k - baselineRun.recall_at_k >= 0 ? '+' : '')}${(hybridMethodRun.recall_at_k - baselineRun.recall_at_k).toFixed(2)} vs BM25` : 'Measured by local API'} icon={<ChartMultipleRegular />} />
          <MetricCard label="Hybrid · MRR" value={hybridMethodRun?.mrr.toFixed(2) ?? '—'} delta={baselineRun && hybridMethodRun ? `${(hybridMethodRun.mrr - baselineRun.mrr >= 0 ? '+' : '')}${(hybridMethodRun.mrr - baselineRun.mrr).toFixed(2)} vs BM25` : 'Measured by local API'} icon={<SearchRegular />} />
        </div>
        <section>
          <SectionHeading icon={<ChartMultipleRegular />} title="Method comparison" detail="Demo methods and results queries" />
          <div className="table-scroll">
            <Table aria-label="Retrieval method comparison" className="evaluation-table">
              <TableHeader><TableRow><TableHeaderCell>Method</TableHeaderCell><TableHeaderCell>{`Precision@${topK}`}</TableHeaderCell><TableHeaderCell>{`Recall@${topK}`}</TableHeaderCell><TableHeaderCell>MRR</TableHeaderCell></TableRow></TableHeader>
              <TableBody>{runs.map((run) => <TableRow key={run.method}>
                <TableCell><Badge appearance="tint" color={run.method === 'hybrid' ? 'success' : 'informative'}>{run.method.toUpperCase()}</Badge></TableCell>
                <TableCell><strong>{run.precision_at_k.toFixed(2)}</strong></TableCell>
                <TableCell><strong>{run.recall_at_k.toFixed(2)}</strong></TableCell>
                <TableCell><strong>{run.mrr.toFixed(2)}</strong></TableCell>
              </TableRow>)}</TableBody>
            </Table>
          </div>
        </section>
        <div className="benchmark-actions">
          <Field label="Results at K">
            <Select value={String(topK)} onChange={(_, data) => setTopK(Number(data.value))}>
              <Option value="5">5 results</Option>
              <Option value="10">10 results</Option>
            </Select>
          </Field>
          <div className="action-buttons">
            <Button appearance="secondary" icon={<ArrowDownloadRegular />} onClick={() => exportMetrics(runs, topK)}>Export metrics</Button>
            <Button appearance="primary" icon={<ChartMultipleRegular />} onClick={runBenchmark}>Run benchmark</Button>
          </div>
        </div>
      </>}
    </>
  );
}

function MetricCard({ label, value, delta, icon }: { label: string; value: string; delta: string; icon: ReactElement }) {
  return (
    <Card className="metric-card">
      <div className="metric-label">{icon}<Caption1>{label}</Caption1></div>
      <strong className="metric-value">{value}</strong>
      <Caption1 className="metric-delta">{delta}</Caption1>
    </Card>
  );
}

function exportMetrics(runs: EvaluationRun[], topK: number): void {
  const rows = [`Method,Precision@${topK},Recall@${topK},MRR`, ...runs.map((run) => `${run.method},${run.precision_at_k},${run.recall_at_k},${run.mrr}`)];
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }));
  link.download = 'researchpaper-evaluation.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

export default App;