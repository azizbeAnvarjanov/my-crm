ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS duplicate_fields TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS duplicate_count INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION normalize_lead_duplicate_phone(value TEXT)
RETURNS TEXT AS $$
  WITH normalized AS (
    SELECT regexp_replace(COALESCE(value, ''), '[^0-9]', '', 'g') AS digits
  )
  SELECT CASE
    WHEN digits = '' THEN NULL
    WHEN length(digits) >= 9 THEN right(digits, 9)
    ELSE digits
  END
  FROM normalized;
$$ LANGUAGE sql IMMUTABLE;

CREATE INDEX IF NOT EXISTS idx_leads_duplicate_phone
  ON leads (normalize_lead_duplicate_phone(phone))
  WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_duplicate_phone_2
  ON leads (normalize_lead_duplicate_phone(phone_2))
  WHERE phone_2 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_duplicate_passport_series
  ON leads (upper(trim(passport_series)))
  WHERE passport_series IS NOT NULL;

CREATE OR REPLACE FUNCTION get_lead_duplicate_fields(
  target_id BIGINT,
  target_phone TEXT,
  target_phone_2 TEXT,
  target_passport_series TEXT,
  target_jshshr NUMERIC
)
RETURNS TEXT[] AS $$
DECLARE
  fields TEXT[] := ARRAY[]::TEXT[];
  phone_values TEXT[];
  passport_value TEXT;
BEGIN
  phone_values := ARRAY(
    SELECT DISTINCT value
    FROM unnest(ARRAY[
      normalize_lead_duplicate_phone(target_phone),
      normalize_lead_duplicate_phone(target_phone_2)
    ]) AS value
    WHERE value IS NOT NULL
  );

  IF cardinality(phone_values) > 0
    AND EXISTS (
      SELECT 1
      FROM leads other
      WHERE other.id <> target_id
        AND (
          normalize_lead_duplicate_phone(other.phone) = ANY(phone_values)
          OR normalize_lead_duplicate_phone(other.phone_2) = ANY(phone_values)
        )
    )
  THEN
    fields := array_append(fields, 'phone');
  END IF;

  passport_value := NULLIF(upper(trim(target_passport_series)), '');
  IF passport_value IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM leads other
      WHERE other.id <> target_id
        AND upper(trim(other.passport_series)) = passport_value
    )
  THEN
    fields := array_append(fields, 'passport_series');
  END IF;

  IF target_jshshr IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM leads other
      WHERE other.id <> target_id
        AND other.jshshr = target_jshshr
    )
  THEN
    fields := array_append(fields, 'jshshr');
  END IF;

  RETURN fields;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('app.skip_updated_at', true) = 'on' THEN
    RETURN NEW;
  END IF;

  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_lead_duplicate_flags_for_values(
  phone_values TEXT[] DEFAULT ARRAY[]::TEXT[],
  passport_values TEXT[] DEFAULT ARRAY[]::TEXT[],
  jshshr_values NUMERIC[] DEFAULT ARRAY[]::NUMERIC[],
  direct_ids BIGINT[] DEFAULT ARRAY[]::BIGINT[]
)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.skip_updated_at', 'on', true);

  WITH candidate_ids AS (
    SELECT DISTINCT id
    FROM leads
    WHERE id = ANY(COALESCE(direct_ids, ARRAY[]::BIGINT[]))
      OR (
        cardinality(COALESCE(phone_values, ARRAY[]::TEXT[])) > 0
        AND (
          normalize_lead_duplicate_phone(phone) = ANY(phone_values)
          OR normalize_lead_duplicate_phone(phone_2) = ANY(phone_values)
        )
      )
      OR (
        cardinality(COALESCE(passport_values, ARRAY[]::TEXT[])) > 0
        AND upper(trim(passport_series)) = ANY(passport_values)
      )
      OR (
        cardinality(COALESCE(jshshr_values, ARRAY[]::NUMERIC[])) > 0
        AND jshshr = ANY(jshshr_values)
      )
  ),
  computed AS (
    SELECT
      leads.id,
      get_lead_duplicate_fields(leads.id, leads.phone, leads.phone_2, leads.passport_series, leads.jshshr) AS fields
    FROM leads
    JOIN candidate_ids ON candidate_ids.id = leads.id
  )
  UPDATE leads target
  SET
    duplicate_fields = computed.fields,
    duplicate_count = COALESCE(cardinality(computed.fields), 0)
  FROM computed
  WHERE target.id = computed.id
    AND (
      target.duplicate_fields IS DISTINCT FROM computed.fields
      OR target.duplicate_count IS DISTINCT FROM COALESCE(cardinality(computed.fields), 0)
    );

  PERFORM set_config('app.skip_updated_at', 'off', true);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_lead_duplicate_flags_from_trigger()
