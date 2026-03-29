import { useState } from "react";
import * as tasksApi from "../../api/tasksApi";

/** JSON/CSV backup downloads — lives in the site footer so home stays focused. */
export function DataExportFooter() {
  const [busy, setBusy] = useState<"json" | "csv" | null>(null);

  async function run(kind: "json" | "csv") {
    setBusy(kind);
    try {
      if (kind === "json") {
        await tasksApi.downloadExportJson();
      } else {
        await tasksApi.downloadExportCsv();
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-5">
      <p className="text-sm text-zinc-500">
        <span className="text-zinc-500">Backup your data — </span>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void run("json")}
          className="text-zinc-400 underline-offset-2 transition hover:text-zinc-200 hover:underline disabled:opacity-50"
        >
          {busy === "json" ? "…" : "JSON"}
        </button>
        <span className="text-zinc-700"> · </span>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void run("csv")}
          className="text-zinc-400 underline-offset-2 transition hover:text-zinc-200 hover:underline disabled:opacity-50"
        >
          {busy === "csv" ? "…" : "CSV"}
        </button>
      </p>
    </div>
  );
}
