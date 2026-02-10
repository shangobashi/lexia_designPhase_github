const LOCAL_DEV_API_URL = 'http://localhost:3001';
const LOCALHOST_PATTERN = /^https?:\/\/(localhost|127(?:\.\d{1,3}){3})(:\d+)?\/?$/i;

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

export function getApiBaseUrl(): string {
  const configured = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? '';

  if (configured) {
    const normalized = normalizeBaseUrl(configured);

    // Protect production builds from accidentally using local dev defaults.
    if (import.meta.env.PROD && LOCALHOST_PATTERN.test(normalized)) {
      return '';
    }

    return normalized;
  }

  return import.meta.env.DEV ? LOCAL_DEV_API_URL : '';
}

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = getApiBaseUrl();

  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
}
