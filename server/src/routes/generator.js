import express from 'express';
import { query } from '../db/connection.js';
import { generateAgentResponse } from '../services/claude.js';

const router = express.Router();

// Generate response for a test case using a prompt version
router.post('/run', async (req, res) => {
  const { testCaseId, promptVersionId, emailThread, metadata } = req.body;
  
  try {
    let systemPrompt, userPrompt;
    let testCase = null;
    
    // Get prompt version
    if (promptVersionId) {
      const promptResult = await query(
        'SELECT * FROM prompt_versions WHERE id = $1',
        [promptVersionId]
      );
      if (promptResult.rows.length === 0) {
        return res.status(404).json({ error: 'Prompt version not found' });
      }
      systemPrompt = promptResult.rows[0].system_prompt;
      userPrompt = promptResult.rows[0].user_prompt;
    } else {
      // Use active prompt
      const activeResult = await query(
        'SELECT * FROM prompt_versions WHERE is_active = true LIMIT 1'
      );
      if (activeResult.rows.length === 0) {
        return res.status(400).json({ error: 'No active prompt version found' });
      }
      systemPrompt = activeResult.rows[0].system_prompt;
      userPrompt = activeResult.rows[0].user_prompt;
    }
    
    // Get test case if provided
    let email = emailThread;
    let meta = metadata || {};
    
    if (testCaseId) {
      const testCaseResult = await query(
        'SELECT * FROM test_cases WHERE id = $1',
        [testCaseId]
      );
      if (testCaseResult.rows.length === 0) {
        return res.status(404).json({ error: 'Test case not found' });
      }
      testCase = testCaseResult.rows[0];
      email = testCase.email_thread;
      meta = {
        replyTo: testCase.customer_email,
        subject: testCase.subject,
        customerName: testCase.customer_name
      };
    }
    
    // Generate response
    const result = await generateAgentResponse(systemPrompt, userPrompt, email, meta);
    
    res.json({
      ...result,
      testCase,
      promptVersionId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Quick test with custom prompts (no saving)
router.post('/quick-test', async (req, res) => {
  const { systemPrompt, userPrompt, emailThread, metadata } = req.body;
  
  try {
    const result = await generateAgentResponse(
      systemPrompt, 
      userPrompt, 
      emailThread, 
      metadata || {}
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run all test cases against a prompt version
router.post('/run-suite', async (req, res) => {
  const { promptVersionId } = req.body;
  
  try {
    // Get prompt version
    const promptResult = await query(
      'SELECT * FROM prompt_versions WHERE id = $1',
      [promptVersionId]
    );
    if (promptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Prompt version not found' });
    }
    const { system_prompt, user_prompt } = promptResult.rows[0];
    
    // Get all test cases
    const testCasesResult = await query('SELECT * FROM test_cases');
    const testCases = testCasesResult.rows;
    
    const results = [];
    
    for (const tc of testCases) {
      const meta = {
        replyTo: tc.customer_email,
        subject: tc.subject,
        customerName: tc.customer_name
      };
      
      const result = await generateAgentResponse(
        system_prompt, 
        user_prompt, 
        tc.email_thread, 
        meta
      );
      
      results.push({
        testCaseId: tc.id,
        testCaseName: tc.name,
        ...result
      });
    }
    
    res.json({
      promptVersionId,
      totalTests: testCases.length,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
