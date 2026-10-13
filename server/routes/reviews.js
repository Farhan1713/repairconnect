const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Customer reviews a completed booking
router.post('/', auth, async (req, res) => {
  const bookingId = parseInt(req.body.booking_id, 10);
  const rating = parseInt(req.body.rating, 10);
  const comment = (req.body.comment || '').trim() || null;
  if (!bookingId || !(rating >= 1 && rating <= 5))
    return res.status(400).json({ error: 'booking_id and a rating from 1 to 5 are required' });
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT b.status, r.customer_id, q.technician_id
       FROM bookings b
       JOIN quotations q ON q.id = b.quotation_id
       JOIN repair_requests r ON r.id = q.request_id
       WHERE b.id = $1`, [bookingId]);
    const b = rows[0];
    if (!b || b.customer_id !== req.user.id)
      return res.status(404).json({ error: 'Booking not found' });
    if (b.status !== 'completed')
      return res.status(409).json({ error: 'You can review only completed jobs' });
    await client.query('BEGIN');
    const r = await client.query(
      `INSERT INTO reviews (booking_id, customer_id, technician_id, rating, comment)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [bookingId, req.user.id, b.technician_id, rating, comment]);
    await client.query(
      `UPDATE technicians
       SET avg_rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE technician_id = $1)
       WHERE id = $1`, [b.technician_id]);
    await client.query('COMMIT');
    res.status(201).json(r.rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    if (e.code === '23505')
      return res.status(409).json({ error: 'You already reviewed this job' });
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
