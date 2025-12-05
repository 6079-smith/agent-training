import { NextRequest, NextResponse } from 'next/server'
import { queryOne, queryMany } from '@/lib/db'
import type { EvaluatorRule, KnowledgeBase } from '@/types/database'
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
  /\bimportant\b/i,
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
 * POST /api/evaluator/rules/generate
 * Generate an evaluator rule from knowledge base content using AI
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { knowledgeBaseId } = body
    
    if (!knowledgeBaseId) {
      return NextResponse.json(
        { error: 'knowledgeBaseId is required' } as ApiResponse,
        { status: 400 }
      )
    }
    
    // Get the knowledge base entry
    const kbEntry = await queryOne<KnowledgeBase>(
      'SELECT * FROM knowledge_base WHERE id = $1',
      [knowledgeBaseId]
    )
    
    if (!kbEntry) {
      return NextResponse.json(
        { error: 'Knowledge base entry not found' } as ApiResponse,
        { status: 404 }
      )
    }
    
    // Check if content contains rule patterns
    if (!containsRulePattern(kbEntry.value)) {
      return NextResponse.json({
        data: null,
        message: 'Content does not appear to contain a checkable rule'
      } as ApiResponse)
    }
    
    // Check if a rule already exists for this knowledge base entry
    const existingRule = await queryOne<EvaluatorRule>(
      'SELECT * FROM evaluator_rules WHERE knowledge_base_id = $1',
      [knowledgeBaseId]
    )
    
    if (existingRule) {
      return NextResponse.json({
        data: existingRule,
        message: 'Rule already exists for this entry',
        existing: true
      } as ApiResponse<EvaluatorRule>)
    }
    
    // Use Claude to generate the evaluator rule
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
    
    // Parse the response
    const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'Failed to parse AI response' } as ApiResponse,
        { status: 500 }
      )
    }
    
    const ruleData = JSON.parse(jsonMatch[0])
    
    // Insert the new rule
    const newRule = await queryOne<EvaluatorRule>(
      `INSERT INTO evaluator_rules (name, description, check_prompt, priority, is_active, knowledge_base_id)
       VALUES ($1, $2, $3, $4, true, $5)
       RETURNING *`,
      [ruleData.name, ruleData.description, ruleData.check_prompt, ruleData.priority || 5, knowledgeBaseId]
    )
    
    return NextResponse.json({
      data: newRule,
      message: 'Rule generated successfully',
      generated: true
    } as ApiResponse<EvaluatorRule>)
    
  } catch (error) {
    console.error('Error generating evaluator rule:', error)
    return NextResponse.json(
      { error: 'Failed to generate evaluator rule' } as ApiResponse,
      { status: 500 }
    )
  }
}

/**
 * POST /api/evaluator/rules/generate-all
 * Scan all knowledge base entries and generate rules for those with rule patterns
 */
export async function PUT(request: NextRequest) {
  try {
    // Get all knowledge base entries
    const entries = await queryMany<KnowledgeBase>(
      'SELECT * FROM knowledge_base ORDER BY category, key'
    )
    
    const results = {
      scanned: entries.length,
      withPatterns: 0,
      generated: 0,
      existing: 0,
      skipped: 0
    }
    
    for (const entry of entries) {
      if (!containsRulePattern(entry.value)) {
        results.skipped++
        continue
      }
      
      results.withPatterns++
      
      // Check if rule already exists
      const existingRule = await queryOne<EvaluatorRule>(
        'SELECT id FROM evaluator_rules WHERE knowledge_base_id = $1',
        [entry.id]
      )
      
      if (existingRule) {
        results.existing++
        continue
      }
      
      // Generate rule using the same logic as single generation
      try {
        const prompt = `You are helping create an evaluator rule for checking AI customer service agent responses.

Given this training content from the "${entry.category}" category:

**${entry.key}**: ${entry.value}

Generate an evaluator rule that can check if an agent response follows this guidance.

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
          
          await queryOne(
            `INSERT INTO evaluator_rules (name, description, check_prompt, priority, is_active, knowledge_base_id)
             VALUES ($1, $2, $3, $4, true, $5)
             ON CONFLICT (name) DO NOTHING`,
            [ruleData.name, ruleData.description, ruleData.check_prompt, ruleData.priority || 5, entry.id]
          )
          
          results.generated++
        }
      } catch (err) {
        console.error(`Failed to generate rule for ${entry.key}:`, err)
      }
    }
    
    return NextResponse.json({
      data: results,
      message: `Generated ${results.generated} new rules from ${results.withPatterns} entries with rule patterns`
    } as ApiResponse)
    
  } catch (error) {
    console.error('Error generating evaluator rules:', error)
    return NextResponse.json(
      { error: 'Failed to generate evaluator rules' } as ApiResponse,
      { status: 500 }
    )
  }
}
