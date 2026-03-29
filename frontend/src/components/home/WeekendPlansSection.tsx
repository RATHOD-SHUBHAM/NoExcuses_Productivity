import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import * as tasksApi from "../../api/tasksApi";
import type { ApiWeekendWishlistItem } from "../../api/types";
import { formatWeekendRangeLabel, upcomingWeekendSaturdayISO } from "../../lib/weekend";
import { glassCard, inputBase } from "../../lib/ui";
import { SectionHeading } from "../ui/SectionHeading";

function newWishlistId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function WeekendPlansSection() {
  const [weekendStart, setWeekendStart] = useState(() =>
    upcomingWeekendSaturdayISO(),
  );
  const [items, setItems] = useState<ApiWeekendWishlistItem[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persist = useCallback(
    async (next: ApiWeekendWishlistItem[]) => {
      const ws = upcomingWeekendSaturdayISO();
      setWeekendStart(ws);
      setSaving(true);
      setError(null);
      try {
        const r = await tasksApi.putWeekendPlan({
          weekend_start: ws,
          items: next,
        });
        setItems(r.items ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save");
        try {
          const cur = await tasksApi.getWeekendPlan(ws);
          setItems(cur.items ?? []);
        } catch {
          /* ignore */
        }
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const load = useCallback(async () => {
    const ws = upcomingWeekendSaturdayISO();
    setWeekendStart(ws);
    setError(null);
    setLoading(true);
    try {
      const r = await tasksApi.getWeekendPlan(ws);
      setItems(r.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load weekend list");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function addItem(e?: FormEvent) {
    e?.preventDefault();
    const t = draft.trim();
    if (!t || saving || items.length >= 50) return;
    const next = [
      ...items,
      { id: newWishlistId(), text: t, done: false },
    ];
    setDraft("");
    setItems(next);
    void persist(next);
  }

  function toggleDone(id: string) {
    const next = items.map((it) =>
      it.id === id ? { ...it, done: !it.done } : it,
    );
    setItems(next);
    void persist(next);
  }

  function removeItem(id: string) {
    const next = items.filter((it) => it.id !== id);
    setItems(next);
    void persist(next);
  }

  return (
    <section
      aria-labelledby="weekend-plans-heading"
      className={`${glassCard} border-white/[0.08] p-3 sm:p-4`}
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <SectionHeading id="weekend-plans-heading">This weekend</SectionHeading>
          <p className="mt-1 text-xs text-zinc-500">
            {formatWeekendRangeLabel(weekendStart)}
          </p>
        </div>
        <span className="rounded-full border border-amber-500/25 bg-amber-950/35 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-100/90">
          Wishlist
        </span>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-zinc-500">
        Not habits — just ideas you’re holding for Sat–Sun.
      </p>
      {error ? (
        <p className="mb-3 text-sm text-red-300/90" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <>
          {items.length === 0 ? (
            <p
              className={`${glassCard} mb-3 border-dashed border-white/10 py-6 text-center text-sm text-zinc-500`}
            >
              Nothing queued yet — add something below.
            </p>
          ) : (
            <ul className="mb-3 flex flex-col gap-1.5">
              {items.map((it) => (
                <li
                  key={it.id}
                  className={`${glassCard} !p-0 !shadow-md transition hover:border-white/10`}
                >
                  <div className="flex items-start gap-3 p-3 sm:items-center sm:py-2.5 sm:pl-3 sm:pr-2">
                    <input
                      type="checkbox"
                      checked={it.done}
                      disabled={saving}
                      onChange={() => toggleDone(it.id)}
                      className="mt-0.5 size-[1.125rem] shrink-0 rounded border-zinc-500 bg-zinc-950 text-amber-500 focus:ring-2 focus:ring-amber-500/35 focus:ring-offset-0 disabled:opacity-50 sm:mt-0"
                      aria-label={
                        it.done ? `Mark “${it.text}” not done` : `Done: ${it.text}`
                      }
                    />
                    <span
                      className={[
                        "min-w-0 flex-1 text-sm leading-snug text-zinc-100 [overflow-wrap:anywhere]",
                        it.done ? "text-zinc-500 line-through" : "",
                      ].join(" ")}
                    >
                      {it.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(it.id)}
                      disabled={saving}
                      className="shrink-0 rounded-md px-2 py-1 text-sm font-medium text-zinc-500 transition hover:bg-red-950/40 hover:text-red-300 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <form
            onSubmit={(e) => void addItem(e)}
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2"
          >
            <label htmlFor="weekend-wishlist-draft" className="sr-only">
              Add a weekend idea
            </label>
            <input
              id="weekend-wishlist-draft"
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Something you might do this weekend…"
              disabled={saving || items.length >= 50}
              maxLength={500}
              className={`min-h-10 flex-1 px-3 py-2 text-sm ${inputBase} disabled:opacity-50`}
            />
            <button
              type="submit"
              disabled={
                saving || draft.trim().length === 0 || items.length >= 50
              }
              className="min-h-10 shrink-0 rounded-xl bg-gradient-to-br from-amber-500/90 to-amber-600 px-4 text-sm font-semibold text-zinc-950 shadow-[0_0_20px_-8px_rgba(245,158,11,0.45)] transition hover:from-amber-400 hover:to-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add
            </button>
          </form>
          {items.length >= 50 ? (
            <p className="mt-2 text-xs text-zinc-500">50 ideas max for one weekend.</p>
          ) : null}
          {saving ? (
            <p className="mt-2 text-xs text-zinc-500">Saving…</p>
          ) : null}
        </>
      )}
    </section>
  );
}
