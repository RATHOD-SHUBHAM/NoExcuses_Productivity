# NoExcuses Productivity

## Description

NoExcuses is a habit and productivity tracker: **per-account** data with **Supabase Auth** (email/password), tasks with daily completion logs, streaks and stats, weekly reviews (saved in the database with history and export), global and per-task rest days, and CSV/JSON export. The app is a **React (Vite) frontend** and a **FastAPI backend** backed by **Supabase (PostgreSQL)** and row-level security.

## Version

| Component | Version |
|-----------|---------|
| Monorepo / app | **0.1.0** (see root `pyproject.toml` and `frontend/package.json`) |
| Backend package | **0.1.0** (`backend/pyproject.toml`) |

Bump versions in those files when you ship meaningful releases.

## Getting started

You need:

1. **Node.js** (18+) and **npm** for the frontend.
2. **Python 3.12+** and **[uv](https://docs.astral.sh/uv/)** for the backend (see `.python-version` for a suggested local version).
3. A **Supabase** project and API keys.

Clone the repository, configure environment variables, apply SQL migrations in Supabase, then run the API and the dev server (see **Installation** and **Executing**).

## Dependencies

### Frontend (`frontend/`)

- **Runtime:** React 19, React Router, Recharts, Tailwind CSS 4 (via Vite), `@supabase/supabase-js` for auth.
- **Tooling:** TypeScript, Vite 6, `@vitejs/plugin-react`.

### Backend (`backend/`)

- **Runtime:** FastAPI, Uvicorn, Pydantic Settings, PyJWT, Supabase Python client.

### Data

- **Supabase / PostgreSQL** — schema scripts live in `backend/sql/`.

## Installation

### 1. Clone the repository

```bash
git clone <your-fork-or-upstream-url>
cd NoExcuses_Productivity
```

### 2. Backend

From the **repository root**:

```bash
uv sync
```

This installs workspace dependencies and the backend package.

### 3. Frontend

```bash
cd frontend
npm install
cd ..
```

### 4. Environment files

- Copy **`.env.example`** to **`.env`** at the **repo root** (`SUPABASE_*`, `SUPABASE_JWT_SECRET`, `VITE_*`, optional `CORS_ORIGINS`). Vite is set to read this same file when you run `npm run dev` from `frontend/` (see `frontend/vite.config.ts` `envDir`). You can still use **`frontend/.env`** for overrides if you prefer.

Never commit real `.env` files or keys.

## Configuration

| Variable | Where | Purpose |
|----------|--------|---------|
| `SUPABASE_URL` | Root `.env` | Supabase project URL. |
| `SUPABASE_KEY` | Root `.env` | **Anon / publishable** key only. The API sends each user’s JWT to PostgREST so RLS applies; do **not** put the service_role or secret key here. |
| `SUPABASE_JWT_SECRET` | Root `.env` | From Supabase → Project Settings → API (JWT secret). Verifies access tokens. |
| `CORS_ORIGINS` | Root `.env` (production) | Comma-separated browser origins. Local `http://localhost:5173` and `http://127.0.0.1:5173` are always allowed in code in addition to this list. |
| `VITE_API_BASE_URL` | `frontend/.env` or Vercel | Public API URL, **no trailing slash**. Defaults to local dev URL when unset. |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | `frontend/.env` or Vercel | Same project as above; used for sign-in and session. |

## Executing

### API (development)

From the **repository root**:

```bash
uv run --package noexcuses-backend uvicorn noexcuses_backend.main:app --reload
```

- API: `http://127.0.0.1:8000/`
- Interactive docs: `http://127.0.0.1:8000/docs`

### Frontend (development)

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173/` in the browser.

### Production build (frontend)

```bash
cd frontend
npm run build
npm run preview   # optional local check of dist/
```

## Database (Supabase)

In the Supabase SQL editor, run scripts **in order** from `backend/sql/`:

1. **`000_core_tables.sql`** — `tasks`, `task_logs`
2. **`002_rls_dev_policies.sql`** — RLS policies (dev-oriented)
3. **`003_productivity_features.sql`** — `weekly_reviews`, `rest_days`, RLS
4. **`004_task_rest_days.sql`** — per-task rest marks and related features
5. **`005_user_isolation.sql`** — **per-user** columns and RLS (`user_id`, composite keys). **Truncates** all habit/review/rest data. Enable **Email** (or your provider) under **Authentication → Providers** before users sign up.

Optional: **`001_task_logs_unique_task_date.sql`** only if your `task_logs` table was created without the unique constraint.

## Deploy to Render (API) and Vercel (frontend)

Typical flow: deploy the **backend first**, copy its public URL, then deploy the **frontend** with that URL, then finish **CORS** on Render.

### Prerequisite: Supabase

- Run all SQL migrations through **`005_user_isolation.sql`** (see **Database (Supabase)** below).
- **Authentication → Providers:** enable **Email** (or your provider).
- **Authentication → URL configuration:** add your production site URL when you have it, e.g. `https://your-project.vercel.app` (for redirects / email links if you use them).

### 1. Render (FastAPI)

1. Push the repo to GitHub (or GitLab / Bitbucket as supported by Render).
2. **Dashboard → New → Web Service** → connect the repo.
3. **Settings:**
   - **Root Directory:** `backend`
   - **Build Command:** `pip install .`
   - **Start Command:** `uvicorn noexcuses_backend.main:app --host 0.0.0.0 --port $PORT`
   - **Python version:** e.g. **3.12** (see `render.yaml` `PYTHON_VERSION`; avoids hosts that do not yet ship 3.14).
4. **Environment** (no trailing slashes on URLs):

   | Key | Value |
   |-----|--------|
   | `SUPABASE_URL` | `https://YOUR_REF.supabase.co` |
   | `SUPABASE_KEY` | **Anon / publishable** key (`sb_publishable_…`). **Not** the service_role JWT. |
   | `SUPABASE_JWT_SECRET` | JWT secret from Supabase **Project Settings → API** (still required for HS256; JWKS is used for RS256). |
   | `CORS_ORIGINS` | Your Vercel origin after step 2, e.g. `https://your-project.vercel.app`. You can add more comma-separated. |

5. **Create Web Service** and wait for deploy. Copy the URL, e.g. `https://noexcuses-api.onrender.com`.

**Optional:** **New → Blueprint** and point at `render.yaml` in the repo, then add the same env vars in the dashboard.

### 2. Vercel (Vite / React)

1. **Import** the same Git repository.
2. **Root Directory:** `frontend` (or “Edit” and set to `frontend`).
3. **Framework:** Vite (auto-detected).
4. **Environment Variables** (Production — and Preview if you want preview deploys to hit the same API):

   | Key | Value |
   |-----|--------|
   | `VITE_API_BASE_URL` | Your Render URL, e.g. `https://noexcuses-api.onrender.com` (**no** trailing `/`). |
   | `VITE_SUPABASE_URL` | Same as `SUPABASE_URL`. |
   | `VITE_SUPABASE_ANON_KEY` | Same publishable/anon key as `SUPABASE_KEY` on Render. |

5. **Deploy.** Open the `.vercel.app` URL and sign in.

**Note:** Vite bakes `VITE_*` in at **build time**. After changing any of them, trigger a **Redeploy** on Vercel.

**SPA:** `frontend/vercel.json` rewrites all routes to `index.html` so `/tasks/...` works on refresh.

### 3. Finish CORS

If the browser shows CORS errors, set **`CORS_ORIGINS`** on Render to the **exact** origin Vercel shows (scheme + host, no path). Redeploy or restart the Render service if needed.

### Checklist

- [ ] Render: `SUPABASE_KEY` is **publishable**, not service_role.
- [ ] Vercel: `VITE_API_BASE_URL` matches Render (HTTPS, no trailing `/`).
- [ ] Render: `CORS_ORIGINS` includes your Vercel production URL.
- [ ] Secrets only in Render / Vercel env, never committed.
- [ ] Free Render tier may **sleep**; first request after idle can be slow.

### Local vs production env

- **Backend** reads the repo **root** `.env` (or host env on Render).
- **Frontend** in dev can use root or `frontend/.env` (see `frontend/vite.config.ts`). On Vercel, only **Project → Environment Variables** apply.

## Contributing & opening a pull request

Work on a **dedicated branch** — do not commit directly to `main` (or the default branch) for feature work.

1. **Sync** your local `main` with upstream (fetch and merge or rebase as your team prefers).
2. **Create a branch** from `main`:

   ```bash
   git checkout main
   git pull origin main
   git checkout -b your-name/short-feature-description
   ```

3. **Implement** your change; keep commits focused and messages clear.
4. **Run** what applies: `npm run build` in `frontend`, and exercise the API locally if you touched the backend.
5. **Push** the branch:

   ```bash
   git push -u origin your-name/short-feature-description
   ```

6. **Open a PR** on GitHub (or your host): target the default branch, describe *what* changed and *why*, link issues if any, and note any env or SQL migration steps.

7. **Review** feedback and update the same branch; avoid mixing unrelated features in one PR.

Maintainers merge after review and passing checks.
