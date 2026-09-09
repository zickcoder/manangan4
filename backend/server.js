import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, initDatabase } from './db.js';
import { 
  checkFacilityConflictAndSuggest, 
  prioritizeUtilityRequest, 
  predictAssetMaintenance, 
  getAIChatResponse 
} from './aiService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static frontend build if it exists
const distPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(distPath));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
  next();
});

/* =========================================================================
   1. REPORTING & CENTRALIZED DASHBOARD
   ========================================================================= */
app.get('/api/stats', async (req, res) => {
  try {
    const facilitiesTotal = await pool.query('SELECT COUNT(*) FROM facilities');
    const reservationsPending = await pool.query("SELECT COUNT(*) FROM facility_reservations WHERE status = 'Pending'");
    const reservationsApproved = await pool.query("SELECT COUNT(*) FROM facility_reservations WHERE status = 'Approved'");
    
    const cemeteryTotal = await pool.query('SELECT COUNT(*) FROM cemetery_plots');
    const cemeteryOccupied = await pool.query("SELECT COUNT(*) FROM cemetery_plots WHERE status = 'Occupied'");
    const cemeteryAvailable = await pool.query("SELECT COUNT(*) FROM cemetery_plots WHERE status = 'Available'");
    const burialsTotal = await pool.query('SELECT COUNT(*) FROM burial_records');

    const utilitiesPending = await pool.query("SELECT COUNT(*) FROM utility_requests WHERE status != 'Resolved'");
    const utilitiesResolved = await pool.query("SELECT COUNT(*) FROM utility_requests WHERE status = 'Resolved'");

    const assetsTotal = await pool.query('SELECT COUNT(*) FROM assets');
    const assetsMaintenance = await pool.query("SELECT COUNT(*) FROM assets WHERE current_condition != 'Operational'");

    res.json({
      success: true,
      data: {
        totalFacilities: parseInt(facilitiesTotal.rows[0].count),
        pendingReservations: parseInt(reservationsPending.rows[0].count),
        approvedReservations: parseInt(reservationsApproved.rows[0].count),
        totalCemeteryPlots: parseInt(cemeteryTotal.rows[0].count),
        occupiedPlots: parseInt(cemeteryOccupied.rows[0].count),
        availablePlots: parseInt(cemeteryAvailable.rows[0].count),
        totalBurials: parseInt(burialsTotal.rows[0].count),
        openUtilityRequests: parseInt(utilitiesPending.rows[0].count),
        resolvedUtilityRequests: parseInt(utilitiesResolved.rows[0].count),
        totalAssets: parseInt(assetsTotal.rows[0].count),
        assetsNeedingMaintenance: parseInt(assetsMaintenance.rows[0].count),
        systemStatus: 'Operational',
        uptime: '99.99%'
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/* =========================================================================
   2. FACILITIES & PARKS/RECREATION MODULES
   ========================================================================= */
// List facilities (filterable by category: 'Government Facility' or 'Park & Recreation')
app.get('/api/facilities', async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM facilities';
    const params = [];
    if (category && category !== 'all') {
      params.push(category);
      query += ' WHERE category = $1';
    }
    query += ' ORDER BY id ASC';
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a new Facility or Park (Admin)
app.post('/api/facilities', async (req, res) => {
  try {
    const { name, category, capacity, hourly_rate, location, amenities, status, image_url } = req.body;
    const result = await pool.query(`
      INSERT INTO facilities (name, category, capacity, hourly_rate, location, amenities, status, image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [name, category, parseInt(capacity) || 50, parseFloat(hourly_rate) || 0, location, amenities || '', status || 'Available', image_url || null]);
    await pool.query(
      'INSERT INTO activity_logs (user_name, action, module, details) VALUES ($1, $2, $3, $4)',
      ['Admin', 'Facility Added', 'FACILITIES', `New ${category}: ${name}`]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update a Facility or Park (Admin)
app.put('/api/facilities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, capacity, hourly_rate, location, amenities, status, image_url } = req.body;
    const result = await pool.query(`
      UPDATE facilities SET name=$1, category=$2, capacity=$3, hourly_rate=$4, location=$5, amenities=$6, status=$7, image_url=COALESCE($8, image_url)
      WHERE id=$9 RETURNING *
    `, [name, category, parseInt(capacity) || 50, parseFloat(hourly_rate) || 0, location, amenities || '', status || 'Available', image_url || null, id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Facility not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a Facility or Park (Admin)
app.delete('/api/facilities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Cascade delete linked reservations first to prevent foreign key constraint violations
    await pool.query('DELETE FROM facility_reservations WHERE facility_id = $1', [id]);
    await pool.query('DELETE FROM facilities WHERE id = $1', [id]);
    res.json({ success: true, message: 'Facility deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// List facility & park reservations

// Helper: convert "08:00 AM" -> decimal hours since midnight
function parse12HToHours(timeStr) {
  if (!timeStr) return 0;
  const match = timeStr.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 0;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const isPm = /pm/i.test(match[3]);
  const isAm = /am/i.test(match[3]);
  if (isPm && h < 12) h += 12;
  if (isAm && h === 12) h = 0;
  return h + m / 60;
}

app.get('/api/facilities/reservations', async (req, res) => {
  try {
    const { status, category, exclude_cancelled } = req.query;
    let query = `
      SELECT r.*, f.name as facility_name, f.category as facility_category, f.location as facility_location, f.hourly_rate
      FROM facility_reservations r
      LEFT JOIN facilities f ON r.facility_id = f.id
    `;
    const params = [];
    const conditions = [];

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`r.status = $${params.length}`);
    }
    if (category && category !== 'all') {
      params.push(`%${category}%`);
      conditions.push(`f.category ILIKE $${params.length}`);
    }
    if (exclude_cancelled === 'true') {
      conditions.push(`r.status NOT IN ('Cancelled', 'Canceled')`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY r.event_date ASC, r.start_time ASC';

    const result = await pool.query(query, params);

    // Auto-compute fee_amount = hours * hourly_rate when stored fee is 0 or null
    const rows = result.rows.map(r => {
      const rate = parseFloat(r.hourly_rate) || 0;
      const storedFee = parseFloat(r.fee_amount) || 0;
      if (storedFee === 0 && rate > 0 && r.start_time && r.end_time) {
        const startH = parse12HToHours(r.start_time);
        const endH = parse12HToHours(r.end_time);
        const diffHours = endH > startH ? endH - startH : 1;
        r.fee_amount = Math.round(diffHours * rate);
        r.hours = diffHours;
      }
      return r;
    });

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Book a Reservation (Public or Staff)
app.post('/api/facilities/reservations', async (req, res) => {
  try {
    const {
      reference_no, facility_id, applicant_name, applicant_email, applicant_phone,
      purpose, event_date, start_time, end_time, attendees, remarks,
      fee_amount, hours, citizen_id, citizen_email, special_equipment
    } = req.body;
    const refCode = reference_no || `RES-2026-${Math.floor(100 + Math.random() * 900)}`;
    const equipStr = Array.isArray(special_equipment) ? special_equipment.join(', ') : special_equipment;

    // Compute hours from times if not provided
    let bookingHours = parseFloat(hours) || 0;
    if (!bookingHours && start_time && end_time) {
      const startH = parse12HToHours(start_time);
      const endH = parse12HToHours(end_time);
      bookingHours = endH > startH ? endH - startH : 1;
    }

    // fee_amount should already be hours * hourly_rate from frontend
    // but if 0, leave it 0 — admin will see it auto-computed from hourly_rate on GET
    const savedFee = parseFloat(fee_amount) || 0;

    const result = await pool.query(`
      INSERT INTO facility_reservations (
        reference_no, facility_id, applicant_name, applicant_email, applicant_phone,
        purpose, event_date, start_time, end_time, attendees, status, remarks,
        fee_amount, hours, citizen_id, citizen_email, special_equipment
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Pending Review', $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [
      refCode, facility_id, applicant_name, applicant_email, applicant_phone,
      purpose, event_date, start_time, end_time, parseInt(attendees || 20), remarks,
      savedFee, bookingHours, citizen_id || null, citizen_email || applicant_email, equipStr || null
    ]);

    await pool.query(
      'INSERT INTO activity_logs (user_name, action, module, details) VALUES ($1, $2, $3, $4)',
      [applicant_name, 'Reservation Submitted', 'FACILITIES', `Ref ${refCode} on ${event_date}`]
    );

    res.status(201).json({ success: true, message: 'Reservation request logged!', data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update Reservation Status (Approve / Reject / Grant Payment / Pay)
app.patch('/api/facilities/reservations/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks, reviewer_name, fee_amount, payment_due_date, paid_at, payment_method } = req.body;

    const result = await pool.query(`
      UPDATE facility_reservations
      SET 
        status = $1, 
        remarks = COALESCE($2, remarks),
        fee_amount = COALESCE($4, fee_amount),
        payment_due_date = COALESCE($5, payment_due_date),
        paid_at = COALESCE($6, paid_at),
        payment_method = COALESCE($7, payment_method)
      WHERE id = $3
      RETURNING *
    `, [
      status,
      remarks,
      id,
      fee_amount !== undefined && fee_amount !== null ? parseFloat(fee_amount) : null,
      payment_due_date || null,
      paid_at ? new Date(paid_at) : null,
      payment_method || null
    ]);

    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Reservation not found' });

    const resData = result.rows[0];
    await pool.query(
      'INSERT INTO activity_logs (user_name, action, module, details) VALUES ($1, $2, $3, $4)',
      [reviewer_name || 'Staff Officer', `Reservation ${status}`, 'FACILITIES', `Ref ${resData.reference_no}`]
    );

    res.json({ success: true, data: resData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI Conflict Detection & Recommendation for Facilities
app.post('/api/ai/facility-check', async (req, res) => {
  try {
    const { facilityName, eventDate, startTime, endTime, facilityId } = req.body;
    
    // Count existing bookings strictly for THIS facility & date (isolated per venue)
    let existingCount = 0;
    if (facilityId) {
      const countRes = await pool.query(
        "SELECT COUNT(*) FROM facility_reservations WHERE facility_id = $1 AND event_date = $2 AND status NOT IN ('Rejected', 'Cancelled')",
        [facilityId, eventDate || new Date().toISOString().split('T')[0]]
      );
      existingCount = parseInt(countRes.rows[0]?.count || 0);
    } else if (facilityName) {
      const countRes = await pool.query(
        `SELECT COUNT(*) FROM facility_reservations r 
         LEFT JOIN facilities f ON r.facility_id = f.id 
         WHERE (f.name ILIKE $1 OR r.purpose ILIKE $1) AND r.event_date = $2 AND r.status NOT IN ('Rejected', 'Cancelled')`,
        [`%${facilityName}%`, eventDate || new Date().toISOString().split('T')[0]]
      );
      existingCount = parseInt(countRes.rows[0]?.count || 0);
    }

    const suggestion = await checkFacilityConflictAndSuggest({
      facilityName: facilityName || 'Civic Center',
      eventDate: eventDate || new Date().toISOString().split('T')[0],
      startTime: startTime || '08:00 AM',
      endTime: endTime || '12:00 PM',
      existingBookings: existingCount
    });

    res.json({ success: true, data: suggestion });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/* =========================================================================
   3. CEMETERY & BURIAL MANAGEMENT
   ========================================================================= */
// List unique cemeteries
app.get('/api/cemetery/cemeteries', async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT cemetery_name FROM cemetery_plots WHERE cemetery_name IS NOT NULL ORDER BY cemetery_name ASC');
    res.json({ success: true, data: result.rows.map(r => r.cemetery_name) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// List Cemetery Plots with cemetery_name filter (joined with burial details)
app.get('/api/cemetery/plots', async (req, res) => {
  try {
    const { section, status, cemetery_name } = req.query;
    let query = `
      SELECT p.*, b.deceased_name, b.burial_date, b.date_of_death, b.permit_no, b.contact_person
      FROM cemetery_plots p
      LEFT JOIN burial_records b ON b.plot_id = p.id
    `;
    const params = [];
    const conditions = [];

    if (cemetery_name && cemetery_name !== 'all') {
      params.push(cemetery_name);
      conditions.push(`p.cemetery_name = $${params.length}`);
    }
    if (section && section !== 'all') {
      params.push(section);
      conditions.push(`p.section = $${params.length}`);
    }
    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`p.status = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY p.row_no ASC, p.col_no ASC, p.plot_code ASC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add Single Plot / Niche
app.post('/api/cemetery/plots', async (req, res) => {
  try {
    const { cemetery_name, plot_code, section, block_no, lot_no, plot_type, price } = req.body;
    const result = await pool.query(`
      INSERT INTO cemetery_plots (cemetery_name, plot_code, section, block_no, lot_no, plot_type, status, price)
      VALUES ($1, $2, $3, $4, $5, $6, 'Available', $7)
      RETURNING *
    `, [cemetery_name || 'Barangay 178 Municipal Cemetery', plot_code, section, block_no, lot_no, plot_type || 'Lawn Lot', parseFloat(price || 15000)]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add Batch Slots / Niche Grid
app.post('/api/cemetery/plots/batch', async (req, res) => {
  try {
    const { cemetery_name, section, plot_type, prefix, count, start_index, price } = req.body;
    const num = parseInt(count || 10);
    const start = parseInt(start_index || 1);
    const inserted = [];

    for (let i = 0; i < num; i++) {
      const idx = start + i;
      const code = `${prefix || 'SEC-NEW'}-${idx < 10 ? '0' + idx : idx}`;
      const r = await pool.query(`
        INSERT INTO cemetery_plots (cemetery_name, plot_code, section, block_no, lot_no, plot_type, status, price)
        VALUES ($1, $2, $3, 'Block A', $4, $5, 'Available', $6)
        ON CONFLICT (plot_code) DO NOTHING
        RETURNING *
      `, [cemetery_name || 'Barangay 178 Municipal Cemetery', code, section || 'New Expansion Wing', `Lot ${idx}`, plot_type || 'Lawn Lot', parseFloat(price || 18000)]);
      if (r.rows[0]) inserted.push(r.rows[0]);
    }

    res.status(201).json({ success: true, count: inserted.length, data: inserted });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update Plot Status (Available, Reserved, Occupied)
app.patch('/api/cemetery/plots/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await pool.query('UPDATE cemetery_plots SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// List Burial Records
app.get('/api/cemetery/burials', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, p.plot_code, p.section, p.plot_type
      FROM burial_records b
      LEFT JOIN cemetery_plots p ON b.plot_id = p.id
      ORDER BY b.burial_date DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// File Burial Application (Public or Staff)
app.post('/api/cemetery/burials', async (req, res) => {
  try {
    const { 
      reference_no, permit_no, deceased_name, date_of_birth, date_of_death, burial_date, burial_time,
      plot_id, plot_code, section, cemetery_name,
      contact_person, contact_phone, applicant_email, citizen_email, citizen_id,
      cause_of_death, deceased_address, attending_physician, applicant_relationship, applicant_address,
      status, fee_amount, remarks
    } = req.body;
    
    const refCode = reference_no || `BUR-2026-${Math.floor(100 + Math.random() * 900)}`;
    const permNo = permit_no || `BP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const finalStatus = status || 'Pending Review';
    const emailVal = (applicant_email || citizen_email || '').toLowerCase().trim();

    const result = await pool.query(`
      INSERT INTO burial_records (
        reference_no, permit_no, deceased_name, date_of_birth, date_of_death, burial_date, burial_time,
        plot_id, plot_code, section, cemetery_name,
        contact_person, contact_phone, applicant_email, citizen_email, citizen_id,
        cause_of_death, deceased_address, attending_physician, applicant_relationship, applicant_address,
        status, fee_amount, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      ON CONFLICT (reference_no) DO UPDATE SET
        status = EXCLUDED.status,
        remarks = EXCLUDED.remarks,
        burial_date = EXCLUDED.burial_date,
        burial_time = EXCLUDED.burial_time
      RETURNING *
    `, [
      refCode, permNo, deceased_name, date_of_birth || null, date_of_death, burial_date, burial_time || '10:00 AM',
      plot_id || null, plot_code || null, section || null, cemetery_name || 'Barangay 178 Municipal Cemetery',
      contact_person, contact_phone, emailVal, emailVal, citizen_id || null,
      cause_of_death || null, deceased_address || null, attending_physician || null, applicant_relationship || null, applicant_address || null,
      finalStatus, parseFloat(fee_amount || 0), remarks || null
    ]);

    // Mark plot as RESERVED
    if (plot_id) {
      await pool.query("UPDATE cemetery_plots SET status = 'Reserved' WHERE id = $1", [plot_id]);
    }

    await pool.query(
      'INSERT INTO activity_logs (user_name, action, module, details) VALUES ($1, $2, $3, $4)',
      [contact_person, 'Burial Registered', 'CEMETERY', `Permit ${permNo} for ${deceased_name}`]
    );

    res.status(201).json({ success: true, message: 'Burial permit registered!', data: result.rows[0] });
  } catch (error) {
    console.error('Error saving burial:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update Burial Status (Approve / Reject / Mark Paid)
app.patch('/api/cemetery/burials/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks, fee_amount, permit_no, payment_method, paid_at, payment_due_date } = req.body;

    const result = await pool.query(`
      UPDATE burial_records
      SET status = COALESCE($1, status),
          remarks = COALESCE($2, remarks),
          fee_amount = COALESCE($3, fee_amount),
          permit_no = COALESCE($4, permit_no),
          payment_method = COALESCE($5, payment_method),
          paid_at = COALESCE($6, paid_at),
          payment_due_date = COALESCE($7, payment_due_date)
      WHERE id = $8 OR reference_no = $8
      RETURNING *
    `, [status, remarks, fee_amount, permit_no, payment_method, paid_at, payment_due_date, id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Burial record not found' });
    }

    const updated = result.rows[0];
    if (status === 'Cancelled' || status === 'Rejected') {
      if (updated.plot_id) {
        await pool.query("UPDATE cemetery_plots SET status = 'Available' WHERE id = $1", [updated.plot_id]);
      }
    } else if (status === 'Paid' || status === 'Approved') {
      if (updated.plot_id) {
        await pool.query("UPDATE cemetery_plots SET status = 'Reserved' WHERE id = $1", [updated.plot_id]);
      }
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/* =========================================================================
   4. WATER SUPPLY & DRAINAGE REQUESTS
   ========================================================================= */
app.get('/api/utilities', async (req, res) => {
  try {
    const { status, service_type } = req.query;
    let query = 'SELECT * FROM utility_requests';
    const params = [];
    const conditions = [];

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (service_type && service_type !== 'all') {
      params.push(service_type);
      conditions.push(`service_type = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY ai_priority_score DESC, created_at DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// File Water/Drainage Ticket
app.post('/api/utilities', async (req, res) => {
  try {
    const { 
      ticket_no, 
      citizen_name, 
      citizen_phone, 
      citizen_email, 
      citizen_id, 
      service_type, 
      location, 
      affected_households, 
      photo_url, 
      description, 
      urgency,
      ai_priority_score 
    } = req.body;

    const currentYear = new Date().getFullYear();
    const finalTicketNo = ticket_no || `REQ-${currentYear}-${Math.floor(1000 + Math.random() * 9000)}`;

    // AI Priority Assessment
    let priorityScore = typeof ai_priority_score === 'number' 
      ? ai_priority_score 
      : (urgency === 'Urgent' ? 95 : urgency === 'High' ? 80 : 60);
    let autoUrgency = urgency || 'Normal';
    let assignedTeam = 'Quick Response Water Crew Alpha';

    try {
      const triage = await prioritizeUtilityRequest({ serviceType: service_type, location, description });
      if (triage) {
        priorityScore = triage.priorityScore;
        autoUrgency = triage.urgency;
        assignedTeam = triage.recommendedTeam;
      }
    } catch (e) {
      console.warn('AI triage fallback used');
    }

    const result = await pool.query(`
      INSERT INTO utility_requests (
        ticket_no, citizen_name, citizen_phone, citizen_email, citizen_id,
        service_type, location, affected_households, photo_url,
        description, urgency, ai_priority_score, status, assigned_team
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Pending', $13)
      RETURNING *
    `, [
      finalTicketNo, 
      citizen_name, 
      citizen_phone, 
      citizen_email || null, 
      citizen_id || null, 
      service_type, 
      location, 
      affected_households || null, 
      photo_url || null, 
      description, 
      autoUrgency, 
      priorityScore, 
      assignedTeam
    ]);

    await pool.query(
      'INSERT INTO activity_logs (user_name, action, module, details) VALUES ($1, $2, $3, $4)',
      [citizen_name || 'Citizen', 'Utility Request Logged', 'WATER & DRAINAGE', `${service_type} at ${location}`]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update Utility Ticket Status (Dispatch, Resolve)
app.patch('/api/utilities/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assigned_team, resolution_notes, officer_name } = req.body;

    const result = await pool.query(`
      UPDATE utility_requests
      SET status = $1, assigned_team = COALESCE($2, assigned_team), resolution_notes = COALESCE($3, resolution_notes),
          resolved_at = CASE WHEN $1 = 'Resolved' THEN CURRENT_TIMESTAMP ELSE resolved_at END
      WHERE id = $4
      RETURNING *
    `, [status, assigned_team, resolution_notes, id]);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/* =========================================================================
   5. ASSET INVENTORY MANAGEMENT
   ========================================================================= */
app.get('/api/assets', async (req, res) => {
  try {
    const { category, condition } = req.query;
    let query = 'SELECT * FROM assets';
    const params = [];
    const conditions = [];

    if (category && category !== 'all') {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }
    if (condition && condition !== 'all') {
      params.push(condition);
      conditions.push(`current_condition = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY id ASC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add New Asset
app.post('/api/assets', async (req, res) => {
  try {
    const { name, category, serial_no, purchase_date, purchase_cost, current_condition, assigned_department, next_maintenance_due, image_url, specs } = req.body;
    const prefix = category.includes('Vehicle') ? 'AST-VEH' : category.includes('Heavy') ? 'AST-EQP' : 'AST-PMP';
    const asset_tag = `${prefix}-${Math.floor(100 + Math.random() * 900)}`;

    const alertText = await predictAssetMaintenance({ name, category, current_condition, last_maintenance_date: purchase_date, next_maintenance_due });

    const result = await pool.query(`
      INSERT INTO assets (
        asset_tag, name, category, serial_no, purchase_date, purchase_cost,
        current_condition, assigned_department, last_maintenance_date, next_maintenance_due, ai_maintenance_alert,
        image_url, specs
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE, $9, $10, $11, $12)
      RETURNING *
    `, [asset_tag, name, category, serial_no, purchase_date, parseFloat(purchase_cost || 0), current_condition || 'Operational', assigned_department, next_maintenance_due, alertText, image_url || null, specs || null]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update Asset Condition / Maintenance
app.patch('/api/assets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { current_condition, next_maintenance_due, ai_maintenance_alert } = req.body;

    const result = await pool.query(`
      UPDATE assets
      SET current_condition = COALESCE($1, current_condition),
          next_maintenance_due = COALESCE($2, next_maintenance_due),
          last_maintenance_date = CURRENT_DATE,
          ai_maintenance_alert = COALESCE($3, ai_maintenance_alert)
      WHERE id = $4
      RETURNING *
    `, [current_condition, next_maintenance_due, ai_maintenance_alert, id]);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/* =========================================================================
   6. UNIVERSAL CITIZEN REFERENCE TRACKER
   ========================================================================= */
app.get('/api/track/:refNo', async (req, res) => {
  try {
    const { refNo } = req.params;
    const code = refNo.trim().toUpperCase();

    // 1. Check Facility Reservations (RES-...)
    const resCheck = await pool.query(
      `SELECT r.*, f.name as facility_name, f.category as facility_category, f.location as facility_location 
       FROM facility_reservations r JOIN facilities f ON r.facility_id = f.id 
       WHERE UPPER(r.reference_no) = $1`,
      [code]
    );
    if (resCheck.rowCount > 0) {
      return res.json({ success: true, module: 'Facility Reservation', data: resCheck.rows[0] });
    }

    // 2. Check Water & Drainage Tickets (REQ-...)
    const utilCheck = await pool.query(
      'SELECT * FROM utility_requests WHERE UPPER(ticket_no) = $1',
      [code]
    );
    if (utilCheck.rowCount > 0) {
      return res.json({ success: true, module: 'Water & Drainage Request', data: utilCheck.rows[0] });
    }

    // 3. Check Burial Permits (BUR-... or BP-...)
    const burCheck = await pool.query(
      `SELECT b.*, p.plot_code, p.section, p.plot_type 
       FROM burial_records b LEFT JOIN cemetery_plots p ON b.plot_id = p.id 
       WHERE UPPER(b.reference_no) = $1 OR UPPER(b.permit_no) = $1`,
      [code]
    );
    if (burCheck.rowCount > 0) {
      return res.json({ success: true, module: 'Burial Record & Permit', data: burCheck.rows[0] });
    }

    res.status(404).json({ success: false, message: 'Reference number not found in municipal records.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/* =========================================================================
   7. AI CHAT ASSISTANT & USERS / AUTH
   ========================================================================= */
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { messages, role } = req.body;
    const reply = await getAIChatResponse(messages || [], role || 'citizen');
    res.json({ success: true, reply });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, department, avatar, created_at FROM users ORDER BY id ASC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { role, department } = req.body;
    const result = await pool.query(
      'UPDATE users SET role = COALESCE($1, role), department = COALESCE($2, department) WHERE id = $3 RETURNING id, name, email, role, department',
      [role || null, department || null, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = (email || '').toLowerCase().trim();
    const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
    if (result.rowCount === 0) {
      if (cleanEmail === 'admin@govserve.gov.ph' && (password === 'admin' || password === 'admin123')) {
        return res.json({
          success: true,
          token: 'jwt_backend_admin_token',
          user: { id: 1, name: 'Atty. Elena Ramos', email: 'admin@govserve.gov.ph', role: 'Super Admin', department: 'Municipal Executive Office' }
        });
      }
      return res.status(401).json({ success: false, message: 'Invalid credentials. User not found in database.' });
    }
    const user = result.rows[0];
    if (user.password !== password) {
      return res.status(401).json({ success: false, message: 'Invalid password.' });
    }
    const { password: _, ...userWithoutPass } = user;
    res.json({ success: true, token: `jwt_user_${user.id}`, user: userWithoutPass });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/login-citizen', async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = (email || '').toLowerCase().trim();
    const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
    if (result.rowCount === 0) {
      return res.status(401).json({ success: false, message: 'Account not found. Please register first.' });
    }
    const user = result.rows[0];
    if (user.password !== password) {
      return res.status(401).json({ success: false, message: 'Invalid password.' });
    }
    const { password: _, ...userWithoutPass } = user;
    res.json({ success: true, token: `jwt_citizen_${user.id}`, user: userWithoutPass });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/register-citizen', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    const cleanEmail = (email || '').toLowerCase().trim();

    const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
    if (existing.rowCount > 0) {
      return res.status(400).json({ success: false, message: 'Email is already registered.' });
    }

    const inserted = await pool.query(`
      INSERT INTO users (name, email, password, phone, role, department, avatar)
      VALUES ($1, $2, $3, $4, 'Citizen', 'Resident User', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80')
      RETURNING id, name, email, phone, role, department, avatar, created_at
    `, [name, cleanEmail, password, phone]);

    res.json({
      success: true,
      message: 'Citizen account registered successfully!',
      user: inserted.rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/update-password', async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = (email || '').toLowerCase().trim();
    const result = await pool.query('UPDATE users SET password = $1 WHERE LOWER(email) = LOWER($2) RETURNING id', [password, cleanEmail]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User email not found.' });
    }
    res.json({ success: true, message: 'Password updated successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/auth/check-email', async (req, res) => {
  try {
    const { email } = req.query;
    const cleanEmail = (String(email || '')).toLowerCase().trim();
    const result = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
    res.json({ success: true, exists: result.rowCount > 0 });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


app.get('/api/activity', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 15');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// SPA Fallback: serve index.html for client routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) next();
  });
});

// Start Server & Database
app.listen(PORT, async () => {
  console.log(`=============================================`);
  console.log(`🚀 GOVSERVE API Server running on port ${PORT}`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`=============================================`);
  await initDatabase();
});

