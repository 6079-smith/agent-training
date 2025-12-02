'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import StatsCard from '@/components/StatsCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorAlert from '@/components/ErrorAlert'
import styles from '@/styles/components.module.css'
import layoutStyles from '@/styles/layout.module.css'
import * as Icons from 'lucide-react'

interface DashboardStats {
  totalPrompts: number
  activePrompt: string | null
  totalTestCases: number
  totalResults: number
  avgScore: number | null
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  async function fetchDashboardStats() {
    try {
      setLoading(true)
      setError(null)

      // Fetch prompts
      const promptsRes = await fetch('/api/prompts')
      const promptsData = await promptsRes.json()
      const prompts = promptsData.data || []
      const activePrompt = prompts.find((p: any) => p.is_active)

      // Fetch test cases
      const testCasesRes = await fetch('/api/test-cases')
      const testCasesData = await testCasesRes.json()
      const testCases = testCasesData.data || []

      // Fetch results
      const resultsRes = await fetch('/api/results')
      const resultsData = await resultsRes.json()
      const results = resultsData.data || []

      // Calculate average score
      const scoresWithValues = results.filter((r: any) => r.evaluator_score != null)
      const avgScore =
        scoresWithValues.length > 0
          ? scoresWithValues.reduce((sum: number, r: any) => sum + r.evaluator_score, 0) /
            scoresWithValues.length
          : null

      setStats({
        totalPrompts: prompts.length,
        activePrompt: activePrompt?.name || null,
        totalTestCases: testCases.length,
        totalResults: results.length,
        avgScore: avgScore ? Math.round(avgScore) : null,
      })
    } catch (err) {
      setError('Failed to load dashboard stats')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={layoutStyles.pageContainer}>
        <LoadingSpinner size="large" message="Loading dashboard..." />
      </div>
    )
  }

  return (
    <div className={layoutStyles.pageContainer}>
      <div className={layoutStyles.pageHeader}>
        <h1>Dashboard</h1>
        <p className={styles.subtitle}>CS Agent Prompt Optimizer</p>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      {stats && (
        <>
          <div className={styles.statsPanel}>
            <StatsCard
              title="Total Prompts"
              value={stats.totalPrompts}
              icon={Icons.FileText}
            />
            <StatsCard
              title="Test Cases"
              value={stats.totalTestCases}
              icon={Icons.TestTube}
            />
            <StatsCard
              title="Test Results"
              value={stats.totalResults}
              icon={Icons.BarChart3}
            />
            <StatsCard
              title="Avg Score"
              value={stats.avgScore !== null ? `${stats.avgScore}%` : 'N/A'}
              icon={Icons.TrendingUp}
            />
          </div>

          {stats.activePrompt && (
            <div className={styles.section}>
              <div className={styles.infoRow}>
                <Icons.CheckCircle size={20} className={styles.iconSuccess} />
                <strong>Active Prompt:</strong>
                <span>{stats.activePrompt}</span>
              </div>
            </div>
          )}

          <div className={styles.section}>
            <h2>Quick Start</h2>
            <div className={styles.cardGrid}>
              <Link href="/wizard" className={styles.actionCard}>
                <Icons.Wand2 size={32} />
                <h3>Training Wizard</h3>
                <p>Teach the AI about your business context and policies</p>
              </Link>

              <Link href="/prompts" className={styles.actionCard}>
                <Icons.FileText size={32} />
                <h3>Manage Prompts</h3>
                <p>Create and version control your system prompts</p>
              </Link>

              <Link href="/test-cases" className={styles.actionCard}>
                <Icons.TestTube size={32} />
                <h3>Test Cases</h3>
                <p>Import email examples as repeatable test cases</p>
              </Link>

              <Link href="/playground" className={styles.actionCard}>
                <Icons.Play size={32} />
                <h3>Playground</h3>
                <p>Test prompts and evaluate responses in real-time</p>
              </Link>

              <Link href="/results" className={styles.actionCard}>
                <Icons.BarChart3 size={32} />
                <h3>View Results</h3>
                <p>Track scores and compare prompt versions</p>
              </Link>
            </div>
          </div>

          <div className={styles.section}>
            <h2>Workflow</h2>
            <ol className={styles.workflowList}>
              <li>
                <strong>Complete the Training Wizard</strong> - Teach the AI evaluator about your
                business
              </li>
              <li>
                <strong>Import Your Prompts</strong> - Add your current Make.com prompts
              </li>
              <li>
                <strong>Add Test Cases</strong> - Import historical email examples
              </li>
              <li>
                <strong>Test in Playground</strong> - Generate and evaluate responses
              </li>
              <li>
                <strong>Iterate & Improve</strong> - Refine prompts based on feedback
              </li>
              <li>
                <strong>Export to Make.com</strong> - Copy optimized prompts
              </li>
            </ol>
          </div>
        </>
      )}
    </div>
  )
}
