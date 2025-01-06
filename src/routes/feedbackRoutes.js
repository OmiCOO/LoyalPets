const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('./authRoutes');

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { pet_id, thread_id, rating, comment } = req.body;
    const userId = req.user.userId;

    // Verify the pet belongs to the user
    const petCheck = await pool.query(
      'SELECT id FROM pets WHERE id = $1 AND user_id = $2',
      [pet_id, userId]
    );

    if (petCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const feedback = await pool.query(
      'INSERT INTO chat_feedback (pet_id, thread_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *',
      [pet_id, thread_id, rating, comment]
    );

    res.json(feedback.rows[0]);
  } catch (error) {
    console.error('Error saving feedback:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 