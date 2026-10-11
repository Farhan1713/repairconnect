const express = require('express');
const nodemailer = require('nodemailer');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Send OTP (#5)
router.post('/send', auth, async (req, res) => {
  const { channel } = req.body;
  if (!['email', 'phone'].includes(channel))
    return res.status(400).json({ error: 'channel must be email or phone' });

  const { rows } = await pool.query(
    'SELECT email, phone FROM users WHERE id = $1', [req.user.id]);
  const user = rows[0];
  if (channel === 'phone' && !user.phone)
    return res.status(400).json({ error: 'No phone number on account' });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  await pool.query(
    `INSERT INTO otp_codes (user_id, channel, code, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')`,
    [req.user.id, channel, code]);

  if (channel === 'email' && process.env.SMTP_USER) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: user.email,
      subject: 'RepairConnect verification code',
      text: `Your code is ${code}. It expires in 10 minutes.`,
    });
  } else {
    console.log(`[OTP ${channel}] ${code}`);
  }

  const body = { sent: true };
  if (process.env.DEMO_MODE === 'true') body.demoCode = code;
  res.json(body);
});

// Confirm OTP
router.post('/confirm', auth, async (req, res) => {
  const { channel, code } = req.body;
  const { rows } = await pool.query(
    `SELECT id FROM otp_codes
     WHERE user_id = $1 AND channel = $2 AND code = $3
       AND used = FALSE AND expires_at > NOW()
     ORDER BY id DESC LIMIT 1`,
    [req.user.id, channel, code]);
  if (!rows.length) return res.status(400).json({ error: 'Invalid or expired code' });

  await pool.query('UPDATE otp_codes SET used = TRUE WHERE id = $1', [rows[0].id]);
  const col = channel === 'email' ? 'email_verified' : 'phone_verified';
  await pool.query(`UPDATE users SET ${col} = TRUE WHERE id = $1`, [req.user.id]);
  res.json({ verified: true, channel });
});

module.exports = router;
