const OPEN_DOC_KEY = 'mahaly:openDocument';

export type OpenDocumentPayload = {
  tab: string;
  sourceId?: string;
  sourceCode?: string;
};

export function openErpDocument(payload: OpenDocumentPayload) {
  sessionStorage.setItem(OPEN_DOC_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent('app:navigate', { detail: payload.tab }));
}

export function consumeOpenDocument(): OpenDocumentPayload | null {
  const raw = sessionStorage.getItem(OPEN_DOC_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(OPEN_DOC_KEY);
  try {
    return JSON.parse(raw) as OpenDocumentPayload;
  } catch {
    return null;
  }
}
