import { useEffect, useState } from "react";
import { glassCard } from "../../lib/ui";
import { fetchRandomZenQuote } from "../../lib/zenQuotes";

const FALLBACK: { quote: string; author: string } = {
  quote: "Discipline equals freedom",
  author: "Jocko Willink",
};

export function QuoteSection() {
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
      className={`${glassCard} relative overflow-hidden px-5 py-8 sm:px-8 sm:py-10`}
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
      <blockquote className="relative text-center">
        <p
          className={`font-display text-balance text-2xl font-normal italic leading-snug tracking-tight text-white sm:text-3xl sm:leading-snug md:text-[1.65rem] md:leading-[1.35] ${status === "loading" ? "animate-pulse text-zinc-500" : ""}`}
        >
          {status === "loading" ? "…" : `“${displayQuote}”`}
        </p>
        <footer className="mt-5 text-sm font-medium text-rose-300/85">
          {status === "loading"
            ? "Loading inspiration…"
            : `— ${displayAuthor}`}
          {status === "fallback" && (
            <span className="mt-2 block text-xs font-normal text-zinc-500">
              Couldn’t reach Zen Quotes — showing a fallback.
            </span>
          )}
        </footer>
      </blockquote>
    </section>
  );
}
