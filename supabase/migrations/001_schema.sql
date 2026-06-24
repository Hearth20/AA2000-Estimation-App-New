-- AA2000 Site Survey — Database Schema
-- Run this against your Supabase project (SQL Editor or CLI).

-- Profiles (extends Supabase Auth users)
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Survey data per system
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

CREATE TABLE survey_fire_alarm (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  building_info   JSONB,
  measurements    JSONB,
  system_type     TEXT,
  integrations    TEXT[],
  detection_areas JSONB[],
  notification    JSONB,
  infrastructure  JSONB,
  control_panel   JSONB,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE survey_access_ctrl (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  building_info   JSONB,
  measurements    JSONB,
  doors           JSONB[],
  infrastructure  JSONB,
  controller      JSONB,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE survey_burglar (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  building_info   JSONB,
  measurements    JSONB,
  sensors         JSONB[],
  notification    JSONB,
  control_panel   JSONB,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE survey_fire_prot (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID REFERENCES projects(id) ON DELETE CASCADE,
  building_info     JSONB,
  measurements      JSONB,
  protection_units  JSONB[],
  alarm_core        JSONB,
  suppression       JSONB,
  sprinkler         JSONB,
  portable          JSONB,
  site_constraints  JSONB,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE survey_other (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  building_info   JSONB,
  measurements    JSONB,
  system_category TEXT,
  scope_of_work   TEXT,
  service_details TEXT,
  technical_specs JSONB,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

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
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  read        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_estimations_project ON estimations(project_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = false;
