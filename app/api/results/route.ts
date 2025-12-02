import { NextRequest, NextResponse } from 'next/server'
import { queryMany, queryOne } from '@/lib/db'
import type { TestResult } from '@/types/database'
import type { ApiResponse } from '@/types/api'

export const dynamic = 'force-dynamic'

/**
 * GET /api/results
 * List test results, optionally filtered by test_case_id or prompt_version_id
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const testCaseId = searchParams.get('test_case_id')
    const promptVersionId = searchParams.get('prompt_version_id')

    let query = `
      SELECT r.*, 
             tc.name as test_case_name,
             pv.name as prompt_version_name
      FROM test_results r
      LEFT JOIN test_cases tc ON r.test_case_id = tc.id
      LEFT JOIN prompt_versions pv ON r.prompt_version_id = pv.id
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (testCaseId) {
      query += ` AND r.test_case_id = $${paramIndex}`
      params.push(testCaseId)
      paramIndex++
    }

    if (promptVersionId) {
      query += ` AND r.prompt_version_id = $${paramIndex}`
      params.push(promptVersionId)
      paramIndex++
    }

    query += ' ORDER BY r.created_at DESC'

    const results = await queryMany<TestResult>(query, params)
    return NextResponse.json({ data: results } as ApiResponse<TestResult[]>)
  } catch (error) {
    console.error('Error fetching test results:', error)
    return NextResponse.json(
      { error: 'Failed to fetch test results' } as ApiResponse,
      { status: 500 }
    )
  }
}

/**
 * POST /api/results
 * Save a new test result
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validation
    if (!body.test_case_id || !body.agent_response) {
      return NextResponse.json(
        { error: 'Missing required fields: test_case_id, agent_response' } as ApiResponse,
        { status: 400 }
      )
    }

    // Insert new test result
    const result = await queryOne<TestResult>(
      `INSERT INTO test_results (
        test_case_id, prompt_version_id, agent_response, 
        evaluator_score, evaluator_reasoning, rule_checks
      )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        body.test_case_id,
        body.prompt_version_id || null,
        body.agent_response,
        body.evaluator_score || null,
        body.evaluator_reasoning || null,
        body.rule_checks ? JSON.stringify(body.rule_checks) : null,
      ]
    )

    return NextResponse.json(
      { data: result, message: 'Test result saved successfully' } as ApiResponse<TestResult>,
      { status: 201 }
    )
  } catch (error) {
    console.error('Error saving test result:', error)
    return NextResponse.json(
      { error: 'Failed to save test result' } as ApiResponse,
      { status: 500 }
    )
  }
}
