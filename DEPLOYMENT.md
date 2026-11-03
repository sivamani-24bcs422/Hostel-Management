# HostelHub — Deployment Guide (Render & Vercel, no Docker)

This guide deploys HostelHub **without Docker**.

HostelHub has three runtime pieces:

| Piece | Technology | What it needs |
| --- | --- | --- |
| Frontend | React 18 + Vite 5 (static files after build) | A static host or a Node server that serves `frontend/dist` |
| Backend | Node.js + Express REST API | A long-running Node process |
| Database | MongoDB | A MongoDB Atlas connection string |

> **Important:** Vercel is a static/serverless platform. It can host the React frontend very well, but it **cannot run the current Express server as a normal long-running process** without code changes. Use **Render for the backend** and **Vercel only for the frontend**, or use **Render for everything**.

---

## 1. Choose a deployment pattern

| Pattern | Frontend | Backend | Difficulty | Recommended for |
| --- | --- | --- | --- | --- |
| **A. Render only — one Web Service** | Served by Express from `frontend/dist` | Render Web Service | Easiest | College demos, evaluations, a single public URL |
| **B. Render + Vercel** | Vercel | Render Web Service | Medium | Best frontend performance and a custom Vercel URL |
| **C. Render API + Render Static Site** | Render Static Site | Render Web Service | Medium | Everything stays inside Render |

**Start with Pattern A.** It uses one service, one URL, and no CORS configuration is required.

The rest of this guide covers Pattern A first, then Pattern B and C.

---

## 2. Architecture at a glance

### Pattern A — one Render Web Service

```text
Browser
   │  HTTPS
   ▼
Render Web Service (Node)
   ├── /api/*  ──► Express REST API ──► MongoDB Atlas
   └── /*      ──► frontend/dist (React SPA)
```

- The build step creates `frontend/dist`.
- `backend/server.js` detects `frontend/dist` and serves it for all non-`/api` routes.
- React Router refreshes work because Express falls back to `index.html`.

### Pattern B — Render API + Vercel frontend

```text
Browser
   ├── https://hostelhub.vercel.app  ──► Vercel static React app
   └── https://hostelhub-api.onrender.com/api ──► Render Express API ──► MongoDB Atlas
```

The frontend calls the API directly through `VITE_API_URL`; the backend allows the Vercel origin through `CLIENT_URL`.

---

## 3. Prerequisites

Before starting, make sure you have:

1. **Node.js 22 LTS** and npm installed locally.
2. **Git** installed.
3. A **GitHub account** and the project pushed to a GitHub repository.
4. A **MongoDB Atlas account** (free M0 cluster is enough).
5. A **Render account** — <https://render.com>.
6. A **Vercel account** — <https://vercel.com> (only for Pattern B).
7. A long random **JWT secret**. Generate one with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

---

## 4. Step 1 — Create the production MongoDB database (Atlas)

### 4.1 Create the cluster

1. Sign in to <https://cloud.mongodb.com>.
2. Create a new project, for example `HostelHub`.
3. Click **Create** → choose **M0 / Free**.
4. Choose the cloud provider and a region close to your Render region
   (for example AWS Mumbai `ap-south-1` or Singapore `ap-southeast-1`).
5. Name the cluster, for example `hostelhub-cluster`, and click **Create Deployment**.

### 4.2 Create a database user

1. Go to **Database Access** → **Add New Database User**.
2. Choose **Password** authentication.
3. Username example: `hostelhub_app`.
4. Generate a strong password and save it somewhere safe.
5. Grant **Read and write to any database** (or restrict to the
   `hostel_management` database).
6. Click **Add User**.

### 4.3 Allow Render to connect

1. Go to **Network Access** → **Add IP Address**.
2. Choose **Allow access from anywhere** → `0.0.0.0/0`.
3. Confirm.

> Render does not provide a fixed outbound IP on the free plan. `0.0.0.0/0` is the
> practical option. For production, use a dedicated egress IP or Atlas Private
> Endpoint, and restrict access to it.

