import type { ApiWeeklyReview } from "../api/types";
import { formatWeekLabel } from "./week";

function triggerDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function formatWeeklyReviewAsText(r: ApiWeeklyReview): string {
  const label = formatWeekLabel(r.week_start);
  const empty = "(empty)";
  return [
    "NoExcuses — Weekly review",
    `Week of ${label} (Monday ${r.week_start})`,
    "",
    "What worked:",
    r.what_worked.trim() || empty,
    "",
    "What to improve next week:",
    r.what_to_improve.trim() || empty,
    "",
    "What to drop or say no to:",
    r.what_to_drop.trim() || empty,
    "",
  ].join("\n");
}

export function downloadWeeklyReviewTxt(r: ApiWeeklyReview): void {
  const safe = r.week_start.replace(/-/g, "");
  const blob = new Blob([formatWeeklyReviewAsText(r)], {
    type: "text/plain;charset=utf-8",
  });
  triggerDownload(`weekly-review-${safe}.txt`, blob);
}

export function downloadWeeklyReviewsJson(reviews: ApiWeeklyReview[]): void {
  const blob = new Blob([JSON.stringify(reviews, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  triggerDownload(`weekly-reviews-all-${stamp}.json`, blob);
}
