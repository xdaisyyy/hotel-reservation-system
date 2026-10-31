const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors()); 
app.use(express.json()); 

const pool = new Pool({
  user: 'postgres',
  host: 'localhost', 
  database: 'hotel_db', 
  password: 'uno07',      
  port: 5432, 
});

const JWT_SECRET = "gala_super_secret_key_123";

// ==========================================
// MIDDLEWARES
// ==========================================
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: "Please login to continue" });
    try {
        const verified = jwt.verify(token.split(" ")[1], JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) { res.status(400).json({ error: "Invalid Token" }); }
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin access required" });
    next();
};

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================
app.post('/api/auth/register', async (req, res) => {
    try {
        const { first_name, last_name, email, password } = req.body;
        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) return res.status(400).json({ error: "Email already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Combine for full_name (used in dashboard)
        const full_name = `${first_name} ${last_name}`;

        const newUser = await pool.query(
            'INSERT INTO users (first_name, last_name, full_name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING user_id, full_name, email, role',
            [first_name, last_name, full_name, email, hashedPassword, 'client']
        );
        res.status(201).json({ message: "Registered successfully", user: newUser.rows[0] });
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: "Server error" }); 
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) return res.status(400).json({ error: "Invalid credentials" });

        const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
        if (!validPassword) return res.status(400).json({ error: "Invalid credentials" });

        const token = jwt.sign({ user_id: user.rows[0].user_id, role: user.rows[0].role }, JWT_SECRET, { expiresIn: "1d" });
        res.json({ token, user: { id: user.rows[0].user_id, name: user.rows[0].full_name, role: user.rows[0].role } });
    } catch (err) { res.status(500).json({ error: "Server error" }); }
});

// ==========================================
// PUBLIC ROUTES
// ==========================================
app.get('/api/venues', async(req, res) => {
    const result = await pool.query('SELECT * FROM venues');
    res.json(result.rows);
});

app.get('/api/reservations/venue/:venueId', async (req, res) => {
    const result = await pool.query(`SELECT event_date FROM reservations WHERE venue_id = $1 AND status != 'Cancelled'`, [req.params.venueId]);
    res.json(result.rows.map(row => new Date(row.event_date).toISOString().split('T')[0]));
});

app.get('/api/rooms', async(req, res) => {
    const result = await pool.query('SELECT * FROM rooms');
    res.json(result.rows);
});

app.get('/api/room-reservations/room/:roomId', async (req, res) => {
    const query = `SELECT check_in_date, check_out_date FROM room_reservations WHERE room_id = $1 AND status != 'Cancelled'`;
    const result = await pool.query(query, [req.params.roomId]);
    let blockedDates = [];
    result.rows.forEach(row => {
        let currentDate = new Date(row.check_in_date);
        const endDate = new Date(row.check_out_date);
        while (currentDate < endDate) {
            blockedDates.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }
    });
    res.json(blockedDates);
});

// GET REVIEWS
app.get('/api/reviews', async (req, res) => {
    const result = await pool.query('SELECT review_id, client_name, rating, comment, user_id, created_at FROM reviews ORDER BY created_at DESC');
    res.json(result.rows);
});

// POST REVIEW (Requires Login & Only 1 per user)
app.post('/api/reviews', verifyToken, async (req, res) => {
    try {
        const { client_name, rating, comment } = req.body;
        const user_id = req.user.user_id;

        const existing = await pool.query('SELECT * FROM reviews WHERE user_id = $1', [user_id]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: "You have already submitted a review. Only one review per user is allowed." });
        }

        const result = await pool.query(
            'INSERT INTO reviews (user_id, client_name, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *', 
            [user_id, client_name, rating, comment]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Failed to post review' }); }
});

// ==========================================
// PROTECTED BOOKING ROUTES
// ==========================================
app.post('/api/reservations', verifyToken, async(req, res) => {
    try {
        const { venue_id, event_date, event_time, guest_count, total_price, extra_hours } = req.body;
        const user_id = req.user.user_id;

        const dateCheckQuery = `SELECT CURRENT_DATE + INTERVAL '7 days' AS min_date, $1::date AS requested_date`;
        const dateCheck = await pool.query(dateCheckQuery, [event_date]);
        
        if (dateCheck.rows[0].requested_date < dateCheck.rows[0].min_date) {
            return res.status(400).json({ error: "Events must be at least 7 days in advance." });
        }

        const duplicateCheckQuery = `SELECT * FROM reservations WHERE venue_id = $1 AND event_date = $2 AND status != 'Cancelled'`;
        const duplicateCheck = await pool.query(duplicateCheckQuery, [venue_id, event_date]);

        if (duplicateCheck.rows.length > 0) {
            return res.status(400).json({ error: "This venue is already booked on this date." });
        }

        const insertQuery = `
            INSERT INTO reservations (user_id, venue_id, event_date, event_time, guest_count, total_price, extra_hours)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
        `;
        
        const result = await pool.query(insertQuery, [user_id, venue_id, event_date, event_time, guest_count, total_price, extra_hours || 0]);
        res.status(201).json({message: 'Reservation created!', data: result.rows[0]});
    } catch (err) { res.status(500).json({error: 'Failed to create reservation.'}); }
});

app.post('/api/room-reservations', verifyToken, async (req, res) => {
    try {
        const { room_id, check_in_date, check_out_date, check_in_time, check_out_time, guest_count, total_price, extra_hours } = req.body;
        const user_id = req.user.user_id;

        const overlapCheck = await pool.query(`
            SELECT * FROM room_reservations 
            WHERE room_id = $1 AND status != 'Cancelled'
            AND (check_in_date, check_out_date) OVERLAPS ($2::date, $3::date)
        `, [room_id, check_in_date, check_out_date]);

        if (overlapCheck.rows.length > 0) {
            return res.status(400).json({ error: "This room is already booked for the selected dates." });
        }

        const insertQuery = `
            INSERT INTO room_reservations (user_id, room_id, check_in_date, check_out_date, check_in_time, check_out_time, guest_count, total_price, extra_hours)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *;
        `;
        
        const result = await pool.query(insertQuery, [user_id, room_id, check_in_date, check_out_date, check_in_time, check_out_time, guest_count, total_price, extra_hours || 0]);
        res.status(201).json({ message: 'Room booked!', data: result.rows[0] });
    } catch (err) { res.status(500).json({ error: 'Failed to book room.' }); }
});

// ==========================================
// PROTECTED ADMIN ROUTES
// ==========================================
app.get('/api/reservations', verifyToken, isAdmin, async(req, res) => {
    const query = `
        SELECT r.reservation_id, u.user_id, u.full_name AS client_name, v.name AS venue_name, 
        r.event_date, r.event_time, r.guest_count, r.extra_hours, COALESCE(r.total_price, 0) AS total_price, r.status
        FROM reservations r JOIN users u ON r.user_id = u.user_id JOIN venues v ON r.venue_id = v.venue_id;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
});

app.put('/api/reservations/:id', verifyToken, isAdmin, async(req, res) => {
    await pool.query(`UPDATE reservations SET status = $1 WHERE reservation_id = $2`, [req.body.status, req.params.id]);
    res.json({message: 'Updated!'});
});

app.delete('/api/reservations/:id', verifyToken, isAdmin, async(req, res) => {
    await pool.query('DELETE FROM reservations WHERE reservation_id = $1', [req.params.id]);
    res.json({message: 'Deleted!'});
});

app.get('/api/admin/room-reservations', verifyToken, isAdmin, async (req, res) => {
    const query = `
        SELECT rr.room_res_id AS reservation_id, u.user_id, u.full_name AS client_name, r.name AS venue_name, 
        rr.check_in_date AS event_date,
        CONCAT('In: ', TO_CHAR(rr.check_in_date, 'YYYY-MM-DD'), ' @ ', rr.check_in_time, ' | Out: ', TO_CHAR(rr.check_out_date, 'YYYY-MM-DD'), ' @ ', rr.check_out_time) AS event_time,
        rr.guest_count, rr.extra_hours, rr.total_price, rr.status
        FROM room_reservations rr JOIN users u ON rr.user_id = u.user_id JOIN rooms r ON rr.room_id = r.room_id;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
});

app.put('/api/admin/room-reservations/:id', verifyToken, isAdmin, async (req, res) => {
    await pool.query('UPDATE room_reservations SET status = $1 WHERE room_res_id = $2', [req.body.status, req.params.id]);
    res.json({ message: 'Updated!' });
});

app.delete('/api/admin/room-reservations/:id', verifyToken, isAdmin, async (req, res) => {
    await pool.query('DELETE FROM room_reservations WHERE room_res_id = $1', [req.params.id]);
    res.json({ message: 'Deleted!' });
});

app.listen(3000, () => console.log('Server is running on http://localhost:3000'));