'use client'

import { useEffect, useState } from 'react'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorAlert from '@/components/ErrorAlert'
import styles from '@/styles/components.module.css'
import layoutStyles from '@/styles/layout.module.css'
import btnStyles from '@/styles/buttons.module.css'
import formStyles from '@/styles/forms.module.css'
import * as Icons from 'lucide-react'
import type { KnowledgeBase } from '@/types/database'

const CATEGORIES = ['policies', 'tone', 'escalation', 'products', 'shipping', 'other']

export default function WizardPage() {
  const [knowledge, setKnowledge] = useState<KnowledgeBase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('policies')
  const [formData, setFormData] = useState({
    category: 'policies',
    key: '',
    value: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  useEffect(() => {
    fetchKnowledge()
  }, [])

  async function fetchKnowledge() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/knowledge')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setKnowledge(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load knowledge base')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.key || !formData.value) {
      setError('Please fill in all fields')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const url = editingId ? `/api/knowledge/${editingId}` : '/api/knowledge'
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setFormData({ category: selectedCategory, key: '', value: '' })
      setEditingId(null)
      fetchKnowledge()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save knowledge entry')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this entry?')) return

    try {
      setError(null)
      const res = await fetch(`/api/knowledge/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      fetchKnowledge()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry')
    }
  }

  function startEdit(entry: KnowledgeBase) {
    setEditingId(entry.id)
    setFormData({
      category: entry.category,
      key: entry.key,
      value: entry.value,
    })
    setSelectedCategory(entry.category)
  }

  function cancelEdit() {
    setEditingId(null)
    setFormData({ category: selectedCategory, key: '', value: '' })
  }

  const filteredKnowledge = knowledge.filter((k) => k.category === selectedCategory)
  const knowledgeByCategory = CATEGORIES.map((cat) => ({
    category: cat,
    count: knowledge.filter((k) => k.category === cat).length,
  }))

  if (loading) {
    return (
      <div className={layoutStyles.pageContainer}>
        <LoadingSpinner size="large" message="Loading knowledge base..." />
      </div>
    )
  }

  return (
    <div className={layoutStyles.pageContainer}>
      <div className={layoutStyles.pageHeader}>
        <h1>Training Wizard</h1>
        <p className={styles.subtitle}>Teach the AI evaluator about your business context</p>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      <div className={styles.section}>
        <div className={styles.infoRow}>
          <Icons.Info size={20} />
          <p>
            Add key-value pairs to teach the AI about your business policies, tone guidelines,
            escalation rules, and more. This knowledge will be used when evaluating agent responses.
          </p>
        </div>
      </div>

      {/* Category Stats */}
      <div className={styles.statsPanel}>
        {knowledgeByCategory.map(({ category, count }) => (
          <div
            key={category}
            className={`${styles.statsCard} ${selectedCategory === category ? styles.statsCardActive : ''}`}
            onClick={() => setSelectedCategory(category)}
            style={{ cursor: 'pointer' }}
          >
            <div className={styles.statsCardHeader}>
              <span className={styles.statsCardTitle}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </span>
            </div>
            <div className={styles.statsCardValue}>{count}</div>
          </div>
        ))}
      </div>

      <div className={styles.wizardGrid}>
        {/* Left: Form */}
        <div className={styles.wizardPanel}>
          <h3>{editingId ? 'Edit Entry' : 'Add New Entry'}</h3>
          <form onSubmit={handleSubmit}>
            <div className={formStyles.formGroup}>
              <label className={formStyles.label}>Category</label>
              <select
                className={formStyles.select}
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className={formStyles.formGroup}>
              <label className={formStyles.label}>Key</label>
              <input
                type="text"
                className={formStyles.input}
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                placeholder="e.g., refund_policy"
                required
              />
            </div>

            <div className={formStyles.formGroup}>
              <label className={formStyles.label}>Value</label>
              <textarea
                className={formStyles.textarea}
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="Enter the policy, guideline, or information..."
                rows={8}
                required
              />
            </div>

            <div className={styles.buttonGroup}>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className={btnStyles.secondary}
                >
                  Cancel
                </button>
              )}
              <button type="submit" className={btnStyles.primary} disabled={submitting}>
                {submitting ? 'Saving...' : editingId ? 'Update' : 'Add Entry'}
              </button>
            </div>
          </form>
        </div>

        {/* Right: List */}
        <div className={styles.wizardPanel}>
          <h3>
            {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} ({filteredKnowledge.length})
          </h3>
          {filteredKnowledge.length === 0 ? (
            <div className={styles.emptyPanel}>
              <Icons.FileText size={32} />
              <p>No entries in this category yet</p>
            </div>
          ) : (
            <div className={styles.knowledgeList}>
              {filteredKnowledge.map((entry) => (
                <div key={entry.id} className={styles.knowledgeEntry}>
                  <div className={styles.knowledgeHeader}>
                    <strong>{entry.key}</strong>
                    <div className={styles.actionButtons}>
                      <button
                        onClick={() => startEdit(entry)}
                        className={btnStyles.iconButton}
                        title="Edit"
                      >
                        <Icons.Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className={`${btnStyles.iconButton} ${btnStyles.danger}`}
                        title="Delete"
                      >
                        <Icons.Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className={styles.knowledgeValue}>{entry.value}</p>
                  <div className={styles.knowledgeMeta}>
                    Updated: {new Date(entry.updated_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
