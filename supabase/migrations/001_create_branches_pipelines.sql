-- Create branches (filiallar) table
CREATE TABLE IF NOT EXISTS branches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pipelines table
CREATE TABLE IF NOT EXISTS pipelines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pipelines_branch_id ON pipelines(branch_id);

-- Enable Row Level Security
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;

-- Create policies for branches (allow all authenticated users to read/write)
CREATE POLICY "Allow authenticated users to read branches" 
  ON branches FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to insert branches" 
  ON branches FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update branches" 
  ON branches FOR UPDATE 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to delete branches" 
  ON branches FOR DELETE 
  TO authenticated 
  USING (true);

-- Create policies for pipelines
CREATE POLICY "Allow authenticated users to read pipelines" 
  ON pipelines FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to insert pipelines" 
  ON pipelines FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update pipelines" 
  ON pipelines FOR UPDATE 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to delete pipelines" 
  ON pipelines FOR DELETE 
  TO authenticated 
  USING (true);

-- Insert sample branches (filiallar)
INSERT INTO branches (name, address, phone) VALUES 
  ('Toshkent Markaziy', 'Toshkent sh., Amir Temur ko''chasi 1', '+998 71 123 45 67'),
  ('Toshkent Chilonzor', 'Toshkent sh., Chilonzor tumani, 10-mavze', '+998 71 234 56 78'),
  ('Samarqand', 'Samarqand sh., Registon ko''chasi 15', '+998 66 345 67 89'),
  ('Buxoro', 'Buxoro sh., Mustaqillik ko''chasi 22', '+998 65 456 78 90'),
  ('Andijon', 'Andijon sh., Bobur shoh ko''chasi 8', '+998 74 567 89 01')
ON CONFLICT DO NOTHING;

-- Insert sample pipelines for first branch
INSERT INTO pipelines (name, description, branch_id, status) 
SELECT 
  'Savdo Pipeline',
  'Asosiy savdo jarayoni',
  id,
  'active'
FROM branches WHERE name = 'Toshkent Markaziy'
ON CONFLICT DO NOTHING;

INSERT INTO pipelines (name, description, branch_id, status) 
SELECT 
  'Marketing Pipeline',
  'Marketing kampaniyalari',
  id,
  'active'
FROM branches WHERE name = 'Toshkent Markaziy'
ON CONFLICT DO NOTHING;

INSERT INTO pipelines (name, description, branch_id, status) 
SELECT 
  'Xizmat ko''rsatish',
  'Mijozlarga xizmat ko''rsatish jarayoni',
  id,
  'paused'
FROM branches WHERE name = 'Toshkent Markaziy'
ON CONFLICT DO NOTHING;

-- Insert sample pipelines for Samarqand branch
INSERT INTO pipelines (name, description, branch_id, status) 
SELECT 
  'Turizm Pipeline',
  'Turistik xizmatlar',
  id,
  'active'
FROM branches WHERE name = 'Samarqand'
ON CONFLICT DO NOTHING;

INSERT INTO pipelines (name, description, branch_id, status) 
SELECT 
  'Mahalliy savdo',
  'Mahalliy bozor uchun savdo',
  id,
  'active'
FROM branches WHERE name = 'Samarqand'
ON CONFLICT DO NOTHING;
