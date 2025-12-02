import express from 'express';
import { query } from '../db/connection.js';
import { evaluateResponse, checkRule } from '../services/claude.js';

const router = express.Router();

// Get all evaluator rules
router.get('/rules', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM evaluator_rules WHERE is_active = true ORDER BY priority DESC, name'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create evaluator rule
router.post('/rules', async (req, res) => {
  const { name, description, check_prompt, priority } = req.body;
  
  try {
    const result = await query(
      `INSERT INTO evaluator_rules (name, description, check_prompt, priority) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [name, description, check_prompt, priority || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update evaluator rule
router.put('/rules/:id', async (req, res) => {
  const { name, description, check_prompt, is_active, priority } = req.body;
  
  try {
    const result = await query(
      `UPDATE evaluator_rules 
       SET name = $1, description = $2, check_prompt = $3, is_active = $4, priority = $5
       WHERE id = $6 
       RETURNING *`,
      [name, description, check_prompt, is_active, priority, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete evaluator rule
router.delete('/rules/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM evaluator_rules WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Evaluate a response
router.post('/evaluate', async (req, res) => {
  const { emailThread, agentResponse, testCaseId, promptVersionId } = req.body;
  
  try {
    // Get knowledge base
    const kbResult = await query('SELECT * FROM knowledge_base');
    const knowledgeBase = {};
    for (const row of kbResult.rows) {
      if (!knowledgeBase[row.category]) {
        knowledgeBase[row.category] = {};
      }
      knowledgeBase[row.category][row.key] = row.value;
    }
    
    // Get active rules
    const rulesResult = await query(
      'SELECT * FROM evaluator_rules WHERE is_active = true ORDER BY priority DESC'
    );
    const rules = rulesResult.rows;
    
    // Run evaluation
    const evaluation = await evaluateResponse(
      emailThread, 
      agentResponse, 
      knowledgeBase, 
      rules
    );
    
    // Save result if test case and prompt version provided
    if (testCaseId && promptVersionId && evaluation.success) {
      await query(
        `INSERT INTO test_results 
         (test_case_id, prompt_version_id, agent_response, evaluator_score, evaluator_reasoning, rule_checks) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          testCaseId, 
          promptVersionId, 
          agentResponse, 
          evaluation.evaluation.overallScore,
          evaluation.evaluation.reasoning,
          JSON.stringify(evaluation.evaluation.ruleChecks)
        ]
      );
    }
    
    res.json(evaluation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get test results with scores
router.get('/results', async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        tr.*,
        tc.name as test_case_name,
        tc.email_thread,
        pv.name as prompt_version_name
       FROM test_results tr
       JOIN test_cases tc ON tr.test_case_id = tc.id
       JOIN prompt_versions pv ON tr.prompt_version_id = pv.id
       ORDER BY tr.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get score summary by prompt version
router.get('/summary/:promptVersionId', async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        COUNT(*) as total_tests,
        AVG(evaluator_score) as avg_score,
        MIN(evaluator_score) as min_score,
        MAX(evaluator_score) as max_score
       FROM test_results 
       WHERE prompt_version_id = $1`,
      [req.params.promptVersionId]
    );
    
    // Get rule pass/fail counts
    const ruleStats = await query(
      `SELECT rule_checks FROM test_results WHERE prompt_version_id = $1`,
      [req.params.promptVersionId]
    );
    
    const ruleCounts = {};
    for (const row of ruleStats.rows) {
      if (row.rule_checks) {
        for (const [ruleName, check] of Object.entries(row.rule_checks)) {
          if (!ruleCounts[ruleName]) {
            ruleCounts[ruleName] = { pass: 0, fail: 0 };
          }
          if (check.status === 'PASS') {
            ruleCounts[ruleName].pass++;
          } else {
            ruleCounts[ruleName].fail++;
          }
        }
      }
    }
    
    res.json({
      ...result.rows[0],
      ruleCounts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Compare two prompt versions
router.get('/compare/:id1/:id2', async (req, res) => {
  try {
    const [summary1, summary2] = await Promise.all([
      query(
        `SELECT 
          COUNT(*) as total_tests,
          AVG(evaluator_score) as avg_score
         FROM test_results 
         WHERE prompt_version_id = $1`,
        [req.params.id1]
      ),
      query(
        `SELECT 
          COUNT(*) as total_tests,
          AVG(evaluator_score) as avg_score
         FROM test_results 
         WHERE prompt_version_id = $1`,
        [req.params.id2]
      )
    ]);
    
    res.json({
      version1: { id: req.params.id1, ...summary1.rows[0] },
      version2: { id: req.params.id2, ...summary2.rows[0] }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
