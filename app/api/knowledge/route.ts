import { NextRequest, NextResponse } from 'next/server'
import { queryMany, queryOne } from '@/lib/db'
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

    query += ' ORDER BY category, key'

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
 * Create a new knowledge base entry
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validation
    if (!body.category || !body.key || !body.value) {
      return NextResponse.json(
        { error: 'Missing required fields: category, key, value' } as ApiResponse,
        { status: 400 }
      )
    }

    // Insert new knowledge entry (will fail if category+key already exists due to UNIQUE constraint)
    const knowledge = await queryOne<KnowledgeBase>(
      `INSERT INTO knowledge_base (category, key, value)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [body.category, body.key, body.value]
    )

    return NextResponse.json(
      { data: knowledge, message: 'Knowledge entry created successfully' } as ApiResponse<KnowledgeBase>,
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating knowledge entry:', error)
    
    // Check for unique constraint violation
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Knowledge entry with this category and key already exists' } as ApiResponse,
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create knowledge entry' } as ApiResponse,
      { status: 500 }
    )
  }
}
