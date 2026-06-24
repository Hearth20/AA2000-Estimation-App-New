# AA2000 Site Survey — Architecture

## Overview

**AA2000 Site Survey** is a React + TypeScript SPA for conducting electronic security system site surveys, generating estimations, and managing project workflows. The app uses **Supabase** as its backend-as-a-service (auth, database, storage) and **Google Gemini** for AI-powered audit assistance.

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    CLIENT-SIDE (React SPA)                                   │
│                                                                              │
│  ┌──────────┐  ┌────────────┐  ┌──────────────────────────────────────────┐ │
│  │  App.tsx  │  │  Portal    │  │   Survey Components                      │ │
│  │ (Router)  │──│  Layout    │──│   (CCTV, FA, FP, AC, BA, Other, Intercom)│ │
│  │ (State)   │  │ (Sidebar/  │  └──────────────────────────────────────────┘ │
│  │           │  │  Header)   │  ┌──────────────────────────────────────────┐ │
│  └──────────┘  └────────────┘  │   Estimations (EstimationScreen, BOQ)     │ │
│       │                        └──────────────────────────────────────────┘ │
│       │                        ┌──────────────────────────────────────────┐ │
│       │                        │   AI Clarification (Gemini chat)         │ │
│       └────────────────────────┴──────────────────────────────────────────┘ │
│                                                                              │
│  @supabase/supabase-js                                                       │
│  Auth: Supabase Auth (email/password)                                        │
│  DB: Supabase PostgreSQL + Row-Level Security                                │
│  Storage: Supabase Storage (floor plans, reports, images)                    │
└──────────────────────────────────┬───────────────────────────────────────────┘
                                   │
                                   │ HTTPS / WebSockets
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    SUPABASE (Backend-as-a-Service)                           │
│                                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐   │
│  │   AUTH               │  │   DATABASE (Postgres) │  │   STORAGE         │   │
│  │  • Email/password    │  │                       │  │  • floor_plans/   │   │
│  │  • JWT sessions      │  │  Tables (see schema)  │  │  • reports/       │   │
│  │  • RLS policies      │  │  • profiles           │  │  • site_images/   │   │
│  │  • Role claims       │  │  • projects           │  └──────────────────┘   │
│  │                      │  │  • survey_cctv        │                         │
│  │                      │  │  • survey_fire_alarm  │                         │
│  │                      │  │  • survey_access_ctrl │                         │
│  │                      │  │  • survey_burglar     │                         │
│  │                      │  │  • survey_fire_prot   │                         │
│  │                      │  │  • survey_other       │                         │
│  │                      │  │  • estimations        │                         │
│  │                      │  │  • consumables        │                         │
│  │                      │  │  • additional_fees    │                         │
│  │                      │  │  • notifications      │                         │
│  │                      │  └──────────────────────┘                         │
│  └──────────────────────┘                                                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Client-Side Layers

| Layer | Files | Role |
|-------|-------|------|
| **State & Routing** | `App.tsx` | Custom state machine routing (20+ screens), URL sync via `history.pushState`/`popstate`, global state buffers for active project/survey |
| **Layout** | `PortalLayout.tsx` | Sidebar navigation, top header, theme toggling, notification bell |
| **Auth** | `Login.tsx`, `AdminLogin.tsx`, `Signup.tsx` | Supabase Auth email/password sign-in/sign-up |
| **Dashboard** | `Dashboard.tsx` | Project list (ongoing/upcoming/history), accept/decline assignments, search/filter |
| **Project** | `ProjectDetails.tsx` | Create/edit project, set scope, assign technicians |
| **Surveys** | `CCTVSurvey.tsx`, `FireAlarmSurvey.tsx`, `AccessControlSurvey.tsx`, `BurglarAlarmSurvey.tsx`, `FireProtectionSurvey.tsx`, `OtherSurvey.tsx`, `IntercomServiceSurveyForm.tsx` | System-specific data collection forms with floor plan upload |
| **AI** | `AIClarification.tsx`, `geminiService.ts` | Gemini-powered chat for audit questions and narrative generation |
| **Estimation** | `EstimationScreen.tsx`, `BOQ.tsx` | Manpower breakdown, consumables, site constraints, cost calculation, DOCX/PDF generation |
| **Summary** | `SurveySummary.tsx`, `CurrentProjects.tsx` | Final review, approval/rejection, finalized report export |
| **Services** | `src/services/` | Supabase client, Gemini API, Geo location |
| **Utils** | `src/utils/` | Mean pricing calculators, consumable defaults, PDF export, notifications, voice processing |

