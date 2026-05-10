/**
 * useFileContext — reads a user-uploaded file and returns its text content
 * so it can be prepended to an LLM prompt as context.
 *
 * Supported:
 *   .txt .md .csv .json .xml .html .py .ts .js .jsx .tsx  — FileReader
 *   .pdf — PDF.js (loaded from cdnjs, no install needed)
 *
 * Usage:
 *   const { loadFile, context, fileName, clear, loading, error } = useFileContext();
 *   <input type="file" onChange={e => loadFile(e.target.files?.[0])} />
 *   // context is a string ready to prepend to the prompt
 */
import { useCallback, useState } from 'react';

export interface UseFileContextReturn {
  loadFile: (file: File | undefined) => Promise<void>;
  context: string | null;
  fileName: string | null;
  fileSizeKb: number | null;
  loading: boolean;
  error: string | null;
  clear: () => void;
}

const TEXT_TYPES = [
  'text/', 'application/json', 'application/xml',
  'application/javascript', 'application/typescript',
];

const TEXT_EXTENSIONS = [
  '.txt', '.md', '.csv', '.json', '.xml', '.html', '.htm',
  '.py', '.ts', '.tsx', '.js', '.jsx', '.yaml', '.yml',
  '.sql', '.sh', '.bash', '.log', '.ini', '.toml', '.env',
];

function isTextFile(file: File): boolean {
  if (TEXT_TYPES.some(t => file.type.startsWith(t))) return true;
  const name = file.name.toLowerCase();
  return TEXT_EXTENSIONS.some(ext => name.endsWith(ext));
}

async function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

async function readPdf(file: File): Promise<string> {
  // Dynamically load PDF.js from cdnjs — no bundle cost
  if (!(window as any).pdfjsLib) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load PDF.js'));
      document.head.appendChild(s);
    });
    (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  const pdfjsLib = (window as any).pdfjsLib;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: any) => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text) pages.push(`[Page ${i}]\n${text}`);
  }

  return pages.join('\n\n');
}

// Trim text to a reasonable context size (avoid hitting token limits)
const MAX_CHARS = 24_000; // ~6k tokens, safe for most providers

function trimContext(text: string, fileName: string): string {
  const trimmed = text.length > MAX_CHARS
    ? text.slice(0, MAX_CHARS) + `\n\n[... truncated at ${MAX_CHARS} chars ...]`
    : text;
  return `--- File: ${fileName} ---\n${trimmed}\n--- End of file ---`;
}

export function useFileContext(): UseFileContextReturn {
  const [context, setContext] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSizeKb, setFileSizeKb] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setContext(null);
    setFileName(file.name);
    setFileSizeKb(Math.round(file.size / 1024));

    try {
      let text: string;
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        text = await readPdf(file);
      } else if (isTextFile(file)) {
        text = await readAsText(file);
      } else {
        throw new Error(`Unsupported file type: ${file.type || 'unknown'}. Supported: PDF, TXT, CSV, MD, JSON, and most text formats.`);
      }
      setContext(trimContext(text, file.name));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setFileName(null);
      setFileSizeKb(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setContext(null);
    setFileName(null);
    setFileSizeKb(null);
    setError(null);
  }, []);

  return { loadFile, context, fileName, fileSizeKb, loading, error, clear };
}
