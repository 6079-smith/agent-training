'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
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
  horizontalListSortingStrategy,
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

interface Step {
  id: number
  title: string
  category: string
  sort_order: number
}

// Step status type
type StepStatus = 'empty' | 'incomplete' | 'complete'

// Sortable Step Tab Component
function SortableStepTab({
  step,
  index,
  isActive,
  status,
  onClick,
  onEdit,
  onDelete,
}: {
  step: Step
  index: number
  isActive: boolean
  status: StepStatus
  onClick: () => void
  onEdit: (id: number, title: string) => void
  onDelete: (id: number) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(step.title)
  const [isHovered, setIsHovered] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleSaveTitle = () => {
    if (editedTitle.trim() && editedTitle !== step.title) {
      onEdit(step.id, editedTitle.trim())
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle()
    } else if (e.key === 'Escape') {
      setEditedTitle(step.title)
      setIsEditing(false)
    }
  }

  // Determine status class
  const statusClass = status === 'complete' 
    ? styles.wizardStepComplete 
    : status === 'incomplete' 
      ? styles.wizardStepIncomplete 
      : ''

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.wizardStepTab} ${isActive ? styles.wizardStepActive : ''} ${statusClass}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Drag handle */}
      <div {...attributes} {...listeners} className={formStyles.stepDragHandle}>
        <Icons.GripVertical size={14} />
      </div>

      {/* Step number */}
      <div className={styles.wizardStepNumber}>{index + 1}</div>

      {/* Title */}
      <div className={styles.wizardStepInfo} onClick={onClick}>
        {isEditing ? (
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={handleKeyDown}
            className={formStyles.stepTitleInput}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className={styles.wizardStepTitle}>{step.title}</div>
        )}
      </div>

      {/* Action buttons */}
      <div 
        className={formStyles.stepActions}
        style={{ opacity: isHovered ? 1 : 0 }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setIsEditing(true)
            setEditedTitle(step.title)
          }}
          className={formStyles.stepIconButton}
          title="Edit step name"
        >
          <Icons.Pencil size={12} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(step.id)
          }}
          className={`${formStyles.stepIconButton} ${formStyles.stepIconButtonDanger}`}
          title="Delete step"
        >
          <Icons.Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

