const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

// Live username check (#4)
router.get('/check-username', async (req, res) => {
  const u = (req.query.u || '').trim();
  if (u.length < 3) return res.json({ available: false, reason: 'too short' });
  const { rows } = await pool.query(
    'SELECT 1 FROM users WHERE LOWER(username) = LOWER($1)', [u]);
  res.json({ available: rows.length === 0 });
});

// Register
router.post('/register', async (req, res) => {
  const { username, email, phone, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: 'Missing fields' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (username, email, phone, password_hash)
       VALUES ($1, $2, $3, $4) RETURNING id, username, email, role`,
      [username, email, phone || null, hash]);
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505')
      return res.status(409).json({ error: 'Username, email or phone already used' });
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login (#11)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign(
    { id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
});

module.exports = router;
