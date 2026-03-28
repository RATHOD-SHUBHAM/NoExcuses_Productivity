/**
 * Lightweight auth/routing traces so deploy issues are visible in DevTools without guessing.
 * Add ?authDebug=1 once to also show an on-screen log (stored in localStorage).
 */

const STORAGE_KEY = "noexcusesAuthDebug";
const EVENT = "noexcuses-auth-debug";
const BUF_MAX = 40;
const buffer: string[] = [];

function hudEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    if (new URLSearchParams(window.location.search).get("authDebug") === "1") {
      return true;
    }
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Call from main.tsx before React mounts so the first URL can enable the HUD. */
export function initAuthDebugFromUrl(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (new URLSearchParams(window.location.search).get("authDebug") === "1") {
      window.localStorage.setItem(STORAGE_KEY, "1");
    }
  } catch {
    /* private mode */
  }
}

export function isAuthDebugHudEnabled(): boolean {
  return hudEnabled();
}

export function getAuthTraceBuffer(): readonly string[] {
  return buffer;
}

export function subscribeAuthTrace(cb: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

export function traceAuth(phase: string, detail?: Record<string, unknown>): void {
  const line =
    detail !== undefined
      ? `[NoExcuses Auth] ${phase} ${JSON.stringify(detail)}`
      : `[NoExcuses Auth] ${phase}`;
  console.warn(line);

  if (typeof window !== "undefined" && hudEnabled()) {
    const stamp = new Date().toLocaleTimeString();
    buffer.push(`${stamp} ${line}`);
    if (buffer.length > BUF_MAX) {
      buffer.splice(0, buffer.length - BUF_MAX);
    }
    window.dispatchEvent(new CustomEvent(EVENT));
  }
}
