const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Become a technician
router.post('/become', auth, async (req, res) => {
  const { shop_name, skills, address, latitude, longitude } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO technicians (user_id, shop_name, skills, address, latitude, longitude)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.id, shop_name, skills, address, latitude, longitude]);
    await pool.query("UPDATE users SET role='technician' WHERE id=$1", [req.user.id]);
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Already a technician' });
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// List technicians with pagination (#8)
router.get('/', async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 6, 50);
  const search = `%${req.query.search || ''}%`;
  const offset = (page - 1) * limit;

  const total = (await pool.query(
    'SELECT COUNT(*) FROM technicians WHERE shop_name ILIKE $1 OR skills ILIKE $1',
    [search])).rows[0].count;
  const { rows } = await pool.query(
    `SELECT * FROM technicians WHERE shop_name ILIKE $1 OR skills ILIKE $1
     ORDER BY avg_rating DESC, id LIMIT $2 OFFSET $3`,
    [search, limit, offset]);

  res.json({ data: rows, page, total: Number(total), totalPages: Math.ceil(total / limit) });
});

module.exports = router;
