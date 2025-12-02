export interface KnowledgeBase {
  id: number
  category: string
  key: string
  value: string
  created_at: Date
  updated_at: Date
}

export interface PromptVersion {
  id: number
  name: string
  system_prompt: string
  user_prompt: string
  is_active: boolean
  created_at: Date
  notes: string | null
}

export interface TestCase {
  id: number
  name: string
  email_thread: string
  customer_email: string | null
  customer_name: string | null
  subject: string | null
  order_number: string | null
  expected_behavior: string | null
  tags: string[] | null
  created_at: Date
}

export interface TestResult {
  id: number
  test_case_id: number
  prompt_version_id: number
  agent_response: string
  evaluator_score: number
  evaluator_reasoning: string | null
  rule_checks: Record<string, any> | null
  created_at: Date
}

export interface EvaluatorRule {
  id: number
  name: string
  description: string | null
  check_prompt: string
  is_active: boolean
  priority: number
  created_at: Date
}

export interface WizardProgress {
  id: number
  current_step: number
  completed: boolean
  created_at: Date
  updated_at: Date
}
