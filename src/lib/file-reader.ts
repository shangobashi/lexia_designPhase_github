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

export function isSupported(file: File): boolean {
  const ext = getExtension(file.name);
  return ACCEPTED_EXTENSIONS.includes(ext);
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
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read text file'));
    reader.readAsText(file, 'utf-8');
  });
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

async function readPdfFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjs = await getPdfJsModule();

  try {
    return await extractPdfText(pdfjs, arrayBuffer);
  } catch {
    // Fallback for environments where worker loading is restricted.
    return extractPdfText(pdfjs, arrayBuffer, true);
  }
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
  const ext = getExtension(file.name);
  let content: string;
  let type: LoadedFile['type'];

  if (PDF_EXTENSIONS.includes(ext)) {
    type = 'pdf';
    content = await readPdfFile(file);
  } else if (DOCX_EXTENSIONS.includes(ext)) {
    type = 'docx';
    content = await readDocxFile(file);
  } else if (IMAGE_EXTENSIONS.includes(ext)) {
    type = 'image';
    content = await readImageFile(file);
  } else {
    type = 'text';
    content = await readTextFile(file);
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
    let fileContent = file.content;

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
