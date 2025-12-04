import { NextRequest, NextResponse } from 'next/server'
import { queryMany, queryOne, execute } from '@/lib/db'
import type { ApiResponse } from '@/types/api'

export const dynamic = 'force-dynamic'

interface WizardStep {
  id: number
  title: string
  category: string
  sort_order: number
  created_at: Date
  updated_at: Date
}

/**
 * GET /api/wizard-steps
 * List all wizard steps ordered by sort_order
 */
export async function GET() {
  try {
    const steps = await queryMany<WizardStep>(
      'SELECT * FROM wizard_steps ORDER BY sort_order, id'
    )
    return NextResponse.json({ data: steps } as ApiResponse<WizardStep[]>)
  } catch (error) {
    console.error('Error fetching wizard steps:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wizard steps' } as ApiResponse,
      { status: 500 }
    )
  }
}

/**
 * POST /api/wizard-steps
 * Create a new wizard step
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.title) {
      return NextResponse.json(
        { error: 'Missing required field: title' } as ApiResponse,
        { status: 400 }
      )
    }

    // Auto-generate category from title
    const category = body.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')

    // Get max sort_order
    const maxResult = await queryOne<{ max: number }>(
      'SELECT COALESCE(MAX(sort_order), -1) as max FROM wizard_steps'
    )
    const sortOrder = (maxResult?.max ?? -1) + 1

    const step = await queryOne<WizardStep>(
      `INSERT INTO wizard_steps (title, category, sort_order)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [body.title, category, sortOrder]
    )

    return NextResponse.json(
      { data: step, message: 'Step created successfully' } as ApiResponse<WizardStep>,
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating wizard step:', error)

    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A step with this name already exists' } as ApiResponse,
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create wizard step' } as ApiResponse,
      { status: 500 }
    )
  }
}

/**
 * PUT /api/wizard-steps
 * Update a wizard step (title or sort_order)
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

    const updates: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (body.title !== undefined) {
      updates.push(`title = $${paramIndex++}`)
      params.push(body.title)
      
      // Also update category when title changes
      const newCategory = body.title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
      updates.push(`category = $${paramIndex++}`)
      params.push(newCategory)
    }

    if (body.sort_order !== undefined) {
      updates.push(`sort_order = $${paramIndex++}`)
      params.push(body.sort_order)
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' } as ApiResponse,
        { status: 400 }
      )
    }

    updates.push('updated_at = NOW()')
    params.push(body.id)

    const step = await queryOne<WizardStep>(
      `UPDATE wizard_steps SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    )

    return NextResponse.json(
      { data: step, message: 'Step updated successfully' } as ApiResponse<WizardStep>,
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error updating wizard step:', error)

    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A step with this name already exists' } as ApiResponse,
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update wizard step' } as ApiResponse,
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/wizard-steps
 * Delete a wizard step (only if no questions exist)
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

    // Get the step to find its category
    const step = await queryOne<WizardStep>(
      'SELECT * FROM wizard_steps WHERE id = $1',
      [id]
    )

    if (!step) {
      return NextResponse.json(
        { error: 'Step not found' } as ApiResponse,
        { status: 404 }
      )
    }

    // Check if any questions exist for this category
    const questionCount = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM knowledge_base WHERE category = $1',
      [step.category]
    )

    if (questionCount && parseInt(questionCount.count) > 0) {
      return NextResponse.json(
        { error: `Cannot delete step: ${questionCount.count} question(s) exist. Remove all questions first.` } as ApiResponse,
        { status: 400 }
      )
    }

    await execute('DELETE FROM wizard_steps WHERE id = $1', [id])

    return NextResponse.json(
      { message: 'Step deleted successfully' } as ApiResponse,
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting wizard step:', error)
    return NextResponse.json(
      { error: 'Failed to delete wizard step' } as ApiResponse,
      { status: 500 }
    )
  }
}
