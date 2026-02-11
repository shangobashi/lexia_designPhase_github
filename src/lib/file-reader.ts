import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// --- Constants ---

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_FILES = 5;
export const MAX_CONTENT_LENGTH = 200_000; // 200K chars per file
export const MAX_TOTAL_CONTENT = 400_000; // 400K chars combined

const TEXT_EXTENSIONS = [
  '.txt', '.md', '.csv', '.json', '.xml', '.html', '.log',
  '.js', '.ts', '.py', '.css', '.sql', '.yaml', '.yml',
];

const PDF_EXTENSIONS = ['.pdf'];
const DOCX_EXTENSIONS = ['.docx'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

const TEXT_MIME_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'text/csv',
  'text/xml',
  'application/xml',
  'text/html',
  'text/json',
  'application/json',
  'application/ld+json',
  'text/javascript',
  'application/javascript',
  'application/x-javascript',
  'text/css',
  'application/sql',
  'text/x-sql',
  'application/yaml',
  'text/yaml',
  'text/x-yaml',
]);

const PDF_MIME_TYPES = new Set(['application/pdf']);
const DOCX_MIME_TYPES = new Set(['application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
const IMAGE_MIME_PREFIXES = ['image/'];

export const ACCEPTED_EXTENSIONS = [
  ...TEXT_EXTENSIONS,
  ...PDF_EXTENSIONS,
  ...DOCX_EXTENSIONS,
  ...IMAGE_EXTENSIONS,
];

// Build accept string for file input
export const ACCEPT_STRING = ACCEPTED_EXTENSIONS.join(',');

// --- Types ---

export interface LoadedFile {
  name: string;
  size: number;
  content: string;
  type: 'text' | 'pdf' | 'docx' | 'image';
}

type PdfJsModule = typeof import('pdfjs-dist');
type MammothModule = typeof import('mammoth/mammoth.browser.js');

let pdfJsModulePromise: Promise<PdfJsModule> | null = null;
let mammothModulePromise: Promise<MammothModule> | null = null;
let isPdfWorkerConfigured = false;

// --- Helpers ---

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx >= 0 ? filename.slice(idx).toLowerCase() : '';
}

function normalizeMimeType(file: File): string {
  return (file.type || '').toLowerCase().trim();
}

function detectFileType(file: File): LoadedFile['type'] | null {
  const ext = getExtension(file.name);
  if (PDF_EXTENSIONS.includes(ext)) return 'pdf';
  if (DOCX_EXTENSIONS.includes(ext)) return 'docx';
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (TEXT_EXTENSIONS.includes(ext)) return 'text';

  const mimeType = normalizeMimeType(file);
  if (!mimeType) return null;

  if (PDF_MIME_TYPES.has(mimeType)) return 'pdf';
  if (DOCX_MIME_TYPES.has(mimeType)) return 'docx';
  if (IMAGE_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix))) return 'image';
  if (TEXT_MIME_TYPES.has(mimeType) || mimeType.startsWith('text/')) return 'text';

  return null;
}

export function isSupported(file: File): boolean {
  return detectFileType(file) !== null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function truncateFileName(name: string, max = 20): string {
  if (name.length <= max) return name;
  const ext = getExtension(name);
  const base = name.slice(0, name.length - ext.length);
  const truncBase = base.slice(0, max - ext.length - 3);
  return `${truncBase}...${ext}`;
}

async function getPdfJsModule(): Promise<PdfJsModule> {
  if (!pdfJsModulePromise) {
    pdfJsModulePromise = import('pdfjs-dist');
  }

  const pdfjs = await pdfJsModulePromise;
  if (!isPdfWorkerConfigured) {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
    isPdfWorkerConfigured = true;
  }

  return pdfjs;
}

async function getMammothModule(): Promise<MammothModule> {
  if (!mammothModulePromise) {
    mammothModulePromise = import('mammoth/mammoth.browser.js');
  }

  return mammothModulePromise;
}

// --- Readers ---

async function readTextFile(file: File): Promise<string> {
  const value = await file.text();
  return value.replace(/^\uFEFF/, '');
}

async function extractPdfText(
  pdfjs: PdfJsModule,
  arrayBuffer: ArrayBuffer,
  disableWorker = false
): Promise<string> {
  const loadingTask = pdfjs.getDocument({
    data: arrayBuffer,
    ...(disableWorker ? ({ disableWorker: true } as Record<string, unknown>) : {}),
  } as Record<string, unknown>);
  const pdf = await loadingTask.promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: unknown) => {
        if (typeof item === 'object' && item !== null && 'str' in item) {
          return String((item as { str: string }).str);
        }
        return '';
      })
      .filter(Boolean)
      .join(' ');

    pages.push(pageText);
  }

  return pages.join('\n\n');
}

