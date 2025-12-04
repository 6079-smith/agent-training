import { NextRequest, NextResponse } from 'next/server'
import { queryMany, queryOne, execute } from '@/lib/db'
import type { KnowledgeBase } from '@/types/database'
import type { ApiResponse } from '@/types/api'

export const dynamic = 'force-dynamic'

/**
 * GET /api/knowledge
 * List all knowledge base entries, optionally filtered by category
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    let query = 'SELECT * FROM knowledge_base'
    const params: any[] = []

    if (category) {
      query += ' WHERE category = $1'
      params.push(category)
    }

    query += ' ORDER BY category, sort_order, id'

    const knowledge = await queryMany<KnowledgeBase>(query, params)
    return NextResponse.json({ data: knowledge } as ApiResponse<KnowledgeBase[]>)
  } catch (error) {
    console.error('Error fetching knowledge base:', error)
    return NextResponse.json(
      { error: 'Failed to fetch knowledge base' } as ApiResponse,
      { status: 500 }
    )
  }
}

/**
 * POST /api/knowledge
 * Create or update a knowledge base entry (upsert)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validation - value can be empty for new questions
    if (!body.category || !body.key) {
      return NextResponse.json(
        { error: 'Missing required fields: category, key' } as ApiResponse,
        { status: 400 }
      )
    }

    const value = body.value || ''
    const displayTitle = body.display_title || body.key.replace(/_/g, ' ')
    const sortOrder = body.sort_order ?? 0

    // Upsert: insert or update if exists
    const knowledge = await queryOne<KnowledgeBase>(
      `INSERT INTO knowledge_base (category, key, value, display_title, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (category, key) 
       DO UPDATE SET 
         value = EXCLUDED.value, 
         display_title = COALESCE(EXCLUDED.display_title, knowledge_base.display_title),
         sort_order = EXCLUDED.sort_order,
         updated_at = NOW()
       RETURNING *`,
      [body.category, body.key, value, displayTitle, sortOrder]
    )

    return NextResponse.json(
      { data: knowledge, message: 'Knowledge entry saved successfully' } as ApiResponse<KnowledgeBase>,
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error saving knowledge entry:', error)

    return NextResponse.json(
      { error: 'Failed to save knowledge entry' } as ApiResponse,
      { status: 500 }
    )
  }
}

/**
 * PUT /api/knowledge
 * Update display_title or reorder entries
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

    // Build dynamic update query
    const updates: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (body.display_title !== undefined) {
      updates.push(`display_title = $${paramIndex++}`)
      params.push(body.display_title)
    }
    if (body.sort_order !== undefined) {
      updates.push(`sort_order = $${paramIndex++}`)
      params.push(body.sort_order)
    }
    if (body.value !== undefined) {
      updates.push(`value = $${paramIndex++}`)
      params.push(body.value)
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' } as ApiResponse,
        { status: 400 }
      )
    }

    updates.push('updated_at = NOW()')
    params.push(body.id)

    const knowledge = await queryOne<KnowledgeBase>(
      `UPDATE knowledge_base SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    )

    return NextResponse.json(
      { data: knowledge, message: 'Knowledge entry updated successfully' } as ApiResponse<KnowledgeBase>,
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error updating knowledge entry:', error)

    return NextResponse.json(
      { error: 'Failed to update knowledge entry' } as ApiResponse,
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/knowledge
 * Delete a knowledge base entry by id
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

    await execute('DELETE FROM knowledge_base WHERE id = $1', [id])

    return NextResponse.json(
      { message: 'Knowledge entry deleted successfully' } as ApiResponse,
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error deleting knowledge entry:', error)

    return NextResponse.json(
      { error: 'Failed to delete knowledge entry' } as ApiResponse,
      { status: 500 }
    )
  }
}
