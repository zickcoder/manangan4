-- =========================================================================
-- GOVSERVE: Public Assets and Facilities Management System
-- Complete PostgreSQL Database Schema & Initial Seed Data
-- =========================================================================

-- 1. USERS & AUTHENTICATION TABLE (Citizen Residents & Staff)
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
  phone VARCHAR(50),
  password VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'Citizen', -- 'Citizen', 'Super Admin', 'Staff Officer'
  department VARCHAR(100) DEFAULT 'Barangay 178 Resident',
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
  citizen_id INT REFERENCES users(id) ON DELETE SET NULL,
  facility_id INT REFERENCES facilities(id) ON DELETE SET NULL,
  facility_name VARCHAR(150),
  applicant_name VARCHAR(100) NOT NULL,
  applicant_email VARCHAR(100) NOT NULL,
  applicant_phone VARCHAR(50) NOT NULL,
  purpose VARCHAR(200) NOT NULL,
  event_date DATE NOT NULL,
  start_time VARCHAR(20) NOT NULL,
  end_time VARCHAR(20) NOT NULL,
  attendees INT DEFAULT 20,
  special_equipment TEXT, -- JSON or comma separated checklist items
  status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected', 'Completed'
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. CEMETERY PLOTS TABLE (Columbarium Wall & Lawn Lots)
CREATE TABLE cemetery_plots (
  id SERIAL PRIMARY KEY,
  cemetery_name VARCHAR(150) NOT NULL DEFAULT 'Barangay 178 Municipal Cemetery',
  plot_code VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'COL-R01-C01'
  section VARCHAR(100) NOT NULL, -- e.g., 'Columbarium Wall Alpha'
  block_no VARCHAR(20),
  lot_no VARCHAR(20),
  row_no INT,
  col_no INT,
  plot_type VARCHAR(50) DEFAULT 'Columbarium Niche',
  status VARCHAR(50) DEFAULT 'Available', -- 'Available', 'Reserved', 'Occupied'
  price NUMERIC(10, 2) DEFAULT 18000.00
);

