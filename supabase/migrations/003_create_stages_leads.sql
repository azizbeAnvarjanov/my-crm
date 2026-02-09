-- Create stages table
CREATE TABLE IF NOT EXISTS stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  pipeline_id UUID NOT NULL REFERENCES piplines(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_2 TEXT,
  utm TEXT,
  date_of_year TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', NULL)),
  status TEXT DEFAULT 'new',
  stage_id UUID NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  pipeline_id UUID NOT NULL REFERENCES piplines(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES xodimlar(id) ON DELETE SET NULL,
  age INTEGER,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stages_pipeline_id ON stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_stages_order_index ON stages(order_index);

CREATE INDEX IF NOT EXISTS idx_leads_pipeline_id ON leads(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage_id ON leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_leads_employee_id ON leads(employee_id);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_name ON leads(name);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- Enable Row Level Security
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create policies for stages
CREATE POLICY "Allow authenticated users to read stages" 
  ON stages FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow super-admin to manage stages" 
  ON stages FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM xodimlar 
      WHERE xodimlar.employee_id = auth.uid() 
      AND xodimlar.role = 'super-admin'
    )
  );

-- Create policies for leads
CREATE POLICY "Allow authenticated users to read leads" 
  ON leads FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to insert leads" 
  ON leads FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update leads" 
  ON leads FOR UPDATE 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow super-admin to delete leads" 
  ON leads FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM xodimlar 
      WHERE xodimlar.employee_id = auth.uid() 
      AND xodimlar.role = 'super-admin'
    )
  );

-- Trigger for leads updated_at
DROP TRIGGER IF EXISTS leads_updated_at ON leads;
CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample stages for testing (optional - comment out in production)
-- INSERT INTO stages (name, pipeline_id, order_index, color) VALUES
-- ('Yangi', 'your-pipeline-id', 0, '#3b82f6'),
-- ('Bog''lanildi', 'your-pipeline-id', 1, '#eab308'),
-- ('Izohda', 'your-pipeline-id', 2, '#8b5cf6'),
-- ('Yakunlandi', 'your-pipeline-id', 3, '#22c55e'),
-- ('Bekor qilindi', 'your-pipeline-id', 4, '#ef4444');