---

## Database Schema

### Tables

```sql
-- Users & roles (managed by Supabase Auth + profiles table)
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id),
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('technician', 'admin')),
  phone       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Projects
CREATE TABLE projects (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  client_name           TEXT NOT NULL,
  client_contact_name   TEXT,
  client_email          TEXT,
  client_contact        TEXT,
  location              TEXT,
  location_name         TEXT,
  building_info         JSONB,
  project_survey_types  TEXT[],
  assigned_technicians  JSONB[],
  technician_responses  JSONB,
  status                TEXT DEFAULT 'In Progress',
  finalization          JSONB,
  start_date            DATE,
  end_date              DATE,
  created_by            UUID REFERENCES profiles(id),
  created_at            TIMESTAMPTZ DEFAULT now(),
  completed_at          TIMESTAMPTZ,
  completed_by          TEXT
);

-- Survey data per system (each uses JSONB for flexible nested data)
CREATE TABLE survey_cctv (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  building_info   JSONB,
  measurements    JSONB,
  cameras         JSONB[],
  infrastructure  JSONB,
  control_room    JSONB,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- (Similar structure for: survey_fire_alarm, survey_access_ctrl,
--  survey_burglar, survey_fire_prot, survey_other)

-- Estimations
CREATE TABLE estimations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID REFERENCES projects(id) ON DELETE CASCADE,
  survey_type       TEXT NOT NULL,
  days              INTEGER,
  techs             INTEGER,
  manpower_breakdown JSONB[],
  site_constraints  JSONB,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE consumables (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimation_id UUID REFERENCES estimations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  category      TEXT,
  qty           INTEGER,
  unit_price    NUMERIC
);

CREATE TABLE additional_fees (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimation_id UUID REFERENCES estimations(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  amount        NUMERIC
);

-- Notifications
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id),
  kind        TEXT NOT NULL,
  project_id  UUID REFERENCES projects(id),
  read        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

### Row-Level Security (RLS) Policies

```sql
-- Profiles: users can read/edit their own; admins can read all
CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "admins_read_all_profiles" ON profiles
  FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Projects: techs see assigned; admins see all
CREATE POLICY "technician_read_assigned" ON projects
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE email = ANY (
        SELECT jsonb_array_elements_text(assigned_technicians::jsonb)::jsonb->>'email'
      )
    )
  );
CREATE POLICY "admin_all_projects" ON projects
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Survey tables: techs can CRUD their assigned projects; admins all
CREATE POLICY "technician_survey_access" ON survey_cctv
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE auth.uid() IN (
        SELECT id FROM profiles
        WHERE email = ANY (
          SELECT jsonb_array_elements_text(assigned_technicians::jsonb)::jsonb->>'email'
        )
      )
    )
  );
