import express from 'express';
import { query } from '../db/connection.js';
import { improvePrompt } from '../services/claude.js';

const router = express.Router();

// Get all prompt versions
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM prompt_versions ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get active prompt version
router.get('/active', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM prompt_versions WHERE is_active = true LIMIT 1'
    );
    res.json(result.rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single prompt version
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM prompt_versions WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prompt version not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new prompt version
router.post('/', async (req, res) => {
  const { name, system_prompt, user_prompt, notes } = req.body;
  
  try {
    const result = await query(
      `INSERT INTO prompt_versions (name, system_prompt, user_prompt, notes) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [name, system_prompt, user_prompt, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update prompt version
router.put('/:id', async (req, res) => {
  const { name, system_prompt, user_prompt, notes } = req.body;
  
  try {
    const result = await query(
      `UPDATE prompt_versions 
       SET name = $1, system_prompt = $2, user_prompt = $3, notes = $4
       WHERE id = $5 
       RETURNING *`,
      [name, system_prompt, user_prompt, notes, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prompt version not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set active prompt version
router.post('/:id/activate', async (req, res) => {
  try {
    // Deactivate all
    await query('UPDATE prompt_versions SET is_active = false');
    
    // Activate selected
    const result = await query(
      'UPDATE prompt_versions SET is_active = true WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prompt version not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete prompt version
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM prompt_versions WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prompt version not found' });
    }
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate prompt from training data
router.post('/generate', async (req, res) => {
  try {
    // Get all knowledge base data
    const kbResult = await query('SELECT * FROM knowledge_base ORDER BY category, key');
    
    // Organize by category
    const kb = {};
    kbResult.rows.forEach(row => {
      if (!kb[row.category]) kb[row.category] = {};
      kb[row.category][row.key] = row.value;
    });
    
    // Generate system prompt
    const systemPrompt = generateSystemPrompt(kb);
    
    // Generate user prompt template
    const userPrompt = generateUserPrompt(kb);
    
    res.json({
      name: `Generated Prompt - ${new Date().toLocaleDateString()}`,
      system_prompt: systemPrompt,
      user_prompt: userPrompt,
      notes: 'Auto-generated from Training Wizard data'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function generateSystemPrompt(kb) {
  const business = kb.business || {};
  const policies = kb.policies || {};
  const capabilities = kb.capabilities || {};
  const tone = kb.tone || {};
  const failures = kb.failures || {};
  
  return `You are a customer service agent for ${business.company_name || '[Company Name]'}.

# YOUR ROLE
You respond to customer service emails professionally, empathetically, and efficiently. Your goal is to resolve customer issues while maintaining a positive brand experience.

# PRODUCTS & SERVICES
${business.products || 'Products: [Not specified]'}

# SHIPPING INFORMATION
- Ships to: ${business.ship_to_countries || '[Not specified]'}
- Does NOT ship to: ${business.no_ship_countries || '[Not specified]'}
${policies.shipping_policy ? '\n' + policies.shipping_policy : ''}

# POLICIES
## Refund Policy
${policies.refund_policy || '[Not specified]'}

## Escalation Triggers
${policies.escalation_triggers || '[Not specified]'}

# YOUR CAPABILITIES
## What You CAN Do:
${capabilities.can_do || '[Not specified]'}

## What You CANNOT Do:
${capabilities.cannot_do || '[Not specified]'}

## Available Tools:
${capabilities.tools_available || '[Not specified]'}

# TONE & COMMUNICATION STYLE
${tone.disclose_ai === 'Yes' ? 'You should disclose that you are an AI assistant when appropriate.' : 'You do not need to disclose that you are an AI.'}

## Sign-off Strategy (Choose based on context):

### 1. Happy Path (Standard Inquiries)
${tone.sign_off_happy_path || 'Best regards,\n[Agent Name]'}

### 2. De-Escalation (Delays & Problems)
${tone.sign_off_de_escalation || 'We appreciate your patience,\n[Agent Name]'}

### 3. Anxiety Management (Concerned Customers)
${tone.sign_off_anxiety_management || 'We\'ve got your back,\n[Agent Name]'}

## Sign-off Rules:
${tone.sign_off_rules || '- Match the customer\'s tone\n- Include tracking links when relevant\n- Be empathetic and professional'}

## Phrases to ALWAYS Avoid:
${tone.phrases_avoid || '[Not specified]'}

## Phrases to ALWAYS Include (when relevant):
${tone.phrases_include || '[Not specified]'}

# CRITICAL RULES - NEVER VIOLATE THESE
${failures.must_never_say || '[Not specified]'}

# COMMON MISTAKES TO AVOID
${failures.common_mistakes || '[Not specified]'}

# KNOWN FAILURE PATTERNS
${failures.hallucination_examples || '[Not specified]'}

# RESPONSE GUIDELINES
1. Read the entire email thread carefully
2. Identify the customer's main concern
3. Check if you have the tools/authority to help
4. If escalation is needed, explain why and what happens next
5. Choose the appropriate sign-off based on the situation
6. Always be helpful, never dismissive
7. Match the customer's communication style
8. Include relevant tracking links or next steps`;
}

function generateUserPrompt(kb) {
  return `Please analyze this customer service email and provide an appropriate response.

# EMAIL THREAD
{{13.thread}}

# CUSTOMER INFORMATION
- To: {{14.to[].email}}
- From: {{14.fromName}}
- Subject: {{14.subject}}

# YOUR TASK
1. Understand the customer's issue or question
2. Determine if you can help or if escalation is needed
3. Provide a helpful, empathetic response
4. Use the appropriate sign-off based on the situation
5. Include any relevant tracking information or next steps

# CRITICAL OUTPUT REQUIREMENTS
- Return ONLY plain text email body
- NO HTML tags (no <p>, <br>, etc.)
- NO XML tags (no <reply_to_address>, <subject>, etc.)
- NO metadata fields
- NO explanations or commentary
- Start directly with the email content
- Use plain line breaks for paragraphs

Just write the email as you would in a plain text email client.`;
}

// Auto-improve prompt based on evaluation results
router.post('/auto-improve', async (req, res) => {
  const { promptVersionId, evaluation, emailThread, agentResponse } = req.body;
  
  try {
    // Get the current prompt version
    const promptResult = await query(
      'SELECT * FROM prompt_versions WHERE id = $1',
      [promptVersionId]
    );
    
    if (promptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Prompt version not found' });
    }
    
    const currentPrompt = promptResult.rows[0];
    
    // Generate improvement instructions based on failures
    const failedRules = [];
    const passedRules = [];
    
    if (evaluation.ruleChecks) {
      Object.entries(evaluation.ruleChecks).forEach(([rule, check]) => {
        if (check.status === 'FAIL') {
          failedRules.push({ rule, reason: check.reason });
        } else {
          passedRules.push(rule);
        }
      });
    }
    
    // Create the improvement prompt
    const improvementPrompt = `You are an expert prompt engineer specializing in customer service AI agents.

You need to improve a system prompt that failed quality evaluation.

# CURRENT SYSTEM PROMPT
${currentPrompt.system_prompt}

# TEST CASE
Customer Email:
${emailThread}

AI Response:
${agentResponse}

# EVALUATION RESULTS
Overall Score: ${evaluation.overallScore}/10
Reasoning: ${evaluation.reasoning}

# FAILED RULES
${failedRules.map(f => `- ${f.rule}: ${f.reason}`).join('\n')}

# RULES THAT PASSED (Keep these working)
${passedRules.join(', ')}

# YOUR TASK
1. Analyze why the prompt failed these specific rules
2. Rewrite the relevant sections to prevent these failures
3. Make instructions MORE EXPLICIT and SPECIFIC
4. Add concrete examples where helpful
5. Use clear formatting (headers, bullets, bold) to emphasize critical rules
6. Keep all sections that are working well
7. DO NOT make the prompt shorter - add detail where needed

# GUIDELINES FOR IMPROVEMENT
- If tone failed: Add explicit tone guidelines with examples
- If sign-off failed: Add decision tree for sign-off selection
- If policy failed: Make policy rules more prominent and specific
- If escalation failed: Add clear escalation criteria
- Use "CRITICAL", "NEVER", "ALWAYS" for important rules
- Add "Good example:" and "Bad example:" where relevant

Return ONLY the improved system prompt text, no explanations.`;
    
    // Call Claude to improve the prompt
    const improvementResult = await improvePrompt(
      currentPrompt.system_prompt,
      evaluation,
      emailThread,
      agentResponse
    );
    
    if (!improvementResult.success) {
      return res.status(500).json({ error: 'Failed to generate improved prompt: ' + improvementResult.error });
    }
    
    res.json({
      name: `Auto-improved from ${currentPrompt.name}`,
      system_prompt: improvementResult.improvedPrompt,
      user_prompt: currentPrompt.user_prompt,
      notes: `Auto-improved based on evaluation. Failed rules: ${failedRules.map(f => f.rule).join(', ')}. Original score: ${evaluation.overallScore}/10`,
      failedRules,
      currentPromptId: promptVersionId,
      usage: improvementResult.usage
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Compare two prompt versions
router.get('/compare/:id1/:id2', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM prompt_versions WHERE id IN ($1, $2)',
      [req.params.id1, req.params.id2]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
