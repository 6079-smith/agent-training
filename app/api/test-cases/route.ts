import { NextRequest, NextResponse } from 'next/server'
import { queryMany, queryOne } from '@/lib/db'
import type { TestCase } from '@/types/database'
import type { ApiResponse } from '@/types/api'

export const dynamic = 'force-dynamic'

/**
 * GET /api/test-cases
 * List all test cases, optionally filtered by tags
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tag = searchParams.get('tag')

    let query = 'SELECT * FROM test_cases'
    const params: any[] = []

    if (tag) {
      query += ' WHERE $1 = ANY(tags)'
      params.push(tag)
    }

    query += ' ORDER BY created_at DESC'

    const testCases = await queryMany<TestCase>(query, params)
    return NextResponse.json({ data: testCases } as ApiResponse<TestCase[]>)
  } catch (error) {
    console.error('Error fetching test cases:', error)
    return NextResponse.json(
      { error: 'Failed to fetch test cases' } as ApiResponse,
      { status: 500 }
    )
  }
}

/**
 * POST /api/test-cases
 * Create a new test case
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validation
    if (!body.name || !body.email_thread) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email_thread' } as ApiResponse,
        { status: 400 }
      )
    }

    // Insert new test case
    const testCase = await queryOne<TestCase>(
      `INSERT INTO test_cases (
        name, email_thread, customer_email, customer_name, 
        subject, order_number, expected_behavior, tags
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        body.name,
        body.email_thread,
        body.customer_email || null,
        body.customer_name || null,
        body.subject || null,
        body.order_number || null,
        body.expected_behavior || null,
        body.tags || null,
      ]
    )

    return NextResponse.json(
      { data: testCase, message: 'Test case created successfully' } as ApiResponse<TestCase>,
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating test case:', error)
    return NextResponse.json(
      { error: 'Failed to create test case' } as ApiResponse,
      { status: 500 }
    )
  }
}
