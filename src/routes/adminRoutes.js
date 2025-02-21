const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const result = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows[0]?.is_admin) {
      next();
    } else {
      res.status(403).json({ message: 'Unauthorized: Admin access required' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get overall statistics
router.get('/stats', isAdmin, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM pets) as total_pets,
        (SELECT ROUND(AVG(rating), 2) FROM chat_feedback) as avg_rating
    `);
    
    res.json(stats.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get pet types distribution
router.get('/pet-types', isAdmin, async (req, res) => {
  try {
    const types = await pool.query(`
      SELECT pet_type, COUNT(*) as count 
      FROM pets 
      GROUP BY pet_type 
      ORDER BY count DESC
    `);
    
    res.json(types.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get common diseases
router.get('/diseases', isAdmin, async (req, res) => {
  try {
    const diseases = await pool.query(`
      SELECT disease, COUNT(*) as count 
      FROM pets 
      GROUP BY disease 
      ORDER BY count DESC 
      LIMIT 10
    `);
    
    res.json(diseases.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get feedback ratings distribution
router.get('/ratings', isAdmin, async (req, res) => {
  try {
    const ratings = await pool.query(`
      SELECT rating, COUNT(*) as count 
      FROM chat_feedback 
      GROUP BY rating 
      ORDER BY rating
    `);
    
    res.json(ratings.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user growth over time
router.get('/user-growth', isAdmin, async (req, res) => {
  try {
    const growth = await pool.query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as new_users
      FROM users 
      GROUP BY month 
      ORDER BY month
    `);
    
    res.json(growth.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add this new route after your existing routes
router.get('/disease-by-pet-type', isAdmin, async (req, res) => {
  try {
    const diseasesByType = await pool.query(`
      SELECT 
        pet_type,
        disease,
        COUNT(*) as count
      FROM pets 
      GROUP BY pet_type, disease
      HAVING COUNT(*) > 1
      ORDER BY pet_type, count DESC
    `);
    
    res.json(diseasesByType.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get engagement metrics
router.get('/engagement-metrics', isAdmin, async (req, res) => {
  try {
    const metrics = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM chat_sessions WHERE start_time >= NOW() - INTERVAL '1 day') as daily_conversations,
        (SELECT COUNT(*) FROM chat_sessions WHERE start_time >= NOW() - INTERVAL '1 week') as weekly_conversations,
        (SELECT COUNT(*) FROM chat_sessions WHERE start_time >= NOW() - INTERVAL '1 month') as monthly_conversations,
        (SELECT COUNT(DISTINCT user_id) FROM chat_sessions WHERE start_time >= NOW() - INTERVAL '1 month') as monthly_active_users,
        (SELECT ROUND(AVG(messages_count), 2) FROM chat_sessions) as avg_messages_per_session,
        (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (end_time - start_time))/60), 2) 
         FROM chat_sessions 
         WHERE end_time IS NOT NULL) as avg_session_duration_minutes
    `);

    const deviceMetrics = await pool.query(`
      SELECT device_type, COUNT(*) as count
      FROM chat_sessions
      GROUP BY device_type
      ORDER BY count DESC
    `);

    const topTopics = await pool.query(`
      SELECT topic, COUNT(*) as count
      FROM chat_topics
      GROUP BY topic
      ORDER BY count DESC
      LIMIT 10
    `);

    const responseMetrics = await pool.query(`
      SELECT 
        ROUND(AVG(EXTRACT(EPOCH FROM response_time)), 2) as avg_response_time,
        COUNT(*) FILTER (WHERE NOT is_understood) as misunderstood_queries,
        COUNT(*) as total_queries
      FROM chat_messages
      WHERE role = 'assistant'
    `);

    res.json({
      engagement: metrics.rows[0],
      devices: deviceMetrics.rows,
      topics: topTopics.rows,
      response: responseMetrics.rows[0]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = {
  router,
  isAdmin
}; 