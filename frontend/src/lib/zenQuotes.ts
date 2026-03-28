function zenRandomUrl(): string {
  if (import.meta.env.DEV) {
    return "/zen-api/api/random";
  }
  return "https://zenquotes.io/api/random";
}

export type ZenQuote = {
  quote: string;
  author: string;
};

type ZenApiItem = {
  q: string;
  a: string;
};

/** Fetches one random quote from zenquotes.io (new quote each HTTP request). */
export async function fetchRandomZenQuote(
  signal?: AbortSignal,
): Promise<ZenQuote> {
  const res = await fetch(zenRandomUrl(), { signal });
  if (!res.ok) {
    throw new Error(`Zen Quotes request failed: ${res.status}`);
  }
  const data = (await res.json()) as ZenApiItem[];
  const item = data[0];
  if (!item?.q) {
    throw new Error("Zen Quotes returned no quote");
  }
  return { quote: item.q, author: item.a?.trim() || "Unknown" };
}
