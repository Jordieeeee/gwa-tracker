# GWA Tracker

IT 412 Platform Technologies final project: a Cloud PaaS web app with a REST API.

A student enters one semester's subjects. The **server** validates them, computes the weighted GWA and an academic standing with reasons, saves the record to a managed cloud database, and shows it back.

**Live URL:** `https://YOUR-APP.onrender.com` (fill in after deploying)

---

## Before you submit: replace the placeholders

These rules are **placeholders**, not official BatStateU policy. Check them against the student handbook:

| What | File |
|---|---|
| Dean's List GWA cutoff, worst grade allowed, minimum units | `server/config/standing.js` |
| Subjects excluded from GWA (currently `NSTP`) | `server/config/standing.js` |
| Valid grade marks, and whether 5.00 counts in GWA | `db/schema.sql` **and** `shared/constants.js` (a test fails if they differ) |

---

## Rubric mapping

| Rubric part | Where it is |
|---|---|
| P1: PaaS vs IaaS + diagram | Write-up by the group (see "Part 1 notes" below) |
| P2: Dynamic app on Render | Express handles input and runs the GWA/standing logic (`server/services/gwa.service.js`). Auto-deployed from GitHub to Render. |
| P3: Cloud database, store and render back | Supabase Postgres. `POST` saves the record; History and Detail pages read it back. |
| P4: GET + POST, 200/201/400, Postman | `server/routes/api.routes.js`, collection in `postman/` |

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS, react-router-dom |
| Backend | Node.js 22 + Express 5 |
| Database | Supabase Postgres via `pg` (Session pooler) |
| Validation | zod, one schema in `shared/` used by both the form and the API |
| Security | helmet, express-rate-limit, parameterized SQL, RLS |
| Hosting | Render Web Service (one service serves the React build and `/api`) |

```
Browser ──HTTPS──> Render Web Service (Express)
                     ├─ serves client/dist (React)
                     └─ /api/* → routes → validation → GWA service → repository
                                                                  │ TLS, pooled
                                                                  ▼
                                                         Supabase Postgres
```

## Project structure

```
client/          React app (pages, components, api.js)
server/
  config/        standing.js: honors rules (PLACEHOLDERS)
  db/            pool.js: Postgres connection
  middleware/    errors.js: one JSON error format, status code mapping
  repositories/  records.repo.js: all SQL, parameterized, transaction on save
  routes/        api.routes.js: the REST endpoints
  services/      gwa.service.js: GWA + standing logic (pure, unit-tested)
shared/          constants + zod schema used by client AND server
db/schema.sql    tables, grade_scale seed, RLS
tests/           unit tests + API integration tests
postman/         Postman collection (14 requests)
.github/workflows/keepalive.yml
```

---

## API

All responses are JSON. Errors always look like:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid input",
  "details": [{ "field": "subjects[0].grade", "message": "Grade must be one of ..." }] } }
