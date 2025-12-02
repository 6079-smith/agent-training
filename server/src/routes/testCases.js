import express from 'express';
import { query } from '../db/connection.js';

const router = express.Router();

// Get all test cases
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM test_cases ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single test case
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM test_cases WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test case not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create test case
router.post('/', async (req, res) => {
  const { 
    name, 
    email_thread, 
    customer_email, 
    customer_name, 
    subject, 
    order_number,
    expected_behavior,
    tags 
  } = req.body;
  
  try {
    const result = await query(
      `INSERT INTO test_cases 
       (name, email_thread, customer_email, customer_name, subject, order_number, expected_behavior, tags) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [name, email_thread, customer_email, customer_name, subject, order_number, expected_behavior, tags || []]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update test case
router.put('/:id', async (req, res) => {
  const { 
    name, 
    email_thread, 
    customer_email, 
    customer_name, 
    subject, 
    order_number,
    expected_behavior,
    tags 
  } = req.body;
  
  try {
    const result = await query(
      `UPDATE test_cases 
       SET name = $1, email_thread = $2, customer_email = $3, customer_name = $4, 
           subject = $5, order_number = $6, expected_behavior = $7, tags = $8
       WHERE id = $9 
       RETURNING *`,
      [name, email_thread, customer_email, customer_name, subject, order_number, expected_behavior, tags || [], req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test case not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete test case
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM test_cases WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test case not found' });
    }
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get test results for a test case
router.get('/:id/results', async (req, res) => {
  try {
    const result = await query(
      `SELECT tr.*, pv.name as prompt_version_name 
       FROM test_results tr 
       JOIN prompt_versions pv ON tr.prompt_version_id = pv.id 
       WHERE tr.test_case_id = $1 
       ORDER BY tr.created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk import test cases
router.post('/bulk', async (req, res) => {
  const { testCases } = req.body;
  
  try {
    const results = [];
    for (const tc of testCases) {
      const result = await query(
        `INSERT INTO test_cases 
         (name, email_thread, customer_email, customer_name, subject, order_number, expected_behavior, tags) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING *`,
        [tc.name, tc.email_thread, tc.customer_email, tc.customer_name, tc.subject, tc.order_number, tc.expected_behavior, tc.tags || []]
      );
      results.push(result.rows[0]);
    }
    res.status(201).json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
