'use client'

import { useEffect, useState } from 'react'
import Modal from '@/components/Modal'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorAlert from '@/components/ErrorAlert'
import styles from '@/styles/components.module.css'
import layoutStyles from '@/styles/layout.module.css'
import btnStyles from '@/styles/buttons.module.css'
import formStyles from '@/styles/forms.module.css'
import * as Icons from 'lucide-react'
import type { TestCase } from '@/types/database'

export default function TestCasesPage() {
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null)
  const [selectedTag, setSelectedTag] = useState<string>('')
  const [formData, setFormData] = useState({
    name: '',
    email_thread: '',
    customer_email: '',
    customer_name: '',
    subject: '',
    order_number: '',
    expected_behavior: '',
    tags: [] as string[],
  })
  const [submitting, setSubmitting] = useState(false)
  const [newTag, setNewTag] = useState('')

  useEffect(() => {
    fetchTestCases()
  }, [selectedTag])

  async function fetchTestCases() {
    try {
      setLoading(true)
      setError(null)
      const url = selectedTag ? `/api/test-cases?tag=${selectedTag}` : '/api/test-cases'
      const res = await fetch(url)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setTestCases(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load test cases')
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingTestCase(null)
    setFormData({
      name: '',
      email_thread: '',
      customer_email: '',
      customer_name: '',
      subject: '',
      order_number: '',
      expected_behavior: '',
      tags: [],
    })
    setIsModalOpen(true)
  }

  function openEditModal(testCase: TestCase) {
    setEditingTestCase(testCase)
    setFormData({
      name: testCase.name,
      email_thread: testCase.email_thread,
      customer_email: testCase.customer_email || '',
      customer_name: testCase.customer_name || '',
      subject: testCase.subject || '',
      order_number: testCase.order_number || '',
      expected_behavior: testCase.expected_behavior || '',
      tags: testCase.tags || [],
    })
    setIsModalOpen(true)
  }

  function addTag() {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData({ ...formData, tags: [...formData.tags, newTag] })
      setNewTag('')
    }
  }

  function removeTag(tag: string) {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name || !formData.email_thread) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const url = editingTestCase ? `/api/test-cases/${editingTestCase.id}` : '/api/test-cases'
      const method = editingTestCase ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setIsModalOpen(false)
      fetchTestCases()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save test case')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this test case?')) return

    try {
      setError(null)
      const res = await fetch(`/api/test-cases/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      fetchTestCases()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete test case')
    }
  }

  // Get all unique tags from test cases
  const allTags = Array.from(
    new Set(testCases.flatMap((tc) => tc.tags || []))
  ).sort()

  if (loading) {
    return (
      <div className={layoutStyles.pageContainer}>
        <LoadingSpinner size="large" message="Loading test cases..." />
      </div>
    )
  }

  return (
    <div className={layoutStyles.pageContainer}>
      <div className={layoutStyles.pageHeader}>
        <div>
          <h1>Test Cases</h1>
          <p className={styles.subtitle}>Manage email examples for testing prompts</p>
        </div>
        <button onClick={openCreateModal} className={btnStyles.primary}>
          <Icons.Plus size={18} />
          New Test Case
        </button>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      {allTags.length > 0 && (
        <div className={styles.filterContainer}>
          <label>Filter by tag:</label>
          <select
            className={formStyles.select}
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
          >
            <option value="">All Tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
      )}

      {testCases.length === 0 ? (
        <div className={styles.emptyState}>
          <Icons.TestTube size={48} />
          <h3>No test cases yet</h3>
          <p>Create your first test case to start testing prompts</p>
          <button onClick={openCreateModal} className={btnStyles.primary}>
            <Icons.Plus size={18} />
            Create Test Case
          </button>
        </div>
      ) : (
        <div className={styles.section}>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Subject</th>
                  <th>Tags</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {testCases.map((testCase) => (
                  <tr key={testCase.id}>
                    <td>
                      <strong>{testCase.name}</strong>
                      {testCase.customer_name && (
                        <div className={styles.textMuted}>
                          {testCase.customer_name}
                          {testCase.customer_email && ` (${testCase.customer_email})`}
                        </div>
                      )}
                    </td>
                    <td>{testCase.subject || '-'}</td>
                    <td>
                      {testCase.tags && testCase.tags.length > 0 ? (
                        <div className={styles.tagList}>
                          {testCase.tags.map((tag) => (
                            <span key={tag} className={styles.tag}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>{new Date(testCase.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          onClick={() => openEditModal(testCase)}
                          className={btnStyles.iconButton}
                          title="Edit"
                        >
                          <Icons.Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(testCase.id)}
                          className={`${btnStyles.iconButton} ${btnStyles.danger}`}
                          title="Delete"
                        >
                          <Icons.Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTestCase ? 'Edit Test Case' : 'Create Test Case'}
        size="large"
      >
        <form onSubmit={handleSubmit}>
          <div className={formStyles.formGroup}>
            <label className={formStyles.label}>
              Name <span className={formStyles.required}>*</span>
            </label>
            <input
              type="text"
              className={formStyles.input}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Refund Request #1"
              required
            />
          </div>

          <div className={formStyles.formGroup}>
            <label className={formStyles.label}>
              Email Thread <span className={formStyles.required}>*</span>
            </label>
            <textarea
              className={formStyles.textarea}
              value={formData.email_thread}
              onChange={(e) => setFormData({ ...formData, email_thread: e.target.value })}
              placeholder="Paste the full email thread here..."
              rows={10}
              required
            />
          </div>

          <div className={formStyles.formRow}>
            <div className={formStyles.formGroup}>
              <label className={formStyles.label}>Customer Name</label>
              <input
                type="text"
                className={formStyles.input}
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div className={formStyles.formGroup}>
              <label className={formStyles.label}>Customer Email</label>
              <input
                type="email"
                className={formStyles.input}
                value={formData.customer_email}
                onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                placeholder="customer@example.com"
              />
            </div>
          </div>

          <div className={formStyles.formRow}>
            <div className={formStyles.formGroup}>
              <label className={formStyles.label}>Subject</label>
              <input
                type="text"
                className={formStyles.input}
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Order never received"
              />
            </div>

            <div className={formStyles.formGroup}>
              <label className={formStyles.label}>Order Number</label>
              <input
                type="text"
                className={formStyles.input}
                value={formData.order_number}
                onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                placeholder="#12345"
              />
            </div>
          </div>

          <div className={formStyles.formGroup}>
            <label className={formStyles.label}>Expected Behavior</label>
            <textarea
              className={formStyles.textarea}
              value={formData.expected_behavior}
              onChange={(e) => setFormData({ ...formData, expected_behavior: e.target.value })}
              placeholder="Describe what the agent should do..."
              rows={3}
            />
          </div>

          <div className={formStyles.formGroup}>
            <label className={formStyles.label}>Tags</label>
            <div className={formStyles.inputGroup}>
              <input
                type="text"
                className={formStyles.input}
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add a tag..."
              />
              <button type="button" onClick={addTag} className={btnStyles.secondary}>
                Add
              </button>
            </div>
            {formData.tags.length > 0 && (
              <div className={styles.tagList}>
                {formData.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className={styles.tagRemove}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className={btnStyles.secondary}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className={btnStyles.primary} disabled={submitting}>
              {submitting ? 'Saving...' : editingTestCase ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
