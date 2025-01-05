const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Create pet
router.post('/', async (req, res) => {
  try {
    const { name, pet_type, breed, age, disease, symptoms } = req.body;
    const userId = req.user.userId;  // Get from JWT token

    const newPet = await pool.query(
      'INSERT INTO pets (name, pet_type, breed, age, disease, symptoms, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, pet_type, breed, age, disease, symptoms, userId]
    );
    res.json(newPet.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get all pets
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const allPets = await pool.query('SELECT * FROM pets WHERE user_id = $1', [userId]);
    res.json(allPets.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get pet by id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const pet = await pool.query(
      'SELECT * FROM pets WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (pet.rows.length === 0) {
      return res.status(404).json({ message: 'Pet not found' });
    }
    res.json(pet.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Update thread ID endpoint
router.put('/:id/thread', async (req, res) => {
    try {
        const { id } = req.params;
        const { thread_id } = req.body;
        const userId = req.user.userId;

        // Get pet details for logging
        const petDetails = await pool.query(
            'SELECT name FROM pets WHERE id = $1',
            [id]
        );
        
        console.log('Attempting to save thread_id:', {
            thread_id,
            pet_id: id,
            pet_name: petDetails.rows[0]?.name,
            user_id: userId
        });

        const updatedPet = await pool.query(
            'UPDATE pets SET thread_id = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
            [thread_id, id, userId]
        );

        if (updatedPet.rows.length === 0) {
            console.log('Failed to update thread_id - Pet not found or unauthorized');
            return res.status(404).json({ message: 'Pet not found or unauthorized' });
        }

        console.log('Successfully saved thread_id:', {
            thread_id: updatedPet.rows[0].thread_id,
            pet_name: updatedPet.rows[0].name,
            pet_id: updatedPet.rows[0].id,
            user_id: updatedPet.rows[0].user_id
        });

        res.json(updatedPet.rows[0]);
    } catch (err) {
        console.error('Error saving thread_id:', err.message);
        res.status(500).send('Server Error');
    }
});

router.put('/:id/health-update', async (req, res) => {
    try {
        const { id } = req.params;
        const { symptoms, disease } = req.body;
        const userId = req.user.userId;

        const updatedPet = await pool.query(
            'UPDATE pets SET symptoms = $1, disease = $2, last_updated = CURRENT_TIMESTAMP WHERE id = $3 AND user_id = $4 RETURNING *',
            [symptoms, disease, id, userId]
        );

        res.json(updatedPet.rows[0]);
    } catch (err) {
        console.error('Error updating pet health:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router; 