function hasMeaningfulText(text: string): boolean {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length < 80) return false;
  const alnumChars = compact.match(/[A-Za-z0-9À-ÖØ-öø-ÿ]/g)?.length ?? 0;
  return alnumChars >= 30;
}

function decodePdfEscapes(value: string): string {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

function extractPdfOperatorText(arrayBuffer: ArrayBuffer): string {
  const binary = new TextDecoder('latin1').decode(new Uint8Array(arrayBuffer));
  const segments: string[] = [];

  const tjMatches = binary.matchAll(/\((?:\\.|[^\\)])+\)\s*Tj/g);
  for (const match of tjMatches) {
    const raw = match[0].replace(/\)\s*Tj$/, '');
    segments.push(decodePdfEscapes(raw.slice(1)));
  }

  const tjArrayMatches = binary.matchAll(/\[(.*?)\]\s*TJ/gs);
  for (const match of tjArrayMatches) {
    const payload = match[1] || '';
    const literals = payload.matchAll(/\((?:\\.|[^\\)])+\)/g);
    for (const literal of literals) {
      const item = literal[0];
      segments.push(decodePdfEscapes(item.slice(1, -1)));
    }
  }

  return segments.join(' ').replace(/\s{2,}/g, ' ').trim();
}

async function readPdfFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjs = await getPdfJsModule();
  let extracted = '';

  try {
    extracted = await extractPdfText(pdfjs, arrayBuffer);
  } catch {
    // Fallback for environments where worker loading is restricted.
    extracted = await extractPdfText(pdfjs, arrayBuffer, true);
  }

  if (hasMeaningfulText(extracted)) {
    return extracted;
  }

  const operatorText = extractPdfOperatorText(arrayBuffer);
  if (operatorText.length > extracted.length) {
    extracted = operatorText;
  }

  if (!extracted.trim()) {
    return '[No readable text could be extracted from this PDF. The file may be image-based or protected.]';
  }

  return extracted;
}

async function readDocxFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const mammothModule = await getMammothModule();
  const mammothApi = mammothModule as {
    default?: { extractRawText?: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> };
    extractRawText?: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
  };

  const extractRawText =
    mammothApi.extractRawText ??
    mammothApi.default?.extractRawText;

  if (typeof extractRawText !== 'function') {
    throw new Error('DOCX parser is not available');
  }

  const result = await extractRawText({ arrayBuffer });
  return result.value;
}

async function readImageFile(file: File): Promise<string> {
  // For images, we return a placeholder for AI context.
  return `[Image: ${file.name}, ${formatFileSize(file.size)}]`;
}

// --- Main dispatcher ---

export async function readFileContent(file: File): Promise<LoadedFile> {
  const fileType = detectFileType(file);
  if (!fileType) {
    throw new Error(`Unsupported file format for "${file.name}"`);
  }

  let content: string;
  const type: LoadedFile['type'] = fileType;

  if (type === 'pdf') {
    content = await readPdfFile(file);
  } else if (type === 'docx') {
    content = await readDocxFile(file);
  } else if (type === 'image') {
    content = await readImageFile(file);
  } else {
    content = await readTextFile(file);
  }

  if (type !== 'image' && !content.trim()) {
    content = '[No readable text could be extracted from this file.]';
  }

  // Truncate if too long.
  if (content.length > MAX_CONTENT_LENGTH) {
    const originalLength = content.length;
    content =
      content.slice(0, MAX_CONTENT_LENGTH) +
      `\n[... Content truncated. Original: ${originalLength.toLocaleString()} characters, showing first ${MAX_CONTENT_LENGTH.toLocaleString()} ...]`;
  }

  return {
    name: file.name,
    size: file.size,
    content,
    type,
  };
}

// --- AI context builder ---

export function buildFileContext(files: LoadedFile[]): string {
  let totalLength = 0;
  const blocks: string[] = [];

  for (const file of files) {
    let fileContent = file.content.trim() ? file.content : '[No readable text could be extracted from this file.]';

    // Enforce total content cap.
    if (totalLength + fileContent.length > MAX_TOTAL_CONTENT) {
      const remaining = MAX_TOTAL_CONTENT - totalLength;
      if (remaining > 0) {
        fileContent =
          fileContent.slice(0, remaining) +
          '\n[... Content truncated due to total size limit ...]';
      } else {
        blocks.push(`[ATTACHED FILE: ${file.name} (${formatFileSize(file.size)}) - skipped due to total content limit]`);
        continue;
      }
    }

    blocks.push(
      `[ATTACHED FILE: ${file.name} (${formatFileSize(file.size)})]\n${fileContent}\n[END FILE]`
    );

    totalLength += fileContent.length;
  }

  return blocks.join('\n\n');
}
