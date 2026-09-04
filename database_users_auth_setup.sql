-- =========================================================================
-- GOVSERVE: Public Assets & Facilities Management System
-- Database Setup & Seed Script for Authentication & Core System Tables
-- =========================================================================
-- Run this SQL in your eProvider (Supabase) SQL Editor or PostgreSQL Database
-- =========================================================================

-- 1. USERS & AUTHENTICATION TABLE
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role VARCHAR(50) NOT NULL DEFAULT 'Citizen',
  department VARCHAR(150) DEFAULT 'Resident User',
  avatar VARCHAR(255) DEFAULT 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  status VARCHAR(50) DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure all required columns exist in case the table already existed previously
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'Citizen';
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS department VARCHAR(150) DEFAULT 'Resident User';
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS avatar VARCHAR(255) DEFAULT 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';

-- Enable RLS (if needed by Supabase) or grant public access for anon key
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations for anon" ON users;
CREATE POLICY "Allow all operations for anon" ON users FOR ALL USING (true) WITH CHECK (true);

-- Initial Users Seed Data (Admin, Staff, Citizen)
INSERT INTO users (name, email, password, phone, role, department, avatar, status)
VALUES 
  ('Atty. Elena Ramos', 'admin@govserve.gov.ph', 'admin123', '+63 917 888 1111', 'Super Admin', 'Municipal Executive Office', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80', 'Active'),
  ('Engr. Roberto Santos', 'staff@govserve.gov.ph', 'staff123', '+63 918 777 2222', 'Staff Officer', 'City Engineering & Public Works', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', 'Active'),
  ('Juan M. Dela Cruz', 'juan.delacruz@citizen.gov.ph', 'citizen123', '+63 917 123 4567', 'Citizen', 'Resident User', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80', 'Active')
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  status = EXCLUDED.status;

-- 2. FACILITIES & RECREATION PARKS TABLE
CREATE TABLE IF NOT EXISTS facilities (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL,
  capacity INT DEFAULT 50,
  hourly_rate NUMERIC(10, 2) DEFAULT 0,
  location VARCHAR(255) NOT NULL,
  amenities TEXT DEFAULT 'Sound System, Aircon, Chairs, Stage',
  status VARCHAR(50) DEFAULT 'Available',
  image_url VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS facilities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations for anon" ON facilities;
CREATE POLICY "Allow all operations for anon" ON facilities FOR ALL USING (true) WITH CHECK (true);

-- 3. FACILITY & PARK RESERVATIONS TABLE
CREATE TABLE IF NOT EXISTS facility_reservations (
  id BIGSERIAL PRIMARY KEY,
  reference_no VARCHAR(50) UNIQUE NOT NULL,
  facility_id BIGINT REFERENCES facilities(id) ON DELETE SET NULL,
  applicant_name VARCHAR(100) NOT NULL,
  applicant_email VARCHAR(100) NOT NULL,
  applicant_phone VARCHAR(50) NOT NULL,
  purpose VARCHAR(200) NOT NULL,
  event_date DATE NOT NULL,
  start_time VARCHAR(20) NOT NULL,
  end_time VARCHAR(20) NOT NULL,
  attendees INT DEFAULT 20,
  special_equipment TEXT,
  status VARCHAR(50) DEFAULT 'Pending',
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS facility_reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations for anon" ON facility_reservations;
CREATE POLICY "Allow all operations for anon" ON facility_reservations FOR ALL USING (true) WITH CHECK (true);

-- 4. CEMETERY PLOTS & COLUMBARIUM WALL TABLE
CREATE TABLE IF NOT EXISTS cemetery_plots (
  id BIGSERIAL PRIMARY KEY,
  cemetery_name VARCHAR(150) DEFAULT 'Barangay 178 Municipal Cemetery',
  plot_code VARCHAR(50) UNIQUE NOT NULL,
  section VARCHAR(100) NOT NULL,
  block_no VARCHAR(50) NOT NULL,
  lot_no VARCHAR(50) NOT NULL,
  row_no INT,
  col_no INT,
  plot_type VARCHAR(50) DEFAULT 'Columbarium Niche',
  status VARCHAR(50) DEFAULT 'Available',
  price NUMERIC(10, 2) DEFAULT 15000.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS cemetery_plots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations for anon" ON cemetery_plots;
CREATE POLICY "Allow all operations for anon" ON cemetery_plots FOR ALL USING (true) WITH CHECK (true);

-- 5. BURIAL RECORDS & PERMITS TABLE
CREATE TABLE IF NOT EXISTS burial_records (
  id BIGSERIAL PRIMARY KEY,
  reference_no VARCHAR(50) UNIQUE NOT NULL,
  permit_no VARCHAR(50),
  deceased_name VARCHAR(150) NOT NULL,
  date_of_birth DATE,
  date_of_death DATE NOT NULL,
  cause_of_death VARCHAR(200),
  deceased_address TEXT,
  attending_physician VARCHAR(150),
  burial_date DATE NOT NULL,
  burial_time VARCHAR(20),
  cemetery_name VARCHAR(150) DEFAULT 'Barangay 178 Municipal Cemetery',
  plot_id BIGINT REFERENCES cemetery_plots(id) ON DELETE SET NULL,
  contact_person VARCHAR(100) NOT NULL,
  applicant_relationship VARCHAR(50),
  contact_phone VARCHAR(50) NOT NULL,
  applicant_email VARCHAR(100),
  applicant_address TEXT,
  death_cert_attached BOOLEAN DEFAULT false,
  death_cert_url TEXT,
  valid_id_attached BOOLEAN DEFAULT false,
  valid_id_url TEXT,
  status VARCHAR(50) DEFAULT 'Pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS burial_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations for anon" ON burial_records;
CREATE POLICY "Allow all operations for anon" ON burial_records FOR ALL USING (true) WITH CHECK (true);

-- 6. WATER & DRAINAGE UTILITY REQUESTS TABLE
CREATE TABLE IF NOT EXISTS utility_requests (
  id BIGSERIAL PRIMARY KEY,
  ticket_no VARCHAR(50) UNIQUE NOT NULL,
  incident_type VARCHAR(100) NOT NULL,
  citizen_name VARCHAR(100) NOT NULL,
  citizen_phone VARCHAR(50) NOT NULL,
  citizen_email VARCHAR(100),
  location VARCHAR(255) NOT NULL,
  landmark VARCHAR(255),
  urgency VARCHAR(50) DEFAULT 'Medium',
  description TEXT NOT NULL,
  photo_url TEXT,
  status VARCHAR(50) DEFAULT 'Pending Review',
  assigned_team VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS utility_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations for anon" ON utility_requests;
CREATE POLICY "Allow all operations for anon" ON utility_requests FOR ALL USING (true) WITH CHECK (true);

-- 7. PUBLIC ASSETS & HEAVY EQUIPMENT INVENTORY TABLE
CREATE TABLE IF NOT EXISTS assets (
  id BIGSERIAL PRIMARY KEY,
  asset_tag VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(100) NOT NULL,
  assigned_department VARCHAR(150) NOT NULL,
  location VARCHAR(255) NOT NULL,
  acquisition_date DATE,
  purchase_cost NUMERIC(12, 2) DEFAULT 0,
  current_condition VARCHAR(50) DEFAULT 'Operational',
  status VARCHAR(50) DEFAULT 'Active',
  last_service_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations for anon" ON assets;
CREATE POLICY "Allow all operations for anon" ON assets FOR ALL USING (true) WITH CHECK (true);

-- 8. SYSTEM ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGSERIAL PRIMARY KEY,
  user_name VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  module VARCHAR(50) NOT NULL,
  details TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations for anon" ON activity_logs;
CREATE POLICY "Allow all operations for anon" ON activity_logs FOR ALL USING (true) WITH CHECK (true);
