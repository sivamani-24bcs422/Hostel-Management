# HostelHub — MERN Hostel Management System

A complete, production-style hostel management platform built with the MERN stack. HostelHub gives administrators, wardens and students their own role-aware dashboard for managing residences, room allocations, fees, payments, attendance, complaints, visitors and announcements — with live MongoDB statistics, charts, PDF receipts and CSV reports.

---

## Table of contents

- [Highlights](#highlights)
- [Documentation](#documentation)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick start (two VS Code terminals)](#quick-start-two-vs-code-terminals)
- [Demo accounts](#demo-accounts)
- [Environment variables](#environment-variables)
- [Available scripts](#available-scripts)
- [Feature tour](#feature-tour)
- [Role permissions](#role-permissions)
- [API overview](#api-overview)
- [Testing](#testing)
- [Production build](#production-build)
- [Docker](#docker)
- [Troubleshooting](#troubleshooting)

---

## Documentation

- **[docs.md](docs.md)** — full project report and technical documentation: architecture, data model, modules, API reference, security, testing, and limitations.
- **[DEPLOYMENT.md](DEPLOYMENT.md)** — step-by-step Render and Vercel deployment without Docker, including Atlas setup, environment variables, seeding, verification, and troubleshooting.
- **[pptx-content.md](pptx-content.md)** — ready-to-use content for an 8-slide project presentation with speaker notes and visual suggestions.

---

## Highlights

- **Three role-based dashboards** — Admin, Warden and Student, with protected frontend routes and backend authorization.
- **11 functional modules** — students, wardens, hostels, rooms, allocations, fees, payments, attendance, complaints, visitors and announcements, plus analytics/reports.
- **Real MongoDB data** — dashboard cards, occupancy charts, fee collection trends, attendance rates and complaint breakdowns are calculated live.
- **Full CRUD** — create, view, edit and delete flows with validation, search, sorting, filtering and pagination.
- **Room allocation safeguards** — duplicate-allocation prevention, bed-level conflicts, gender/hostel matching and automatic occupancy updates.
- **Finance workflows** — fee generation, partial/full payments, overpayment protection, auto receipt numbers and downloadable **PDF receipts**.
- **CSV export centre** — export every dataset from the Reports page.
- **Premium responsive UI** — lavender, chartreuse and tomato-red brand palette, sidebar dashboard shell, cards, tables, charts, modals, toasts and confirmations.
- **Secure API** — JWT authentication, bcrypt password hashing, Helmet, CORS allow-list, rate limiting, Mongo query sanitisation and centralized error handling.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite 5, React Router 6, Tailwind CSS 3, Axios, Recharts, Lucide icons |
| Backend | Node.js, Express 4, Mongoose 8, JWT, bcryptjs, express-validator |
| Database | MongoDB (local or MongoDB Atlas / remote URI) |
| PDF / CSV | PDFKit, custom CSV serializer |
| Tooling | Nodemon, Concurrently, VS Code tasks |

---

## Project structure

```text
Hostel-Management/
├── backend/
│   ├── config/            # Database connection
│   ├── controllers/       # Request handlers for every module
│   ├── middleware/        # Auth, validation, error handling
│   ├── models/            # User, Student, Warden, Hostel, Room, Allocation,
│   │                      # Fee, Payment, Attendance, Complaint, Visitor, Announcement
│   ├── routes/            # Express route definitions
│   ├── seed/              # Realistic demo data seeder
│   ├── services/          # Dashboard, reports and room-occupancy logic
│   ├── test/              # End-to-end API smoke test
│   ├── utils/             # Helpers, PDF receipt generator, ApiError
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/    # UI primitives, layout, charts, tables
│   │   ├── context/       # Auth, toast and confirmation providers
│   │   ├── hooks/
│   │   ├── pages/         # Login, dashboard, every module, reports, profile
│   │   ├── routes/        # Route map and role guards
│   │   ├── services/      # Axios API layer
│   │   └── utils/         # Formatting, options, form helpers
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── .vscode/               # Ready-made run tasks and launch configs
├── .dockerignore
├── .env.example           # Optional root env for hosted deployments
├── .gitignore
├── Dockerfile             # Optimized multi-stage production image
├── docker-compose.yml     # App + optional local MongoDB
├── package.json           # Root convenience scripts
└── README.md
```

---

## Prerequisites

- **Node.js 18+** and npm
- **MongoDB** available either locally (`mongodb://127.0.0.1:27017/hostel_management`) or as a remote/Atlas connection string.

---

## Quick start (two VS Code terminals)

The backend and frontend run as two separate processes. The frontend dev server proxies `/api` calls to `http://localhost:3000`.

### 1. Install dependencies (one time)

Open a terminal in the project root:

```bash
npm run setup
```

`setup` installs the root tooling plus the backend and frontend dependencies. `npm run install:all` installs only the two apps.

Or install each app manually:

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Configure the backend

```powershell
cd backend
Copy-Item .env.example .env
```

On macOS/Linux use `cp .env.example .env`. Then edit `backend/.env`:

```env
PORT=3000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/hostel_management
JWT_SECRET=replace-this-with-a-long-random-secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173,http://127.0.0.1:5173
SEED_PASSWORD=Password@123
```

> For MongoDB Atlas, replace `MONGO_URI` with your connection string. Keep `JWT_SECRET` long and random.

### 3. Seed the demo database

```bash
npm run seed
```

This clears the 12 HostelHub collections and inserts 3 hostels, 36 rooms, 48 students, 3 wardens, 48 allocations, 336 fees, 271 payments, 576 attendance records, 14 complaints, 12 visitors and 6 announcements.

### 4. Terminal 1 — start the backend

In VS Code, open a new terminal and run:

```bash
cd backend
npm run dev
```

You should see:

```text
MongoDB connected
HostelHub API listening on http://localhost:3000
```

Health check: <http://localhost:3000/api/health>

### 5. Terminal 2 — start the frontend

Open a **second** VS Code terminal (`Terminal → New Terminal`) and run:

```bash
cd frontend
npm run dev
```

Open <http://localhost:5173> and sign in.

> **Tip:** You can also use the preconfigured VS Code tasks: `Terminal → Run Task → Backend: dev` and `Frontend: dev`. Or start both with `npm run dev` from the project root.

---

## Demo accounts

| Role | Email | Password | Access |
| --- | --- | --- | --- |
| Admin | `admin@hostelhub.com` | `Admin@123` | Everything, reports and CSV exports |
| Warden | `warden@hostelhub.com` | `Warden@123` | Assigned hostel: students, rooms, allocations, attendance, complaints, visitors, announcements |
| Student | `student@hostelhub.com` | `Student@123` | Own room, fees, payments, attendance, complaints and announcements |

The login page also provides **one-click demo login** buttons for all three accounts.

---

## Environment variables

### `backend/.env`

| Variable | Description |
| --- | --- |
| `PORT` | API port (default `3000`) |
| `NODE_ENV` | `development` or `production` |
| `MONGO_URI` | MongoDB connection string (used by Docker and byteXL) |
| `MONGO_DB_URI` | Accepted alias for `MONGO_URI` |
| `JWT_SECRET` | Secret used to sign JWTs (**required**) |
| `JWT_EXPIRES_IN` | Token lifetime (default `7d`) |
| `CLIENT_URL` | Allowed frontend origin(s), comma separated |
| `SEED_PASSWORD` | Optional default password for seeded/created users |

### `frontend/.env` (optional)

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | API base URL. Defaults to `/api` (Vite proxy). Set to e.g. `https://api.example.com/api` for a separately deployed API. |

---

## Available scripts

From the **project root**:

| Command | Description |
| --- | --- |
| `npm run install:all` | Install backend and frontend dependencies |
| `npm run seed` | Seed the demo database |
| `npm run dev` | Run API and frontend together with Concurrently |
| `npm run dev:backend` | Start the backend with Nodemon |
| `npm run dev:frontend` | Start the Vite dev server |
| `npm run build` | Build the frontend into `frontend/dist` |
| `npm start` | Start the backend in production mode |
| `npm run test:smoke` | Run the end-to-end API smoke test (backend must be running) |

Backend-specific scripts (`cd backend`): `npm start`, `npm run dev`, `npm run seed`, `npm run test:smoke`.

Frontend-specific scripts (`cd frontend`): `npm run dev`, `npm run build`, `npm run preview`.

---

## Feature tour

### Dashboard
Role-specific hero, live KPI cards, occupancy and fee charts, attendance trend, recent payments, open complaints and pinned announcements.

### Students
Student directory with avatar, roll number, course, guardian contact, hostel/room assignment and status. Admin can create, edit and delete; deletion safely cascades fees, payments, attendance, complaints, visitors and allocations. Warden sees only their assigned hostel. Students can view their own profile.

### Wardens
Admin-only directory of hostel leadership with employee IDs, hostel assignment, designation, qualification and contact details.

### Hostels
Hostel profiles with type (boys/girls/co-ed), address, floors, capacity, facilities and status. Capacity is recalculated automatically from rooms.

### Rooms
Room inventory with floor, type, capacity, rent, facilities and live occupancy (`available`, `partial`, `full`, `maintenance`). Occupancy recalculates automatically when allocations change.

### Allocations
Allocate a student to a room and bed, with guards against duplicate active allocations, occupied beds, full rooms, gender mismatches and inactive hostels. Vacating restores room occupancy and clears the student's room.

### Fees
Per-student fee records for hostel rent, mess, security deposits, fines, maintenance and other charges. Supports manual fee creation, bulk monthly generation (duplicates skipped), editing and deletion protection once payments exist.

### Payments
Record partial or full payments by cash, UPI, card, net banking or bank transfer. Overpayments are rejected, receipts receive unique numbers, and every payment can be downloaded as a **PDF receipt**.

### Attendance
Daily attendance by student status (`present`, `absent`, `late`, `leave`) with bulk marking for allocated students. Includes today's summary, 7-day trend chart, filters and per-student history.

### Complaints
Students raise complaints by category and priority. Wardens/admins move complaints through `open → in_progress → resolved/rejected`, assign staff and add resolution notes. Students can delete their own open complaints.

### Visitors
Visitor log with guest details, relation, purpose, ID proof, check-in and check-out timestamps. Warden access is scoped to their hostel.

### Announcements
Audience-aware notices for everyone, students, wardens or a specific hostel, with priority levels and optional expiry. Wardens publish only to their students/hostel and can edit only their own posts.

### Reports & analytics
Admin-only analytics for occupancy, revenue, fee collection, attendance and complaints, plus date-range filtering and CSV exports for students, wardens, hostels, rooms, allocations, fees, payments, attendance, complaints and visitors.

### Profile
Update name/phone and change password with current-password verification.

---

## Role permissions

| Capability | Admin | Warden | Student |
| --- | :---: | :---: | :---: |
| Dashboard | ✅ | ✅ (assigned hostel) | ✅ (personal) |
| Students | Full CRUD | Read (assigned hostel) | Own profile |
| Wardens | Full CRUD | — | — |
| Hostels | Full CRUD | Read | — |
| Rooms | Full CRUD | Read (assigned hostel) | — |
| Allocations | Create / vacate | Read (assigned hostel) | Own allocation |
| Fees | Full CRUD + generate | Read (assigned hostel) | Own fees |
| Payments | Record + receipts | Read (assigned hostel) | Own payments |
| Attendance | Mark / delete | Mark / delete (assigned hostel) | Own records |
| Complaints | Manage all | Manage assigned hostel | Create / delete own open |
| Visitors | Full CRUD | Manage assigned hostel | — |
| Announcements | Full CRUD | Own hostel/students | Read |
| Reports / CSV | ✅ | — | — |

Backend middleware enforces these rules independently of the UI.

---

## API overview

Base URL: `http://localhost:3000/api`. All routes except `/health` and `/auth/login` require `Authorization: Bearer <token>`.

| Resource | Endpoints |
| --- | --- |
| Auth | `POST /auth/login`, `GET /auth/me`, `PUT /auth/profile`, `PUT /auth/password`, `POST /auth/logout` |
| Dashboard | `GET /dashboard` |
| Students | `GET/POST /students`, `GET/PUT/DELETE /students/:id` |
| Wardens | `GET/POST /wardens`, `GET/PUT/DELETE /wardens/:id` |
| Hostels | `GET/POST /hostels`, `GET/PUT/DELETE /hostels/:id` |
| Rooms | `GET/POST /rooms`, `GET/PUT/DELETE /rooms/:id` |
| Allocations | `GET/POST /allocations`, `GET /allocations/my`, `PUT /allocations/:id/vacate` |
| Fees | `GET/POST /fees`, `GET/PUT/DELETE /fees/:id`, `GET /fees/summary`, `POST /fees/generate` |
| Payments | `GET/POST /payments`, `GET /payments/:id`, `GET /payments/:id/receipt` |
| Attendance | `GET /attendance`, `GET /attendance/trend`, `POST /attendance/bulk`, `DELETE /attendance/:id` |
| Complaints | `GET/POST /complaints`, `GET/PUT/DELETE /complaints/:id` |
| Visitors | `GET/POST /visitors`, `PUT/DELETE /visitors/:id`, `PUT /visitors/:id/checkout` |
| Announcements | `GET/POST /announcements`, `PUT/DELETE /announcements/:id` |
| Reports | `GET /reports/overview`, `GET /reports/export/:type` |

List endpoints support `page`, `limit`, `q`, `sortBy`, `order` plus module-specific filters such as `status`, `hostel`, `student`, `from` and `to`.

---

## Testing

### API smoke test

With the backend running:

```bash
cd backend
npm run test:smoke
```

The test exercises **101 checks** end-to-end:

- health and login for all three roles
- role-based access restrictions
- dashboards for every role
- student creation/update
- room allocation, occupancy updates, duplicate and occupied-bed guards
- fee creation, partial/full payments, overpayment rejection
- PDF receipt generation and validation
- bulk attendance and trends
- complaint creation/resolution
- visitor check-in/check-out
- announcements and student visibility
- report overview and all 10 CSV exports
- vacate flow, occupancy restoration and cascading cleanup

Cleanup runs even if a check fails, so the demo data stays intact.

### Frontend build check

```bash
cd frontend
npm run build
```

---

## Production build

```bash
npm run build
```

This creates `frontend/dist`. When `backend/server.js` starts and `frontend/dist` exists, Express serves the built SPA and API from the same origin:

```bash
cd backend
npm start
# API + app: http://localhost:3000
```

For a split deployment, host `frontend/dist` on Netlify/Vercel/static hosting, set `VITE_API_URL` to the public API URL and add that frontend origin to `CLIENT_URL`.

---

## Docker

The `Dockerfile` follows the same layout as the original project template:

1. a `node:22-alpine` stage builds the React app;
2. a second `node:22-alpine` stage installs only production backend dependencies, copies the API, the built SPA and `backend/.env`, then runs `node backend/server.js`.

The container serves the SPA and API together on port **3000**. The MongoDB URL is read from **`backend/.env`**, which is copied into the image on purpose. A root `.env` is also copied and loaded as a fallback. Variables set by the hosting platform (including byteXL) override both files at runtime. `MONGO_DB_URI` is also accepted as an alias for `MONGO_URI`.

### Docker Compose

```bash
docker compose up --build -d
docker compose exec app npm run seed --prefix backend
```

Open <http://localhost:3000>.

Compose loads `backend/.env` through `env_file`, so it uses the same database URL and JWT secret as local development. Useful commands:

```bash
docker compose logs -f app       # follow app logs
docker compose down              # stop the app
```

If you want the optional bundled MongoDB instead of a remote database, set this in `backend/.env`:

```env
MONGO_URI=mongodb://mongo:27017/hostel_management
```

Then start the `local-db` profile:

```bash
docker compose --profile local-db up --build -d
```

### Build and run the image directly

```bash
docker build -t hostelhub .

docker run --rm -p 3000:3000 --env-file backend/.env hostelhub
```

Seed the database once:

```bash
docker exec -it <container-id> npm run seed --prefix backend
```

You can override the baked-in `.env` at runtime without rebuilding:

```bash
docker run --rm -p 3000:3000 \
  --env-file backend/.env \
  -e MONGO_URI="mongodb://your-host:27017/hostel_management" \
  -e JWT_SECRET="replace-with-a-long-random-secret" \
  hostelhub
```

### Deploying on byteXL

1. Put the real database URL in `backend/.env`:

   ```env
   PORT=3000
   MONGO_URI=mongodb://user:password@host:port/database
   JWT_SECRET=a-long-random-secret
   CLIENT_URL=http://localhost:3000
   ```

2. Make that file available to byteXL. `.env` is gitignored by default, so choose one of these:
   - add `MONGO_URI` and `JWT_SECRET` in byteXL's environment-variable settings (recommended), or
   - for a college/demo deployment, force-add the file to the repository:

     ```bash
     git add -f backend/.env
     git commit -m "Add deployment environment for byteXL"
     git push
     ```

     This commits database credentials. Only do this for a throwaway/demo database.

3. In byteXL, use the repository root as the build context. The root `Dockerfile` is detected automatically. If byteXL asks for a port, use **3000**. The app also honours a platform-provided `PORT` variable.

4. After the first successful deployment, seed the demo data once (through byteXL's container terminal, if available):

   ```bash
   npm run seed --prefix backend
   ```

5. Open the deployed URL and sign in with one of the demo accounts.

> Local development still uses **frontend on port 5173** and **backend on port 3000**. The Docker image is the production deployment path and serves both on port 3000.

---

## Troubleshooting

**MongoDB connection fails**

- Confirm `MONGO_URI` in `backend/.env` and that MongoDB is running.
- Atlas users: whitelist your IP and URL-encode special characters in the password.

**`JWT_SECRET is not configured`**

- Copy `backend/.env.example` to `backend/.env` and set a secret.

**CORS error / login returns 500 through the proxy**

- Ensure the browser URL origin is listed in `CLIENT_URL` (for example `http://localhost:5173` or `http://127.0.0.1:5173`).
- Restart the backend after changing `.env`.

**Port already in use**

- Change `PORT` in `backend/.env`, then update the proxy target in `frontend/vite.config.js` if needed.

**No demo data**

- Run `npm run seed` while the backend `.env` points at the intended database. This command clears the HostelHub collections first.

**Receipt download or CSV export not working**

- Those endpoints require a valid token and, for reports, the admin role.
- Check the browser network tab for the API response.

---

Built for calm, connected campus operations. 🏠
