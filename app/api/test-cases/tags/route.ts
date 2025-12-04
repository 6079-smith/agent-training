import { NextResponse } from 'next/server'
import { queryMany } from '@/lib/db'
import type { ApiResponse } from '@/types/api'

export const dynamic = 'force-dynamic'

/**
 * GET /api/test-cases/tags
 * Get all unique tags from test cases
 */
export async function GET() {
  try {
    // Get all test cases with tags
    const testCases = await queryMany<{ tags: string[] }>(
      'SELECT tags FROM test_cases WHERE tags IS NOT NULL'
    )

    // Extract unique tags
    const allTags = new Set<string>()
    for (const tc of testCases) {
      if (tc.tags && Array.isArray(tc.tags)) {
        tc.tags.forEach(tag => allTags.add(tag))
      }
    }

    // Return sorted array
    const sortedTags = Array.from(allTags).sort()

    return NextResponse.json({ data: sortedTags } as ApiResponse<string[]>)
  } catch (error) {
    console.error('Error fetching tags:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tags' } as ApiResponse,
      { status: 500 }
    )
  }
}
