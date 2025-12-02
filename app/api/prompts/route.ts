import { NextRequest, NextResponse } from 'next/server'
import { queryMany, queryOne } from '@/lib/db'
import type { PromptVersion } from '@/types/database'
import type { ApiResponse } from '@/types/api'

export const dynamic = 'force-dynamic'

/**
 * GET /api/prompts
 * List all prompt versions
 */
export async function GET() {
  try {
    const prompts = await queryMany<PromptVersion>(
      'SELECT * FROM prompt_versions ORDER BY created_at DESC'
    )
    return NextResponse.json({ data: prompts } as ApiResponse<PromptVersion[]>)
  } catch (error) {
    console.error('Error fetching prompts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prompts' } as ApiResponse,
      { status: 500 }
    )
  }
}

/**
 * POST /api/prompts
 * Create a new prompt version
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validation
    if (!body.name || !body.system_prompt || !body.user_prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: name, system_prompt, user_prompt' } as ApiResponse,
        { status: 400 }
      )
    }

    // If this is marked as active, deactivate all others first
    if (body.is_active) {
      await queryMany(
        'UPDATE prompt_versions SET is_active = false WHERE is_active = true'
      )
    }

    // Insert new prompt version
    const prompt = await queryOne<PromptVersion>(
      `INSERT INTO prompt_versions (name, system_prompt, user_prompt, is_active, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        body.name,
        body.system_prompt,
        body.user_prompt,
        body.is_active || false,
        body.notes || null,
      ]
    )

    return NextResponse.json(
      { data: prompt, message: 'Prompt version created successfully' } as ApiResponse<PromptVersion>,
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating prompt:', error)
    return NextResponse.json(
      { error: 'Failed to create prompt version' } as ApiResponse,
      { status: 500 }
    )
  }
}
