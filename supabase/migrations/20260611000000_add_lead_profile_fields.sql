ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS budget NUMERIC,
  ADD COLUMN IF NOT EXISTS passport_series TEXT,
  ADD COLUMN IF NOT EXISTS jshshr NUMERIC(14, 0),
  ADD COLUMN IF NOT EXISTS fakultet TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'leads_budget_non_negative_check'
  ) THEN
    ALTER TABLE leads
      ADD CONSTRAINT leads_budget_non_negative_check
      CHECK (budget IS NULL OR budget >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'leads_passport_series_format_check'
  ) THEN
    ALTER TABLE leads
      ADD CONSTRAINT leads_passport_series_format_check
      CHECK (passport_series IS NULL OR passport_series ~ '^[A-Z]{2}[0-9]{7}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'leads_jshshr_14_digits_check'
  ) THEN
    ALTER TABLE leads
      ADD CONSTRAINT leads_jshshr_14_digits_check
      CHECK (jshshr IS NULL OR (jshshr >= 10000000000000 AND jshshr <= 99999999999999));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_leads_passport_series ON leads(passport_series);
CREATE INDEX IF NOT EXISTS idx_leads_jshshr ON leads(jshshr);
