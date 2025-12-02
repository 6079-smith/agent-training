import Anthropic from '@anthropic-ai/sdk'

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AnthropicResponse {
  content: string
  model: string
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

/**
 * Generate a response using Claude
 */
export async function generateResponse(
  systemPrompt: string,
  messages: AnthropicMessage[]
): Promise<AnthropicResponse> {
  try {
    const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022'

    const response = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    })

    // Extract text content from the response
    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n')

    return {
      content,
      model: response.model,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    }
  } catch (error) {
    console.error('Anthropic API error:', error)
    throw new Error(
      `Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Evaluate a response using Claude
 */
export async function evaluateResponse(
  evaluationPrompt: string,
  context: string
): Promise<AnthropicResponse> {
  try {
    const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022'

    const response = await anthropic.messages.create({
      model,
      max_tokens: 2048,
      system: evaluationPrompt,
      messages: [
        {
          role: 'user',
          content: context,
        },
      ],
    })

    // Extract text content from the response
    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n')

    return {
      content,
      model: response.model,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    }
  } catch (error) {
    console.error('Anthropic API error:', error)
    throw new Error(
      `Failed to evaluate response: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
