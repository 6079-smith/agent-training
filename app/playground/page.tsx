'use client'

import { useEffect, useState } from 'react'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorAlert from '@/components/ErrorAlert'
import styles from '@/styles/components.module.css'
import layoutStyles from '@/styles/layout.module.css'
import btnStyles from '@/styles/buttons.module.css'
import formStyles from '@/styles/forms.module.css'
import * as Icons from 'lucide-react'
import type { PromptVersion, TestCase, KnowledgeBase } from '@/types/database'

interface WizardStep {
  id: number
  title: string
  category: string
}
import type { GenerateResponse, EvaluateResponse } from '@/types/api'

const STORAGE_KEY = 'playground_state'

interface Suggestion {
  id: string
  type: 'add_to_existing' | 'new_step'
  stepTitle: string
  stepCategory?: string
  questionTitle: string
  questionValue: string
  reasoning: string
  priority: 'high' | 'medium' | 'low'
  ruleViolated?: string
}

interface SuggestionsResponse {
  suggestions: Suggestion[]
  summary: string
}

interface PlaygroundState {
  selectedPromptId: number | null
  selectedTestCaseId: number | null
  emailThread: string
  generatedResponse: string
  evaluation: EvaluateResponse | null
}

export default function PlaygroundPage() {
  const [prompts, setPrompts] = useState<PromptVersion[]>([])
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [selectedPromptId, setSelectedPromptId] = useState<number | null>(null)
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<number | null>(null)
  const [emailThread, setEmailThread] = useState('')
  const [generatedResponse, setGeneratedResponse] = useState('')
  const [evaluation, setEvaluation] = useState<EvaluateResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stateRestored, setStateRestored] = useState(false)
  const [suggestions, setSuggestions] = useState<SuggestionsResponse | null>(null)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())
  const [generateProgress, setGenerateProgress] = useState(0)
  const [evaluateProgress, setEvaluateProgress] = useState(0)
  
  // Manual suggestion state
  const [wizardSteps, setWizardSteps] = useState<WizardStep[]>([])
  const [stepQuestions, setStepQuestions] = useState<KnowledgeBase[]>([])
  const [selectedStepCategory, setSelectedStepCategory] = useState('')
  const [selectedQuestionKey, setSelectedQuestionKey] = useState('')
  const [newQuestionTitle, setNewQuestionTitle] = useState('')
  const [manualContent, setManualContent] = useState('')
  const [appendMode, setAppendMode] = useState(true)
  const [applyingManual, setApplyingManual] = useState(false)
  
  // Track edits to auto-suggestions (step and question title overrides)
  const [suggestionEdits, setSuggestionEdits] = useState<Record<string, { stepCategory?: string; questionTitle?: string }>>({})
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (!stateRestored) return // Don't save until we've restored
    
    const state: PlaygroundState = {
      selectedPromptId,
      selectedTestCaseId,
      emailThread,
      generatedResponse,
      evaluation,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [selectedPromptId, selectedTestCaseId, emailThread, generatedResponse, evaluation, stateRestored])

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const [promptsRes, testCasesRes] = await Promise.all([
        fetch('/api/prompts'),
        fetch('/api/test-cases'),
      ])
      const promptsData = await promptsRes.json()
      const testCasesData = await testCasesRes.json()
      
      setPrompts(promptsData.data || [])
      setTestCases(testCasesData.data || [])
      
      // Try to restore saved state from localStorage
      const savedState = localStorage.getItem(STORAGE_KEY)
      if (savedState) {
        try {
          const state: PlaygroundState = JSON.parse(savedState)
          // Only restore if the prompt still exists
          const promptExists = (promptsData.data || []).some((p: PromptVersion) => p.id === state.selectedPromptId)
          if (promptExists && state.selectedPromptId) {
            setSelectedPromptId(state.selectedPromptId)
          }
          // Only restore test case if it still exists
          const testCaseExists = (testCasesData.data || []).some((tc: TestCase) => tc.id === state.selectedTestCaseId)
          if (testCaseExists && state.selectedTestCaseId) {
            setSelectedTestCaseId(state.selectedTestCaseId)
          }
          if (state.emailThread) setEmailThread(state.emailThread)
          if (state.generatedResponse) setGeneratedResponse(state.generatedResponse)
          if (state.evaluation) setEvaluation(state.evaluation)
        } catch {
          // Invalid saved state, ignore
        }
      } else {
        // No saved state - auto-select active prompt
        const activePrompt = (promptsData.data || []).find((p: PromptVersion) => p.is_active)
        if (activePrompt) {
          setSelectedPromptId(activePrompt.id)
        }
      }
    } catch (err) {
      setError('Failed to load data')
    } finally {
      setLoading(false)
      setStateRestored(true)
    }
  }

  function loadTestCase(id: number) {
    const testCase = testCases.find((tc) => tc.id === id)
    if (testCase) {
      setEmailThread(testCase.email_thread)
      setSelectedTestCaseId(id)
      // Clear previous results
      setGeneratedResponse('')
      setEvaluation(null)
    }
  }

  async function handleGenerate() {
    if (!selectedPromptId || !emailThread) {
      setError('Please select a prompt and enter an email thread')
      return
    }

    const prompt = prompts.find((p) => p.id === selectedPromptId)
    if (!prompt) return

    try {
      setGenerating(true)
      setGenerateProgress(0)
      setError(null)
      setSuggestions(null) // Clear old suggestions
      setAppliedIds(new Set()) // Clear applied state

      // Start progress animation
      const progressInterval = setInterval(() => {
        setGenerateProgress(prev => {
          if (prev >= 90) return prev
          return prev + Math.random() * 15
        })
      }, 500)

      const res = await fetch('/api/generator/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: prompt.system_prompt,
          userPrompt: prompt.user_prompt,
          emailThread,
        }),
      })

      clearInterval(progressInterval)
      setGenerateProgress(100)

      const data = await res.json()
      if (data.error) throw new Error(data.error)
      
      setGeneratedResponse(data.data.response)
      setEvaluation(null) // Clear previous evaluation
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate response')
    } finally {
      setGenerating(false)
      setTimeout(() => setGenerateProgress(0), 300)
    }
  }

  async function handleEvaluate() {
    if (!generatedResponse || !emailThread) {
      setError('Please generate a response first')
      return
    }

    try {
      setEvaluating(true)
      setEvaluateProgress(0)
      setError(null)
      setSuggestions(null) // Clear previous suggestions
      setAppliedIds(new Set()) // Clear applied state
      
      // Start progress animation
      const progressInterval = setInterval(() => {
        setEvaluateProgress(prev => {
          if (prev >= 90) return prev
          return prev + Math.random() * 12
        })
      }, 500)

      // Get expected behavior from selected test case if available
      const selectedTestCase = testCases.find(tc => tc.id === selectedTestCaseId)
      const expectedBehavior = selectedTestCase?.expected_behavior

      const res = await fetch('/api/evaluator/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailThread,
          agentResponse: generatedResponse,
          expectedBehavior,
        }),
      })

      clearInterval(progressInterval)
      setEvaluateProgress(100)

      const data = await res.json()
      if (data.error) throw new Error(data.error)
      
      setEvaluation(data.data)
      
      // Automatically fetch suggestions after evaluation
      fetchSuggestions(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to evaluate response')
    } finally {
      setEvaluating(false)
      setTimeout(() => setEvaluateProgress(0), 300)
    }
  }

  async function fetchSuggestions(evalData: EvaluateResponse) {
    try {
      setLoadingSuggestions(true)
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailThread,
          agentResponse: generatedResponse,
          evaluation: evalData,
        }),
      })

      const data = await res.json()
      if (data.error) {
        console.error('Failed to fetch suggestions:', data.error)
        return
      }
      
      setSuggestions(data.data)
    } catch (err) {
      console.error('Failed to fetch suggestions:', err)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  async function applySuggestion(suggestion: Suggestion) {
    try {
      setApplyingId(suggestion.id)
      console.log('Applying suggestion with promptVersionId:', selectedPromptId)
      
      // Get any user edits for this suggestion
      const edits = suggestionEdits[suggestion.id] || {}
      const stepCategory = edits.stepCategory || suggestion.stepCategory || suggestion.stepTitle.toLowerCase().replace(/\s+/g, '_')
      const stepTitle = edits.stepCategory 
        ? wizardSteps.find(s => s.category === edits.stepCategory)?.title || suggestion.stepTitle
        : suggestion.stepTitle
      const questionTitle = edits.questionTitle || suggestion.questionTitle
      
      const res = await fetch('/api/suggestions/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: suggestion.type,
          stepTitle,
          stepCategory,
          questionTitle,
          questionValue: suggestion.questionValue,
          promptVersionId: selectedPromptId, // Also update the current prompt
        }),
      })
      
      const data = await res.json()
      console.log('Apply response:', data)
      
      if (data.error) throw new Error(data.error)
      
      // Mark as applied
      setAppliedIds(prev => new Set([...prev, suggestion.id]))
      
      // If prompt was updated, refresh the prompts list and notify user
      if (data.promptUpdated) {
        const promptsRes = await fetch('/api/prompts')
        const promptsData = await promptsRes.json()
        if (promptsData.data) {
          setPrompts(promptsData.data)
        }
        // Don't clear the response - user may want to save the result first
        alert('✅ Improvement applied to your prompt!\n\nYou can Save Result now, then Generate Response again to test the improvement.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply suggestion')
    } finally {
      setApplyingId(null)
    }
  }

  function dismissSuggestion(suggestionId: string) {
    if (!suggestions) return
    setSuggestions({
      ...suggestions,
      suggestions: suggestions.suggestions.filter(s => s.id !== suggestionId)
    })
  }

  // Fetch wizard steps for manual suggestion dropdown
  async function fetchWizardSteps() {
    try {
      const res = await fetch('/api/wizard/steps')
      const data = await res.json()
      if (data.data) {
        setWizardSteps(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch wizard steps:', err)
    }
  }

  // Fetch questions for selected step
  async function fetchStepQuestions(category: string) {
    try {
      const res = await fetch(`/api/knowledge?category=${encodeURIComponent(category)}`)
      const data = await res.json()
      if (data.data) {
        setStepQuestions(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch step questions:', err)
    }
  }

  // Handle step selection change
  function handleStepChange(category: string) {
    setSelectedStepCategory(category)
    setSelectedQuestionKey('')
    setNewQuestionTitle('')
    setManualContent('')
    if (category) {
      fetchStepQuestions(category)
    } else {
      setStepQuestions([])
    }
  }

  // Handle question selection change
  function handleQuestionChange(key: string) {
    setSelectedQuestionKey(key)
    if (key === '__new__') {
      setNewQuestionTitle('')
      setManualContent('')
      setAppendMode(true)
    } else if (key) {
      const question = stepQuestions.find(q => q.key === key)
      if (question) {
        // Show existing content as reference
        setManualContent('')
        setAppendMode(true)
      }
    }
  }

  async function applyManualSuggestion() {
    if (!selectedStepCategory) {
      setError('Please select a step')
      return
    }
    if (!selectedQuestionKey) {
      setError('Please select a question or create a new one')
      return
    }
    if (selectedQuestionKey === '__new__' && !newQuestionTitle.trim()) {
      setError('Please enter a title for the new question')
      return
    }
    if (!manualContent.trim()) {
      setError('Please enter the improvement content')
      return
    }

    try {
      setApplyingManual(true)
      setError(null)
      
      const selectedStep = wizardSteps.find(s => s.category === selectedStepCategory)
      const questionKey = selectedQuestionKey === '__new__' 
        ? newQuestionTitle.toLowerCase().replace(/\s+/g, '_')
        : selectedQuestionKey
      
      // If appending to existing, get current value and append
      let finalValue = manualContent
      if (selectedQuestionKey !== '__new__' && appendMode) {
        const existingQuestion = stepQuestions.find(q => q.key === selectedQuestionKey)
        if (existingQuestion) {
          finalValue = existingQuestion.value + '\n\n' + manualContent
        }
      }
      
      const res = await fetch('/api/suggestions/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'add_to_existing',
          stepTitle: selectedStep?.title || selectedStepCategory,
          stepCategory: selectedStepCategory,
          questionTitle: questionKey,
          questionValue: finalValue,
          promptVersionId: selectedPromptId,
        }),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // Clear the form
      setSelectedQuestionKey('')
      setNewQuestionTitle('')
      setManualContent('')
      
      // Refresh questions for this step
      fetchStepQuestions(selectedStepCategory)

      // Notify user
      if (data.promptUpdated) {
        const promptsRes = await fetch('/api/prompts')
        const promptsData = await promptsRes.json()
        if (promptsData.data) {
          setPrompts(promptsData.data)
        }
        alert('✅ Manual improvement applied to your prompt!\n\nYou can Save Result now, then Generate Response again to test the improvement.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply manual suggestion')
    } finally {
      setApplyingManual(false)
    }
  }

  async function handleSaveResult() {
    if (!selectedTestCaseId || !generatedResponse) {
      setError('Please select a test case and generate a response')
      return
    }

    try {
      setError(null)
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_case_id: selectedTestCaseId,
          prompt_version_id: selectedPromptId,
          agent_response: generatedResponse,
          evaluator_score: evaluation?.score || null,
          evaluator_reasoning: evaluation?.reasoning || null,
          rule_checks: evaluation?.ruleChecks || null,
        }),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)
      
      alert('Result saved successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save result')
    }
  }

  if (loading) {
    return (
      <div className={layoutStyles.pageContainer}>
        <LoadingSpinner size="large" message="Loading playground..." />
      </div>
    )
  }

  return (
    <div className={layoutStyles.pageContainer}>
      <div className={layoutStyles.pageHeader}>
        <h1>Playground</h1>
        <p className={styles.subtitle}>Test prompts and evaluate responses in real-time</p>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      <div className={styles.playgroundControls}>
        <div className={styles.controlGroup}>
          <h3 className={formStyles.sectionLabel}>Prompt Version</h3>
          <select
            className={formStyles.select}
            value={selectedPromptId || ''}
            onChange={(e) => setSelectedPromptId(Number(e.target.value))}
          >
            <option value="">-- Select a prompt version --</option>
            {prompts.map((prompt) => (
              <option key={prompt.id} value={prompt.id}>
                {prompt.name} {prompt.is_active ? '(Active)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.controlGroup}>
          <h3 className={formStyles.sectionLabel}>Test Case</h3>
          <select
            className={formStyles.select}
            value={selectedTestCaseId || ''}
            onChange={(e) => loadTestCase(Number(e.target.value))}
          >
            <option value="">-- Load a saved test case --</option>
            {testCases.map((tc) => (
              <option key={tc.id} value={tc.id}>
                {tc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.playgroundGrid}>
        {/* Left Panel: Email Thread Input */}
        <div className={styles.playgroundPanel}>
          <div className={styles.panelHeader}>
            <h3>Email Thread</h3>
          </div>
          <textarea
            className={styles.playgroundTextarea}
            value={emailThread}
            onChange={(e) => setEmailThread(e.target.value)}
            placeholder="Paste the customer email thread here..."
          />
          <div className={styles.panelFooter}>
            <button
              onClick={handleGenerate}
              className={`${btnStyles.primary} ${generating ? btnStyles.generating : ''}`}
              disabled={!selectedPromptId || !emailThread || generating}
              style={{ 
                width: 'auto', 
                minWidth: '180px', 
                maxWidth: 'fit-content',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {generating && (
                <span 
                  className={btnStyles.progressBar}
                  style={{ width: `${generateProgress}%` }}
                />
              )}
              <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {generating ? (
                  <>
                    <Icons.Loader2 size={18} className="animate-spin" />
                    Generating... {Math.round(generateProgress)}%
                  </>
                ) : (
                  <>
                    <Icons.Sparkles size={18} />
                    Generate Response
                  </>
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Middle Panel: Generated Response */}
        <div className={styles.playgroundPanel}>
          <div className={styles.panelHeader}>
            <h3>Generated Response</h3>
            {generatedResponse && (
              <button
                onClick={() => navigator.clipboard.writeText(generatedResponse)}
                className={btnStyles.iconButton}
                title="Copy to clipboard"
              >
                <Icons.Copy size={16} />
              </button>
            )}
          </div>
          <div className={styles.playgroundTextarea}>
            {generatedResponse ? (
              <div className={styles.formattedResponse}>
                {generatedResponse}
              </div>
            ) : (
              <div className={styles.emptyPanel}>
                <Icons.MessageSquare size={32} />
                <p>Generated response will appear here</p>
              </div>
            )}
          </div>
          <div className={styles.panelFooter}>
            <button
              onClick={handleEvaluate}
              className={`${btnStyles.primary} ${evaluating ? btnStyles.generating : ''}`}
              disabled={!generatedResponse || evaluating}
              style={{ 
                width: 'auto', 
                minWidth: '160px', 
                maxWidth: 'fit-content',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {evaluating && (
                <span 
                  className={btnStyles.progressBar}
                  style={{ width: `${evaluateProgress}%` }}
                />
              )}
              <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {evaluating ? (
                  <>
                    <Icons.Loader2 size={18} className="animate-spin" />
                    Evaluating... {Math.round(evaluateProgress)}%
                  </>
                ) : (
                  <>
                    <Icons.CheckCircle size={18} />
                    Evaluate
                  </>
                )}
              </span>
            </button>
            {selectedTestCaseId && generatedResponse && (
              <button 
                onClick={handleSaveResult} 
                className={btnStyles.success}
                style={{ width: 'auto', minWidth: '140px', maxWidth: 'fit-content' }}
              >
                <Icons.Save size={18} />
                Save Result
              </button>
            )}
          </div>
        </div>

        {/* Right Panel: Evaluation Results */}
        <div className={styles.playgroundPanel}>
          <div className={styles.panelHeader}>
            <h3>Evaluation</h3>
          </div>
          <div className={styles.playgroundTextarea}>
            {evaluation ? (
              <div className={styles.evaluationResults}>
                <div className={styles.scoreDisplay}>
                  <div className={styles.scoreCircle}>
                    <span className={styles.scoreValue}>{evaluation.score}</span>
                    <span className={styles.scoreLabel}>/ 100</span>
                  </div>
                </div>

                <div className={styles.evaluationSection}>
                  <h4>Overall Assessment</h4>
                  <div className={styles.formattedResponse}>
                    {evaluation.reasoning}
                  </div>
                </div>

                <div className={styles.evaluationSection}>
                  <h4>Rule Checks</h4>
                  <div className={styles.ruleChecksList}>
                    {Object.entries(evaluation.ruleChecks).map(([ruleName, check]) => (
                      <div key={ruleName} className={styles.ruleCheck}>
                        <div className={styles.ruleCheckHeader}>
                          {check.passed ? (
                            <Icons.CheckCircle size={16} className={styles.iconSuccess} />
                          ) : (
                            <Icons.XCircle size={16} className={styles.iconDanger} />
                          )}
                          <strong>{ruleName}</strong>
                        </div>
                        <p className={styles.ruleCheckReasoning}>{check.reasoning}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.emptyPanel}>
                <Icons.BarChart3 size={32} />
                <p>Evaluation results will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Improvement Suggestions Panel */}
      {(loadingSuggestions || (suggestions && suggestions.suggestions.length > 0)) && (
        <div className={styles.suggestionsPanel}>
          <div className={styles.suggestionsPanelHeader}>
            <div className={styles.suggestionsTitleRow}>
              <Icons.Lightbulb size={20} className={styles.iconWarning} />
              <h3 className={formStyles.sectionLabel}>Improvement Suggestions</h3>
            </div>
            {suggestions && (
              <p className={styles.suggestionsSummary}>{suggestions.summary}</p>
            )}
          </div>

          {loadingSuggestions ? (
            <div className={styles.suggestionsLoading}>
              <Icons.Loader2 size={24} className="animate-spin" />
              <p>Analyzing evaluation results...</p>
            </div>
          ) : (
            <div className={styles.suggestionsList}>
              {suggestions?.suggestions.map((suggestion) => {
                const isApplied = appliedIds.has(suggestion.id)
                const isApplying = applyingId === suggestion.id
                
                return (
                  <div 
                    key={suggestion.id} 
                    className={`${styles.suggestionCard} ${isApplied ? styles.suggestionApplied : ''}`}
                  >
                    <div className={styles.suggestionHeader}>
                      <div className={styles.suggestionMeta}>
                        <span className={styles.suggestionMetaLabel}>Severity:</span>
                        <span className={`${styles.suggestionPriority} ${styles[`priority${suggestion.priority.charAt(0).toUpperCase() + suggestion.priority.slice(1)}`]}`}>
                          {suggestion.priority}
                        </span>
                        {suggestion.ruleViolated && (
                          <>
                            <span className={styles.suggestionMetaLabel}>Rule Violated:</span>
                            <span className={styles.suggestionRule}>
                              <Icons.AlertTriangle size={14} />
                              {suggestion.ruleViolated}
                            </span>
                          </>
                        )}
                      </div>
                      {!isApplied && (
                        <div className={styles.suggestionActions}>
                          <button
                            onClick={() => applySuggestion(suggestion)}
                            className={btnStyles.success}
                            disabled={isApplying}
                          >
                            {isApplying ? (
                              <>
                                <Icons.Loader2 size={14} className="animate-spin" />
                                Applying...
                              </>
                            ) : (
                              <>
                                <Icons.Check size={14} />
                                Apply
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => dismissSuggestion(suggestion.id)}
                            className={btnStyles.ghost}
                            title="Dismiss"
                          >
                            <Icons.X size={14} />
                          </button>
                        </div>
                      )}
                      {isApplied && (
                        <span className={styles.suggestionAppliedBadge}>
                          <Icons.CheckCircle size={14} />
                          Applied
                        </span>
                      )}
                    </div>
                    
                    <div className={styles.suggestionContent}>
                      <div className={styles.suggestionTarget}>
                        <strong>Step:</strong>{' '}
                        {isApplied ? (
                          suggestionEdits[suggestion.id]?.stepCategory 
                            ? wizardSteps.find(s => s.category === suggestionEdits[suggestion.id]?.stepCategory)?.title 
                            : suggestion.stepTitle
                        ) : (
                          <select
                            value={suggestionEdits[suggestion.id]?.stepCategory || suggestion.stepCategory || ''}
                            onChange={(e) => {
                              setSuggestionEdits(prev => ({
                                ...prev,
                                [suggestion.id]: { ...prev[suggestion.id], stepCategory: e.target.value }
                              }))
                            }}
                            onFocus={() => wizardSteps.length === 0 && fetchWizardSteps()}
                            className={styles.suggestionStepSelect}
                          >
                            <option value={suggestion.stepCategory || suggestion.stepTitle.toLowerCase().replace(/\s+/g, '_')}>
                              {suggestion.stepTitle}
                            </option>
                            {wizardSteps
                              .filter(s => s.category !== (suggestion.stepCategory || suggestion.stepTitle.toLowerCase().replace(/\s+/g, '_')))
                              .map(step => (
                                <option key={step.category} value={step.category}>
                                  {step.title}
                                </option>
                              ))}
                          </select>
                        )}
                      </div>
                      <div className={styles.suggestionEntry}>
                        <div className={styles.suggestionEntryTitle}>
                          {editingQuestionId === suggestion.id && !isApplied ? (
                            <input
                              type="text"
                              value={suggestionEdits[suggestion.id]?.questionTitle ?? suggestion.questionTitle}
                              onChange={(e) => {
                                setSuggestionEdits(prev => ({
                                  ...prev,
                                  [suggestion.id]: { ...prev[suggestion.id], questionTitle: e.target.value }
                                }))
                              }}
                              onBlur={() => setEditingQuestionId(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === 'Escape') {
                                  setEditingQuestionId(null)
                                }
                              }}
                              className={styles.suggestionQuestionInput}
                              autoFocus
                            />
                          ) : (
                            <strong 
                              className={!isApplied ? styles.suggestionQuestionEditable : ''}
                              onClick={() => !isApplied && setEditingQuestionId(suggestion.id)}
                              title={!isApplied ? 'Click to edit' : ''}
                            >
                              {suggestionEdits[suggestion.id]?.questionTitle || suggestion.questionTitle}
                            </strong>
                          )}
                        </div>
                        <div className={styles.suggestionEntryValue}>
                          {suggestion.questionValue}
                        </div>
                      </div>
                      <div className={styles.suggestionReasoning}>
                        <Icons.Info size={14} />
                        {suggestion.reasoning}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Manual Suggestion Input */}
          {evaluation && (
            <div className={styles.manualSuggestionSection}>
              <h4 className={styles.manualSuggestionTitle}>
                <Icons.PenLine size={16} />
                Add Manual Improvement
              </h4>
              <div className={styles.manualSuggestionForm}>
                {/* Step Dropdown */}
                <div className={styles.manualFormRow}>
                  <label className={styles.manualLabel}>Step:</label>
                  <select
                    value={selectedStepCategory}
                    onChange={(e) => handleStepChange(e.target.value)}
                    className={styles.manualSelect}
                    onFocus={() => wizardSteps.length === 0 && fetchWizardSteps()}
                  >
                    <option value="">Select a step...</option>
                    {wizardSteps.map(step => (
                      <option key={step.category} value={step.category}>
                        {step.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Question Dropdown - always visible */}
                <div className={styles.manualFormRow}>
                  <label className={styles.manualLabel}>Question:</label>
                  <select
                    value={selectedQuestionKey}
                    onChange={(e) => handleQuestionChange(e.target.value)}
                    className={styles.manualSelect}
                    disabled={!selectedStepCategory}
                  >
                    <option value="">{selectedStepCategory ? 'Select or create...' : 'Select a step first...'}</option>
                    {selectedStepCategory && <option value="__new__">➕ Create new question</option>}
                    {stepQuestions.map(q => (
                      <option key={q.key} value={q.key}>
                        {q.display_title || q.key}
                      </option>
                    ))}
                  </select>
                </div>

                {/* New Question Title - only when creating new */}
                {selectedQuestionKey === '__new__' && (
                  <div className={styles.manualFormRow}>
                    <label className={styles.manualLabel}>New Question Title:</label>
                    <input
                      type="text"
                      placeholder="e.g., 'refund_timeline_rules'"
                      value={newQuestionTitle}
                      onChange={(e) => setNewQuestionTitle(e.target.value)}
                      className={styles.manualStepInput}
                    />
                  </div>
                )}

                {/* Show existing content preview - only when editing existing */}
                {selectedQuestionKey && selectedQuestionKey !== '__new__' && (
                  <div className={styles.existingContentPreview}>
                    <label className={styles.manualLabel}>Current Content:</label>
                    <div className={styles.existingContentBox}>
                      {stepQuestions.find(q => q.key === selectedQuestionKey)?.value || 'No content'}
                    </div>
                  </div>
                )}

                {/* Mode Toggle - only when editing existing */}
                {selectedQuestionKey && selectedQuestionKey !== '__new__' && (
                  <div className={styles.modeToggle}>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        checked={appendMode}
                        onChange={() => setAppendMode(true)}
                      />
                      Append to existing content
                    </label>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        checked={!appendMode}
                        onChange={() => setAppendMode(false)}
                      />
                      Replace existing content
                    </label>
                  </div>
                )}

                {/* Content Input - always visible */}
                <div className={styles.manualFormRow}>
                  <label className={styles.manualLabel}>
                    {selectedQuestionKey === '__new__' ? 'Content:' : (selectedQuestionKey && !appendMode ? 'New Content:' : 'Improvement:')}
                  </label>
                  <textarea
                    placeholder="Enter your improvement..."
                    value={manualContent}
                    onChange={(e) => setManualContent(e.target.value)}
                    className={styles.manualSuggestionInput}
                    rows={3}
                    disabled={!selectedStepCategory}
                  />
                </div>

                {/* Apply Button - always visible */}
                <button
                  onClick={applyManualSuggestion}
                  className={btnStyles.success}
                  disabled={applyingManual || !selectedStepCategory || !selectedQuestionKey || !manualContent.trim() || (selectedQuestionKey === '__new__' && !newQuestionTitle.trim())}
                >
                  {applyingManual ? (
                    <>
                      <Icons.Loader2 size={14} className="animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Icons.Check size={14} />
                      Apply Manual Improvement
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
