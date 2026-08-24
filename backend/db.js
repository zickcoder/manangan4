import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
};

export let pool = null;

export async function initDatabase() {
  console.log('🔄 Initializing PostgreSQL database for GOVSERVE...');
  
  const adminPool = new Pool({
    ...dbConfig,
    database: 'postgres',
  });

  try {
    const res = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [process.env.DB_NAME || 'govserve_db']
    );

    if (res.rowCount === 0) {
      await adminPool.query(`CREATE DATABASE "${process.env.DB_NAME || 'govserve_db'}"`);
    }
  } catch (err) {
    console.error('DB check error:', err.message);
  } finally {
    await adminPool.end();
  }

  pool = new Pool({
    ...dbConfig,
    database: process.env.DB_NAME || 'govserve_db',
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL,
        department VARCHAR(100) NOT NULL,
        avatar VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS facilities (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        category VARCHAR(50) NOT NULL,
        capacity INT DEFAULT 50,
        hourly_rate NUMERIC(10, 2) DEFAULT 0,
        location VARCHAR(255) NOT NULL,
        amenities TEXT DEFAULT 'Sound System, Aircon, Chairs, Stage',
        status VARCHAR(50) DEFAULT 'Available',
        image_url VARCHAR(255)
      );

      CREATE TABLE IF NOT EXISTS facility_reservations (
        id SERIAL PRIMARY KEY,
        reference_no VARCHAR(50) UNIQUE NOT NULL,
        facility_id INT REFERENCES facilities(id),
        applicant_name VARCHAR(100) NOT NULL,
        applicant_email VARCHAR(100) NOT NULL,
        applicant_phone VARCHAR(50) NOT NULL,
        purpose VARCHAR(200) NOT NULL,
        event_date DATE NOT NULL,
        start_time VARCHAR(20) NOT NULL,
        end_time VARCHAR(20) NOT NULL,
        attendees INT DEFAULT 20,
        status VARCHAR(50) DEFAULT 'Pending',
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 2. Cemetery & Burial Management (Multi-Cemetery & Grid Coordinates Support)
      CREATE TABLE IF NOT EXISTS cemetery_plots (
        id SERIAL PRIMARY KEY,
        cemetery_name VARCHAR(150) DEFAULT 'Barangay 178 Municipal Cemetery',
        plot_code VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'COL-R01-C01' or 'SEC-A-B01-L01'
        section VARCHAR(50) NOT NULL, -- 'Columbarium Wall Alpha', 'Section A - Lawn Lots', 'Section B - Mausoleums'
        block_no VARCHAR(20) NOT NULL,
        lot_no VARCHAR(20) NOT NULL,
        row_no INT,
        col_no INT,
        plot_type VARCHAR(50) DEFAULT 'Columbarium Niche', -- 'Columbarium Niche', 'Lawn Lot', 'Mausoleum', 'Ossuary'
        status VARCHAR(50) DEFAULT 'Available', -- 'Available', 'Reserved', 'Occupied'
        price NUMERIC(10, 2) DEFAULT 15000.00
      );

      CREATE TABLE IF NOT EXISTS burial_records (
        id SERIAL PRIMARY KEY,
        reference_no VARCHAR(50) UNIQUE NOT NULL,
        deceased_name VARCHAR(100) NOT NULL,
        date_of_birth DATE,
        date_of_death DATE NOT NULL,
        burial_date DATE NOT NULL,
        plot_id INT REFERENCES cemetery_plots(id),
        contact_person VARCHAR(100) NOT NULL,
        contact_phone VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'Approved',
        permit_no VARCHAR(50) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS utility_requests (
        id SERIAL PRIMARY KEY,
        ticket_no VARCHAR(50) UNIQUE NOT NULL,
        citizen_name VARCHAR(100) NOT NULL,
        citizen_phone VARCHAR(50) NOT NULL,
        service_type VARCHAR(100) NOT NULL,
        location VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        urgency VARCHAR(20) DEFAULT 'Normal',
        ai_priority_score INT DEFAULT 60,
        status VARCHAR(50) DEFAULT 'Pending',
        assigned_team VARCHAR(100),
        resolution_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS assets (
        id SERIAL PRIMARY KEY,
        asset_tag VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(150) NOT NULL,
        category VARCHAR(100) NOT NULL,
        serial_no VARCHAR(100),
        purchase_date DATE,
        purchase_cost NUMERIC(15, 2) DEFAULT 0,
        current_condition VARCHAR(50) DEFAULT 'Operational',
        assigned_department VARCHAR(100) NOT NULL,
        last_maintenance_date DATE,
        next_maintenance_due DATE,
        ai_maintenance_alert TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_name VARCHAR(100) NOT NULL,
        action VARCHAR(100) NOT NULL,
        module VARCHAR(50) NOT NULL,
        details TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure column migrations on cemetery_plots
    await pool.query(`
      ALTER TABLE cemetery_plots ADD COLUMN IF NOT EXISTS cemetery_name VARCHAR(150) DEFAULT 'Barangay 178 Municipal Cemetery';
      ALTER TABLE cemetery_plots ADD COLUMN IF NOT EXISTS row_no INT;
      ALTER TABLE cemetery_plots ADD COLUMN IF NOT EXISTS col_no INT;
    `);

    console.log('✅ Schema verified with Columbarium Wall Grid & Multi-Cemetery support.');
    await seedDemoData();

  } catch (err) {
    console.error('Database setup error:', err);
  }
}

async function seedDemoData() {
  const countRes = await pool.query('SELECT COUNT(*) FROM cemetery_plots');
  if (parseInt(countRes.rows[0].count) > 20) {
    console.log('ℹ️ Cemetery slots already seeded.');
    return;
  }

  console.log('🌱 Seeding 96 Columbarium Wall Niches + Lawn plots across municipal cemeteries...');

  // Users
  await pool.query(`
    INSERT INTO users (name, email, password, role, department, avatar) VALUES
    ('Atty. Elena Ramos', 'admin@govserve.gov.ph', 'admin123', 'Super Admin', 'Municipal Executive Office', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80')
    ON CONFLICT (email) DO NOTHING;
  `);

  // Facilities & Parks
  await pool.query(`
    INSERT INTO facilities (name, category, capacity, hourly_rate, location, amenities, status, image_url) VALUES
    ('Barangay 178 Multi-Purpose Civic Center', 'Government Facility', 350, 500.00, 'Civic Complex, Mindanao Ave.', 'Central Aircon, Full PA Sound System, Stage, 300 Chairs, Generator Backup', 'Available', 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=500&auto=format&fit=crop&q=80'),
    ('Mindanao Community Sports Gymnasium', 'Government Facility', 600, 750.00, 'Zone 4 Sports Arena', 'Hardwood Basketball Court, Electronic Scoreboard, Bleachers, Shower Rooms', 'Available', 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=500&auto=format&fit=crop&q=80'),
    ('Camarin Green Urban Recreation Park', 'Park & Recreation', 500, 0.00, 'Camarin Road Sector 3', 'Jogging Trail, Children Playground, Gazebo, Covered Picnic Sheds, Solar Lights', 'Available', 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=500&auto=format&fit=crop&q=80'),
    ('Purok 7 Community Amphitheater & Plaza', 'Park & Recreation', 400, 250.00, 'Purok 7 Hillsview', 'Open-Air Stage, Tiered Seating, Ambient Garden Lighting, Perimeter Fence', 'Available', 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&auto=format&fit=crop&q=80')
    ON CONFLICT DO NOTHING;
  `);

  // Seed 8 Rows x 10 Columns = 80 Columbarium Wall Niches (Matching new image!)
  for (let r = 1; r <= 8; r++) {
    for (let c = 1; c <= 10; c++) {
      const rowStr = r < 10 ? `R0${r}` : `R${r}`;
      const colStr = c < 10 ? `C0${c}` : `C${c}`;
      const code = `COL-${rowStr}-${colStr}`;
      
      // Give realistic status mix: some occupied, some reserved, majority available
      let status = 'Available';
      if ((r === 1 && c === 2) || (r === 2 && c === 5) || (r === 3 && c === 8) || (r === 5 && c === 6) || (r === 7 && c === 9)) {
        status = 'Occupied';
      } else if ((r === 1 && c === 4) || (r === 4 && c === 7) || (r === 6 && c === 3)) {
        status = 'Reserved';
      }

      await pool.query(`
        INSERT INTO cemetery_plots (cemetery_name, plot_code, section, block_no, lot_no, row_no, col_no, plot_type, status, price)
        VALUES ('Barangay 178 Municipal Cemetery', $1, 'Columbarium Wall Alpha', $2, $3, $4, $5, 'Columbarium Niche', $6, 18000.00)
        ON CONFLICT (plot_code) DO NOTHING;
      `, [code, `Row ${r}`, `Vault ${c}`, r, c, status]);
    }
  }


  // Seed Lawn Lots & Mausoleums in Section A & B
  for (let i = 1; i <= 10; i++) {
    const code = `SEC-A-B01-L${i < 10 ? '0' + i : i}`;
    const status = i <= 3 ? 'Occupied' : i === 4 ? 'Reserved' : 'Available';
    await pool.query(`
      INSERT INTO cemetery_plots (cemetery_name, plot_code, section, block_no, lot_no, plot_type, status, price)
      VALUES ('Barangay 178 Municipal Cemetery', $1, 'Section A - St. Peter Lawn', 'Block 1', $2, 'Lawn Lot', $3, 25000.00)
      ON CONFLICT (plot_code) DO NOTHING;
    `, [code, `Lot ${i}`, status]);
  }

  // Note: Bagong Silang Memorial Park removed per user request - focus on Barangay 178 Municipal Cemetery only

  // Initial Burials
  await pool.query(`
    INSERT INTO burial_records (reference_no, deceased_name, date_of_birth, date_of_death, burial_date, plot_id, contact_person, contact_phone, status, permit_no) VALUES
    ('BUR-2026-081', 'Severino M. Dela Cruz', '1948-03-12', '2026-08-15', '2026-08-20', 1, 'Maria Dela Cruz (Daughter)', '+63 917 222 8891', 'Completed', 'BP-2026-0089'),
    ('BUR-2026-082', 'Florencia T. Bautista', '1955-09-24', '2026-08-18', '2026-08-24', 2, 'Ricardo Bautista (Husband)', '+63 919 333 7712', 'Completed', 'BP-2026-0090'),
    ('BUR-2026-083', 'Hon. Benjamin G. Ramos', '1940-11-05', '2026-08-21', CURRENT_DATE + INTERVAL '2 day', 5, 'Consuelo Ramos (Wife)', '+63 922 444 1109', 'Approved', 'BP-2026-0091')
    ON CONFLICT (reference_no) DO NOTHING;
  `);

  console.log('✅ Seeded 112 plots & niches across municipal cemeteries!');
}