### 4.4 Copy the connection string

1. Go to **Database** → your cluster → **Connect**.
2. Choose **Drivers** → **Node.js**.
3. Copy the string. It looks like:

   ```text
   mongodb+srv://hostelhub_app:<password>@hostelhub-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

4. Add the database name before the `?`:

   ```text
   mongodb+srv://hostelhub_app:<password>@hostelhub-cluster.xxxxx.mongodb.net/hostel_management?retryWrites=true&w=majority
   ```

5. If your password contains `@`, `:`, `/`, `?`, `#`, `[`, `]`, or `%`, **URL-encode it**.
   For example, `P@ss#1` becomes `P%40ss%231`.

Keep this full string; it is your `MONGO_URI`.

---

## 5. Step 2 — Push the project to GitHub

Run these commands from the project root:

```bash
cd C:\Users\sivam\Projects\Hostel-Management

git status
git add .
git commit -m "Prepare HostelHub for cloud deployment"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

If the remote already exists:

```bash
git remote set-url origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### Verify that secrets are not committed

```bash
git ls-files | findstr /I ".env"
```

You should only see `.env.example` files. **`backend/.env` must not be tracked.**
If it is tracked, remove it before deploying:

```bash
git rm --cached backend/.env
git commit -m "Stop tracking local environment file"
git push
```

> If `backend/.env` was ever pushed to a public repository, rotate the MongoDB
> password and the JWT secret immediately.

---

## 6. Step 3 — Deploy Pattern A: one Render Web Service

This serves the **React frontend and Express API from the same URL**.

### 6.1 Create the service

1. Sign in to <https://dashboard.render.com>.
2. Click **New +** → **Web Service**.
3. Connect your GitHub account if prompted.
4. Select the HostelHub repository.
5. Fill in the form:

| Field | Value |
| --- | --- |
| **Name** | `hostelhub` (or any unique name) |
| **Region** | Choose the region closest to your users / Atlas cluster |
| **Branch** | `main` |
| **Root Directory** | Leave **empty** |
| **Runtime** | **Node** (not Docker) |
| **Build Command** | `npm run setup && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | Free (demo) or Starter (always-on) |
| **Health Check Path** | `/api/health` |
| **Auto-Deploy** | Yes |

> **Do not choose “Docker”.** The repository contains a `Dockerfile`, but this
> guide deliberately uses the **Node** runtime.

The build command does the following:

- `npm run setup` installs root, backend, and frontend dependencies with dev
  dependencies included.
- `npm run build` builds the React app into `frontend/dist`.
- `npm start` starts `backend/server.js`, which serves both `/api` and the SPA.

### 6.2 Add environment variables

In the Render service, open **Environment** → **Add Environment Variable** and
add:

| Key | Value | Required |
| --- | --- | --- |
| `NODE_ENV` | `production` | Yes |
| `MONGO_URI` | Your Atlas connection string | Yes |
| `JWT_SECRET` | Your long random secret | Yes |
| `JWT_EXPIRES_IN` | `7d` | Recommended |
| `CLIENT_URL` | `https://<your-service>.onrender.com` | Yes for CORS |
| `SEED_PASSWORD` | A strong password for seeded extra users | Optional |
| `NODE_VERSION` | `22` | Recommended |

**Do not set `PORT`.** Render injects `PORT` automatically and
`backend/server.js` reads `process.env.PORT`.

`CLIENT_URL` accepts multiple comma-separated origins:

```text
https://hostelhub.onrender.com,https://hostelhub.vercel.app
```

No trailing slash.

You do not know the exact Render URL until the first deploy. You can:

1. Use a placeholder now, deploy, copy the real URL, update `CLIENT_URL`, and
   redeploy; **or**
2. Create the service, then immediately edit the environment variables.

### 6.3 Deploy

1. Click **Create Web Service**.
2. Watch the **Logs** tab.
3. A successful build ends with something similar to:

   ```text
   HostelHub API listening on http://localhost:10000
   MongoDB connected: ...
   ```

