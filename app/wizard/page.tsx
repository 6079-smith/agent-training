'use client'

import { useState, useEffect, ReactNode } from 'react'
import styles from '@/styles/components.module.css'
import btnStyles from '@/styles/buttons.module.css'
import formStyles from '@/styles/forms.module.css'
import * as Icons from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Types
interface Question {
  id: number
  category: string
  key: string
  value: string
  display_title: string
  sort_order: number
}

// Step configuration
const STEPS = [
  { id: 1, title: 'Business Basics', category: 'business', icon: Icons.Building2 },
  { id: 2, title: 'Policies', category: 'policies', icon: Icons.FileText },
  { id: 3, title: 'Capabilities', category: 'capabilities', icon: Icons.Zap },
  { id: 4, title: 'Tone & Sign-offs', category: 'tone', icon: Icons.MessageSquare },
  { id: 5, title: 'Failure Patterns', category: 'failures', icon: Icons.AlertTriangle },
]

// Sortable Question Component
function SortableQuestion({
  question,
  onValueChange,
  onTitleEdit,
  onDelete,
}: {
  question: Question
  onValueChange: (id: number, value: string) => void
  onTitleEdit: (id: number, title: string) => void
  onDelete: (id: number) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(question.display_title)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleTitleSave = () => {
    if (editedTitle.trim()) {
      onTitleEdit(question.id, editedTitle.trim())
    }
    setIsEditingTitle(false)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave()
    } else if (e.key === 'Escape') {
      setEditedTitle(question.display_title)
      setIsEditingTitle(false)
    }
  }

  return (
    <div ref={setNodeRef} style={style} className={formStyles.formGroupSection}>
      <div className={formStyles.sectionHeader}>
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className={formStyles.dragHandle}
          title="Drag to reorder"
        >
          <Icons.GripVertical size={18} />
        </div>

        {/* Title (editable) */}
        {isEditingTitle ? (
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={handleTitleKeyDown}
            className={formStyles.titleInput}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h3
            className={formStyles.sectionLabel}
            onClick={() => setIsOpen(!isOpen)}
            style={{ cursor: 'pointer', flex: 1 }}
          >
            {question.display_title}
          </h3>
        )}

        {/* Action Buttons */}
        <div className={formStyles.questionActions}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsEditingTitle(true)
              setEditedTitle(question.display_title)
            }}
            className={formStyles.iconButton}
            title="Edit title"
          >
            <Icons.Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (confirm(`Delete "${question.display_title}"?`)) {
                onDelete(question.id)
              }
            }}
            className={`${formStyles.iconButton} ${formStyles.iconButtonDanger}`}
            title="Delete question"
          >
            <Icons.Trash2 size={16} />
          </button>
          <Icons.ChevronDown
            size={20}
            className={`${formStyles.sectionToggle} ${!isOpen ? formStyles.collapsed : ''}`}
            onClick={() => setIsOpen(!isOpen)}
            style={{ cursor: 'pointer' }}
          />
        </div>
      </div>
      <div className={`${formStyles.sectionContent} ${!isOpen ? formStyles.collapsed : ''}`}>
        <textarea
          className={`${formStyles.textarea} ${formStyles.textareaLarge}`}
          value={question.value}
          onChange={(e) => onValueChange(question.id, e.target.value)}
          rows={8}
          placeholder="Enter your answer..."
        />
      </div>
    </div>
  )
}