```

| Method | Route | Success | Errors |
|---|---|---|---|
| GET | `/api/health` | 200 | 503 if the database is down |
| GET | `/api/grade-scale` | 200 | 503 |
| GET | `/api/records` | 200 (newest 50) | 503 |
| GET | `/api/records/:id` | 200 | 400 bad id, 404 not found |
| POST | `/api/records` | **201** + `Location` header | **400** invalid input or JSON, 413 too large, 415 not JSON, 429 rate limited, 503 |

**POST body:**

```json
{
  "studentAlias": "Juan",
  "academicYear": "2026-2027",
  "semester": "1ST",
  "subjects": [
    { "code": "IT 412", "units": 3, "grade": "1.25" },
    { "code": "IT 413", "units": 3, "grade": "INC" }
  ]
}
```

**Validation rules:** nickname 2–60 characters and no student-number patterns; academic year `YYYY-YYYY` with consecutive years; semester `1ST`, `2ND` or `SUMMER`; 1–15 subjects; units are whole numbers from 1 to 6; grade must be in the grade scale; no duplicate subject codes (`it412` = `IT 412`); unknown fields are rejected.

**Business rules** (`server/services/gwa.service.js`):
- GWA = Σ(grade × units) ÷ Σ(units), counting only marks where `counts_in_gwa` is true and skipping excluded subjects. It is computed with integers to avoid float errors and rounded to 4 decimals.
- Standing:
  - **Not Computable**: no subject counts toward the GWA.
  - **Has Deficiency**: any 5.00, INC or DRP.
  - **Dean's Lister**: every Dean's List rule passes.
  - **Good Standing**: everything else, with the reason it missed Dean's List.

---

## Setup

### 1. Supabase (database)
1. Create a free project at supabase.com.
2. **SQL Editor** → paste `db/schema.sql` → Run. It is safe to run again.
3. **Connect** → copy the **Session pooler** connection string (port 5432) and put in your password.
   Do **not** use the direct `db.xxx.supabase.co` string: it is IPv6-only and Render can't reach it.
   Do **not** add `?sslmode=...` to it; the app sets SSL itself.

### 2. Run locally
Requires Node 22.9 or newer.
```bash
npm install
cp .env.example .env        # paste DATABASE_URL
npm run dev:server          # terminal 1: API on http://localhost:3000
npm run dev:client          # terminal 2: React on http://localhost:5173 (proxies /api)
```

### 3. Deploy to Render
1. Push this repo to a **public** GitHub repository.
2. Render → New → **Web Service** → connect the repo.
3. Settings:
   - Build command: `npm ci --include=dev && npm run build`
   - Start command: `npm start`
   - Health check path: `/api/health`
   - Environment: `DATABASE_URL` = the Session pooler string, `NODE_ENV` = `production`
4. Deploy. Every push to `main` redeploys automatically.

(Or use **New → Blueprint** with the included `render.yaml`.)

### 4. Keep the demo alive
Free Supabase projects pause after about 7 days without database activity, and Render's free tier sleeps when idle.
GitHub repo → Settings → Secrets and variables → Actions → **Variables** → add `APP_URL` = your Render URL.
The `Keep alive` workflow then calls `/api/health` every 3 days. You can also run it by hand from the Actions tab.

**On demo day:** open the live URL a few minutes early. The first request after a quiet period can take close to a minute.

---

## Testing

```bash
npm test          # 19 unit tests: GWA logic + validation rules
npm run test:api  # 13 API tests against the database in .env (adds test rows; use a test project)
```

**Postman (Part 4 screenshots):** import `postman/gwa-tracker.postman_collection.json`, set the `baseUrl` collection variable to your Render URL, then run the requests in order. Each request has tests for its expected status code. Take screenshots of at least: 201, 200, three different 400s, and 404.

## Security notes
- **SQL injection:** every query is parameterized; ids are checked before they reach SQL.
- **XSS:** React escapes all user text. helmet sets a Content-Security-Policy.
- **Abuse:** 10 KB body limit, at most 15 subjects, 20 POSTs per 15 minutes per IP (`trust proxy` is set for Render).
- **Errors:** stack traces and SQL errors are logged on the server, never sent to the client.
- **Secrets:** `DATABASE_URL` only lives in `.env` (git-ignored) and Render environment variables.
- **Supabase REST API:** RLS is enabled with no policies, so the public anon key can't read or write the tables. Our server connects as the table owner, which RLS does not affect.
- **Privacy:** records are public by design (no login). Use nicknames and sample grades only. The form rejects nicknames that look like student numbers.
- **Known trade-off:** SSL to Supabase is encrypted, but the certificate isn't verified unless you set `DATABASE_CA_CERT`.

## Part 1 notes (for the reflection)
- **PaaS vs IaaS:** on a VM (IaaS) we would patch the OS, install and update Node.js, configure TLS, a firewall, process restarts, backups and scaling ourselves. Render and Supabase handle all of that.
- **Shared Responsibility:**
  - **Provider manages:** physical infrastructure, OS and runtime patching, TLS certificates, database engine and backups, scaling, availability.
  - **We manage:** application code, input validation, access rules (RLS), secrets, and the data we choose to store.
- **Diagram:** Browser → Render Web Service (Express + React build) → Supabase Postgres.
