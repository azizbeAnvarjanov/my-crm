-- Forms table
CREATE TABLE IF NOT EXISTS forms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    pipeline_id UUID NOT NULL REFERENCES piplines(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
    status BOOLEAN DEFAULT false,
    utm TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_forms_branch_id ON forms(branch_id);
CREATE INDEX IF NOT EXISTS idx_forms_pipeline_id ON forms(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_forms_stage_id ON forms(stage_id);
CREATE INDEX IF NOT EXISTS idx_forms_status ON forms(status);

-- Enable Row Level Security
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all forms in their branch
CREATE POLICY "Users can read forms in their branch"
ON forms FOR SELECT
USING (
    branch_id IN (
        SELECT branch_id FROM employees WHERE user_id = auth.uid()
    )
);

-- Policy: Super admins can read all forms
CREATE POLICY "Super admins can read all forms"
ON forms FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM employees 
        WHERE user_id = auth.uid() AND role = 'super-admin'
    )
);

-- Policy: Super admins can insert forms
CREATE POLICY "Super admins can insert forms"
ON forms FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM employees 
        WHERE user_id = auth.uid() AND role = 'super-admin'
    )
);

-- Policy: Super admins can update forms
CREATE POLICY "Super admins can update forms"
ON forms FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM employees 
        WHERE user_id = auth.uid() AND role = 'super-admin'
    )
);

-- Policy: Super admins can delete forms
CREATE POLICY "Super admins can delete forms"
ON forms FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM employees 
        WHERE user_id = auth.uid() AND role = 'super-admin'
    )
);

-- Update updated_at timestamp on update
CREATE OR REPLACE FUNCTION update_forms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_forms_updated_at_trigger
BEFORE UPDATE ON forms
FOR EACH ROW
EXECUTE FUNCTION update_forms_updated_at();
