# 📦 Price Tracker — Setup & Reference

A full-stack price monitoring application that tracks product prices and stock levels from the [INE mock store](https://demo.inelabteamdev.com), storing history in Supabase and displaying live charts in a React frontend.

---

## 🏗️ Project Structure

```
iNE_project/
├── backend/          # Express + TypeScript API + Playwright scraper
│   ├── src/
│   │   ├── index.ts          # Entry point + cron scheduler
│   │   ├── db.ts             # Supabase client
│   │   ├── routes/api.ts     # REST API routes
│   │   └── scraper/
│   │       ├── playwright.ts # Core Playwright scraping logic
│   │       └── scheduler.ts  # Shared scrape runner (cron + manual)
│   └── scrape_headed.ts      # Standalone visible scraper (demo/debug)
└── frontend/         # React + Vite + Chart.js UI
    └── src/
        └── components/
            ├── ProductDetails.tsx  # Price chart + scrape log
            └── ...
```

---

## ⚙️ Prerequisites

- **Node.js** v18+ (v20 recommended)
- **npm** v9+
- A [Supabase](https://supabase.com) project with the schema below

---

## 🗄️ Supabase Schema

Run these in your Supabase SQL editor:

```sql
-- Products being tracked
create table "Product" (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  url          text not null unique,
  "currentPrice" numeric,
  "currentStock" integer,
  "createdAt"  timestamptz default now(),
  "updatedAt"  timestamptz default now()
);

-- Price + stock snapshots over time
create table "PriceHistory" (
  id          uuid primary key default gen_random_uuid(),
  "productId" uuid references "Product"(id) on delete cascade,
  price       numeric not null,
  stock       integer not null,
  timestamp   timestamptz default now()
);

-- Every scrape attempt (success or failure)
create table "ScrapeLog" (
  id             uuid primary key default gen_random_uuid(),
  "productId"    uuid references "Product"(id) on delete cascade,
  status         text not null,
  "attemptNumber" integer not null,
  "errorMessage" text,
  timestamp      timestamptz default now()
);
```

---

## 🔐 Environment Variables

### Backend — `backend/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ | Your Supabase `anon` public key |
| `CRON_SECRET` | Optional | Secret for securing the manual `/api/scrape` endpoint (default: `mysecret123`) |
| `PORT` | Optional | Port for the Express server (default: `3000`) |

**Example `backend/.env`:**
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
CRON_SECRET=mysecret123
PORT=3000
```

### Frontend — `frontend/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Optional | Backend API base URL (default: `http://localhost:3000`) |

---

## 🚀 Setup & Running Locally

### 1. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Install Playwright browsers

```bash
cd backend
npx playwright install chromium
```

### 3. Configure environment variables

```bash
# Copy and fill in your Supabase credentials
cp backend/.env.example backend/.env
```

### 4. Start the backend

```bash
cd backend
npm run dev
```

On startup, the backend will:
- Start the Express API on port `3000`
- Register the 2-hourly cron schedule
- **Immediately run an initial scrape** of all tracked products (after 5 seconds)

### 5. Start the frontend

```bash
cd frontend
npm run dev
```

Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## ⏰ Scraping Schedule

| Mode | Trigger | Description |
|------|---------|-------------|
| **Auto — external cron** | Every 2 hours | Scrapes ALL tracked products automatically (e.g. via cron-job.org) |
| **Manual** | `POST /api/scrape` | Triggers an immediate scrape run |

### How new products are handled
When you add a product via the UI, it is saved to the `Product` table in Supabase. **The next scheduled cron run (within 2 hours) automatically picks it up** — no restart or code change required.

### Manual scrape trigger

```bash
curl -X POST http://localhost:3000/api/scrape \
  -H "Authorization: Bearer mysecret123"
```

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/products` | List all tracked products |
| `POST` | `/api/products` | Add a product to track (`{ name, url }`) |
| `GET` | `/api/search?q=query` | Search the mock store for products |
| `GET` | `/api/products/:id/history` | Price + stock history for a product |
| `GET` | `/api/products/:id/logs` | Scrape activity log for a product |
| `POST` | `/api/scrape` | Manually trigger a full scrape (requires `Authorization` header) |
| `GET` | `/health` | Server health check |

---

## 🔍 Watching the Scraper Live

To see the scraper in a visible browser window (useful for demos):

```bash
cd backend
npx ts-node scrape_headed.ts
```

This opens a Chromium window and shows the full hover → reveal → extract sequence.

---

## 📦 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Chart.js, react-chartjs-2 |
| Backend | Node.js, Express, TypeScript |
| Scraping | Playwright (Chromium) |
| Database | Supabase (PostgreSQL) |
| Scheduling | node-cron |
