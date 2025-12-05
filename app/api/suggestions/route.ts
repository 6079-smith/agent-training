import { NextRequest, NextResponse } from 'next/server'
import { generateResponse } from '@/lib/services/anthropic'
import { queryMany } from '@/lib/db'
import type { ApiResponse } from '@/types/api'
import type { KnowledgeBase } from '@/types/database'

export const dynamic = 'force-dynamic'

export interface Suggestion {
  id: string
  type: 'add_to_existing'
  stepTitle: string
  stepCategory: string
  questionTitle: string
  questionValue: string
  reasoning: string
  priority: 'high' | 'medium' | 'low'
  ruleViolated?: string
}

export interface SuggestionsResponse {
  suggestions: Suggestion[]
  summary: string
}

/**
 * POST /api/suggestions
 * Generate improvement suggestions based on evaluation results
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { emailThread, agentResponse, evaluation } = body

    if (!emailThread || !agentResponse || !evaluation) {
      return NextResponse.json(
        { error: 'Missing required fields: emailThread, agentResponse, evaluation' } as ApiResponse,
        { status: 400 }
      )
    }

    // Fetch current knowledge base to understand existing structure
    const knowledgeBase = await queryMany<KnowledgeBase>(
      'SELECT * FROM knowledge_base ORDER BY category, key'
    )

    // Get unique categories (steps) from knowledge base
    const existingCategories = Array.from(new Set(knowledgeBase.map(kb => kb.category)))

    // Fetch wizard steps for proper titles
    const wizardSteps = await queryMany<{ title: string; category: string }>(
      'SELECT title, category FROM wizard_steps ORDER BY sort_order'
    )
    
    // Build step info with titles
    const stepInfo = wizardSteps.map(s => `- **${s.title}** (category: "${s.category}")`).join('\n')

    // Build the prompt for generating suggestions
    const systemPrompt = `You are an AI assistant that helps improve customer service agent training data. 
Your job is to analyze evaluation results and suggest specific improvements to the training knowledge base.

## AVAILABLE TRAINING WIZARD STEPS

You MUST use one of these existing steps for your suggestions:

${stepInfo}

## Current Knowledge Base Entries

${existingCategories.map(cat => {
  const entries = knowledgeBase.filter(kb => kb.category === cat)
  const stepTitle = wizardSteps.find(s => s.category === cat)?.title || cat
  return `### ${stepTitle} (${cat})
${entries.map(e => `- **${e.key}**: ${e.value}`).join('\n')}`
}).join('\n\n')}

## Your Task

Based on the evaluation results, suggest specific improvements to add to the training wizard.

**CRITICAL: You MUST use existing steps from the list above.** Map each suggestion to the most appropriate existing step.
- Do NOT create new steps
- Do NOT invent new category names
- Pick the best-fit existing step for each suggestion

## Output Format

Respond with a JSON object:
\`\`\`json
{
  "suggestions": [
    {
      "id": "unique_id",
      "type": "add_to_existing",
      "stepTitle": "Exact Step Title from list above",
      "stepCategory": "exact_category_slug_from_list_above",
      "questionTitle": "short_snake_case_key",
      "questionValue": "The actual content/value to add",
      "reasoning": "Why this improvement is needed",
      "priority": "high|medium|low",
      "ruleViolated": "Name of the rule that was violated (if applicable)"
    }
  ],
  "summary": "Brief summary of all suggested improvements"
}
\`\`\`

Guidelines:
- **ALWAYS use existing steps** - Pick the closest matching step from the list above
- **MAXIMUM 3 SUGGESTIONS** - Focus on the most impactful improvements only
- **NO REPETITION** - If multiple issues stem from the same root cause, consolidate into ONE comprehensive suggestion
- **ONE suggestion per rule violation** - Don't create separate suggestions for examples, rules, and guidelines about the same issue
- **questionTitle must be short snake_case** - e.g., "escalation_timeframe", "refund_policy"
- Only suggest improvements that would prevent the identified issues
- Be specific and actionable
- Priority should be "high" for rule violations, "medium" for quality issues, "low" for minor improvements
- Generate unique IDs using format "sug_" + random string
- If the score is 80+, suggest at most 1 improvement or none at all`

    const userPrompt = `## Evaluation Results

**Score**: ${evaluation.score}/100

**Overall Assessment**:
${evaluation.reasoning}

**Rule Checks**:
${Object.entries(evaluation.ruleChecks || {}).map(([rule, check]: [string, any]) => 
  `- **${rule}**: ${check.passed ? '✅ PASSED' : '❌ FAILED'} - ${check.reasoning}`
).join('\n')}

## Original Email Thread
${emailThread}

## Agent Response That Was Evaluated
${agentResponse}

---

Please analyze these results and suggest specific improvements to add to the training wizard.
Focus especially on any failed rule checks - what knowledge could be added to prevent these failures?
If the score is already high (80+), you may suggest fewer or no improvements.`

    // Call Claude to generate suggestions
    const result = await generateResponse(systemPrompt, [
      { role: 'user', content: userPrompt }
    ])

    // Parse the JSON response
    let suggestions: SuggestionsResponse
    try {
      const jsonMatch = result.content.match(/```json\s*([\s\S]*?)\s*```/)
      const jsonStr = jsonMatch ? jsonMatch[1] : result.content
      suggestions = JSON.parse(jsonStr)
    } catch (parseError) {
      console.error('Failed to parse suggestions response:', result.content)
      // Return empty suggestions if parsing fails
      suggestions = {
        suggestions: [],
        summary: 'Unable to generate suggestions at this time.'
      }
    }

    return NextResponse.json({ data: suggestions } as ApiResponse<SuggestionsResponse>)
  } catch (error) {
    console.error('Error generating suggestions:', error)
    return NextResponse.json(
      { error: `Failed to generate suggestions: ${error instanceof Error ? error.message : 'Unknown error'}` } as ApiResponse,
      { status: 500 }
    )
  }
}
