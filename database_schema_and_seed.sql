-- =========================================================================
-- GOVSERVE: Public Assets and Facilities Management System
-- Complete PostgreSQL Database Schema & Initial Seed Data
-- =========================================================================

-- Optional: Create Database (run if database doesn't exist yet)
-- CREATE DATABASE govserve_db;
-- \c govserve_db;

-- 1. USERS & AUTHENTICATION TABLE
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS burial_records CASCADE;
DROP TABLE IF EXISTS cemetery_plots CASCADE;
DROP TABLE IF EXISTS facility_reservations CASCADE;
DROP TABLE IF EXISTS facilities CASCADE;
DROP TABLE IF EXISTS utility_requests CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL,
  department VARCHAR(100) NOT NULL,
  avatar VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. FACILITIES & PARKS TABLE
CREATE TABLE facilities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'Government Facility' or 'Park & Recreation'
  capacity INT DEFAULT 50,
  hourly_rate NUMERIC(10, 2) DEFAULT 0,
  location VARCHAR(255) NOT NULL,
  amenities TEXT DEFAULT 'Sound System, Aircon, Chairs, Stage',
  status VARCHAR(50) DEFAULT 'Available',
  image_url VARCHAR(255)
);

-- 3. FACILITY & PARK RESERVATIONS TABLE
CREATE TABLE facility_reservations (
  id SERIAL PRIMARY KEY,
  reference_no VARCHAR(50) UNIQUE NOT NULL,
  facility_id INT REFERENCES facilities(id) ON DELETE SET NULL,
  applicant_name VARCHAR(100) NOT NULL,
  applicant_email VARCHAR(100) NOT NULL,
  applicant_phone VARCHAR(50) NOT NULL,
  purpose VARCHAR(200) NOT NULL,
  event_date DATE NOT NULL,
  start_time VARCHAR(20) NOT NULL,
  end_time VARCHAR(20) NOT NULL,
  attendees INT DEFAULT 20,
  status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected', 'Completed'
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. CEMETERY PLOTS & COLUMBARIUM VAULTS TABLE
CREATE TABLE cemetery_plots (
  id SERIAL PRIMARY KEY,
  cemetery_name VARCHAR(150) DEFAULT 'Barangay 178 Municipal Cemetery',
  plot_code VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'COL-R01-C01' or 'SEC-A-B01-L01'
  section VARCHAR(50) NOT NULL,         -- 'Columbarium Wall Alpha', 'Section A - St. Peter Lawn'
  block_no VARCHAR(20) NOT NULL,
  lot_no VARCHAR(20) NOT NULL,
  row_no INT,
  col_no INT,
  plot_type VARCHAR(50) DEFAULT 'Columbarium Niche', -- 'Columbarium Niche', 'Lawn Lot', 'Mausoleum', 'Ossuary'
  status VARCHAR(50) DEFAULT 'Available',            -- 'Available', 'Reserved', 'Occupied'
  price NUMERIC(10, 2) DEFAULT 18000.00
);

-- 5. DECEASED REGISTRY & BURIAL PERMITS TABLE
CREATE TABLE burial_records (
  id SERIAL PRIMARY KEY,
  reference_no VARCHAR(50) UNIQUE NOT NULL,
  deceased_name VARCHAR(100) NOT NULL,
  date_of_birth DATE,
  date_of_death DATE NOT NULL,
  burial_date DATE NOT NULL,
  plot_id INT REFERENCES cemetery_plots(id) ON DELETE SET NULL,
  contact_person VARCHAR(100) NOT NULL,
  contact_phone VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'Approved',
  permit_no VARCHAR(50) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. WATER SUPPLY & DRAINAGE REQUESTS TABLE
CREATE TABLE utility_requests (
  id SERIAL PRIMARY KEY,
  ticket_no VARCHAR(50) UNIQUE NOT NULL,
  citizen_name VARCHAR(100) NOT NULL,
  citizen_phone VARCHAR(50) NOT NULL,
  service_type VARCHAR(100) NOT NULL, -- 'Clogged Drainage / Flood Mitigation', 'Main Pipeline Leak Repair', etc.
  location VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  urgency VARCHAR(20) DEFAULT 'Normal',
  ai_priority_score INT DEFAULT 60,
  status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Dispatched', 'Resolved'
  assigned_team VARCHAR(100),
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

-- 7. ASSET INVENTORY MANAGEMENT TABLE
CREATE TABLE assets (
  id SERIAL PRIMARY KEY,
  asset_tag VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(100) NOT NULL,
  serial_no VARCHAR(100),
  purchase_date DATE,
  purchase_cost NUMERIC(15, 2) DEFAULT 0,
  current_condition VARCHAR(50) DEFAULT 'Operational', -- 'Operational', 'Needs Maintenance', 'Under Repair'
  assigned_department VARCHAR(100) NOT NULL,
  last_maintenance_date DATE,
  next_maintenance_due DATE,
  ai_maintenance_alert TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. OPERATIONS AUDIT TRAIL TABLE
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  user_name VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  module VARCHAR(50) NOT NULL,
  details TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- SEED DATA INJECTION
-- =========================================================================

-- 1. Insert Administrator Users
INSERT INTO users (name, email, password, role, department, avatar) VALUES
('Atty. Elena Ramos', 'admin@govserve.gov.ph', 'admin', 'Super Admin', 'Municipal Executive Office', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80')
ON CONFLICT (email) DO UPDATE SET password = 'admin';

-- 2. Insert Government Facilities & Parks
INSERT INTO facilities (name, category, capacity, hourly_rate, location, amenities, status, image_url) VALUES
('Barangay 178 Multi-Purpose Civic Center', 'Government Facility', 350, 500.00, 'Civic Complex, Mindanao Ave.', 'Central Aircon, Full PA Sound System, Stage, 300 Chairs, Generator Backup', 'Available', 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=500&auto=format&fit=crop&q=80'),
('Mindanao Community Sports Gymnasium', 'Government Facility', 600, 750.00, 'Zone 4 Sports Arena', 'Hardwood Basketball Court, Electronic Scoreboard, Bleachers, Shower Rooms', 'Available', 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=500&auto=format&fit=crop&q=80'),
('Camarin Green Urban Recreation Park', 'Park & Recreation', 500, 0.00, 'Camarin Road Sector 3', 'Jogging Trail, Children Playground, Gazebo, Covered Picnic Sheds, Solar Lights', 'Available', 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=500&auto=format&fit=crop&q=80'),
('Purok 7 Community Amphitheater & Plaza', 'Park & Recreation', 400, 250.00, 'Purok 7 Hillsview', 'Open-Air Stage, Tiered Seating, Ambient Garden Lighting, Perimeter Fence', 'Available', 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&auto=format&fit=crop&q=80')
ON CONFLICT DO NOTHING;

-- 3. Insert Initial Facility Reservations
INSERT INTO facility_reservations (reference_no, facility_id, applicant_name, applicant_email, applicant_phone, purpose, event_date, start_time, end_time, attendees, status, remarks) VALUES
('RES-2026-101', 1, 'Kagawad Roberto Santos', 'roberto.santos@gmail.com', '+63 917 555 1234', 'Barangay General Assembly & Townhall', CURRENT_DATE + INTERVAL '3 day', '08:00 AM', '12:00 PM', 250, 'Approved', 'Official Barangay Event'),
('RES-2026-102', 2, 'Coach Danilo Reyes', 'danilo.sports@yahoo.com', '+63 928 444 8921', 'Inter-Barangay Youth Basketball Cup Opening', CURRENT_DATE + INTERVAL '5 day', '01:00 PM', '06:00 PM', 400, 'Approved', 'Sports Development Council Endorsed'),
('RES-2026-103', 3, 'Maria Theresa Mendoza', 'mendoza.teresa@outlook.com', '+63 933 222 1109', 'Community Tree Planting & Environmental Awareness', CURRENT_DATE + INTERVAL '7 day', '07:00 AM', '11:00 AM', 80, 'Pending', 'Awaiting Parks Superintendent approval')
ON CONFLICT (reference_no) DO NOTHING;

-- 4. Seed 80 Columbarium Wall Niches (8 Rows x 10 Columns)
DO $$
DECLARE
  r INT;
  c INT;
  row_str TEXT;
  col_str TEXT;
  p_code TEXT;
  p_status TEXT;
BEGIN
  FOR r IN 1..8 LOOP
    FOR c IN 1..10 LOOP
      IF r < 10 THEN row_str := 'R0' || r; ELSE row_str := 'R' || r; END IF;
      IF c < 10 THEN col_str := 'C0' || c; ELSE col_str := 'C' || c; END IF;
      p_code := 'COL-' || row_str || '-' || col_str;
      
      p_status := 'Available';
      IF (r = 1 AND c = 2) OR (r = 2 AND c = 5) OR (r = 3 AND c = 8) OR (r = 5 AND c = 6) OR (r = 7 AND c = 9) THEN
        p_status := 'Occupied';
      ELSIF (r = 1 AND c = 4) OR (r = 4 AND c = 7) OR (r = 6 AND c = 3) THEN
        p_status := 'Reserved';
      END IF;

      INSERT INTO cemetery_plots (cemetery_name, plot_code, section, block_no, lot_no, row_no, col_no, plot_type, status, price)
      VALUES ('Barangay 178 Municipal Cemetery', p_code, 'Columbarium Wall Alpha', 'Row ' || r, 'Vault ' || c, r, c, 'Columbarium Niche', p_status, 18000.00)
      ON CONFLICT (plot_code) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- 5. Seed Lawn Lots in Section A
DO $$
DECLARE
  i INT;
  p_code TEXT;
  p_status TEXT;
BEGIN
  FOR i IN 1..10 LOOP
    IF i < 10 THEN p_code := 'SEC-A-B01-L0' || i; ELSE p_code := 'SEC-A-B01-L' || i; END IF;
    IF i <= 3 THEN p_status := 'Occupied';
    ELSIF i = 4 THEN p_status := 'Reserved';
    ELSE p_status := 'Available';
    END IF;

    INSERT INTO cemetery_plots (cemetery_name, plot_code, section, block_no, lot_no, plot_type, status, price)
    VALUES ('Barangay 178 Municipal Cemetery', p_code, 'Section A - St. Peter Lawn', 'Block 1', 'Lot ' || i, 'Lawn Lot', p_status, 25000.00)
    ON CONFLICT (plot_code) DO NOTHING;
  END LOOP;
END $$;

-- 6. Insert Burial Records
INSERT INTO burial_records (reference_no, deceased_name, date_of_birth, date_of_death, burial_date, plot_id, contact_person, contact_phone, status, permit_no) VALUES
('BUR-2026-081', 'Severino M. Dela Cruz', '1948-03-12', '2026-08-15', '2026-08-20', 2, 'Maria Dela Cruz (Daughter)', '+63 917 222 8891', 'Completed', 'BP-2026-0089'),
('BUR-2026-082', 'Florencia T. Bautista', '1955-09-24', '2026-08-18', '2026-08-24', 15, 'Ricardo Bautista (Husband)', '+63 919 333 7712', 'Completed', 'BP-2026-0090'),
('BUR-2026-083', 'Hon. Benjamin G. Ramos', '1940-11-05', '2026-08-21', CURRENT_DATE + INTERVAL '2 day', 28, 'Consuelo Ramos (Wife)', '+63 922 444 1109', 'Approved', 'BP-2026-0091'),
('BUR-2026-084', 'Corazon V. Alcantara', '1962-01-19', '2026-08-10', '2026-08-16', 46, 'Ernesto Alcantara (Son)', '+63 915 678 9901', 'Completed', 'BP-2026-0092'),
('BUR-2026-085', 'Manuel P. Gonzales', '1950-06-30', '2026-08-12', '2026-08-18', 69, 'Lourdes Gonzales (Wife)', '+63 918 890 2234', 'Completed', 'BP-2026-0093')
ON CONFLICT (reference_no) DO NOTHING;

-- 7. Insert Water & Drainage Utility Incident Tickets
INSERT INTO utility_requests (ticket_no, citizen_name, citizen_phone, service_type, location, description, urgency, ai_priority_score, status, assigned_team, resolution_notes) VALUES
('UTIL-2026-401', 'Kapitan Eduardo Cruz', '+63 917 888 1234', 'Clogged Drainage / Flood Mitigation', 'Purok 4 Corner Camarin Creek', 'Severe canal blockage causing water overflow during heavy rains near daycare center.', 'Critical', 94, 'Pending', 'Quick Response Water Crew Alpha', NULL),
('UTIL-2026-402', 'Lourdes Bautista', '+63 920 333 4455', 'Main Pipeline Leak Repair', 'Zone 2 Mindanao Avenue Highway', 'Underground waterline ruptured, clear potable water spurting across pedestrian lane.', 'High', 85, 'Dispatched', 'Pipeline Maintenance Team Bravo', 'Dispatched with backhoe and replacement couplers'),
('UTIL-2026-403', 'Ramon Garcia', '+63 919 777 9900', 'Emergency Water Tanker Delivery', 'Sitio Hillsview Upper Sector', 'Low water pressure experienced for 3 consecutive days affecting 60 households.', 'Normal', 68, 'Pending', 'Logistics Fleet Team', NULL),
('UTIL-2026-404', 'Teresa Villafuerte', '+63 922 111 5566', 'Canal Dredging & Desilting Request', 'Purok 6 Riverside Sector', 'Deep silt buildup blocking the culvert exit leading to the main river outlet.', 'Normal', 62, 'Pending', 'Dredging Operations Crew', NULL)
ON CONFLICT (ticket_no) DO NOTHING;

-- 8. Insert Asset Inventory
INSERT INTO assets (asset_tag, name, category, serial_no, purchase_date, purchase_cost, current_condition, assigned_department, last_maintenance_date, next_maintenance_due, ai_maintenance_alert) VALUES
('AST-ENG-001', 'CAT 420F Heavy Backhoe Loader', 'Heavy Machinery & Earthmoving', 'CAT-420F-99821-PH', '2023-03-15', 3850000.00, 'Needs Maintenance', 'City Engineering & Public Works', '2026-05-10', '2026-08-28', 'Hydraulic fluid pressure telemetry indicates filter replacement due before flood mitigation operations.'),
('AST-WTR-002', 'Isuzu 10,000L Potable Water Tanker Truck', 'Municipal Utility Vehicle', 'ISZ-WT10-7718-MNL', '2024-01-20', 2400000.00, 'Operational', 'Water Supply & Disaster Logistics', '2026-07-15', '2026-10-15', 'Engine oil and tire pressure within normal operational thresholds.'),
('AST-FL-003', 'Honda 6-Inch High-Volume Trash/Flood Pump', 'Flood Mitigation Equipment', 'HND-TP600-4491-QC', '2023-08-10', 320000.00, 'Operational', 'Quick Response Drainage Team', '2026-06-20', '2026-09-20', 'Impeller clearance verified. Ready for deployment.'),
('AST-GEN-004', 'Cummins 50kVA Mobile Silent Diesel Generator', 'Emergency Power Supply', 'CUM-50KVA-1102-PH', '2024-05-02', 780000.00, 'Operational', 'Executive Disaster Operations Center', '2026-08-01', '2026-11-01', 'Fuel reserves full at 100%. Automatic transfer switch functional.')
ON CONFLICT (asset_tag) DO NOTHING;

-- 9. Insert Initial Activity Logs
INSERT INTO activity_logs (user_name, action, module, details) VALUES
('Atty. Elena Ramos', 'System Initialized', 'SYSTEM', 'PostgreSQL database tables and constraints established successfully'),
('Atty. Elena Ramos', 'Burial Permit Issued', 'CEMETERY', 'Burial Permit BP-2026-0091 issued for Hon. Benjamin G. Ramos'),
('Atty. Elena Ramos', 'Facility Reservation Approved', 'FACILITIES', 'Reservation RES-2026-101 approved for Civic Center'),
('Atty. Elena Ramos', 'Emergency Crew Dispatched', 'UTILITIES', 'Dispatched Team Bravo for Water Main Leak (UTIL-2026-402)')
ON CONFLICT DO NOTHING;

-- Verification Queries
SELECT 'Users Count: ' || COUNT(*) FROM users;
SELECT 'Facilities Count: ' || COUNT(*) FROM facilities;
SELECT 'Cemetery Plots Count: ' || COUNT(*) FROM cemetery_plots;
SELECT 'Burial Records Count: ' || COUNT(*) FROM burial_records;
SELECT 'Utility Requests Count: ' || COUNT(*) FROM utility_requests;
SELECT 'Assets Count: ' || COUNT(*) FROM assets;
