const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Create a repair request (#6, #19)
router.post('/', auth, async (req, res) => {
  const { device_category, brand, model, problem, budget, service_type, image_url } = req.body;
  if (!device_category || !problem)
    return res.status(400).json({ error: 'device_category and problem are required' });
  const { rows } = await pool.query(
    `INSERT INTO repair_requests
     (customer_id, device_category, brand, model, problem, budget, service_type, image_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.user.id, device_category, brand, model, problem, budget, service_type || 'pickup', image_url]);
  res.status(201).json(rows[0]);
});

// My requests, paginated (#8)
router.get('/mine', auth, async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 6, 50);
  const total = (await pool.query(
    'SELECT COUNT(*) FROM repair_requests WHERE customer_id=$1', [req.user.id])).rows[0].count;
  const { rows } = await pool.query(
    `SELECT * FROM repair_requests WHERE customer_id=$1
     ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [req.user.id, limit, (page - 1) * limit]);
  res.json({ data: rows, page, total: Number(total), totalPages: Math.ceil(total / limit) });
});

// Open requests for technicians, paginated
router.get('/open', auth, async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 6, 50);
  const total = (await pool.query(
    "SELECT COUNT(*) FROM repair_requests WHERE status='open'")).rows[0].count;
  const { rows } = await pool.query(
    `SELECT * FROM repair_requests WHERE status='open'
     ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, (page - 1) * limit]);
  res.json({ data: rows, page, total: Number(total), totalPages: Math.ceil(total / limit) });
});

module.exports = router;
