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

interface RecentActivity {
  id: number
  type: 'result' | 'prompt' | 'testcase'
  message: string
  timestamp: string
  status: 'success' | 'warning' | 'info'
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
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

      // Build recent activity from results
      const activity: RecentActivity[] = results
        .slice(0, 5)
        .map((r: any) => ({
          id: r.id,
          type: 'result' as const,
          message: `Test completed with ${r.evaluator_score !== null ? r.evaluator_score + '%' : 'no'} score`,
          timestamp: r.created_at,
          status: r.evaluator_score >= 80 ? 'success' : r.evaluator_score >= 60 ? 'warning' : 'info',
        }))
      setRecentActivity(activity)
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

  function getTimeAgo(timestamp: string) {
    const now = new Date()
    const then = new Date(timestamp)
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)
    
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  return (
    <div className={layoutStyles.pageContainer}>
      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      {stats && (
        <>
          {/* Header */}
          <div className={styles.minimalHeader}>
            <div>
              <h1>Dashboard</h1>
              {stats.activePrompt && (
                <p className={styles.activePromptText}>
                  <Icons.CheckCircle size={16} />
                  Active: <strong>{stats.activePrompt}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className={styles.minimalStats}>
            <div className={styles.minimalStatCard}>
              <div className={styles.minimalStatValue}>{stats.totalPrompts}</div>
              <div className={styles.minimalStatLabel}>Prompts</div>
            </div>
            <div className={styles.minimalStatCard}>
              <div className={styles.minimalStatValue}>{stats.totalTestCases}</div>
              <div className={styles.minimalStatLabel}>Test Cases</div>
            </div>
            <div className={styles.minimalStatCard}>
              <div className={styles.minimalStatValue}>{stats.totalResults}</div>
              <div className={styles.minimalStatLabel}>Results</div>
            </div>
            <div className={styles.minimalStatCard}>
              <div className={styles.minimalStatValue}>
                {stats.avgScore !== null ? `${stats.avgScore}%` : 'N/A'}
              </div>
              <div className={styles.minimalStatLabel}>Avg Score</div>
            </div>
          </div>

          {/* Action Cards - Single Column */}
          <div className={styles.minimalActions}>
            <Link href="/wizard" className={styles.minimalCard}>
              <div className={styles.minimalCardIcon}>
                <Icons.Sparkles size={32} />
              </div>
              <div className={styles.minimalCardContent}>
                <h2>Training Wizard</h2>
                <p>Teach the AI evaluator about your business policies, tone, and guidelines</p>
              </div>
              <Icons.ArrowRight size={24} className={styles.minimalCardArrow} />
            </Link>

            <Link href="/prompts" className={styles.minimalCard}>
              <div className={styles.minimalCardIcon}>
                <Icons.FileText size={32} />
              </div>
              <div className={styles.minimalCardContent}>
                <h2>Manage Prompts</h2>
                <p>Create, edit, and version control your system prompts</p>
              </div>
              <Icons.ArrowRight size={24} className={styles.minimalCardArrow} />
            </Link>

            <Link href="/test-cases" className={styles.minimalCard}>
              <div className={styles.minimalCardIcon}>
                <Icons.Mail size={32} />
              </div>
              <div className={styles.minimalCardContent}>
                <h2>Test Cases</h2>
                <p>Import and organize email examples for repeatable testing</p>
              </div>
              <Icons.ArrowRight size={24} className={styles.minimalCardArrow} />
            </Link>

            <Link href="/playground" className={styles.minimalCard}>
              <div className={styles.minimalCardIcon}>
                <Icons.Play size={32} />
              </div>
              <div className={styles.minimalCardContent}>
                <h2>Playground</h2>
                <p>Test prompts in real-time with AI-powered generation and evaluation</p>
              </div>
              <Icons.ArrowRight size={24} className={styles.minimalCardArrow} />
            </Link>

            <Link href="/results" className={styles.minimalCard}>
              <div className={styles.minimalCardIcon}>
                <Icons.BarChart2 size={32} />
              </div>
              <div className={styles.minimalCardContent}>
                <h2>View Results</h2>
                <p>Analyze test results and compare prompt performance over time</p>
              </div>
              <Icons.ArrowRight size={24} className={styles.minimalCardArrow} />
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
