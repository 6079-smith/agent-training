import { NextRequest, NextResponse } from 'next/server'
import { queryMany, queryOne, execute } from '@/lib/db'
import type { KnowledgeBase, EvaluatorRule } from '@/types/database'
import type { ApiResponse } from '@/types/api'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic()

/**
 * Patterns that indicate content contains a rule that should be checked
 */
const RULE_PATTERNS = [
  /\bnever\b/i,
  /\balways\b/i,
  /\bmust\b/i,
  /\bdo not\b/i,
  /\bdon't\b/i,
  /\bshould not\b/i,
  /\bshouldn't\b/i,
  /\bprohibited\b/i,
  /\bforbidden\b/i,
  /\brequired\b/i,
  /\bmandatory\b/i,
  /\bcritical\b/i,
  /\bensure\b/i,
  /\bavoid\b/i,
]

/**
 * Check if content contains rule-like patterns
 */
function containsRulePattern(content: string): boolean {
  return RULE_PATTERNS.some(pattern => pattern.test(content))
}

/**
 * Generate an evaluator rule from knowledge base content
 */
async function generateEvaluatorRule(kbEntry: KnowledgeBase): Promise<void> {
  try {
    // Check if content contains rule patterns
    if (!containsRulePattern(kbEntry.value)) {
      return
    }
    
    // Check if a rule already exists for this knowledge base entry
    const existingRule = await queryOne<EvaluatorRule>(
      'SELECT id FROM evaluator_rules WHERE knowledge_base_id = $1',
      [kbEntry.id]
    )
    
    if (existingRule) {
      // Update existing rule instead of creating new one
      const prompt = `You are helping update an evaluator rule for checking AI customer service agent responses.

Given this training content from the "${kbEntry.category}" category:

**${kbEntry.key}**: ${kbEntry.value}

Generate an updated evaluator rule that can check if an agent response follows this guidance.

Respond with JSON only:
{
  "name": "short_snake_case_name",
  "description": "Brief description of what this rule checks",
  "check_prompt": "A clear prompt that asks: does the response violate this rule? Include specific things to look for. End with: Return PASS if compliant, FAIL if violated.",
  "priority": 5
}

Priority scale: 1-3 = low, 4-6 = medium, 7-10 = high (based on business impact)`

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
      
      const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      
      if (jsonMatch) {
        const ruleData = JSON.parse(jsonMatch[0])
        await execute(
          `UPDATE evaluator_rules SET description = $1, check_prompt = $2, priority = $3 WHERE id = $4`,
          [ruleData.description, ruleData.check_prompt, ruleData.priority || 5, existingRule.id]
        )
      }
      return
    }
    
    // Generate new rule
    const prompt = `You are helping create an evaluator rule for checking AI customer service agent responses.

Given this training content from the "${kbEntry.category}" category:

**${kbEntry.key}**: ${kbEntry.value}

Generate an evaluator rule that can check if an agent response follows this guidance.

Respond with JSON only:
{
  "name": "short_snake_case_name",
  "description": "Brief description of what this rule checks",
  "check_prompt": "A clear prompt that asks: does the response violate this rule? Include specific things to look for. End with: Return PASS if compliant, FAIL if violated.",
  "priority": 5
}

Priority scale: 1-3 = low, 4-6 = medium, 7-10 = high (based on business impact)

IMPORTANT: The check_prompt should be specific and actionable. Reference the actual content/values from the training.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })
    
    const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    
    if (jsonMatch) {
      const ruleData = JSON.parse(jsonMatch[0])
      
      await queryOne(
        `INSERT INTO evaluator_rules (name, description, check_prompt, priority, is_active, knowledge_base_id)
         VALUES ($1, $2, $3, $4, true, $5)
         ON CONFLICT (name) DO UPDATE SET 
           description = EXCLUDED.description,
           check_prompt = EXCLUDED.check_prompt,
           priority = EXCLUDED.priority,
           knowledge_base_id = EXCLUDED.knowledge_base_id`,
        [ruleData.name, ruleData.description, ruleData.check_prompt, ruleData.priority || 5, kbEntry.id]
      )
    }
  } catch (error) {
    console.error('Error generating evaluator rule:', error)
    // Don't throw - rule generation is a side effect, shouldn't break the main save
  }
}

/**
 * GET /api/knowledge
 * List all knowledge base entries, optionally filtered by category
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    let query = 'SELECT * FROM knowledge_base'
    const params: any[] = []

    if (category) {
      query += ' WHERE category = $1'
      params.push(category)
    }

    query += ' ORDER BY category, sort_order, id'

    const knowledge = await queryMany<KnowledgeBase>(query, params)
    return NextResponse.json({ data: knowledge } as ApiResponse<KnowledgeBase[]>)
  } catch (error) {
    console.error('Error fetching knowledge base:', error)
    return NextResponse.json(
      { error: 'Failed to fetch knowledge base' } as ApiResponse,
      { status: 500 }
    )
  }
}

/**
 * POST /api/knowledge
 * Create or update a knowledge base entry (upsert)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validation - value can be empty for new questions
    if (!body.category || !body.key) {
      return NextResponse.json(
        { error: 'Missing required fields: category, key' } as ApiResponse,
        { status: 400 }
      )
    }

    const value = body.value || ''
    const displayTitle = body.display_title || body.key.replace(/_/g, ' ')
    const sortOrder = body.sort_order ?? 0

    // Upsert: insert or update if exists
    const knowledge = await queryOne<KnowledgeBase>(
      `INSERT INTO knowledge_base (category, key, value, display_title, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (category, key) 
       DO UPDATE SET 
         value = EXCLUDED.value, 
         display_title = COALESCE(EXCLUDED.display_title, knowledge_base.display_title),
         sort_order = EXCLUDED.sort_order,
         updated_at = NOW()
       RETURNING *`,
      [body.category, body.key, value, displayTitle, sortOrder]
    )

    // Auto-generate evaluator rule if content contains rule patterns (async, don't wait)
    if (knowledge && value) {
      generateEvaluatorRule(knowledge).catch(err => 
        console.error('Background rule generation failed:', err)
      )
    }

    return NextResponse.json(
      { data: knowledge, message: 'Knowledge entry saved successfully' } as ApiResponse<KnowledgeBase>,
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error saving knowledge entry:', error)

    return NextResponse.json(
      { error: 'Failed to save knowledge entry' } as ApiResponse,
      { status: 500 }
    )
  }
}

/**
 * PUT /api/knowledge
 * Update display_title or reorder entries
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.id) {
      return NextResponse.json(
        { error: 'Missing required field: id' } as ApiResponse,
        { status: 400 }
      )
    }

    // Build dynamic update query
    const updates: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (body.display_title !== undefined) {
      updates.push(`display_title = $${paramIndex++}`)
      params.push(body.display_title)
    }
    if (body.sort_order !== undefined) {
      updates.push(`sort_order = $${paramIndex++}`)
      params.push(body.sort_order)
    }
    if (body.value !== undefined) {
      updates.push(`value = $${paramIndex++}`)
      params.push(body.value)
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' } as ApiResponse,
        { status: 400 }
      )
    }

    updates.push('updated_at = NOW()')
    params.push(body.id)

    const knowledge = await queryOne<KnowledgeBase>(
      `UPDATE knowledge_base SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    )

    // Auto-generate/update evaluator rule if value was updated and contains rule patterns
    if (knowledge && body.value !== undefined) {
      generateEvaluatorRule(knowledge).catch(err => 
        console.error('Background rule generation failed:', err)
      )
    }

    return NextResponse.json(
      { data: knowledge, message: 'Knowledge entry updated successfully' } as ApiResponse<KnowledgeBase>,
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error updating knowledge entry:', error)

    return NextResponse.json(
      { error: 'Failed to update knowledge entry' } as ApiResponse,
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/knowledge
 * Delete a knowledge base entry by id
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' } as ApiResponse,
        { status: 400 }
      )
    }

    await execute('DELETE FROM knowledge_base WHERE id = $1', [id])

    return NextResponse.json(
      { message: 'Knowledge entry deleted successfully' } as ApiResponse,
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error deleting knowledge entry:', error)

    return NextResponse.json(
      { error: 'Failed to delete knowledge entry' } as ApiResponse,
      { status: 500 }
    )
  }
}
