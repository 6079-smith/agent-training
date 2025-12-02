import { NextRequest, NextResponse } from 'next/server'
import { generateResponse } from '@/lib/services/anthropic'
import type { GenerateRequest, GenerateResponse, ApiResponse } from '@/types/api'

export const dynamic = 'force-dynamic'

/**
 * POST /api/generator/run
 * Generate an agent response using Claude
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json()

    // Validation
    if (!body.systemPrompt || !body.userPrompt || !body.emailThread) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: systemPrompt, userPrompt, emailThread',
        } as ApiResponse,
        { status: 400 }
      )
    }

    // Construct the full user message
    const userMessage = `${body.userPrompt}\n\nEmail Thread:\n${body.emailThread}`

    // Generate response using Claude
    const result = await generateResponse(body.systemPrompt, [
      {
        role: 'user',
        content: userMessage,
      },
    ])

    const response: GenerateResponse = {
      response: result.content,
      model: result.model,
      usage: result.usage,
    }

    return NextResponse.json({ data: response } as ApiResponse<GenerateResponse>)
  } catch (error) {
    console.error('Error generating response:', error)
    return NextResponse.json(
      {
        error: `Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      } as ApiResponse,
      { status: 500 }
    )
  }
}