export default function WizardPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([])
  const [savedQuestions, setSavedQuestions] = useState<Question[]>([]) // Track last saved state
  const [newQuestionTitle, setNewQuestionTitle] = useState('')
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Get current step's category
  const currentCategory = STEPS[currentStep - 1].category

  // Filter questions for current step
  const currentQuestions = questions
    .filter((q) => q.category === currentCategory)
    .sort((a, b) => a.sort_order - b.sort_order)

  // Check if current step has unsaved changes
  const hasUnsavedChanges = currentQuestions.some((q) => {
    const saved = savedQuestions.find((s) => s.id === q.id)
    if (!saved) return true // New question not yet saved
    return q.value !== saved.value || q.display_title !== saved.display_title || q.sort_order !== saved.sort_order
  })

  // Load all questions from DB
  useEffect(() => {
    async function loadQuestions() {
      try {
        const res = await fetch('/api/knowledge')
        if (!res.ok) throw new Error('Failed to fetch')
        const { data } = await res.json()
        const mapped = data.map((item: any) => ({
          id: item.id,
          category: item.category,
          key: item.key,
          value: item.value || '',
          display_title: item.display_title || item.key.replace(/_/g, ' '),
          sort_order: item.sort_order || 0,
        }))
        setQuestions(mapped)
        setSavedQuestions(JSON.parse(JSON.stringify(mapped))) // Deep copy for comparison
      } catch (error) {
        console.error('Error loading questions:', error)
      } finally {
        setLoading(false)
      }
    }
    loadQuestions()
  }, [])

  // Save a question's value
  const saveQuestion = async (question: Question) => {
    await fetch('/api/knowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: question.category,
        key: question.key,
        value: question.value,
        display_title: question.display_title,
        sort_order: question.sort_order,
      }),
    })
  }

  // Handle value change
  const handleValueChange = (id: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, value } : q))
    )
  }

  // Handle title edit
  const handleTitleEdit = async (id: number, title: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, display_title: title } : q))
    )
    // Save to DB
    await fetch('/api/knowledge', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, display_title: title }),
    })
  }

  // Handle delete
  const handleDelete = async (id: number) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id))
    await fetch(`/api/knowledge?id=${id}`, { method: 'DELETE' })
  }

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = currentQuestions.findIndex((q) => q.id === active.id)
    const newIndex = currentQuestions.findIndex((q) => q.id === over.id)

    const reordered = arrayMove(currentQuestions, oldIndex, newIndex)

    // Update sort_order for all reordered items
    const updatedQuestions = questions.map((q) => {
      const reorderedIndex = reordered.findIndex((r) => r.id === q.id)
      if (reorderedIndex !== -1) {
        return { ...q, sort_order: reorderedIndex }
      }
      return q
    })

    setQuestions(updatedQuestions)

    // Save new order to DB
    for (let i = 0; i < reordered.length; i++) {
      await fetch('/api/knowledge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reordered[i].id, sort_order: i }),
      })
    }
  }

  // Add new question
  const handleAddQuestion = async () => {
    if (!newQuestionTitle.trim()) return

    const key = newQuestionTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')

    const maxSortOrder = Math.max(0, ...currentQuestions.map((q) => q.sort_order))

    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: currentCategory,
          key: key,
          value: '',
          display_title: newQuestionTitle.trim(),
          sort_order: maxSortOrder + 1,
        }),
      })

      if (res.ok) {
        const { data } = await res.json()
        setQuestions((prev) => [
          ...prev,
          {
            id: data.id,
            category: data.category,
            key: data.key,
            value: data.value || '',
            display_title: data.display_title,
            sort_order: data.sort_order,
          },
        ])
        setNewQuestionTitle('')
      }
    } catch (error) {
      console.error('Error adding question:', error)
    }
  }

  // Save current step and navigate
  const handleNext = async () => {
    if (currentStep < STEPS.length) {
      setSaving(true)
      for (const q of currentQuestions) {
        await saveQuestion(q)
      }
      setSaving(false)
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Save current step without navigating
  const handleSave = async () => {
    setSaving(true)
    try {
      for (const q of currentQuestions) {
        await saveQuestion(q)
      }
      // Update savedQuestions to reflect current state
      setSavedQuestions((prev) => {
        const updated = [...prev]
        for (const q of currentQuestions) {
          const idx = updated.findIndex((s) => s.id === q.id)
          if (idx >= 0) {
            updated[idx] = { ...q }
          } else {
            updated.push({ ...q })
          }
        }
        return updated
      })
    } catch (error) {
      console.error('Error saving:', error)
      alert('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      for (const q of currentQuestions) {
        await saveQuestion(q)
      }
      alert('Training data saved successfully!')
    } catch (error) {
      console.error('Error saving:', error)
      alert('Failed to save training data')
    } finally {
      setSaving(false)
    }
  }

  const progress = (currentStep / STEPS.length) * 100

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <Icons.Loader2 size={32} className="animate-spin" style={{ margin: '0 auto' }} />
        <p style={{ marginTop: '1rem', color: '#888' }}>Loading training data...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className={styles.wizardHeader}>
        <h1>Training Wizard</h1>
        <p className={styles.wizardSubtitle}>Teach the AI evaluator about your business</p>
      </div>

      {/* Progress Steps */}
      <div className={styles.wizardSteps}>
        {STEPS.map((step) => {
          const StepIcon = step.icon
          return (
            <div
              key={step.id}
              className={`${styles.wizardStepTab} ${
                currentStep === step.id ? styles.wizardStepActive : ''
              } ${currentStep > step.id ? styles.wizardStepComplete : ''}`}
              onClick={() => setCurrentStep(step.id)}
            >
              <div className={styles.wizardStepNumber}>{step.id}</div>
              <div className={styles.wizardStepInfo}>
                <div className={styles.wizardStepTitle}>{step.title}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Progress Bar */}
      <div className={styles.wizardProgressBar}>
        <div className={styles.wizardProgressFill} style={{ width: `${progress}%` }} />
      </div>

      {/* Form Content */}
      <div className={styles.wizardFormContainer}>
        <div className={styles.wizardFormCard}>
          {/* Step Title + Save Button */}
          <div className={formStyles.stepHeader}>
            <div className={formStyles.stepTitleRow}>
              <h2 className={styles.wizardFormTitle}>{STEPS[currentStep - 1].title}</h2>
              <button
                type="button"
                onClick={handleSave}
                className={hasUnsavedChanges ? btnStyles.primary : btnStyles.secondary}
                disabled={saving}
              >
                <Icons.Save size={18} />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
            <div className={formStyles.addQuestionRow}>
              <input
                type="text"
                value={newQuestionTitle}
                onChange={(e) => setNewQuestionTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddQuestion()}
                placeholder="Add new question..."
                className={formStyles.addQuestionInput}
              />
              <button
                type="button"
                onClick={handleAddQuestion}
                className={newQuestionTitle.trim() ? btnStyles.primary : btnStyles.secondary}
                disabled={!newQuestionTitle.trim()}
              >
                <Icons.Plus size={18} />
                Add
              </button>
            </div>
          </div>

          {/* Questions List */}
          <div className={styles.wizardFormContent} key={currentStep}>
            {currentQuestions.length === 0 ? (
              <div className={formStyles.emptyState}>
                <Icons.FileQuestion size={48} style={{ opacity: 0.3 }} />
                <p>No questions yet. Add one above!</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={currentQuestions.map((q) => q.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {currentQuestions.map((question) => (
                    <SortableQuestion
                      key={question.id}
                      question={question}
                      onValueChange={handleValueChange}
                      onTitleEdit={handleTitleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className={styles.wizardFormActions}>
            <button
              onClick={handlePrevious}
              className={btnStyles.secondary}
              disabled={currentStep === 1}
            >
              <Icons.ChevronLeft size={18} />
              Previous
            </button>
            {currentStep < STEPS.length ? (
              <button onClick={handleNext} className={btnStyles.primary} disabled={saving}>
                {saving ? 'Saving...' : 'Next'}
                <Icons.ChevronRight size={18} />
              </button>
            ) : (
              <button onClick={handleSubmit} className={btnStyles.primary} disabled={saving}>
                <Icons.Check size={18} />
                {saving ? 'Saving...' : 'Complete Training'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
