-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('super-admin', 'manager')),
  access TEXT[] DEFAULT ARRAY['/', '/profile', '/pipelines', '/notes', '/calls'],
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id),
  UNIQUE(email)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_branch_id ON employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);

-- Enable Row Level Security
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Create policies for departments
CREATE POLICY "Allow authenticated users to read departments" 
  ON departments FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow super-admin to manage departments" 
  ON departments FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE employees.employee_id = auth.uid() 
      AND employees.role = 'super-admin'
    )
  );

-- Create policies for employees
CREATE POLICY "Allow authenticated users to read employees" 
  ON employees FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow super-admin to manage employees" 
  ON employees FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE employees.employee_id = auth.uid() 
      AND employees.role = 'super-admin'
    )
  );

CREATE POLICY "Allow users to update their own profile" 
  ON employees FOR UPDATE 
  TO authenticated 
  USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());

-- Insert sample departments
INSERT INTO departments (name) VALUES 
  ('Savdo'),
  ('Marketing'),
  ('IT'),
  ('Moliya'),
  ('HR')
ON CONFLICT (name) DO NOTHING;

-- Function to create employee on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.employees (employee_id, name, email, role, user_id, access)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    CASE 
      WHEN NOT EXISTS (SELECT 1 FROM public.employees LIMIT 1) THEN 'super-admin'
      ELSE 'manager'
    END,
    NEW.id,
    CASE 
      WHEN NOT EXISTS (SELECT 1 FROM public.employees LIMIT 1) 
      THEN ARRAY['/', '/profile', '/pipelines', '/notes', '/calls', '/settings', '/employees', '/forms', '/leads', '/import', '/dashboard', '/calls-analytics']
      ELSE ARRAY['/', '/profile', '/pipelines', '/notes', '/calls']
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create employee on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for employees updated_at
DROP TRIGGER IF EXISTS employees_updated_at ON employees;
CREATE TRIGGER employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
