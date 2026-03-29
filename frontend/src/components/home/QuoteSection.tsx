import { useEffect, useState } from "react";
import { homeFeaturePanel, homePanelPad } from "../../lib/ui";
import { fetchRandomZenQuote } from "../../lib/zenQuotes";

const FALLBACK: { quote: string; author: string } = {
  quote: "Discipline equals freedom",
  author: "Jocko Willink",
};

type QuoteSectionProps = {
  /** Tighter strip for dashboard layouts (smaller type, less padding). */
  compact?: boolean;
};

export function QuoteSection({ compact = false }: QuoteSectionProps) {
  const [quote, setQuote] = useState<string | null>(null);
  const [author, setAuthor] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">(
    "loading",
  );

  useEffect(() => {
    const ac = new AbortController();
    setStatus("loading");
    setQuote(null);
    setAuthor(null);

    fetchRandomZenQuote(ac.signal)
      .then(({ quote: q, author: a }) => {
        setQuote(q);
        setAuthor(a);
        setStatus("ready");
      })
      .catch(() => {
        if (ac.signal.aborted) return;
        setQuote(FALLBACK.quote);
        setAuthor(FALLBACK.author);
        setStatus("fallback");
      });

    return () => ac.abort();
  }, []);

  const displayQuote = quote ?? FALLBACK.quote;
  const displayAuthor = author ?? FALLBACK.author;

  return (
    <section
      aria-labelledby="quote-heading"
      className={`${homeFeaturePanel} ${homePanelPad} relative overflow-hidden ${compact ? "py-3 sm:py-4" : "py-6 sm:py-7"}`}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-rose-500/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-12 h-40 w-56 rounded-full bg-emerald-600/15 blur-3xl"
        aria-hidden
      />
      <h2 id="quote-heading" className="sr-only">
        Motivational quote
      </h2>
      <blockquote
        className={
          compact
            ? "relative text-left md:flex md:items-start md:justify-between md:gap-6"
            : "relative text-center"
        }
      >
        <p
          className={`font-display text-balance font-normal italic leading-snug tracking-tight text-white ${compact ? "text-base sm:text-lg md:max-w-[85%]" : "text-2xl sm:text-3xl sm:leading-snug md:text-[1.65rem] md:leading-[1.35]"} ${status === "loading" ? "animate-pulse text-zinc-500" : ""}`}
        >
          {status === "loading" ? "…" : `“${displayQuote}”`}
        </p>
        <footer
          className={
            compact
              ? "mt-2 shrink-0 text-sm font-medium text-rose-300/85 md:mt-0 md:text-right"
              : "mt-5 text-base font-medium text-rose-300/85"
          }
        >
          {status === "loading"
            ? "Loading inspiration…"
            : `— ${displayAuthor}`}
          {status === "fallback" && (
            <span
              className={
                compact
                  ? "mt-1 block text-xs font-normal text-zinc-500"
                  : "mt-2 block text-sm font-normal text-zinc-500"
              }
            >
              Couldn’t reach Zen Quotes — showing a fallback.
            </span>
          )}
        </footer>
      </blockquote>
    </section>
  );
}