4. A successful deploy shows **Live** with a URL such as:

   ```text
   https://hostelhub.onrender.com
   ```

### 6.4 Seed the production database

The seed script **deletes all HostelHub collections** before inserting demo data.

Pick **one** method.

#### Method 1 — Run the seed from your computer against Atlas (most reliable)

From the project root in PowerShell:

```powershell
cd C:\Users\sivam\Projects\Hostel-Management

$env:MONGO_URI = "mongodb+srv://hostelhub_app:<password>@cluster.mongodb.net/hostel_management?retryWrites=true&w=majority"
$env:SEED_PASSWORD = "Use-A-Strong-Seed-Password"

npm run seed

Remove-Item Env:\MONGO_URI
Remove-Item Env:\SEED_PASSWORD
```

Why this works: the seed script loads `backend/.env`, but `dotenv` does **not**
override environment variables that already exist. The Atlas URI in the shell
therefore wins over your local `backend/.env`.

On macOS/Linux:

```bash
MONGO_URI="mongodb+srv://..." SEED_PASSWORD="..." npm run seed
```

At the end you should see:

```text
HostelHub demo data created successfully.
Admin    : admin@hostelhub.com     / Admin@123
Warden   : warden@hostelhub.com    / Warden@123
Student  : student@hostelhub.com   / Student@123
```

#### Method 2 — Run the seed from the Render Shell

If your Render plan provides **Shell**:

1. Open the service → **Shell**.
2. Run:

   ```bash
   npm run seed --prefix backend
   ```

   If the service root is the repository root, this is the correct path. If you
   later set **Root Directory** to `backend`, run `npm run seed` instead.

> The Render Shell may not be available on the free instance type. Use Method 1
> if you do not see the Shell tab.

#### Method 3 — Run a one-off Render Job

Create a **Job** from the same repository with:

| Field | Value |
| --- | --- |
| Root Directory | empty |
| Build Command | `npm run setup` |
| Command | `npm run seed` |

Add the same `MONGO_URI` and `SEED_PASSWORD` environment variables, then run it
once.

### 6.5 Update `CLIENT_URL` after the first deploy

1. Copy the live Render URL.
2. Open **Environment**.
3. Set:

   ```text
   CLIENT_URL=https://hostelhub.onrender.com
   ```

4. Click **Save Changes** → **Deploy latest commit** (or **Manual Deploy**).

A same-origin deployment does not strictly need `CLIENT_URL`, because the
backend also accepts requests whose `Origin` host matches the request host, but
setting it is good practice and is required later if you add a custom domain or
a Vercel frontend.

---

## 7. Step 4 — Verify the deployment

Run this checklist after the first successful deploy.

### 7.1 Health endpoint

Open:

```text
https://<your-service>.onrender.com/api/health
```

Expected:

```json
{
  "success": true,
  "message": "HostelHub API is running",
  "environment": "production",
  "timestamp": "..."
}
```

### 7.2 Frontend

Open:

```text
https://<your-service>.onrender.com
```

You should see the HostelHub login page.

### 7.3 Login

