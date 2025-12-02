import { NextResponse } from 'next/server'
import { queryMany } from '@/lib/db'
import type { EvaluatorRule } from '@/types/database'
import type { ApiResponse } from '@/types/api'

export const dynamic = 'force-dynamic'

/**
 * GET /api/evaluator/rules
 * Get all active evaluation rules
 */
export async function GET() {
  try {
    const rules = await queryMany<EvaluatorRule>(
      'SELECT * FROM evaluator_rules WHERE is_active = true ORDER BY priority DESC, name'
    )

    return NextResponse.json({ data: rules } as ApiResponse<EvaluatorRule[]>)
  } catch (error) {
    console.error('Error fetching evaluation rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch evaluation rules' } as ApiResponse,
      { status: 500 }
    )
  }
}
