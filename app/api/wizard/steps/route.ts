import { NextResponse } from 'next/server'
import { queryMany } from '@/lib/db'
import type { ApiResponse } from '@/types/api'

export const dynamic = 'force-dynamic'

interface WizardStep {
  id: number
  title: string
  category: string
}

/**
 * GET /api/wizard/steps
 * Get all wizard steps for dropdown
 */
export async function GET() {
  try {
    const steps = await queryMany<WizardStep>(
      'SELECT id, title, category FROM wizard_steps ORDER BY sort_order'
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