Use one of the demo accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@hostelhub.com` | `Admin@123` |
| Warden | `warden@hostelhub.com` | `Warden@123` |
| Student | `student@hostelhub.com` | `Student@123` |

### 7.4 Core flows

- [ ] Dashboard loads live statistics.
- [ ] Students list loads and paginates.
- [ ] Rooms show occupancy.
- [ ] Fees list loads.
- [ ] Payments page loads.
- [ ] A PDF receipt downloads.
- [ ] Reports page loads for the admin.
- [ ] A CSV export downloads.
- [ ] Refresh the browser on `/students` — it should not 404.
- [ ] Browser DevTools → Console shows no CORS or 401 errors.

### 7.5 Render logs

Check for:

```text
MongoDB connected: ...
HostelHub API listening on http://localhost:<port>
```

If `JWT_SECRET is not configured` appears, the environment variable was not
saved before the deploy. Add it and redeploy.

---

## 8. Pattern B — Render API + Vercel frontend

Use this when you want Vercel's global CDN and a `*.vercel.app` URL.

### 8.1 Deploy the backend on Render

1. **New +** → **Web Service** → connect the repository.
2. Configure:

| Field | Value |
| --- | --- |
| Name | `hostelhub-api` |
| Root Directory | `backend` |
| Runtime | **Node** |
| Build Command | `npm ci` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |
| Instance Type | Free or Starter |

3. Add the same environment variables as Pattern A:

   ```text
   NODE_ENV=production
   MONGO_URI=mongodb+srv://...
   JWT_SECRET=<long-random-secret>
   JWT_EXPIRES_IN=7d
   CLIENT_URL=https://<your-vercel-app>.vercel.app
   SEED_PASSWORD=<optional>
   NODE_VERSION=22
   ```

4. Deploy and copy the backend URL:

   ```text
   https://hostelhub-api.onrender.com
   ```

5. Seed the database using the steps in **section 6.4**.

> With **Root Directory = `backend`**, the backend does not build or serve the
> React app. It only exposes `/api`. That is correct for this pattern.

### 8.2 Deploy the frontend on Vercel

1. Sign in to <https://vercel.com>.
2. Click **Add New** → **Project**.
3. Import the same GitHub repository.
4. Configure:

| Field | Value |
| --- | --- |
| **Framework Preset** | Vite |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm ci` |

5. Add an environment variable:

   | Key | Value | Environments |
   | --- | --- | --- |
   | `VITE_API_URL` | `https://hostelhub-api.onrender.com/api` | Production, Preview, Development |

   > `VITE_API_URL` is baked into the JavaScript at **build time**. After
   > changing it, you must redeploy the Vercel project.

6. Click **Deploy**.
7. Copy the production URL, for example:

   ```text
   https://hostelhub.vercel.app
   ```

### 8.3 Allow the Vercel origin in the backend

1. Go back to the Render backend service → **Environment**.
2. Set:

   ```text
   CLIENT_URL=https://hostelhub.vercel.app
   ```

3. If you also use preview deployments, add each preview origin exactly:

   ```text
   CLIENT_URL=https://hostelhub.vercel.app,https://hostelhub-git-main-yourname.vercel.app
   ```

   Comma-separated, no spaces required, no trailing slash.
4. Save and redeploy the backend.

### 8.4 Add SPA routing for Vercel

React Router needs every non-file path to return `index.html`. Create a file at
**`frontend/vercel.json`**:

```json
{
  "rewrites": [
    {
      "source": "/:path*",
      "destination": "/index.html"
    }
  ]
}
```

Commit and push:

```bash
git add frontend/vercel.json
git commit -m "Add Vercel SPA routing"
git push
```

Vercel serves existing static files before applying rewrites, so assets under
`/assets/*` still load normally.

### 8.5 Test Pattern B

- [ ] `https://hostelhub.vercel.app` opens the login page.
- [ ] Login works.
- [ ] API requests in DevTools go to `https://hostelhub-api.onrender.com/api`.
- [ ] No CORS errors appear.
- [ ] Refresh on `/students` does not 404.
- [ ] PDF receipt and CSV export work.

### 8.6 Optional — call the API through a Vercel rewrite (same-origin)

Instead of exposing the backend URL to the browser, Vercel can proxy `/api`:

1. Set the Vercel environment variable:

   ```text
   VITE_API_URL=/api
   ```

2. Replace `frontend/vercel.json` with:

   ```json
   {
     "rewrites": [
       {
         "source": "/api/:path*",
         "destination": "https://hostelhub-api.onrender.com/api/:path*"
       },
       {
         "source": "/:path*",
         "destination": "/index.html"
       }
     ]
   }
   ```

3. Redeploy the Vercel project.

**Caveat:** Render free instances spin down after inactivity. A cold start can
take 30–60 seconds, which may exceed the Vercel proxy timeout and produce a
504. The direct `VITE_API_URL=https://.../api` approach avoids that proxy hop and
is recommended for free-tier deployments.

---

## 9. Pattern C — Render API + Render Static Site

