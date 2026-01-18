-- Additional security hardening

-- 1. Add policy for leads marketplace viewing (authenticated lawfirm users)
-- Allow lawfirm users to view marketplace leads (status Pendiente, no assignments)
CREATE POLICY "Lawfirm users can view marketplace leads"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (
    status_internal = 'Pendiente'::lead_status
    AND is_in_marketplace = true
    AND get_user_lawfirm_id(auth.uid()) IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM lead_assignments WHERE lead_id = leads.id)
  );

-- 2. Allow lawfirm users to view lexcore runs for their leads or marketplace leads
CREATE POLICY "Lawfirm users can view lexcore runs for their leads"
  ON public.lexcore_runs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lead_assignments la
      JOIN profiles p ON p.lawfirm_id = la.lawfirm_id
      WHERE la.lead_id = lexcore_runs.lead_id
      AND p.id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = lexcore_runs.lead_id
      AND l.status_internal = 'Pendiente'
      AND get_user_lawfirm_id(auth.uid()) IS NOT NULL
    )
  );

-- 3. Allow lawfirm users to view branches of their lawfirm
CREATE POLICY "Lawfirm users can view their branches"
  ON public.branches
  FOR SELECT
  TO authenticated
  USING (lawfirm_id = get_user_lawfirm_id(auth.uid()));

-- 4. Allow lawfirm admins to manage their branches
CREATE POLICY "Lawfirm admins can manage their branches"
  ON public.branches
  FOR ALL
  TO authenticated
  USING (
    lawfirm_id = get_user_lawfirm_id(auth.uid())
    AND has_role(auth.uid(), 'lawfirm_admin')
  )
  WITH CHECK (
    lawfirm_id = get_user_lawfirm_id(auth.uid())
    AND has_role(auth.uid(), 'lawfirm_admin')
  );