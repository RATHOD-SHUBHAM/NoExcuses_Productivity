import { API_BASE_URL, assertApiBaseConfigured } from "./config";
import {
  getAccessTokenForApi,
  getRuntimeAccessToken,
  sessionBearerToken,
} from "../lib/authSession";
import { getSupabase } from "../lib/supabaseClient";
import type {
  ApiDailyCompletion,
  ApiRestDay,
  ApiTask,
  ApiTaskLog,
  ApiTaskRestDay,
  ApiTaskStats,
  ApiWeeklyReview,
} from "./types";

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body === "object" && body && "detail" in body) {
      const d = (body as { detail: unknown }).detail;
      return typeof d === "string" ? d : JSON.stringify(d);
    }
    return JSON.stringify(body);
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
}

function mergeRequestHeaders(
  auth: Record<string, string>,
  init?: RequestInit,
): Record<string, string> {
  const out: Record<string, string> = { Accept: "application/json" };
  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => {
      out[key] = value;
    });
  }
  if (auth.Authorization) {
    out.Authorization = auth.Authorization;
  }
  return out;
}

async function authHeaders(): Promise<Record<string, string>> {
  const fromReact = getRuntimeAccessToken()?.trim();
  if (fromReact) {
    return { Authorization: `Bearer ${fromReact}` };
  }
  const bridged = getAccessTokenForApi()?.trim();
  if (bridged) {
    return { Authorization: `Bearer ${bridged}` };
  }
  const sb = getSupabase();
  if (!sb) return {};

  let session = (await sb.auth.getSession()).data.session;
  let token = session ? sessionBearerToken(session) : null;
  if (!token) {
    await new Promise<void>((r) => queueMicrotask(r));
    session = (await sb.auth.getSession()).data.session;
    token = session ? sessionBearerToken(session) : null;
  }
  if (!token) {
    const { data, error } = await sb.auth.refreshSession();
    if (!error && data.session) {
      token = sessionBearerToken(data.session);
    }
  }
  if (!token?.trim()) return {};
  return { Authorization: `Bearer ${token.trim()}` };
}

async function throwIfNotOk(res: Response): Promise<void> {
  if (res.ok) {
    return;
  }
  if (res.status === 401) {
    const sb = getSupabase();
    if (sb) {
      await sb.auth.signOut();
    }
    if (
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login")
    ) {
      window.location.assign("/login");
    }
    throw new Error("Session expired. Sign in again.");
  }
  throw new Error(await parseError(res));
}

async function requestJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  assertApiBaseConfigured();
  const url = `${API_BASE_URL}${path}`;
  const auth = await authHeaders();
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: mergeRequestHeaders(auth, init),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg === "Failed to fetch" ||
      msg === "Load failed" ||
      e instanceof TypeError
    ) {
      throw new Error(
        `Can't reach the API at ${API_BASE_URL}. ` +
          `Start the FastAPI server (e.g. port 8000), set VITE_API_BASE_URL in frontend/.env if needed, and keep CORS origins aligned. ` +
          `An empty database is OK — this error means the browser had no HTTP response (nothing listening or blocked).`,
      );
    }
    throw e;
  }
  await throwIfNotOk(res);
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

/** GET /api/tasks */
export function getAllTasks(): Promise<ApiTask[]> {
  return requestJson<ApiTask[]>("/api/tasks");
}

/** POST /api/tasks */
export function createTask(title: string): Promise<ApiTask> {
  return requestJson<ApiTask>("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
}

/** DELETE /api/tasks/{task_id} */
export async function deleteTask(taskId: string): Promise<void> {
  await requestJson<void>(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: "DELETE",
  });
}

