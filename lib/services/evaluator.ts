import { evaluateResponse } from './anthropic'
import { queryMany } from '@/lib/db'
import type { EvaluatorRule, KnowledgeBase } from '@/types/database'
import type { EvaluateResponse, RuleCheckResult } from '@/types/api'

/**
 * Build the evaluation prompt from knowledge base and rules
 */
function buildEvaluationPrompt(
  knowledgeBase: KnowledgeBase[],
  rules: EvaluatorRule[],
  expectedBehavior?: string
): string {
  let prompt = `You are an AI evaluator for customer service agent responses. Your job is to analyze agent responses and score them based on quality, accuracy, and adherence to business rules.

## Business Context

`

  // Add knowledge base by category
  const categories = Array.from(new Set(knowledgeBase.map((kb) => kb.category)))
  for (const category of categories) {
    const entries = knowledgeBase.filter((kb) => kb.category === category)
    prompt += `\n### ${category}\n`
    for (const entry of entries) {
      prompt += `- **${entry.key}**: ${entry.value}\n`
    }
  }

  prompt += `\n## Evaluation Rules

You must check the agent response against these rules:

`

  // Add evaluation rules
  for (const rule of rules) {
    prompt += `### ${rule.name}
${rule.description || ''}
Check: ${rule.check_prompt}
Priority: ${rule.priority}

`
  }

  // Add expected behavior as a special rule if provided
  if (expectedBehavior) {
    prompt += `### Expected Behavior Check
This test case has a specific expected behavior defined. The agent response should align with this expectation.
Check: Does the response fulfill the expected behavior: "${expectedBehavior}"?
Priority: high

`
  }

  prompt += `## Your Task

1. Analyze the email thread and agent response
2. Check each rule and determine if it passed or failed${expectedBehavior ? '\n3. Check if the response meets the Expected Behavior' : ''}
${expectedBehavior ? '4' : '3'}. Provide reasoning for each rule check
${expectedBehavior ? '5' : '4'}. Calculate an overall score from 0-100 based on:
   - Rule compliance (weighted by priority)${expectedBehavior ? '\n   - Meeting the expected behavior' : ''}
   - Response quality
   - Professionalism
   - Accuracy

## Output Format

Respond with a JSON object in this exact format:
\`\`\`json
{
  "score": 85,
  "reasoning": "Overall assessment of the response...",
  "ruleChecks": {
    "rule_name_1": {
      "passed": true,
      "reasoning": "Explanation..."
    },
    "rule_name_2": {
      "passed": false,
      "reasoning": "Explanation..."
    }
  }
}
\`\`\`

Be strict but fair in your evaluation. Focus on what matters for customer satisfaction.`

  return prompt
}

/**
 * Evaluate an agent response
 */
export async function evaluateAgentResponse(
  emailThread: string,
  agentResponse: string,
  knowledgeBase?: KnowledgeBase[],
  expectedBehavior?: string
): Promise<EvaluateResponse> {
  try {
    // Fetch active evaluation rules
    const rules = await queryMany<EvaluatorRule>(
      'SELECT * FROM evaluator_rules WHERE is_active = true ORDER BY priority DESC'
    )

    if (rules.length === 0) {
      throw new Error('No active evaluation rules found')
    }

    // Fetch knowledge base if not provided
    let kb = knowledgeBase
    if (!kb) {
      kb = await queryMany<KnowledgeBase>(
        'SELECT * FROM knowledge_base ORDER BY category, key'
      )
    }

    // Build evaluation prompt
    const evaluationPrompt = buildEvaluationPrompt(kb, rules, expectedBehavior)

    // Build context for evaluation
    let context = `## Email Thread
${emailThread}

## Agent Response
${agentResponse}`

    if (expectedBehavior) {
      context += `

## Expected Behavior
The test case specifies that the agent should: ${expectedBehavior}`
    }

    context += `

Please evaluate this agent response according to the rules and provide your assessment in JSON format.`

    // Get evaluation from Claude
    const result = await evaluateResponse(evaluationPrompt, context)

    // Parse the JSON response
    let evaluation: EvaluateResponse
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = result.content.match(/```json\s*([\s\S]*?)\s*```/)
      const jsonStr = jsonMatch ? jsonMatch[1] : result.content

      evaluation = JSON.parse(jsonStr)
    } catch (parseError) {
      console.error('Failed to parse evaluation response:', result.content)
      throw new Error('Failed to parse evaluation response as JSON')
    }

    // Validate response structure
    if (
      typeof evaluation.score !== 'number' ||
      !evaluation.reasoning ||
      !evaluation.ruleChecks
    ) {
      throw new Error('Invalid evaluation response structure')
    }

    return evaluation
  } catch (error) {
    console.error('Error evaluating response:', error)
    throw error
  }
}
