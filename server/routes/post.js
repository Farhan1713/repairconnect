const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Paginated list of posts with counts and my own reaction
router.get('/', auth, async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 5, 50);
  try {
    const total = (await pool.query('SELECT COUNT(*) FROM posts')).rows[0].count;
    const { rows } = await pool.query(
      `SELECT p.id, p.title, p.content, p.created_at, u.username AS author,
        (SELECT COUNT(*) FROM post_reactions r WHERE r.post_id = p.id AND r.type = 'like')::int AS likes,
        (SELECT COUNT(*) FROM post_reactions r WHERE r.post_id = p.id AND r.type = 'dislike')::int AS dislikes,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id)::int AS comment_count,
        (SELECT r.type FROM post_reactions r WHERE r.post_id = p.id AND r.user_id = $1) AS my_reaction
       FROM posts p JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, (page - 1) * limit]);
    res.json({ data: rows, page, total: Number(total), totalPages: Math.ceil(total / limit) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a post
router.post('/', auth, async (req, res) => {
  const title = (req.body.title || '').trim();
  const content = (req.body.content || '').trim();
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });
  if (title.length > 150) return res.status(400).json({ error: 'Title is too long (150 characters max)' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO posts (user_id, title, content) VALUES ($1,$2,$3) RETURNING *',
      [req.user.id, title, content]);
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Comments on a post
router.get('/:id/comments', auth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Bad id' });
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.content, c.created_at, u.username AS author
       FROM comments c JOIN users u ON u.id = c.user_id
       WHERE c.post_id = $1 ORDER BY c.created_at ASC, c.id ASC`, [id]);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/comments', auth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const content = (req.body.content || '').trim();
  if (!id || !content) return res.status(400).json({ error: 'Comment text is required' });
  try {
    const post = await pool.query('SELECT 1 FROM posts WHERE id=$1', [id]);
    if (!post.rows.length) return res.status(404).json({ error: 'Post not found' });
    const { rows } = await pool.query(
      'INSERT INTO comments (post_id, user_id, content) VALUES ($1,$2,$3) RETURNING *',
      [id, req.user.id, content]);
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Like or dislike (tapping the same one again removes it)
router.post('/:id/react', auth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { type } = req.body;
  if (!id || !['like', 'dislike'].includes(type))
    return res.status(400).json({ error: 'type must be like or dislike' });
  try {
    const post = await pool.query('SELECT 1 FROM posts WHERE id=$1', [id]);
    if (!post.rows.length) return res.status(404).json({ error: 'Post not found' });
    const cur = await pool.query(
      'SELECT type FROM post_reactions WHERE post_id=$1 AND user_id=$2', [id, req.user.id]);
    if (cur.rows[0] && cur.rows[0].type === type) {
      await pool.query('DELETE FROM post_reactions WHERE post_id=$1 AND user_id=$2', [id, req.user.id]);
    } else {
      await pool.query(
        `INSERT INTO post_reactions (post_id, user_id, type) VALUES ($1,$2,$3)
         ON CONFLICT (post_id, user_id) DO UPDATE SET type = EXCLUDED.type`,
        [id, req.user.id, type]);
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