// Sortable Question Component
function SortableQuestion({
  question,
  isExpanded,
  onToggleExpand,
  onValueChange,
  onTitleEdit,
  onDelete,
}: {
  question: Question
  isExpanded: boolean
  onToggleExpand: (id: number) => void
  onValueChange: (id: number, value: string) => void
  onTitleEdit: (id: number, title: string) => void
  onDelete: (id: number) => void
}) {
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
            onClick={() => onToggleExpand(question.id)}
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
            className={`${formStyles.sectionToggle} ${!isExpanded ? formStyles.collapsed : ''}`}
            onClick={() => onToggleExpand(question.id)}
            style={{ cursor: 'pointer' }}
          />
        </div>
      </div>
      <div className={`${formStyles.sectionContent} ${!isExpanded ? formStyles.collapsed : ''}`}>
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
  const searchParams = useSearchParams()
  const [steps, setSteps] = useState<Step[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([])
  const [savedQuestions, setSavedQuestions] = useState<Question[]>([])
  const [newQuestionTitle, setNewQuestionTitle] = useState('')
  const [newStepTitle, setNewStepTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [isEditingStepTitle, setIsEditingStepTitle] = useState(false)
  const [editedStepTitle, setEditedStepTitle] = useState('')
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set())

  // Toggle question expand/collapse
  const handleToggleExpand = (id: number) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Expand/collapse all questions for current step
  const handleExpandCollapseAll = () => {
    const currentIds = currentQuestions.map(q => q.id)
    const allExpanded = currentIds.every(id => expandedQuestions.has(id))
    
    setExpandedQuestions(prev => {
      const next = new Set(prev)
      if (allExpanded) {
        // Collapse all current
        currentIds.forEach(id => next.delete(id))
      } else {
        // Expand all current
        currentIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Get current step
  const currentStep = steps[currentStepIndex]
  const currentCategory = currentStep?.category || ''

  // Filter questions for current step
  const currentQuestions = questions
    .filter((q) => q.category === currentCategory)
    .sort((a, b) => a.sort_order - b.sort_order)

  // Check if current step has unsaved changes
  const hasUnsavedChanges = currentQuestions.some((q) => {
    const saved = savedQuestions.find((s) => s.id === q.id)
    if (!saved) return true
    return q.value !== saved.value || q.display_title !== saved.display_title || q.sort_order !== saved.sort_order
  })

  // Get step status: empty (no questions), incomplete (has unanswered), complete (all answered)
  const getStepStatus = (stepCategory: string): StepStatus => {
    const stepQuestions = questions.filter((q) => q.category === stepCategory)
    if (stepQuestions.length === 0) return 'empty'
    const hasUnanswered = stepQuestions.some((q) => !q.value || q.value.trim() === '')
    return hasUnanswered ? 'incomplete' : 'complete'
  }

  // Load steps and questions from DB
  useEffect(() => {
    async function loadData() {
      try {
        // Load steps
        const stepsRes = await fetch('/api/wizard-steps')
        if (stepsRes.ok) {
          const { data: stepsData } = await stepsRes.json()
          setSteps(stepsData)
        }

        // Load questions
        const questionsRes = await fetch('/api/knowledge')
        if (questionsRes.ok) {
          const { data: questionsData } = await questionsRes.json()
          const mapped = questionsData.map((item: any) => ({
            id: item.id,
            category: item.category,
            key: item.key,
            value: item.value || '',
            display_title: item.display_title || item.key.replace(/_/g, ' '),
            sort_order: item.sort_order || 0,
          }))
          setQuestions(mapped)
          setSavedQuestions(JSON.parse(JSON.stringify(mapped)))
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Handle ?step= query parameter to navigate to specific step
  useEffect(() => {
    const stepCategory = searchParams.get('step')
    if (stepCategory && steps.length > 0) {
      const stepIndex = steps.findIndex(s => s.category === stepCategory)
      if (stepIndex !== -1) {
        setCurrentStepIndex(stepIndex)
      }
    }
  }, [searchParams, steps])

  // === STEP HANDLERS ===

  const handleAddStep = async () => {
    if (!newStepTitle.trim()) return

    try {
      const res = await fetch('/api/wizard-steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newStepTitle.trim() }),
      })

      if (res.ok) {
        const { data } = await res.json()
        setSteps((prev) => [...prev, data])
        setNewStepTitle('')
      } else {
        const { error } = await res.json()
        alert(error || 'Failed to add step')
      }
    } catch (error) {
      console.error('Error adding step:', error)
    }
  }

  const handleEditStep = async (id: number, title: string) => {
    try {
      const res = await fetch('/api/wizard-steps', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, title }),
      })

      if (res.ok) {
        const { data } = await res.json()
        setSteps((prev) => prev.map((s) => (s.id === id ? data : s)))
      } else {
        const { error } = await res.json()
        alert(error || 'Failed to update step')
      }
    } catch (error) {
      console.error('Error updating step:', error)
    }
  }

  const handleDeleteStep = async (id: number) => {
    const step = steps.find((s) => s.id === id)
    if (!step) return

    if (!confirm(`Delete step "${step.title}"?`)) return

    try {
      const res = await fetch(`/api/wizard-steps?id=${id}`, { method: 'DELETE' })

      if (res.ok) {
        setSteps((prev) => prev.filter((s) => s.id !== id))
        // Adjust current step index if needed
        if (currentStepIndex >= steps.length - 1) {
          setCurrentStepIndex(Math.max(0, steps.length - 2))
        }
      } else {
        const { error } = await res.json()
        alert(error || 'Failed to delete step')
      }
    } catch (error) {
      console.error('Error deleting step:', error)
    }
  }

  const handleStepDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = steps.findIndex((s) => s.id === active.id)
    const newIndex = steps.findIndex((s) => s.id === over.id)

    const reordered = arrayMove(steps, oldIndex, newIndex)
    setSteps(reordered)

    // Update current step index to follow the active step
    if (currentStep && currentStep.id === active.id) {
      setCurrentStepIndex(newIndex)
    } else {
      // Find where the current step ended up
      const newCurrentIndex = reordered.findIndex((s) => s.id === currentStep?.id)
      if (newCurrentIndex >= 0) {
        setCurrentStepIndex(newCurrentIndex)
      }
    }

    // Save new order to DB
    for (let i = 0; i < reordered.length; i++) {
      await fetch('/api/wizard-steps', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reordered[i].id, sort_order: i }),
      })
    }
  }

  // === QUESTION HANDLERS ===

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

  const handleValueChange = (id: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, value } : q))
    )
  }

  const handleTitleEdit = async (id: number, title: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, display_title: title } : q))
    )
    await fetch('/api/knowledge', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, display_title: title }),
    })
  }

  const handleDelete = async (id: number) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id))
    await fetch(`/api/knowledge?id=${id}`, { method: 'DELETE' })
  }

  const handleQuestionDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = currentQuestions.findIndex((q) => q.id === active.id)
    const newIndex = currentQuestions.findIndex((q) => q.id === over.id)

    const reordered = arrayMove(currentQuestions, oldIndex, newIndex)

    const updatedQuestions = questions.map((q) => {
      const reorderedIndex = reordered.findIndex((r) => r.id === q.id)
      if (reorderedIndex !== -1) {
        return { ...q, sort_order: reorderedIndex }
      }
      return q
    })

    setQuestions(updatedQuestions)

    for (let i = 0; i < reordered.length; i++) {
      await fetch('/api/knowledge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reordered[i].id, sort_order: i }),
      })
    }
  }

  const handleAddQuestion = async () => {
    if (!newQuestionTitle.trim() || !currentStep) return

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

  // === NAVIGATION HANDLERS ===

  const handleNext = async () => {
    if (currentStepIndex < steps.length - 1) {
      setSaving(true)
      for (const q of currentQuestions) {
        await saveQuestion(q)
      }
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
      setSaving(false)
      setCurrentStepIndex(currentStepIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      for (const q of currentQuestions) {
        await saveQuestion(q)
      }
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

  const progress = steps.length > 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <Icons.Loader2 size={32} className="animate-spin" style={{ margin: '0 auto' }} />
        <p style={{ marginTop: '1rem', color: '#888' }}>Loading training data...</p>
      </div>
    )
  }

  return (
    <div className={styles.wizardPage}>
      {/* Sticky Header Section */}
      <div className={styles.wizardStickyHeader}>
        {/* Header with Add Step */}
        <div className={styles.wizardHeader}>
        <div>
          <h1>Training Wizard</h1>
          <p className={styles.wizardSubtitle}>Teach the AI evaluator about your business</p>
        </div>
        <div className={formStyles.addStepRow}>
          <span className={formStyles.addStepLabel}>Add Step</span>
          <input
            type="text"
            value={newStepTitle}
            onChange={(e) => setNewStepTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddStep()}
            placeholder="Step name..."
            className={formStyles.addStepInput}
          />
          <button
            type="button"
            onClick={handleAddStep}
            className={newStepTitle.trim() ? btnStyles.primary : btnStyles.secondary}
            disabled={!newStepTitle.trim()}
          >
            <Icons.Plus size={18} />
            Add
          </button>
        </div>
      </div>

        {/* Step Tabs with Drag & Drop */}
        {steps.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleStepDragEnd}
          >
            <SortableContext
              items={steps.map((s) => s.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div className={styles.wizardSteps}>
                {steps.map((step, index) => (
                  <SortableStepTab
                    key={step.id}
                    step={step}
                    index={index}
                    isActive={currentStepIndex === index}
                    status={getStepStatus(step.category)}
                    onClick={() => setCurrentStepIndex(index)}
                    onEdit={handleEditStep}
                    onDelete={handleDeleteStep}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className={formStyles.emptyState}>
            <Icons.Layers size={48} style={{ opacity: 0.3 }} />
            <p>No steps yet. Add one above to get started!</p>
          </div>
        )}

        {/* Progress Bar */}
        {steps.length > 0 && (
          <div className={styles.wizardProgressBar}>
            <div className={styles.wizardProgressFill} style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      {/* Scrollable Form Content */}
      {currentStep && (
        <div className={styles.wizardFormContainer}>
          <div className={styles.wizardFormCard}>
            {/* Step Title + Save Button */}
            <div className={formStyles.stepHeader}>
              <div className={formStyles.stepTitleRow}>
                {isEditingStepTitle ? (
                  <input
                    type="text"
                    value={editedStepTitle}
                    onChange={(e) => setEditedStepTitle(e.target.value)}
                    onBlur={() => {
                      if (editedStepTitle.trim() && editedStepTitle !== currentStep.title) {
                        handleEditStep(currentStep.id, editedStepTitle.trim())
                      }
                      setIsEditingStepTitle(false)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (editedStepTitle.trim() && editedStepTitle !== currentStep.title) {
                          handleEditStep(currentStep.id, editedStepTitle.trim())
                        }
                        setIsEditingStepTitle(false)
                      } else if (e.key === 'Escape') {
                        setIsEditingStepTitle(false)
                      }
                    }}
                    className={formStyles.formTitleInput}
                    autoFocus
                  />
                ) : (
                  <h2 
                    className={styles.wizardFormTitle}
                    onClick={() => {
                      setEditedStepTitle(currentStep.title)
                      setIsEditingStepTitle(true)
                    }}
                    style={{ cursor: 'pointer' }}
                    title="Click to edit"
                  >
                    {currentStep.title}
                  </h2>
                )}
                {currentQuestions.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExpandCollapseAll}
                    className={formStyles.expandCollapseBtn}
                  >
                    <Icons.ChevronsUpDown size={14} />
                    {currentQuestions.every(q => expandedQuestions.has(q.id)) ? 'Collapse All' : 'Expand All'}
                  </button>
                )}
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
            <div className={styles.wizardFormContent} key={currentStepIndex}>
              {currentQuestions.length === 0 ? (
                <div className={formStyles.emptyState}>
                  <Icons.FileQuestion size={48} style={{ opacity: 0.3 }} />
                  <p>No questions yet. Add one above!</p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleQuestionDragEnd}
                >
                  <SortableContext
                    items={currentQuestions.map((q) => q.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {currentQuestions.map((question) => (
                      <SortableQuestion
                        key={question.id}
                        question={question}
                        isExpanded={expandedQuestions.has(question.id)}
                        onToggleExpand={handleToggleExpand}
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
                disabled={currentStepIndex === 0}
              >
                <Icons.ChevronLeft size={18} />
                Previous
              </button>
              {currentStepIndex < steps.length - 1 ? (
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
      )}
    </div>
  )
}
