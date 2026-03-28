# NoExcuses Productivity

## Description

NoExcuses is a habit and productivity tracker: tasks with daily completion logs, streaks and stats, weekly reviews (saved in the database with history and export), global and per-task rest days, and CSV/JSON export. The app is a **React (Vite) frontend** and a **FastAPI backend** backed by **Supabase (PostgreSQL)**.

## Version

| Component | Version |
|-----------|---------|
| Monorepo / app | **0.1.0** (see root `pyproject.toml` and `frontend/package.json`) |
| Backend package | **0.1.0** (`backend/pyproject.toml`) |

Bump versions in those files when you ship meaningful releases.

## Getting started

You need:

1. **Node.js** (18+) and **npm** for the frontend.
2. **Python 3.14+** and **[uv](https://docs.astral.sh/uv/)** for the backend (see `.python-version`).
3. A **Supabase** project and API keys.

Clone the repository, configure environment variables, apply SQL migrations in Supabase, then run the API and the dev server (see **Installation** and **Executing**).

## Dependencies

### Frontend (`frontend/`)

- **Runtime:** React 19, React Router, Recharts, Tailwind CSS 4 (via Vite).
- **Tooling:** TypeScript, Vite 6, `@vitejs/plugin-react`.

### Backend (`backend/`)

- **Runtime:** FastAPI, Uvicorn, Pydantic Settings, Supabase Python client.

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

- Copy **`.env.example`** to **`.env`** at the repo root (Supabase and optional `CORS_ORIGINS`).
- Copy **`frontend/.env.example`** to **`frontend/.env`** for local API URL if needed.

Never commit real `.env` files or keys.

## Configuration

| Variable | Where | Purpose |
|----------|--------|---------|
| `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` | Root `.env` | Backend database access; elevated key required for writes with dev RLS setup. |
| `CORS_ORIGINS` | Root `.env` (production) | Comma-separated browser origins. Local `http://localhost:5173` and `http://127.0.0.1:5173` are always allowed in code in addition to this list. |
| `VITE_API_BASE_URL` | `frontend/.env` or Vercel | Public API URL, **no trailing slash**. Defaults to local dev URL when unset. |

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

Optional: **`001_task_logs_unique_task_date.sql`** only if your `task_logs` table was created without the unique constraint.

## Deployment (summary)

Typical setup: **Vercel** (frontend, root `frontend/`) + **Render** (backend, root `backend/`).

| Host | Variable | Notes |
|------|-----------|--------|
| Vercel | `VITE_API_BASE_URL` | Your HTTPS API URL, no trailing `/`. Rebuild after changes. |
| Render | `SUPABASE_*`, `CORS_ORIGINS` | Match your Vercel origin exactly in `CORS_ORIGINS`. |

Render example: **Root Directory** `backend`, build `pip install .`, start `uvicorn noexcuses_backend.main:app --host 0.0.0.0 --port $PORT`. See **`render.yaml`** if present for a blueprint starting point. **`frontend/vercel.json`** supports SPA routing on refresh.

**Checklist:** API URL in Vercel matches Render; `CORS_ORIGINS` includes your Vercel origin; secrets only in host env, never in git.

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
