-- Allow regular employees to remove duplicate leads assigned to themselves during merge.
-- Super-admin delete access is already covered by the existing leads policy.

GRANT DELETE ON leads TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'leads'
      AND policyname = 'Allow assigned users to delete own leads'
  ) THEN
    CREATE POLICY "Allow assigned users to delete own leads"
      ON leads FOR DELETE
      TO authenticated
      USING (
        employee_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM xodimlar
          WHERE xodimlar.employee_id::TEXT = auth.uid()::TEXT
            AND xodimlar.id::TEXT = leads.employee_id::TEXT
        )
      );
  END IF;
END;
$$;
