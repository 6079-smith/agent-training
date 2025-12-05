import { NextResponse } from 'next/server'
import { generatePromptFromTraining } from '@/lib/services/promptGenerator'
import type { ApiResponse } from '@/types/api'

export const dynamic = 'force-dynamic'

/**
 * POST /api/prompts/generate
 * Generate a system prompt from training wizard data
 */
export async function POST() {
  try {
    const prompt = await generatePromptFromTraining()

    return NextResponse.json({
      data: prompt
    } as ApiResponse)

  } catch (error) {
    console.error('Error generating prompt:', error)
    return NextResponse.json(
      { error: `Failed to generate prompt: ${error instanceof Error ? error.message : 'Unknown error'}` } as ApiResponse,
      { status: 500 }
    )
  }
}