-- 5. BURIAL & INTERMENT RECORDS TABLE (Complete 5 Sections A-E)
CREATE TABLE burial_records (
  id SERIAL PRIMARY KEY,
  reference_no VARCHAR(50) UNIQUE NOT NULL,
  permit_no VARCHAR(50) UNIQUE,
  citizen_id INT REFERENCES users(id) ON DELETE SET NULL,
  -- Section A: Deceased Information
  deceased_name VARCHAR(100) NOT NULL,
  date_of_birth DATE,
  date_of_death DATE NOT NULL,
  cause_of_death VARCHAR(150) NOT NULL,
  deceased_address VARCHAR(255),
  attending_physician VARCHAR(150),
  -- Section B: Burial Details
  burial_date DATE NOT NULL,
  burial_time VARCHAR(20) DEFAULT '10:00 AM',
  plot_id INT REFERENCES cemetery_plots(id) ON DELETE SET NULL,
  plot_code VARCHAR(50),
  cemetery_name VARCHAR(150) DEFAULT 'Barangay 178 Municipal Cemetery',
  -- Section C: Applicant Information
  contact_person VARCHAR(100) NOT NULL,
  applicant_relationship VARCHAR(50) NOT NULL,
  contact_phone VARCHAR(50) NOT NULL,
  applicant_email VARCHAR(100),
  applicant_address VARCHAR(255),
  -- Section D & E: Requirements & Status
  death_cert_attached BOOLEAN DEFAULT FALSE,
  valid_id_attached BOOLEAN DEFAULT FALSE,
  declaration_accepted BOOLEAN DEFAULT TRUE,
  status VARCHAR(50) DEFAULT 'Pending Review', -- 'Pending Review', 'Approved', 'Completed'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. WATER & DRAINAGE SERVICE INCIDENT REQUESTS TABLE
CREATE TABLE utility_requests (
  id SERIAL PRIMARY KEY,
  ticket_no VARCHAR(50) UNIQUE NOT NULL,
  citizen_id INT REFERENCES users(id) ON DELETE SET NULL,
  citizen_name VARCHAR(100) NOT NULL,
  citizen_phone VARCHAR(50) NOT NULL,
  citizen_email VARCHAR(100),
  service_type VARCHAR(100) NOT NULL, -- 'Water Main Leak', 'Drainage Declogging', 'Flash Flooding', etc.
  location VARCHAR(255) NOT NULL,
  affected_households VARCHAR(100) DEFAULT '1 Household',
  photo_url VARCHAR(255),
  description TEXT NOT NULL,
  urgency VARCHAR(20) DEFAULT 'Urgent',
  ai_priority_score INT DEFAULT 75,
  status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Dispatched', 'In Progress', 'Resolved'
  assigned_team VARCHAR(100),
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. ASSET INVENTORY MANAGEMENT TABLE
CREATE TABLE assets (
  id SERIAL PRIMARY KEY,
  asset_tag VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'Heavy Equipment', 'Service Vehicle', 'Water Pump & Generator'
  serial_no VARCHAR(100),
  purchase_date DATE,
  purchase_cost NUMERIC(12, 2),
  current_condition VARCHAR(50) DEFAULT 'Operational', -- 'Operational', 'Needs Repair', 'Under Maintenance'
  assigned_department VARCHAR(150) NOT NULL,
  last_maintenance_date DATE,
  next_maintenance_due DATE,
  ai_maintenance_alert TEXT,
  specs TEXT,
  image_url VARCHAR(255)
);

-- 8. SYSTEM ACTIVITY LOGS TABLE
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  user_name VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  module VARCHAR(50) NOT NULL,
  details TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- INITIAL SEED DATA
-- =========================================================================

-- Seed Users (Admin & Citizen)
INSERT INTO users (name, email, phone, password, role, department) VALUES
('Atty. Elena Ramos', 'admin@govserve.gov.ph', '+63 917 888 9900', 'admin123', 'Super Admin', 'Municipal Executive Office'),
('Engr. Marcus Cruz', 'marcus.cruz@govserve.gov.ph', '+63 918 777 6655', 'admin123', 'Staff Officer', 'Facilities & Public Works Bureau'),
('Juan M. Dela Cruz', 'juan.delacruz@citizen.gov.ph', '+63 917 123 4567', 'password123', 'Citizen', 'Barangay 178 Resident');

-- Seed Facilities
INSERT INTO facilities (name, category, capacity, hourly_rate, location, amenities, image_url) VALUES
('Barangay 178 Multi-Purpose Civic Center', 'Government Facility', 350, 500.00, 'Civic Complex, Mindanao Ave.', 'Central Aircon, Full PA Sound System, Stage, 300 Chairs, Generator Backup', 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=500&auto=format&fit=crop&q=80'),
('Mindanao Community Sports Gymnasium', 'Government Facility', 600, 750.00, 'Zone 4 Sports Arena', 'Hardwood Basketball Court, Electronic Scoreboard, Bleachers, Shower Rooms', 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=500&auto=format&fit=crop&q=80'),
('Camarin Green Urban Recreation Park', 'Park & Recreation', 500, 0.00, 'Camarin Road Sector 3', 'Jogging Trail, Children Playground, Gazebo, Covered Picnic Sheds, Solar Lights', 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=500&auto=format&fit=crop&q=80'),
('Purok 7 Community Amphitheater & Plaza', 'Park & Recreation', 400, 250.00, 'Purok 7 Hillsview', 'Open-Air Stage, Tiered Seating, Ambient Garden Lighting, Perimeter Fence', 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&auto=format&fit=crop&q=80');

-- Seed Columbarium Niche Plots
INSERT INTO cemetery_plots (cemetery_name, plot_code, section, block_no, lot_no, row_no, col_no, plot_type, status, price) VALUES
('Barangay 178 Municipal Cemetery', 'COL-R01-C01', 'Columbarium Wall Alpha', 'Row 1', 'Vault 1', 1, 1, 'Columbarium Niche', 'Occupied', 18000.00),
('Barangay 178 Municipal Cemetery', 'COL-R01-C02', 'Columbarium Wall Alpha', 'Row 1', 'Vault 2', 1, 2, 'Columbarium Niche', 'Occupied', 18000.00),
('Barangay 178 Municipal Cemetery', 'COL-R01-C03', 'Columbarium Wall Alpha', 'Row 1', 'Vault 3', 1, 3, 'Columbarium Niche', 'Available', 18000.00),
('Barangay 178 Municipal Cemetery', 'COL-R01-C04', 'Columbarium Wall Alpha', 'Row 1', 'Vault 4', 1, 4, 'Columbarium Niche', 'Available', 18000.00);

-- Seed Initial Facility Reservation
INSERT INTO facility_reservations (reference_no, facility_id, facility_name, applicant_name, applicant_email, applicant_phone, purpose, event_date, start_time, end_time, attendees, status, remarks) VALUES
('RES-2026-001', 1, 'Barangay 178 Multi-Purpose Civic Center', 'Juan M. Dela Cruz', 'juan.delacruz@citizen.gov.ph', '+63 917 123 4567', 'Barangay Youth Sports & Leadership Assembly', '2026-09-05', '08:00 AM', '12:00 PM', 150, 'Approved', 'Approved by Executive Committee');

-- Seed Initial Water & Drainage Incident Ticket
INSERT INTO utility_requests (ticket_no, citizen_name, citizen_phone, citizen_email, service_type, location, affected_households, description, urgency, ai_priority_score, status, assigned_team) VALUES
('UTL-2026-001', 'Juan M. Dela Cruz', '+63 917 123 4567', 'juan.delacruz@citizen.gov.ph', 'Drainage Declogging', 'Zone 2 Main Drainage Culvert', '6 - 15 Households (Entire Street / Alley)', 'Heavy storm canal blockage causing road overflow.', 'Urgent', 85, 'Dispatched', 'Quick Response Water Crew Alpha');

-- Seed Assets
INSERT INTO assets (asset_tag, name, category, serial_no, purchase_date, purchase_cost, current_condition, assigned_department, specs, image_url) VALUES
('AST-2026-001', 'Isuzu 5,000L Rapid Water Response Tanker', 'Heavy Equipment', 'ISZ-WT-88219', '2024-02-15', 3200000, 'Operational', 'Disaster Risk Reduction & Management (DRRMO)', 'High-pressure water cannon, 5000L tank, 4x4 off-road chassis', 'https://images.unsplash.com/photo-1596720426673-e4e14290f0cc?w=600&auto=format&fit=crop&q=80'),
('AST-2026-002', 'Caterpillar 45kVA Civic Standby Diesel Generator', 'Water Pump & Generator', 'CAT-GEN-9901', '2023-08-20', 850000, 'Operational', 'Barangay 178 Civic Center', '45kVA 3-Phase Silent Type, Automatic Transfer Switch (ATS)', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80');

-- Seed Initial Activity Log
INSERT INTO activity_logs (user_name, action, module, details) VALUES
('Atty. Elena Ramos', 'System Initialization', 'System', 'PostgreSQL Database schema and initial seed updated with Citizen Resident accounts.');