Everything stays in Render.

### 9.1 Backend

Follow **section 8.1** to create `hostelhub-api`.

### 9.2 Static site

1. **New +** → **Static Site** → connect the repository.
2. Configure:

| Field | Value |
| --- | --- |
| Name | `hostelhub-web` |
| Root Directory | `frontend` |
| Build Command | `npm ci --include=dev && npm run build` |
| Publish Directory | `dist` |

3. Add environment variable:

   ```text
   VITE_API_URL=https://hostelhub-api.onrender.com/api
   ```

4. Deploy.
5. Open the static site → **Redirects/Rewrites** → add:

   | Source | Destination | Action |
   | --- | --- | --- |
   | `/*` | `/index.html` | **Rewrite** |

6. Add the static site URL to the backend's `CLIENT_URL` and redeploy the
   backend:

   ```text
   CLIENT_URL=https://hostelhub-web.onrender.com
   ```

---

## 10. Environment variable reference

### Backend

| Variable | Required | Example | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | Yes in production | `production` | Disables development logging and stack traces |
| `PORT` | No | injected by Render | Do **not** set manually |
| `MONGO_URI` | Yes | `mongodb+srv://...` | Atlas connection string with database name |
| `MONGO_DB_URI` | No | same as above | Accepted alias used by older templates |
| `JWT_SECRET` | Yes | 96-character hex string | Server exits if missing |
| `JWT_EXPIRES_IN` | No | `7d` | Token lifetime |
| `CLIENT_URL` | Yes for split deployments | `https://app.vercel.app` | Comma-separated allow-list |
| `SEED_PASSWORD` | No | strong password | Password for extra seeded students/wardens |

### Frontend (build-time)

| Variable | Example | Notes |
| --- | --- | --- |
| `VITE_API_URL` | `https://hostelhub-api.onrender.com/api` | If omitted, the app calls `/api` (Vite proxy in development, same-origin in Pattern A) |

---

## 11. Optional configuration files

You do **not** need these files for the manual steps above. They are convenient
if you want infrastructure-as-code.

### `render.yaml` (Pattern A blueprint)

Place this in the repository root and create a **Blueprint** in Render:

```yaml
services:
  - type: web
    name: hostelhub
    runtime: node
    plan: free
    buildCommand: npm run setup && npm run build
    startCommand: npm start
    healthCheckPath: /api/health
    autoDeploy: true
    envVars:
      - key: NODE_ENV
        value: production
      - key: NODE_VERSION
        value: "22"
      - key: MONGO_URI
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: JWT_EXPIRES_IN
        value: 7d
      - key: CLIENT_URL
        sync: false
```

`sync: false` means Render asks you for the value in the dashboard instead of
storing it in the repository.

### `frontend/vercel.json` (Pattern B SPA routing)

```json
{
  "rewrites": [
    {
      "source": "/:path*",
      "destination": "/index.html"
    }
  ]
}
```

### `.node-version`

If Render or Vercel picks an unexpected Node version, add this file to the
repository root:

```text
22
```

---

