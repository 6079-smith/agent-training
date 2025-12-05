import { queryMany, queryOne } from '@/lib/db'
import { generateResponse } from '@/lib/services/anthropic'
import type { KnowledgeBase } from '@/types/database'

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

export interface GeneratedPrompt {
  systemPrompt: string
  userPrompt: string
  name: string
  notes: string
}

/**
 * Generate a system prompt from Training Wizard data
 */
export async function generatePromptFromTraining(): Promise<GeneratedPrompt> {
  // Fetch all knowledge base entries
  const knowledge = await queryMany<KnowledgeBase>(
    'SELECT * FROM knowledge_base ORDER BY category, sort_order'
  )

  if (knowledge.length === 0) {
    throw new Error('No training data found. Please complete the Training Wizard first.')
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

  return {
    systemPrompt: result.content,
    userPrompt: USER_PROMPT_TEMPLATE,
    name: `Generated Prompt - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
    notes: 'Auto-generated from Training Wizard data'
  }
}

/**
 * Create a new prompt version in the database
 */
export async function createPromptVersion(prompt: GeneratedPrompt): Promise<{ id: number }> {
  const result = await queryOne<{ id: number }>(
    `INSERT INTO prompt_versions (name, system_prompt, user_prompt, notes)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [prompt.name, prompt.systemPrompt, prompt.userPrompt, prompt.notes]
  )
  
  if (!result) {
    throw new Error('Failed to create prompt version')
  }
  
  return result
}
