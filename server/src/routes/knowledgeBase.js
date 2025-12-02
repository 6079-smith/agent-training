import express from 'express';
import { query } from '../db/connection.js';

const router = express.Router();

// Get all knowledge base entries grouped by category
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM knowledge_base ORDER BY category, key'
    );
    
    // Group by category
    const grouped = {};
    for (const row of result.rows) {
      if (!grouped[row.category]) {
        grouped[row.category] = {};
      }
      grouped[row.category][row.key] = row.value;
    }
    
    res.json(grouped);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get entries by category
router.get('/category/:category', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM knowledge_base WHERE category = $1 ORDER BY key',
      [req.params.category]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upsert knowledge base entry
router.post('/', async (req, res) => {
  const { category, key, value } = req.body;
  
  try {
    const result = await query(
      `INSERT INTO knowledge_base (category, key, value) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (category, key) 
       DO UPDATE SET value = $3, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [category, key, value]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk upsert (for wizard)
router.post('/bulk', async (req, res) => {
  const { entries } = req.body;
  
  try {
    const results = [];
    for (const entry of entries) {
      const result = await query(
        `INSERT INTO knowledge_base (category, key, value) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (category, key) 
         DO UPDATE SET value = $3, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [entry.category, entry.key, entry.value]
      );
      results.push(result.rows[0]);
    }
    res.status(201).json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete entry
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM knowledge_base WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete category
router.delete('/category/:category', async (req, res) => {
  try {
    await query(
      'DELETE FROM knowledge_base WHERE category = $1',
      [req.params.category]
    );
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get wizard progress
router.get('/wizard/progress', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM wizard_progress ORDER BY id DESC LIMIT 1'
    );
    res.json(result.rows[0] || { current_step: 0, completed: false });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update wizard progress
router.post('/wizard/progress', async (req, res) => {
  const { current_step, completed } = req.body;
  
  try {
    // Upsert wizard progress
    const existing = await query('SELECT id FROM wizard_progress LIMIT 1');
    
    if (existing.rows.length > 0) {
      const result = await query(
        `UPDATE wizard_progress 
         SET current_step = $1, completed = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $3 
         RETURNING *`,
        [current_step, completed, existing.rows[0].id]
      );
      res.json(result.rows[0]);
    } else {
      const result = await query(
        `INSERT INTO wizard_progress (current_step, completed) 
         VALUES ($1, $2) 
         RETURNING *`,
        [current_step, completed]
      );
      res.status(201).json(result.rows[0]);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
