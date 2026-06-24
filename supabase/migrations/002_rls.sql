-- AA2000 Site Survey — Row-Level Security Policies
-- Run after 001_schema.sql.

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_cctv ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_fire_alarm ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_access_ctrl ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_burglar ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_fire_prot ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_other ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumables ENABLE ROW LEVEL SECURITY;
ALTER TABLE additional_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "admins_read_all_profiles" ON profiles
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

CREATE POLICY "admins_insert_profiles" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Projects: techs see only assigned; admins see all
CREATE POLICY "technician_read_assigned" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.email = ANY (
          SELECT jsonb_array_elements_text(assigned_technicians::jsonb)::jsonb->>'email'
        )
    )
  );

CREATE POLICY "technician_update_response" ON projects
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.email = ANY (
          SELECT jsonb_array_elements_text(assigned_technicians::jsonb)::jsonb->>'email'
        )
    )
  );

CREATE POLICY "admin_all_projects" ON projects
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Survey tables: techs access assigned project surveys; admins all
CREATE POLICY "technician_survey_select" ON survey_cctv
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND email = ANY (
            SELECT jsonb_array_elements_text(p.assigned_technicians::jsonb)::jsonb->>'email'
          )
      )
    )
  );

CREATE POLICY "technician_survey_insert_update" ON survey_cctv
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND email = ANY (
            SELECT jsonb_array_elements_text(p.assigned_technicians::jsonb)::jsonb->>'email'
          )
      )
    )
  );

CREATE POLICY "admin_survey_all" ON survey_cctv
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Apply same pattern to remaining survey tables
-- (survey_fire_alarm, survey_access_ctrl, survey_burglar,
--  survey_fire_prot, survey_other) — repeat the two tech policies
-- + admin policy per table.

-- Estimations: techs can CRUD their project estimations; admins all
CREATE POLICY "technician_estimation_all" ON estimations
  FOR ALL USING (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND email = ANY (
            SELECT jsonb_array_elements_text(p.assigned_technicians::jsonb)::jsonb->>'email'
          )
      )
    )
  );

CREATE POLICY "admin_estimation_all" ON estimations
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Consumables and additional_fees inherit via estimation_id
CREATE POLICY "technician_consumables_all" ON consumables
  FOR ALL USING (
    estimation_id IN (
      SELECT e.id FROM estimations e
      JOIN projects p ON p.id = e.project_id
      WHERE EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND email = ANY (
            SELECT jsonb_array_elements_text(p.assigned_technicians::jsonb)::jsonb->>'email'
          )
      )
    )
  );

CREATE POLICY "admin_consumables_all" ON consumables
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

CREATE POLICY "technician_fees_all" ON additional_fees
  FOR ALL USING (
    estimation_id IN (
      SELECT e.id FROM estimations e
      JOIN projects p ON p.id = e.project_id
      WHERE EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND email = ANY (
            SELECT jsonb_array_elements_text(p.assigned_technicians::jsonb)::jsonb->>'email'
          )
      )
    )
  );

CREATE POLICY "admin_fees_all" ON additional_fees
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Notifications: users see their own; admins see all
CREATE POLICY "user_read_own_notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_update_own_notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "admin_notifications_all" ON notifications
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );
