const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Technician sends a quotation on an open request
router.post('/', auth, async (req, res) => {
  const { request_id, price, estimated_days, note } = req.body;
  if (!request_id || !price || Number(price) <= 0)
    return res.status(400).json({ error: 'request_id and a positive price are required' });
  try {
    const tech = await pool.query('SELECT id FROM technicians WHERE user_id=$1', [req.user.id]);
    if (!tech.rows[0])
      return res.status(400).json({ error: 'Create your technician profile first' });
    const r = await pool.query('SELECT status FROM repair_requests WHERE id=$1', [request_id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Request not found' });
    if (r.rows[0].status !== 'open')
      return res.status(409).json({ error: 'Request is no longer open' });
    const dup = await pool.query(
      'SELECT 1 FROM quotations WHERE request_id=$1 AND technician_id=$2',
      [request_id, tech.rows[0].id]);
    if (dup.rows.length) return res.status(409).json({ error: 'You already quoted this request' });
    const { rows } = await pool.query(
      `INSERT INTO quotations (request_id, technician_id, price, estimated_days, note)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [request_id, tech.rows[0].id, price, estimated_days || null, note || null]);
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Customer sees quotations on their own request
router.get('/request/:id', auth, async (req, res) => {
  try {
    const own = await pool.query(
      'SELECT 1 FROM repair_requests WHERE id=$1 AND customer_id=$2',
      [req.params.id, req.user.id]);
    if (!own.rows.length) return res.status(404).json({ error: 'Request not found' });
    const { rows } = await pool.query(
      `SELECT q.*, u.username AS technician_name
       FROM quotations q
       JOIN technicians t ON t.id = q.technician_id
       JOIN users u ON u.id = t.user_id
       WHERE q.request_id=$1 ORDER BY q.price ASC`,
      [req.params.id]);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Customer accepts a quotation, which creates the booking
router.post('/:id/accept', auth, async (req, res) => {
  const { appointment_date } = req.body;
  if (!appointment_date)
    return res.status(400).json({ error: 'appointment_date is required (YYYY-MM-DD)' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const q = await client.query(
      `SELECT q.id, q.request_id
       FROM quotations q JOIN repair_requests r ON r.id = q.request_id
       WHERE q.id=$1 AND r.customer_id=$2 AND r.status='open'
       FOR UPDATE OF r`,
      [req.params.id, req.user.id]);
    if (!q.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Quotation not found, or request is not open' });
    }
    await client.query('UPDATE quotations SET accepted = (id=$1) WHERE request_id=$2',
      [q.rows[0].id, q.rows[0].request_id]);
    const b = await client.query(
      'INSERT INTO bookings (quotation_id, appointment_date) VALUES ($1,$2) RETURNING *',
      [q.rows[0].id, appointment_date]);
    await client.query("UPDATE repair_requests SET status='booked' WHERE id=$1",
      [q.rows[0].request_id]);
    await client.query('COMMIT');
    res.status(201).json(b.rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    if (e.code === '22007' || e.code === '22008')
      return res.status(400).json({ error: 'Invalid date, use YYYY-MM-DD' });
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
