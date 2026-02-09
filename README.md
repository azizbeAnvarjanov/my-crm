# CRM Pro - Enterprise Customer Management

Professional CRM solution built with Next.js, Supabase, and shadcn/ui.

## 🚀 Features

- **Authentication**: Email/Password, GitHub, Google OAuth
- **Dark Theme**: Supabase-inspired green dark theme
- **Collapsible Sidebar**: Professional sidebar with branch/filial selector
- **Pipelines**: Branch-specific pipeline management
- **Protected Routes**: All routes require authentication

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/              # Auth pages (no sidebar)
│   │   ├── login/
│   │   ├── signup/
│   │   └── forgot-password/
│   ├── (protected)/         # Protected pages (with sidebar)
│   │   ├── dashboard/
│   │   ├── pipelines/       # Branch-specific pipelines
│   │   ├── tables/
│   │   ├── authentication/
│   │   ├── api-keys/
│   │   └── settings/
│   └── auth/callback/       # OAuth callback
├── components/
│   ├── app-sidebar.tsx      # Main sidebar with branch context
│   └── ui/                  # shadcn/ui components
└── lib/
    └── supabase/            # Supabase clients
```

## ⚙️ Setup

### 1. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 2. Database Setup

Run the following SQL in your Supabase SQL Editor:

```sql
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

-- Create policies for branches
CREATE POLICY "Allow authenticated users to read branches" 
  ON branches FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert branches" 
  ON branches FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update branches" 
  ON branches FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete branches" 
  ON branches FOR DELETE TO authenticated USING (true);

-- Create policies for pipelines
CREATE POLICY "Allow authenticated users to read pipelines" 
  ON pipelines FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert pipelines" 
  ON pipelines FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update pipelines" 
  ON pipelines FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete pipelines" 
  ON pipelines FOR DELETE TO authenticated USING (true);

-- Insert sample branches
INSERT INTO branches (name, address, phone) VALUES 
  ('Toshkent Markaziy', 'Toshkent sh., Amir Temur ko''chasi 1', '+998 71 123 45 67'),
  ('Toshkent Chilonzor', 'Toshkent sh., Chilonzor tumani, 10-mavze', '+998 71 234 56 78'),
  ('Samarqand', 'Samarqand sh., Registon ko''chasi 15', '+998 66 345 67 89'),
  ('Buxoro', 'Buxoro sh., Mustaqillik ko''chasi 22', '+998 65 456 78 90'),
  ('Andijon', 'Andijon sh., Bobur shoh ko''chasi 8', '+998 74 567 89 01');
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🎨 Design

- **Theme**: Supabase-inspired dark green theme
- **Primary Color**: `#3ecf8e` (Supabase green)
- **Background**: `#171717` (Dark)
- **Sidebar**: `#101010` (Darker)

## 📦 Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **UI**: shadcn/ui
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

## 🔐 Authentication Flow

1. Unauthenticated users are redirected to `/login`
2. After login, users are redirected to `/dashboard`
3. All `/protected/*` routes require authentication
4. Branch selection is stored in localStorage

## 🏢 Branch/Filial System

- Branches are fetched from `branches` table
- Selected branch is stored in localStorage
- Pipelines are filtered by selected branch
- Branch context is shared via React Context
