<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AA2000 Site Survey

Site survey and estimation platform for electronic security systems (CCTV, Fire Alarm, Access Control, Burglar Alarm, Fire Protection, and more). Built with React + TypeScript on the frontend and Supabase as the backend.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 6 |
| Styling | Tailwind CSS 4, Framer Motion |
| Backend | Supabase (Auth, PostgreSQL, Storage, Edge Functions) |
| AI | Google Gemini |
| Reports | jsPDF, html2canvas, docx |

## Prerequisites

- Node.js 18+
- A Supabase project
- A Google Gemini API key

## Getting Started

1. **Clone the repo**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables** — copy `.env.example` to `.env.local` and fill in:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Run database migrations** — execute the SQL in `supabase/migrations/` against your Supabase project (via Dashboard SQL editor or CLI).

5. **Start the dev server**
   ```bash
   npm run dev
   ```
   The app runs at `http://localhost:3002`.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server (port 3002) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | TypeScript type checking |

## Project Structure

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a full breakdown of the architecture, database schema, RLS policies, and workflow.
