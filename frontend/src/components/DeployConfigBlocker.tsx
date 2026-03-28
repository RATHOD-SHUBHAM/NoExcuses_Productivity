import { PageBackdrop } from "./layout/PageBackdrop";

type Props = {
  issues: string[];
  deploySha?: string;
};

export function DeployConfigBlocker({ issues, deploySha }: Props) {
  const sha = (deploySha ?? "").trim();

  return (
    <div className="relative flex min-h-dvh flex-col font-sans text-zinc-100">
      <PageBackdrop />
      <main className="relative z-0 mx-auto max-w-lg flex-1 px-4 py-16">
        <h1 className="text-lg font-semibold text-rose-200">
          Can&apos;t show sign-in — Supabase env missing in this build
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          The login page needs{" "}
          <code className="text-zinc-300">VITE_SUPABASE_URL</code> and{" "}
          <code className="text-zinc-300">VITE_SUPABASE_ANON_KEY</code> baked at
          build time. Fixing env in Vercel without a new deploy does nothing.
          (Missing <code className="text-zinc-300">VITE_API_BASE_URL</code> alone
          no longer blocks this screen — you can sign in; tasks need the API
          URL.)
        </p>
        <ul className="mt-6 list-disc space-y-2 pl-5 text-sm text-zinc-300">
          {issues.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <ol className="mt-8 list-decimal space-y-2 pl-5 text-sm text-zinc-400">
          <li>
            Vercel → your project → Settings → Environment Variables → check{" "}
            <strong className="font-medium text-zinc-300">Production</strong>{" "}
            (not only Preview).
          </li>
          <li>
            Deployments → open the latest → Redeploy (or push a commit).
          </li>
          <li>
            Root Directory must be <code className="text-zinc-300">frontend</code>{" "}
            so <code className="text-zinc-300">npm run build</code> runs there.
          </li>
        </ol>
        <p className="mt-8 text-xs text-zinc-600">
          Build id:{" "}
          <code className="text-zinc-500">
            {sha.length > 0 ? sha : "not injected (local build or old pipeline)"}
          </code>
          . After redeploy, this should match your latest Git commit on Vercel.
        </p>
        <p className="mt-2 text-xs text-zinc-600">
          Deploy fingerprint:{" "}
          <code className="text-zinc-500">
            {(import.meta.env.VITE_DEPLOY_FINGERPRINT ?? "").trim() || "—"}
          </code>
          . If this never changes after you redeploy, Vercel is not building your latest commit.
        </p>
        <p className="mt-4 text-xs text-zinc-600">
          If this screen disappears but the app still errors: on Render set{" "}
          <code className="text-zinc-500">CORS_ORIGINS</code> to your exact Vercel
          URL; confirm <code className="text-zinc-500">SUPABASE_JWT_SECRET</code>{" "}
          matches Supabase → Project Settings → API.
        </p>
      </main>
    </div>
  );
}
