const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
const YT = /^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//i;

// Paginated list, optional ?category=Phone
router.get('/', auth, async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 5, 50);
  const cat = (req.query.category || '').trim();
  const where = cat ? 'WHERE device_category = $1' : '';
  const params = cat ? [cat] : [];
  try {
    const total = (await pool.query(`SELECT COUNT(*) FROM tutorials ${where}`, params)).rows[0].count;
    const { rows } = await pool.query(
      `SELECT id, title, device_category, youtube_url, created_at FROM tutorials ${where}
       ORDER BY created_at DESC, id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit]);
    res.json({ data: rows, page, total: Number(total), totalPages: Math.ceil(total / limit) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Technicians and admins add a tutorial
router.post('/', auth, async (req, res) => {
  if (!['technician', 'admin'].includes(req.user.role))
    return res.status(403).json({ error: 'Technicians only' });
  const title = (req.body.title || '').trim();
  const category = (req.body.device_category || '').trim();
  const url = (req.body.youtube_url || '').trim();
  if (!title || !url) return res.status(400).json({ error: 'Title and YouTube link are required' });
  if (title.length > 150) return res.status(400).json({ error: 'Title is too long (150 characters max)' });
  if (!YT.test(url)) return res.status(400).json({ error: 'Use a youtube.com or youtu.be link' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO tutorials (title, device_category, youtube_url) VALUES ($1,$2,$3) RETURNING *',
      [title, category || null, url]);
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
