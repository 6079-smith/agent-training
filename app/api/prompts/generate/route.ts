import { NextResponse } from 'next/server'
import { queryMany } from '@/lib/db'
import { generateResponse } from '@/lib/services/anthropic'
import type { KnowledgeBase } from '@/types/database'
import type { ApiResponse } from '@/types/api'

export const dynamic = 'force-dynamic'

const PROMPT_GENERATION_SYSTEM = `You are an expert at creating system prompts for customer service AI agents.

Your task is to generate a comprehensive system prompt based on the training data provided. The system prompt should:

1. Define the agent's role and identity clearly
2. Include all relevant business information (company, products, shipping)
3. Incorporate policies (refunds, returns, shipping)
4. Define capabilities and limitations
5. Set the appropriate tone and communication style
6. Include sign-off guidelines
7. List things the agent must never say or do

Output ONLY the system prompt text, no explanations or markdown formatting. The prompt should be ready to use directly.`

const USER_PROMPT_TEMPLATE = `Please analyze this customer service email and provide an appropriate response.

EMAIL THREAD:
{file.thread}

CUSTOMER INFO:
- Name: {file.customerName}
- Email: {file.customerEmail}
- Subject: {file.subject}
- Order Number: {file.orderNumber}

Provide a professional, empathetic response that addresses the customer's concerns.`

/**
 * POST /api/prompts/generate
 * Generate a system prompt from training wizard data
 */
export async function POST() {
  try {
    // Fetch all knowledge base entries
    const knowledge = await queryMany<KnowledgeBase>(
      'SELECT * FROM knowledge_base ORDER BY category, sort_order'
    )

    if (knowledge.length === 0) {
      return NextResponse.json(
        { error: 'No training data found. Please complete the Training Wizard first.' } as ApiResponse,
        { status: 400 }
      )
    }

    // Organize knowledge by category
    const knowledgeByCategory: Record<string, { title: string; value: string }[]> = {}
    for (const item of knowledge) {
      if (!knowledgeByCategory[item.category]) {
        knowledgeByCategory[item.category] = []
      }
      if (item.value && item.value.trim()) {
        knowledgeByCategory[item.category].push({
          title: item.display_title || item.key,
          value: item.value
        })
      }
    }

    // Format training data for the prompt
    let trainingDataText = 'TRAINING DATA:\n\n'
    for (const [category, items] of Object.entries(knowledgeByCategory)) {
      if (items.length > 0) {
        trainingDataText += `## ${category.toUpperCase()}\n`
        for (const item of items) {
          trainingDataText += `### ${item.title}\n${item.value}\n\n`
        }
      }
    }

    // Generate the system prompt using Claude
    const result = await generateResponse(PROMPT_GENERATION_SYSTEM, [
      {
        role: 'user',
        content: `Based on the following training data, generate a comprehensive system prompt for a customer service AI agent:\n\n${trainingDataText}`
      }
    ])

    // Return the generated prompt
    return NextResponse.json({
      data: {
        systemPrompt: result.content,
        userPrompt: USER_PROMPT_TEMPLATE,
        name: `Generated Prompt - ${new Date().toLocaleDateString()}`,
        notes: 'Auto-generated from Training Wizard data'
      }
    } as ApiResponse)

  } catch (error) {
    console.error('Error generating prompt:', error)
    return NextResponse.json(
      { error: `Failed to generate prompt: ${error instanceof Error ? error.message : 'Unknown error'}` } as ApiResponse,
      { status: 500 }
    )
  }
}