## 12. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Build fails with `vite: not found` | Dev dependencies were skipped | Use `npm run setup && npm run build`, or `npm ci --include=dev --prefix frontend && npm run build` |
| Build fails with `npm ci` lockfile error | Lockfile out of sync | Run `npm install` locally, commit `package-lock.json`, or use `npm install` in the build command |
| `JWT_SECRET is not configured` | Missing environment variable | Add `JWT_SECRET` in Render → Environment and redeploy |
| `MONGO_URI is missing` | Missing database URL | Add `MONGO_URI` and redeploy |
| `MongoServerError: bad auth` | Wrong username/password or unencoded special characters | Reset the Atlas password; URL-encode it; update `MONGO_URI` |
| Mongo connection times out | Atlas IP allow-list | Add `0.0.0.0/0` in Atlas Network Access |
| App deploys but shows “Application failed to respond” | Server did not bind to Render's port | Do not set `PORT`; use the code as-is |
| 502 / 503 on first request | Free instance cold start | Wait 30–60 seconds, or upgrade to Starter |
| CORS error in browser | Frontend origin not in `CLIENT_URL` | Add the exact origin (scheme + host, no trailing slash); redeploy backend |
| Login returns 500 through a proxy | Origin rejected by CORS | Add the browser origin to `CLIENT_URL` |
| Frontend loads but every API call goes to `localhost` | `VITE_API_URL` missing at build time | Set it in Vercel/Render, then **redeploy the frontend** |
| Refresh on `/students` returns 404 | SPA fallback missing | Pattern A handles it automatically; for Vercel add `vercel.json`; for Render Static Site add `/* → /index.html` rewrite |
| `/api/health` works but app is blank | Failed static build or wrong publish directory | Confirm `frontend/dist` exists; confirm Vercel output is `dist` |
| PDF/CSV download fails | Token expired or wrong role | Log in again; reports require the admin role |
| CSV export returns HTML | API URL points to the frontend host | Set `VITE_API_URL` to the backend URL |
| Seed command clears real data | `npm run seed` deletes all HostelHub collections | Only run it against the intended database; back up first |
| `npm run seed` hits the wrong database | `backend/.env` still points elsewhere | Pass `MONGO_URI` in the shell (it overrides dotenv) or temporarily edit `backend/.env` |

### Reading Render logs

Render → your service → **Logs**. Look for:

```text
MongoDB connected: <host>/<database>
HostelHub API listening on http://localhost:<port>
```

### Testing the API from PowerShell

```powershell
Invoke-RestMethod https://hostelhub.onrender.com/api/health

$body = @{ email = "admin@hostelhub.com"; password = "Admin@123" } | ConvertTo-Json
$login = Invoke-RestMethod -Uri https://hostelhub.onrender.com/api/auth/login `
  -Method Post -ContentType "application/json" -Body $body

$headers = @{ Authorization = "Bearer $($login.data.token)" }
Invoke-RestMethod -Uri https://hostelhub.onrender.com/api/dashboard -Headers $headers
```

---

## 13. Production hardening checklist

- [ ] `JWT_SECRET` is long, random, and different from development.
- [ ] `backend/.env` is **not** committed.
- [ ] MongoDB password is strong and URL-encoded in `MONGO_URI`.
- [ ] Atlas access is restricted as much as your hosting allows.
- [ ] `NODE_ENV=production`.
- [ ] `CLIENT_URL` contains only trusted origins.
- [ ] Demo accounts are removed or their passwords changed before real use.
- [ ] `SEED_PASSWORD` is strong if you keep seeded users.
- [ ] HTTPS is enabled (Render and Vercel provide it automatically).
- [ ] Database backups are enabled in Atlas.
- [ ] Logs are monitored after each release.
- [ ] A custom domain is configured, and `CLIENT_URL` is updated.

> The seeded demo accounts are intentionally public in this repository. Do not
> use them for a real hostel. Create a real admin account, deactivate the demo
> users, and keep the seed script for demos only.

---

## 14. Updating the deployment

Render and Vercel deploy automatically from the connected branch.

```bash
git add .
git commit -m "Describe the change"
git push
```

- **Render** rebuilds and restarts the service.
- **Vercel** rebuilds the frontend.

If you changed only backend environment variables in Render, click **Manual
Deploy** (or **Deploy latest commit**) after saving.

### Rollback

- **Render:** service → **Deploys** → choose a previous successful deploy →
  **Redeploy**.
- **Vercel:** project → **Deployments** → choose a previous deployment →
  **Promote to Production**.

---

## 15. Quick command summary

```bash
# Local production build check
npm run setup
npm run build
npm start

# Local development
npm run dev

# Seed a database
npm run seed

# Smoke test (backend must be running)
npm run test:smoke
```

Deployment is complete when:

1. `/api/health` returns `success: true`.
2. The login page loads from the public URL.
3. All three demo roles can sign in.
4. Dashboard data comes from MongoDB Atlas.
5. PDF receipts and CSV exports download successfully.
