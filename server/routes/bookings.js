const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
const STATUSES = ['received', 'repairing', 'ready', 'completed'];

// Returns the booking only if the user is its customer or its technician
async function getBooking(id, userId) {
  const { rows } = await pool.query(
    `SELECT b.*, q.price, r.id AS request_id, r.customer_id, t.user_id AS technician_user_id
     FROM bookings b
     JOIN quotations q ON q.id = b.quotation_id
     JOIN repair_requests r ON r.id = q.request_id
     JOIN technicians t ON t.id = q.technician_id
     WHERE b.id = $1`, [id]);
  const b = rows[0];
  if (!b) return null;
  if (b.customer_id !== userId && b.technician_user_id !== userId) return null;
  return b;
}

// My bookings (customer or technician), paginated
router.get('/mine', auth, async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 5, 50);
  const from = `FROM bookings b
    JOIN quotations q ON q.id = b.quotation_id
    JOIN repair_requests r ON r.id = q.request_id
    JOIN technicians t ON t.id = q.technician_id
    JOIN users tu ON tu.id = t.user_id
    JOIN users cu ON cu.id = r.customer_id
    LEFT JOIN invoices i ON i.booking_id = b.id
    WHERE r.customer_id = $1 OR t.user_id = $1`;
  try {
    const total = (await pool.query(`SELECT COUNT(*) ${from}`, [req.user.id])).rows[0].count;
    const { rows } = await pool.query(
      `SELECT b.id, b.status, to_char(b.appointment_date, 'YYYY-MM-DD') AS appointment_date,
              q.price, r.device_category, r.brand, r.model, r.problem,
              tu.username AS technician_name, cu.username AS customer_name,
              (t.user_id = $1) AS is_technician, i.amount AS invoice_amount
       ${from}
       ORDER BY b.created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, (page - 1) * limit]);
    res.json({ data: rows, page, total: Number(total), totalPages: Math.ceil(total / limit) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Timeline of a booking
router.get('/:id/updates', auth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Bad id' });
  try {
    const b = await getBooking(id, req.user.id);
    if (!b) return res.status(404).json({ error: 'Booking not found' });
    const { rows } = await pool.query(
      'SELECT id, status, note, created_at FROM status_updates WHERE booking_id=$1 ORDER BY created_at ASC, id ASC',
      [id]);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Technician posts a status update; "completed" also creates the invoice
router.post('/:id/updates', auth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status, note } = req.body;
  if (!id) return res.status(400).json({ error: 'Bad id' });
  if (!STATUSES.includes(status))
    return res.status(400).json({ error: 'Status must be one of: ' + STATUSES.join(', ') });
  const client = await pool.connect();
  try {
    const b = await getBooking(id, req.user.id);
    if (!b) return res.status(404).json({ error: 'Booking not found' });
    if (b.technician_user_id !== req.user.id)
      return res.status(403).json({ error: 'Only the technician can post updates' });
    if (b.status === 'completed')
      return res.status(409).json({ error: 'This job is already completed' });
    await client.query('BEGIN');
    const u = await client.query(
      'INSERT INTO status_updates (booking_id, status, note) VALUES ($1,$2,$3) RETURNING *',
      [id, status, note || null]);
    await client.query('UPDATE bookings SET status=$1 WHERE id=$2', [status, id]);
    if (status === 'completed') {
      await client.query(
        'INSERT INTO invoices (booking_id, amount) VALUES ($1,$2) ON CONFLICT (booking_id) DO NOTHING',
        [id, b.price]);
      await client.query("UPDATE repair_requests SET status='completed' WHERE id=$1", [b.request_id]);
    }
    await client.query('COMMIT');
    res.status(201).json(u.rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Invoice of a booking
router.get('/:id/invoice', auth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Bad id' });
  try {
    const b = await getBooking(id, req.user.id);
    if (!b) return res.status(404).json({ error: 'Booking not found' });
    const { rows } = await pool.query(
      `SELECT i.id, i.amount, i.issued_at, b.id AS booking_id,
              to_char(b.appointment_date, 'YYYY-MM-DD') AS appointment_date,
              r.device_category, r.brand, r.model, r.problem,
              t.shop_name, tu.username AS technician_name, cu.username AS customer_name
       FROM invoices i
       JOIN bookings b ON b.id = i.booking_id
       JOIN quotations q ON q.id = b.quotation_id
       JOIN repair_requests r ON r.id = q.request_id
       JOIN technicians t ON t.id = q.technician_id
       JOIN users tu ON tu.id = t.user_id
       JOIN users cu ON cu.id = r.customer_id
       WHERE i.booking_id = $1`, [id]);
    if (!rows[0]) return res.status(404).json({ error: 'No invoice yet' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
