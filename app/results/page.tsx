'use client'

import { useEffect, useState } from 'react'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorAlert from '@/components/ErrorAlert'
import styles from '@/styles/components.module.css'
import layoutStyles from '@/styles/layout.module.css'
import formStyles from '@/styles/forms.module.css'
import * as Icons from 'lucide-react'
import type { TestResult, PromptVersion, TestCase } from '@/types/database'

interface ResultWithNames extends TestResult {
  test_case_name?: string
  prompt_version_name?: string
}

export default function ResultsPage() {
  const [results, setResults] = useState<ResultWithNames[]>([])
  const [prompts, setPrompts] = useState<PromptVersion[]>([])
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPromptId, setSelectedPromptId] = useState<string>('')
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string>('')

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    fetchResults()
  }, [selectedPromptId, selectedTestCaseId])

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
    } catch (err) {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function fetchResults() {
    try {
      setError(null)
      const params = new URLSearchParams()
      if (selectedPromptId) params.append('prompt_version_id', selectedPromptId)
      if (selectedTestCaseId) params.append('test_case_id', selectedTestCaseId)
      
      const url = `/api/results${params.toString() ? `?${params.toString()}` : ''}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResults(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load results')
    }
  }

  function getScoreColor(score: number | null) {
    if (score === null) return 'var(--text-muted)'
    if (score >= 80) return 'var(--success-color)'
    if (score >= 60) return 'var(--warning-color)'
    return 'var(--danger-color)'
  }

  function getScoreBadgeClass(score: number | null) {
    if (score === null) return styles.badgeMuted
    if (score >= 80) return styles.badgeSuccess
    if (score >= 60) return styles.badgeWarning
    return styles.badgeDanger
  }

  // Calculate stats
  const totalResults = results.length
  const avgScore = results.length > 0
    ? Math.round(
        results
          .filter((r) => r.evaluator_score !== null)
          .reduce((sum, r) => sum + (r.evaluator_score || 0), 0) /
          results.filter((r) => r.evaluator_score !== null).length
      )
    : null
  const passedResults = results.filter((r) => r.evaluator_score && r.evaluator_score >= 70).length

  if (loading) {
    return (
      <div className={layoutStyles.pageContainer}>
        <LoadingSpinner size="large" message="Loading results..." />
      </div>
    )
  }

  return (
    <div className={layoutStyles.pageContainer}>
      <div className={layoutStyles.pageHeader}>
        <h1>Test Results</h1>
        <p className={styles.subtitle}>View and analyze test results</p>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      {/* Stats Summary */}
      <div className={styles.statsPanel}>
        <div className={styles.statsCard}>
          <div className={styles.statsCardHeader}>
            <span className={styles.statsCardTitle}>Total Results</span>
            <Icons.BarChart3 size={20} className={styles.statsCardIcon} />
          </div>
          <div className={styles.statsCardValue}>{totalResults}</div>
        </div>
        <div className={styles.statsCard}>
          <div className={styles.statsCardHeader}>
            <span className={styles.statsCardTitle}>Average Score</span>
            <Icons.TrendingUp size={20} className={styles.statsCardIcon} />
          </div>
          <div className={styles.statsCardValue}>{avgScore !== null ? `${avgScore}%` : 'N/A'}</div>
        </div>
        <div className={styles.statsCard}>
          <div className={styles.statsCardHeader}>
            <span className={styles.statsCardTitle}>Passed (≥70%)</span>
            <Icons.CheckCircle size={20} className={styles.statsCardIcon} />
          </div>
          <div className={styles.statsCardValue}>{passedResults}</div>
        </div>
        <div className={styles.statsCard}>
          <div className={styles.statsCardHeader}>
            <span className={styles.statsCardTitle}>Pass Rate</span>
            <Icons.Target size={20} className={styles.statsCardIcon} />
          </div>
          <div className={styles.statsCardValue}>
            {totalResults > 0 ? `${Math.round((passedResults / totalResults) * 100)}%` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.section}>
        <div className={formStyles.formRow}>
          <div className={formStyles.formGroup}>
            <label className={formStyles.label}>Filter by Prompt</label>
            <select
              className={formStyles.select}
              value={selectedPromptId}
              onChange={(e) => setSelectedPromptId(e.target.value)}
            >
              <option value="">All Prompts</option>
              {prompts.map((prompt) => (
                <option key={prompt.id} value={prompt.id}>
                  {prompt.name}
                </option>
              ))}
            </select>
          </div>

          <div className={formStyles.formGroup}>
            <label className={formStyles.label}>Filter by Test Case</label>
            <select
              className={formStyles.select}
              value={selectedTestCaseId}
              onChange={(e) => setSelectedTestCaseId(e.target.value)}
            >
              <option value="">All Test Cases</option>
              {testCases.map((tc) => (
                <option key={tc.id} value={tc.id}>
                  {tc.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Table */}
      {results.length === 0 ? (
        <div className={styles.emptyState}>
          <Icons.BarChart3 size={48} />
          <h3>No results yet</h3>
          <p>Run tests in the Playground to see results here</p>
        </div>
      ) : (
        <div className={styles.section}>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Test Case</th>
                  <th>Prompt Version</th>
                  <th>Score</th>
                  <th>Date</th>
                  <th>Response Preview</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.id}>
                    <td>
                      <strong>{result.test_case_name || `Test Case #${result.test_case_id}`}</strong>
                    </td>
                    <td>{result.prompt_version_name || `Prompt #${result.prompt_version_id}`}</td>
                    <td>
                      {result.evaluator_score !== null ? (
                        <span className={getScoreBadgeClass(result.evaluator_score)}>
                          {result.evaluator_score}%
                        </span>
                      ) : (
                        <span className={styles.badgeMuted}>Not evaluated</span>
                      )}
                    </td>
                    <td>{new Date(result.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className={styles.textTruncate}>
                        {result.agent_response.substring(0, 100)}...
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