CREATE POLICY "admin_survey_access" ON survey_cctv
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );
```

---

## Storage

| Bucket | Visibility | Contents |
|--------|-----------|----------|
| `floor_plans` | Private (RLS) | Floor plan images uploaded during surveys |
| `site_images` | Private (RLS) | Site photos taken during inspection |
| `reports` | Private (RLS) | Generated PDF/DOCX estimation reports |

---

## Workflow Flowchart

```
                  ┌──────────────────────┐
                  │   ROLE SELECTION     │
                  │ Technician / Admin    │
                  └─────────┬────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
     ┌────────▼────────┐       ┌──────────▼──────────┐
     │  TECHNICIAN     │       │  SALES / ADMIN       │
     │  Supabase Auth  │       │  Supabase Auth        │
     └────────┬────────┘       └──────────┬──────────┘
              │                           │
              ▼                           ▼
     ┌──────────────────┐      ┌──────────────────────────┐
     │    DASHBOARD     │      │     DASHBOARD             │
     │ • SELECT projects│      │ • SELECT ALL projects     │
     │   WHERE assigned │      │ • INSERT new project      │
     │ • UPDATE response│      │ • UPDATE finalization     │
     └────────┬─────────┘      └──────────┬───────────────┘
              │                           │
              │            ┌───────────────┘
              ▼            ▼
     ┌─────────────────────────────────────┐
     │       PROJECT DETAILS               │
     │  (view only for techs)              │
     └────────────────┬────────────────────┘
                      │
                      ▼
     ┌─────────────────────────────────────┐
     │       SURVEY (Pick system)          │
     └────────────────┬────────────────────┘
                      │
                      ▼
     ┌──────────────────────────────────────┐
     │    SYSTEM-SPECIFIC SURVEY FORM        │
     │ • Floor plan → upload to Storage     │
     │ • Site images → upload to Storage    │
     │ • Device data → INSERT/UPSERT into   │
     │   survey_* table                     │
     └────────────────┬─────────────────────┘
                      │
                      ▼
     ┌──────────────────────────────────────┐
     │   AI CLARIFICATION (Gemini)          │
     │ • Client-side Gemini API chat        │
     │ • Generates audit narrative          │
     └────────────────┬─────────────────────┘
                      │
                      ▼
     ┌──────────────────────────────────────┐
     │   ESTIMATION SCREEN                  │
     │ • Manpower, consumables, fees        │
     │ • INSERT/UPDATE estimations table    │
     │ • Generated report → Storage upload  │
     └────────────────┬─────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
  (Next survey)            ┌──────────────────┐
                           │    SUMMARY        │
                           │ • SELECT survey + │
                           │   estimation data │
                           │ • Admin: finalize │
                           │   (UPDATE status) │
                           └──────────────────┘
```

---

## Key Technology Stack

| Category | Technology |
|----------|-----------|
| Framework | React 19, TypeScript |
| Build | Vite 6 |
| Styling | Tailwind CSS 4, Framer Motion |
| Backend | Supabase (Auth, Postgres, Storage, Edge Functions) |
| AI | Google Gemini (@google/genai) |
| Documents | jsPDF, html2canvas, docx |
| Maps | Leaflet |
| Import Map | esm.sh (CDN dependencies) |

---

## File Structure

```
src/
├── components/         # React components (screens, layouts)
│   ├── App.tsx         # Root: state machine router
│   ├── PortalLayout.tsx # Sidebar + header shell
│   ├── Dashboard.tsx   # Main workspace hub
│   ├── Login.tsx       # Technician auth
│   ├── AdminLogin.tsx  # Admin auth
│   ├── Signup.tsx      # Registration
│   ├── ProjectDetails.tsx  # Project creation/editing
│   ├── CCTVSurvey.tsx  # (and 5+ other survey forms)
│   ├── EstimationScreen.tsx # Cost estimation
│   ├── SurveySummary.tsx    # Final review
│   └── ...
├── services/
│   ├── supabase.ts     # Supabase client init
│   ├── geminiService.ts # Gemini API wrapper
│   └── summaryAccess.ts
├── utils/              # Pricing calculators, PDF export, helpers
├── hooks/              # Custom React hooks
├── types.ts            # TypeScript interfaces
├── constants.tsx       # Branding, enums
└── main.tsx            # Entry point
```
