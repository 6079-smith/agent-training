import { NextRequest, NextResponse } from 'next/server'
import { queryOne, queryMany } from '@/lib/db'
import { generatePromptFromTraining } from '@/lib/services/promptGenerator'
import type { ApiResponse } from '@/types/api'

export const dynamic = 'force-dynamic'

interface ApplySuggestionRequest {
  type: 'add_to_existing'
  stepTitle: string
  stepCategory: string
  questionTitle: string
  questionValue: string
  promptVersionId?: number // Optional: also update this prompt
  skipRegenerate?: boolean // Skip prompt regeneration (for batch operations)
}

/**
 * POST /api/suggestions/apply
 * Apply a suggestion to the knowledge base
 */
export async function POST(request: NextRequest) {
  try {
    const body: ApplySuggestionRequest = await request.json()
    const { stepTitle, stepCategory, questionTitle, questionValue, promptVersionId, skipRegenerate } = body

    if (!stepCategory || !questionTitle || !questionValue) {
      return NextResponse.json(
        { error: 'Missing required fields' } as ApiResponse,
        { status: 400 }
      )
    }

    // Get max sort order for this category
    const maxOrderResult = await queryOne<{ max: number }>(
      'SELECT COALESCE(MAX(sort_order), 0) as max FROM knowledge_base WHERE category = $1',
      [stepCategory]
    )
    const newSortOrder = (maxOrderResult?.max || 0) + 1

    // Insert the new knowledge base entry
    const result = await queryOne(
      `INSERT INTO knowledge_base (category, key, value, display_title, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (category, key) DO UPDATE SET value = $3, display_title = $4
       RETURNING *`,
      [stepCategory, questionTitle, questionValue, questionTitle, newSortOrder]
    )

    console.log('=== ADD TO EXISTING STEP ===')
    console.log('stepTitle:', stepTitle, 'stepCategory:', stepCategory)

    // Regenerate prompt from updated training data and update the selected version
    // Skip if skipRegenerate is true (for batch operations)
    let promptUpdated = false
    
    if (promptVersionId && !skipRegenerate) {
      console.log('Regenerating prompt from updated training data...')
      try {
        // Generate new prompt from all training data (including the just-added entry)
        const generatedPrompt = await generatePromptFromTraining()
        
        // Update the existing prompt version
        await queryOne(
          `UPDATE prompt_versions 
           SET system_prompt = $1, user_prompt = $2
           WHERE id = $3`,
          [generatedPrompt.systemPrompt, generatedPrompt.userPrompt, promptVersionId]
        )
        
        promptUpdated = true
        console.log('Updated prompt version:', promptVersionId)
      } catch (e) {
        console.error('Failed to regenerate prompt:', e)
        // Continue anyway - knowledge base was updated
      }
    } else if (skipRegenerate) {
      console.log('Skipping prompt regeneration (batch mode)')
    }

    const baseMessage = `Added "${questionTitle}" to "${stepTitle}"`
    const message = promptUpdated 
      ? `${baseMessage}. Prompt updated!`
      : baseMessage

    return NextResponse.json({
      data: result,
      message,
      promptUpdated
    } as ApiResponse)
  } catch (error) {
    console.error('Error applying suggestion:', error)
    return NextResponse.json(
      { error: `Failed to apply suggestion: ${error instanceof Error ? error.message : 'Unknown error'}` } as ApiResponse,
      { status: 500 }
    )
  }
}
