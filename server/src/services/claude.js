import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Default to Claude Sonnet 4 if not specified
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';

/**
 * Generate a response using Claude as the CS Agent
 */
export async function generateAgentResponse(systemPrompt, userPrompt, emailThread, metadata = {}) {
  const fullUserPrompt = userPrompt
    .replace('{{13.thread}}', emailThread)
    .replace('{{14.to[].email}}', metadata.replyTo || '')
    .replace('{{14.subject}}', metadata.subject || '')
    .replace('{{14.fromName}}', metadata.customerName || '');

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: fullUserPrompt
        }
      ]
    });

    return {
      success: true,
      response: response.content[0].text,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens
      }
    };
  } catch (error) {
    console.error('Claude Agent error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Evaluate an agent response using Claude as the Evaluator
 */
export async function evaluateResponse(emailThread, agentResponse, knowledgeBase, rules) {
  const evaluatorSystemPrompt = `You are an expert evaluator for a customer service AI agent. Your job is to score the agent's response based on the business context and rules provided.

## Business Context
${formatKnowledgeBase(knowledgeBase)}

## Evaluation Rules
${rules.map((r, i) => `${i + 1}. ${r.name}: ${r.description}`).join('\n')}

## Your Task
1. Analyze the customer email and the agent's response
2. Check each rule and determine PASS or FAIL
3. Provide an overall score from 1-10
4. Explain your reasoning

Respond in this exact JSON format:
{
  "overallScore": <number 1-10>,
  "reasoning": "<brief explanation>",
  "ruleChecks": {
    "<rule_name>": {
      "status": "PASS" | "FAIL",
      "reason": "<brief reason>"
    }
  },
  "suggestions": ["<improvement suggestion 1>", "<improvement suggestion 2>"]
}`;

  const evaluatorUserPrompt = `## Customer Email Thread
${emailThread}

## Agent's Response
${agentResponse}

Evaluate this response now.`;

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      system: evaluatorSystemPrompt,
      messages: [
        {
          role: 'user',
          content: evaluatorUserPrompt
        }
      ]
    });

    const content = response.content[0].text;
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const evaluation = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        evaluation,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens
        }
      };
    } else {
      return {
        success: false,
        error: 'Could not parse evaluator response'
      };
    }
  } catch (error) {
    console.error('Claude Evaluator error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Run a single rule check
 */
export async function checkRule(emailThread, agentResponse, rule, knowledgeBase) {
  const systemPrompt = `You are evaluating a customer service response against a specific rule.

## Business Context
${formatKnowledgeBase(knowledgeBase)}

## Rule to Check
${rule.name}: ${rule.check_prompt}

Respond with exactly: PASS or FAIL, followed by a brief reason.
Format: STATUS: <reason>`;

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 200,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Customer Email:\n${emailThread}\n\nAgent Response:\n${agentResponse}`
        }
      ]
    });

    const content = response.content[0].text;
    const isPassing = content.toUpperCase().startsWith('PASS');
    
    return {
      success: true,
      status: isPassing ? 'PASS' : 'FAIL',
      reason: content.replace(/^(PASS|FAIL):?\s*/i, '').trim()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Improve a system prompt based on evaluation failures
 */
export async function improvePrompt(currentPrompt, evaluation, emailThread, agentResponse) {
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

  const improvementSystemPrompt = `You are an expert prompt engineer specializing in customer service AI agents.

Your task is to improve system prompts that have failed quality evaluations. You must:
1. Analyze why specific rules failed
2. Rewrite ONLY the sections that need improvement
3. Make instructions MORE EXPLICIT and SPECIFIC
4. Add concrete examples where helpful
5. Use clear formatting (headers, bullets, bold) to emphasize critical rules
6. Preserve all sections that are working well
7. DO NOT make the prompt shorter - add necessary detail

Guidelines for specific failures:
- Tone issues → Add explicit tone guidelines with examples
- Sign-off issues → Add decision tree for sign-off selection with IF/THEN logic
- Policy issues → Make policy rules more prominent with CRITICAL/NEVER/ALWAYS
- Escalation issues → Add clear escalation criteria with examples
- Add "Good example:" and "Bad example:" where relevant

CRITICAL RULES FOR EXAMPLES:
- DO NOT copy specific details from the test case (order numbers, dates, names, etc.)
- Examples must be GENERIC and HYPOTHETICAL
- Examples must FOLLOW the business rules in the prompt (never contradict them)
- Use placeholders like [order number], [customer name], [product name]
- NEVER include specific timeframes (like "24 hours") unless explicitly allowed in the rules
- NEVER mention technical difficulties, system issues, or internal problems
- Examples should demonstrate the CORRECT way to handle situations

Return ONLY the improved system prompt text. Do not include explanations, commentary, or meta-text.`;

  const improvementUserPrompt = `# CURRENT SYSTEM PROMPT
${currentPrompt}

# TEST CASE THAT FAILED (FOR ANALYSIS ONLY - DO NOT COPY SPECIFIC DETAILS)
Customer Email:
${emailThread}

AI Response:
${agentResponse}

# EVALUATION RESULTS
Overall Score: ${evaluation.overallScore}/10
Reasoning: ${evaluation.reasoning}

# FAILED RULES (Must fix these)
${failedRules.map(f => `- ${f.rule}: ${f.reason}`).join('\n')}

# RULES THAT PASSED (Keep these working)
${passedRules.join(', ')}

# YOUR TASK
Improve the system prompt to fix the failed rules while preserving what works.

REMINDER: The test case above is for understanding WHY the prompt failed. DO NOT copy specific details (order numbers, dates, timeframes, etc.) into your examples. Use generic placeholders instead.`;

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      system: improvementSystemPrompt,
      messages: [
        {
          role: 'user',
          content: improvementUserPrompt
        }
      ]
    });

    return {
      success: true,
      improvedPrompt: response.content[0].text,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens
      }
    };
  } catch (error) {
    console.error('Claude Prompt Improvement error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function formatKnowledgeBase(kb) {
  if (!kb || Object.keys(kb).length === 0) {
    return 'No business context configured yet.';
  }
  
  let formatted = '';
  for (const [category, items] of Object.entries(kb)) {
    formatted += `\n### ${category}\n`;
    for (const [key, value] of Object.entries(items)) {
      formatted += `- ${key}: ${value}\n`;
    }
  }
  return formatted;
}
