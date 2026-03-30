# NoExcuses Productivity

## Live app

| | URL |
|---|-----|
| **Frontend (Vercel)** | [https://noexcuses-zeta.vercel.app/login](https://noexcuses-zeta.vercel.app/login) |
| **Backend API (Render)** | [https://noexcuses-productivity.onrender.com](https://noexcuses-productivity.onrender.com) |

Open the Vercel link to use the app. **New user?** Use **sign up** with your email and password. **Returning?** Use **sign in**. The app uses Supabase Auth; confirm your email if your Supabase project requires it.


## Screenshots

<img width="1105" height="234" alt="Image" src="https://github.com/user-attachments/assets/15f4125d-ed14-4179-a45b-c63c926495ad" />

<img width="1122" height="876" alt="Image" src="https://github.com/user-attachments/assets/5c5e907c-400c-44ac-9898-2163cd128c58" />

<img width="1108" height="913" alt="Image" src="https://github.com/user-attachments/assets/7352004c-a318-417f-9d91-aa9767642906" />

---

## Description

NoExcuses is a habit and accountability app: **per-account** data with **Supabase Auth** (email/password), **daily** and **monthly** goals, completion logs, calendar heatmaps, rest days (whole-day and per-habit), rhythm charts, a **weekly review** (saved per week), and a **weekend wishlist** (ideas for the coming Sat–Sun — not habit tasks). Optional **time windows** (HH:MM) for daily habits and a **12h / 24h** time display preference (browser, stored locally).

**Daily todos** can be **today’s plan only** (a fresh list each calendar day) or **repeat every day** (recurring habit). That behavior is stored as `daily_for_date` on `tasks` (see migrations). The home dashboard can show **yesterday’s check-in summary** (done / not done / rested for daily and monthly tasks) via `GET /api/stats/day-checkin`. The UI also refreshes when the **local calendar day** changes (tab left open overnight). **Monthly goals** on the task detail page use **month-scoped heatmaps** (days outside the goal month look different from “not done” inside the month), plus a **days missed** count.

Stack: **React (Vite)** frontend, **FastAPI** API, **Supabase (PostgreSQL)** with row-level security.

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

Clone the repository, configure environment variables, apply **all** SQL migrations through **`009_daily_for_date.sql`** in Supabase, then run the API and the dev server (see **Installation** and **Run locally**).

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

## Run locally

After **Installation**—including copying `.env.example` to `.env` at the repo root and applying **Database (Supabase)** migrations (through **`009_daily_for_date.sql`**)—run the API and the frontend in **two terminals** from the repository root.

1. **API (terminal 1)**

   ```bash
   uv run --package noexcuses-backend uvicorn noexcuses_backend.main:app --reload
   ```

   - API: `http://127.0.0.1:8000/`
   - Interactive docs: `http://127.0.0.1:8000/docs`

2. **Frontend (terminal 2)**

   ```bash
   cd frontend
   npm run dev
   ```

3. Open **`http://localhost:5173/`** in the browser.

   Keep **`VITE_API_BASE_URL=http://127.0.0.1:8000`** in your root `.env` (as in `.env.example`) so the browser calls your local API, not production.

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
6. **`006_task_kinds.sql`** — `task_kind` (`daily` | `monthly`) and `month_bucket` on `tasks` for monthly goals vs daily todos.
7. **`007_task_time_windows.sql`** — `window_start` / `window_end` on `tasks` (optional HH:MM windows for daily habits). Required for task create/update that sets time windows.
8. **`008_weekend_plans.sql`** — `weekend_plans` (weekend **wishlist** items stored as JSON in `notes`, keyed by Saturday). Required for the **This weekend** section on Home.
9. **`009_daily_for_date.sql`** — `daily_for_date` on `tasks` (nullable). When set for a **daily** task, that row only appears on that calendar day (browser-local); `NULL` means a recurring daily habit. Monthly tasks must keep `daily_for_date` null.

Optional: **`001_task_logs_unique_task_date.sql`** only if your `task_logs` table was created without the unique constraint.

If you ever ran a one-off migration named `007_daily_for_date.sql`, **`009_daily_for_date.sql`** is still safe to apply (`add column if not exists`).

### API notes

- **`GET /api/stats/day-checkin?on=YYYY-MM-DD`** — Returns done / not done / rested counts for **daily** and **monthly** tasks that apply on that calendar day (used for the **Yesterday** card on Home).

## Deploy to Render (API) and Vercel (frontend)

Typical flow: deploy the **backend first**, copy its public URL, then deploy the **frontend** with that URL, then finish **CORS** on Render.

### Prerequisite: Supabase

- Run all SQL migrations through **`009_daily_for_date.sql`** (see **Database (Supabase)** below).
- **Authentication → Providers:** enable **Email** (or your provider).
- **Authentication → URL configuration:** add your production site URL for redirects / email links, e.g. `https://noexcuses-zeta.vercel.app`.

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
   | `CORS_ORIGINS` | Your Vercel origin, e.g. `https://noexcuses-zeta.vercel.app` (comma-separated if you add more). |

5. **Create Web Service** and wait for deploy. Example service URL: `https://noexcuses-productivity.onrender.com`.

**Optional:** **New → Blueprint** and point at `render.yaml` in the repo, then add the same env vars in the dashboard.

### 2. Vercel (Vite / React)

1. **Import** the same Git repository.
2. **Root Directory:** `frontend` (or “Edit” and set to `frontend`).
3. **Framework:** Vite (auto-detected).
4. **Environment Variables** (Production — and Preview if you want preview deploys to hit the same API):

   | Key | Value |
   |-----|--------|
   | `VITE_API_BASE_URL` | Your Render URL, e.g. `https://noexcuses-productivity.onrender.com` (**no** trailing `/`). |
   | `VITE_SUPABASE_URL` | Same as `SUPABASE_URL`. |
   | `VITE_SUPABASE_ANON_KEY` | Same publishable/anon key as `SUPABASE_KEY` on Render. |

5. **Deploy.** Open [the app](https://noexcuses-zeta.vercel.app/login) and sign in.

**Note:** Vite bakes `VITE_*` in at **build time**. After changing any of them, trigger a **Redeploy** on Vercel.

**SPA:** `frontend/vercel.json` rewrites all routes to `index.html` so `/tasks/...` works on refresh.

### 3. Finish CORS

If the browser shows CORS errors, set **`CORS_ORIGINS`** on Render to the **exact** origin Vercel shows (scheme + host, no path). Redeploy or restart the Render service if needed.

### Checklist

- [ ] Supabase: migrations **000 → 009** applied on the project you use in production (`007` time windows, `008` weekend wishlist, `009` day-scoped daily todos / `daily_for_date`).
- [ ] Render: `SUPABASE_KEY` is **publishable**, not service_role.
- [ ] Vercel: `VITE_API_BASE_URL` matches Render (HTTPS, no trailing `/`).
- [ ] Render: `CORS_ORIGINS` includes your Vercel production URL.
- [ ] Secrets only in Render / Vercel env, never committed.
- [ ] Free Render tier may **sleep**; first request after idle can be slow.

### Troubleshooting

- **Browser can’t reach the API** — Ensure the FastAPI service is running (local: port 8000), `VITE_API_BASE_URL` matches the API origin (no trailing slash), and redeploy Vercel after changing `VITE_*`.
- **Database / schema errors** — If Supabase returns missing column or table errors, run the corresponding SQL from `backend/sql/` in order. PostgREST may need a moment to refresh schema after `ALTER TABLE`.

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