/** POST /api/tasks/{task_id}/complete — optional date (YYYY-MM-DD); completed defaults true, pass false to uncheck */
export function markTaskComplete(
  taskId: string,
  body?: { date?: string; completed?: boolean },
): Promise<ApiTaskLog> {
  const payload: Record<string, unknown> = {};
  if (body?.date) payload.date = body.date;
  if (body?.completed === false) payload.completed = false;
  return requestJson<ApiTaskLog>(
    `/api/tasks/${encodeURIComponent(taskId)}/complete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

/** GET /api/stats/monthly-completions */
export function getMonthlyCompletions(
  year: number,
  month: number,
): Promise<ApiDailyCompletion[]> {
  const q = new URLSearchParams({
    year: String(year),
    month: String(month),
  });
  return requestJson<ApiDailyCompletion[]>(
    `/api/stats/monthly-completions?${q.toString()}`,
  );
}

/** GET /api/tasks/{task_id}/logs */
export function getTaskLogs(taskId: string): Promise<ApiTaskLog[]> {
  return requestJson<ApiTaskLog[]>(
    `/api/tasks/${encodeURIComponent(taskId)}/logs`,
  );
}

/** GET /api/tasks/{task_id}/stats — pass asOf (YYYY-MM-DD) as browser-local “today” so rest/completion counts match the UI */
export function getTaskStats(
  taskId: string,
  asOf?: string,
): Promise<ApiTaskStats> {
  const q =
    asOf !== undefined && asOf !== ""
      ? `?as_of=${encodeURIComponent(asOf)}`
      : "";
  return requestJson<ApiTaskStats>(
    `/api/tasks/${encodeURIComponent(taskId)}/stats${q}`,
  );
}

/** GET /api/weekly-review — week_start optional (YYYY-MM-DD, any day in week → Monday) */
export function getWeeklyReview(weekStart?: string): Promise<ApiWeeklyReview> {
  const q = weekStart
    ? `?week_start=${encodeURIComponent(weekStart)}`
    : "";
  return requestJson<ApiWeeklyReview>(`/api/weekly-review${q}`);
}

/** GET /api/weekly-reviews — saved weeks, newest Monday first */
export function listWeeklyReviews(limit = 100): Promise<ApiWeeklyReview[]> {
  const q = new URLSearchParams({ limit: String(limit) });
  return requestJson<ApiWeeklyReview[]>(
    `/api/weekly-reviews?${q.toString()}`,
  );
}

/** PUT /api/weekly-review */
export function putWeeklyReview(body: {
  week_start?: string;
  what_worked: string;
  what_to_improve: string;
  what_to_drop: string;
}): Promise<ApiWeeklyReview> {
  return requestJson<ApiWeeklyReview>("/api/weekly-review", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** GET /api/rest-days?from=&to= */
export function listRestDays(from: string, to: string): Promise<ApiRestDay[]> {
  const q = new URLSearchParams({ from, to });
  return requestJson<ApiRestDay[]>(`/api/rest-days?${q.toString()}`);
}

/** POST /api/rest-days */
export function addRestDay(date?: string): Promise<ApiRestDay> {
  return requestJson<ApiRestDay>("/api/rest-days", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(date ? { date } : {}),
  });
}

/** DELETE /api/rest-days/{date} */
export function deleteRestDay(date: string): Promise<void> {
  return requestJson<void>(
    `/api/rest-days/${encodeURIComponent(date)}`,
    { method: "DELETE" },
  );
}

/** GET /api/task-rest-days?on=YYYY-MM-DD — tasks with per-task rest on that day */
export function listTaskRestDaysOnDate(on: string): Promise<ApiTaskRestDay[]> {
  const q = new URLSearchParams({ on });
  return requestJson<ApiTaskRestDay[]>(
    `/api/task-rest-days?${q.toString()}`,
  );
}

/** GET /api/tasks/{task_id}/rest-days?from=&to= */
export function listTaskRestDaysForTask(
  taskId: string,
  from: string,
  to: string,
): Promise<ApiRestDay[]> {
  const q = new URLSearchParams({ from, to });
  return requestJson<ApiRestDay[]>(
    `/api/tasks/${encodeURIComponent(taskId)}/rest-days?${q.toString()}`,
  );
}

/** POST /api/tasks/{task_id}/rest-days — optional { date } */
export function addTaskRestDay(
  taskId: string,
  date?: string,
): Promise<ApiRestDay> {
  return requestJson<ApiRestDay>(
    `/api/tasks/${encodeURIComponent(taskId)}/rest-days`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(date ? { date } : {}),
    },
  );
}

/** DELETE /api/tasks/{task_id}/rest-days/{date} */
export function deleteTaskRestDay(
  taskId: string,
  date: string,
): Promise<void> {
  return requestJson<void>(
    `/api/tasks/${encodeURIComponent(taskId)}/rest-days/${encodeURIComponent(date)}`,
    { method: "DELETE" },
  );
}

function triggerDownload(blob: Blob, filename: string): void {
  const a = document.createElement("a");
  const u = URL.createObjectURL(blob);
  a.href = u;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(u);
}

async function downloadFromApi(path: string, filename: string): Promise<void> {
  assertApiBaseConfigured();
  const url = `${API_BASE_URL}${path}`;
  const auth = await authHeaders();
  let res: Response;
  try {
    res = await fetch(url, { headers: mergeRequestHeaders(auth, undefined) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg === "Failed to fetch" ||
      msg === "Load failed" ||
      e instanceof TypeError
    ) {
      throw new Error(
        `Can't reach the API at ${API_BASE_URL}. Start the FastAPI server and check CORS.`,
      );
    }
    throw e;
  }
  await throwIfNotOk(res);
  const blob = await res.blob();
  triggerDownload(blob, filename);
}

export function downloadExportJson(): Promise<void> {
  return downloadFromApi("/api/export/json", "noexcuses-export.json");
}

export function downloadExportCsv(): Promise<void> {
  return downloadFromApi("/api/export/csv", "noexcuses-export.csv");
}
