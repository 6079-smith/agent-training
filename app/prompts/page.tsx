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
import type { PromptVersion } from '@/types/database'

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<PromptVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<PromptVersion | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    system_prompt: '',
    user_prompt: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchPrompts()
  }, [])

  async function fetchPrompts() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/prompts')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPrompts(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prompts')
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingPrompt(null)
    setFormData({ name: '', system_prompt: '', user_prompt: '', notes: '' })
    setIsModalOpen(true)
  }

  function openEditModal(prompt: PromptVersion) {
    setEditingPrompt(prompt)
    setFormData({
      name: prompt.name,
      system_prompt: prompt.system_prompt,
      user_prompt: prompt.user_prompt,
      notes: prompt.notes || '',
    })
    setIsModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name || !formData.system_prompt || !formData.user_prompt) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const url = editingPrompt ? `/api/prompts/${editingPrompt.id}` : '/api/prompts'
      const method = editingPrompt ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setIsModalOpen(false)
      fetchPrompts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompt')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this prompt version?')) return

    try {
      setError(null)
      const res = await fetch(`/api/prompts/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      fetchPrompts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete prompt')
    }
  }

  async function handleActivate(id: number) {
    try {
      setError(null)
      const res = await fetch(`/api/prompts/${id}/activate`, { method: 'POST' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      fetchPrompts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate prompt')
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  if (loading) {
    return (
      <div className={layoutStyles.pageContainer}>
        <LoadingSpinner size="large" message="Loading prompts..." />
      </div>
    )
  }

  return (
    <div className={layoutStyles.pageContainer}>
      <div className={layoutStyles.pageHeader}>
        <div>
          <h1>Prompt Versions</h1>
          <p className={styles.subtitle}>Manage and version control your system prompts</p>
        </div>
        <button onClick={openCreateModal} className={btnStyles.primary}>
          <Icons.Plus size={18} />
          New Prompt
        </button>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      {prompts.length === 0 ? (
        <div className={styles.emptyState}>
          <Icons.FileText size={48} />
          <h3>No prompts yet</h3>
          <p>Create your first prompt version to get started</p>
          <button onClick={openCreateModal} className={btnStyles.primary}>
            <Icons.Plus size={18} />
            Create Prompt
          </button>
        </div>
      ) : (
        <div className={styles.section}>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {prompts.map((prompt) => (
                  <tr key={prompt.id} className={prompt.is_active ? styles.rowHighlight : ''}>
                    <td>
                      <strong>{prompt.name}</strong>
                      {prompt.notes && (
                        <div className={styles.textMuted}>{prompt.notes}</div>
                      )}
                    </td>
                    <td>
                      {prompt.is_active ? (
                        <span className={styles.badgeSuccess}>Active</span>
                      ) : (
                        <span className={styles.badgeMuted}>Inactive</span>
                      )}
                    </td>
                    <td>{new Date(prompt.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          onClick={() => openEditModal(prompt)}
                          className={btnStyles.iconButton}
                          title="Edit"
                        >
                          <Icons.Edit size={16} />
                        </button>
                        <button
                          onClick={() => copyToClipboard(prompt.system_prompt)}
                          className={btnStyles.iconButton}
                          title="Copy System Prompt"
                        >
                          <Icons.Copy size={16} />
                        </button>
                        {!prompt.is_active && (
                          <button
                            onClick={() => handleActivate(prompt.id)}
                            className={btnStyles.iconButton}
                            title="Set as Active"
                          >
                            <Icons.CheckCircle size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(prompt.id)}
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
        title={editingPrompt ? 'Edit Prompt Version' : 'Create Prompt Version'}
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
              placeholder="e.g., Customer Service v1"
              required
            />
          </div>

          <div className={formStyles.formGroup}>
            <label className={formStyles.label}>
              System Prompt <span className={formStyles.required}>*</span>
            </label>
            <textarea
              className={formStyles.textarea}
              value={formData.system_prompt}
              onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
              placeholder="Enter the system prompt..."
              rows={8}
              required
            />
          </div>

          <div className={formStyles.formGroup}>
            <label className={formStyles.label}>
              User Prompt <span className={formStyles.required}>*</span>
            </label>
            <textarea
              className={formStyles.textarea}
              value={formData.user_prompt}
              onChange={(e) => setFormData({ ...formData, user_prompt: e.target.value })}
              placeholder="Enter the user prompt template..."
              rows={8}
              required
            />
          </div>

          <div className={formStyles.formGroup}>
            <label className={formStyles.label}>Notes</label>
            <textarea
              className={formStyles.textarea}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional notes about this version..."
              rows={3}
            />
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
              {submitting ? 'Saving...' : editingPrompt ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
