import { NextRequest, NextResponse } from 'next/server'
import { evaluateAgentResponse } from '@/lib/services/evaluator'
import type { EvaluateRequest, EvaluateResponse, ApiResponse } from '@/types/api'

export const dynamic = 'force-dynamic'

/**
 * POST /api/evaluator/evaluate
 * Evaluate an agent response using AI and business rules
 */
export async function POST(request: NextRequest) {
  try {
    const body: EvaluateRequest = await request.json()

    // Validation
    if (!body.emailThread || !body.agentResponse) {
      return NextResponse.json(
        {
          error: 'Missing required fields: emailThread, agentResponse',
        } as ApiResponse,
        { status: 400 }
      )
    }

    // Evaluate the response
    const evaluation = await evaluateAgentResponse(
      body.emailThread,
      body.agentResponse,
      body.knowledgeBase,
      body.expectedBehavior
    )

    return NextResponse.json({ data: evaluation } as ApiResponse<EvaluateResponse>)
  } catch (error) {
    console.error('Error evaluating response:', error)
    return NextResponse.json(
      {
        error: `Failed to evaluate response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      } as ApiResponse,
      { status: 500 }
    )
  }
}