RETURNS TRIGGER AS $$
DECLARE
  phone_values TEXT[] := ARRAY[]::TEXT[];
  passport_values TEXT[] := ARRAY[]::TEXT[];
  jshshr_values NUMERIC[] := ARRAY[]::NUMERIC[];
  direct_ids BIGINT[] := ARRAY[]::BIGINT[];
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    direct_ids := array_append(direct_ids, NEW.id);
    phone_values := phone_values || ARRAY[
      normalize_lead_duplicate_phone(NEW.phone),
      normalize_lead_duplicate_phone(NEW.phone_2)
    ];
    passport_values := array_append(passport_values, NULLIF(upper(trim(NEW.passport_series)), ''));
    jshshr_values := array_append(jshshr_values, NEW.jshshr);
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    direct_ids := array_append(direct_ids, OLD.id);
    phone_values := phone_values || ARRAY[
      normalize_lead_duplicate_phone(OLD.phone),
      normalize_lead_duplicate_phone(OLD.phone_2)
    ];
    passport_values := array_append(passport_values, NULLIF(upper(trim(OLD.passport_series)), ''));
    jshshr_values := array_append(jshshr_values, OLD.jshshr);
  END IF;

  phone_values := ARRAY(SELECT DISTINCT value FROM unnest(phone_values) AS value WHERE value IS NOT NULL);
  passport_values := ARRAY(SELECT DISTINCT value FROM unnest(passport_values) AS value WHERE value IS NOT NULL);
  jshshr_values := ARRAY(SELECT DISTINCT value FROM unnest(jshshr_values) AS value WHERE value IS NOT NULL);
  direct_ids := ARRAY(SELECT DISTINCT value FROM unnest(direct_ids) AS value WHERE value IS NOT NULL);

  PERFORM refresh_lead_duplicate_flags_for_values(phone_values, passport_values, jshshr_values, direct_ids);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_duplicate_flags_insert ON leads;
CREATE TRIGGER leads_duplicate_flags_insert
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION refresh_lead_duplicate_flags_from_trigger();

DROP TRIGGER IF EXISTS leads_duplicate_flags_update ON leads;
CREATE TRIGGER leads_duplicate_flags_update
  AFTER UPDATE OF phone, phone_2, passport_series, jshshr ON leads
  FOR EACH ROW
  EXECUTE FUNCTION refresh_lead_duplicate_flags_from_trigger();

DROP TRIGGER IF EXISTS leads_duplicate_flags_delete ON leads;
CREATE TRIGGER leads_duplicate_flags_delete
  AFTER DELETE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION refresh_lead_duplicate_flags_from_trigger();

SELECT refresh_lead_duplicate_flags_for_values(
  ARRAY(
    SELECT DISTINCT value
    FROM (
      SELECT normalize_lead_duplicate_phone(phone) AS value FROM leads
      UNION
      SELECT normalize_lead_duplicate_phone(phone_2) AS value FROM leads
    ) phones
    WHERE value IS NOT NULL
  ),
  ARRAY(
    SELECT DISTINCT NULLIF(upper(trim(passport_series)), '')
    FROM leads
    WHERE NULLIF(upper(trim(passport_series)), '') IS NOT NULL
  ),
  ARRAY(
    SELECT DISTINCT jshshr
    FROM leads
    WHERE jshshr IS NOT NULL
  ),
  ARRAY(
    SELECT id
    FROM leads
  )
);
