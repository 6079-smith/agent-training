import type {
  PromptVersion,
  TestCase,
  TestResult,
  EvaluatorRule,
  KnowledgeBase,
} from './database'

// API Response types
export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
}

// Generator API
export interface GenerateRequest {
  systemPrompt: string
  userPrompt: string
  emailThread: string
}

export interface GenerateResponse {
  response: string
  model: string
  usage?: {
    input_tokens: number
    output_tokens: number
  }
}

// Evaluator API
export interface EvaluateRequest {
  emailThread: string
  agentResponse: string
  knowledgeBase?: KnowledgeBase[]
  expectedBehavior?: string
}

export interface EvaluateResponse {
  score: number
  reasoning: string
  ruleChecks: Record<string, RuleCheckResult>
}

export interface RuleCheckResult {
  passed: boolean
  reasoning: string
}

// Prompt API
export type PromptVersionResponse = PromptVersion
export type PromptVersionsResponse = PromptVersion[]

// Test Case API
export type TestCaseResponse = TestCase
export type TestCasesResponse = TestCase[]

// Knowledge Base API
export type KnowledgeBaseResponse = KnowledgeBase[]
