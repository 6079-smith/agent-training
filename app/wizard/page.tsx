'use client'

import { useState, useEffect, ReactNode } from 'react'
import styles from '@/styles/components.module.css'
import btnStyles from '@/styles/buttons.module.css'
import formStyles from '@/styles/forms.module.css'
import * as Icons from 'lucide-react'

// Collapsible Section Component
function CollapsibleSection({ 
  title, 
  children, 
  defaultOpen = false 
}: { 
  title: string
  children: ReactNode
  defaultOpen?: boolean 
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  
  return (
    <div className={formStyles.formGroupSection}>
      <div 
        className={formStyles.sectionHeader}
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className={formStyles.sectionLabel}>{title}</h3>
        <Icons.ChevronDown 
          size={20} 
          className={`${formStyles.sectionToggle} ${!isOpen ? formStyles.collapsed : ''}`}
        />
      </div>
      <div className={`${formStyles.sectionContent} ${!isOpen ? formStyles.collapsed : ''}`}>
        {children}
      </div>
    </div>
  )
}

const STEPS = [
  { id: 1, title: 'Business Basics', icon: Icons.Building2 },
  { id: 2, title: 'Policies', icon: Icons.FileText },
  { id: 3, title: 'Capabilities', icon: Icons.Zap },
  { id: 4, title: 'Tone & Sign-offs', icon: Icons.MessageSquare },
  { id: 5, title: 'Failure Patterns', icon: Icons.AlertTriangle },
]

// Map database keys to form fields
const DB_TO_FORM_MAP: Record<string, string> = {
  // Business
  'business.company_name': 'companyName',
  'business.products': 'products',
  'business.ship_to_countries': 'countries',
  'business.no_ship_countries': 'notShipTo',
  // Policies
  'policies.refund_policy': 'refundPolicy',
  'policies.shipping_policy': 'shippingPolicy',
  'policies.escalation_triggers': 'escalationTriggers',
  // Capabilities
  'capabilities.can_do': 'canDo',
  'capabilities.cannot_do': 'cannotDo',
  'capabilities.tools_available': 'toolsAvailable',
  // Tone
  'tone.disclose_ai': 'discloseAi',
  'tone.phrases_include': 'phrasesInclude',
  'tone.phrases_avoid': 'phrasesAvoid',
  'tone.sign_off_happy_path': 'signOffHappyPath',
  'tone.sign_off_de_escalation': 'signOffDeEscalation',
  'tone.sign_off_anxiety_management': 'signOffAnxietyManagement',
  'tone.sign_off_rules': 'signOffRules',
  // Failures
  'failures.common_mistakes': 'commonMistakes',
  'failures.hallucination_examples': 'hallucinationExamples',
  'failures.must_never_say': 'mustNeverSay',
}

// Reverse map for saving
const FORM_TO_DB_MAP: Record<string, { category: string; key: string }> = {
  // Business
  companyName: { category: 'business', key: 'company_name' },
  products: { category: 'business', key: 'products' },
  countries: { category: 'business', key: 'ship_to_countries' },
  notShipTo: { category: 'business', key: 'no_ship_countries' },
  // Policies
  refundPolicy: { category: 'policies', key: 'refund_policy' },
  shippingPolicy: { category: 'policies', key: 'shipping_policy' },
  escalationTriggers: { category: 'policies', key: 'escalation_triggers' },
  // Capabilities
  canDo: { category: 'capabilities', key: 'can_do' },
  cannotDo: { category: 'capabilities', key: 'cannot_do' },
  toolsAvailable: { category: 'capabilities', key: 'tools_available' },
  // Tone
  discloseAi: { category: 'tone', key: 'disclose_ai' },
  phrasesInclude: { category: 'tone', key: 'phrases_include' },
  phrasesAvoid: { category: 'tone', key: 'phrases_avoid' },
  signOffHappyPath: { category: 'tone', key: 'sign_off_happy_path' },
  signOffDeEscalation: { category: 'tone', key: 'sign_off_de_escalation' },
  signOffAnxietyManagement: { category: 'tone', key: 'sign_off_anxiety_management' },
  signOffRules: { category: 'tone', key: 'sign_off_rules' },
  // Failures
  commonMistakes: { category: 'failures', key: 'common_mistakes' },
  hallucinationExamples: { category: 'failures', key: 'hallucination_examples' },
  mustNeverSay: { category: 'failures', key: 'must_never_say' },
}

export default function WizardPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    // Step 1: Business Basics
    companyName: '',
    products: '',
    countries: '',
    notShipTo: '',
    
    // Step 2: Policies
    refundPolicy: '',
    shippingPolicy: '',
    escalationTriggers: '',
    
    // Step 3: Capabilities
    canDo: '',
    cannotDo: '',
    toolsAvailable: '',
    
    // Step 4: Tone & Sign-offs
    discloseAi: '',
    phrasesInclude: '',
    phrasesAvoid: '',
    signOffHappyPath: '',
    signOffDeEscalation: '',
    signOffAnxietyManagement: '',
    signOffRules: '',
    
    // Step 5: Failure Patterns
    commonMistakes: '',
    hallucinationExamples: '',
    mustNeverSay: '',
  })

  // Clean up country data by extracting just the country list
  const cleanCountryData = (value: string): string => {
    // Remove preamble text and extract just the country list
    const codeBlockMatch = value.match(/```\n?([\s\S]*?)```/)
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim()
    }
    // If no code block, try to find where the country list starts
    const lines = value.split('\n')
    const countryStartIndex = lines.findIndex(line => 
      /^[A-Z][a-zA-Z\s&'À-ÿ]+$/.test(line.trim()) && line.trim().length > 2
    )
    if (countryStartIndex > 0) {
      return lines.slice(countryStartIndex).join('\n').trim()
    }
    return value
  }

  // Load existing data from knowledge base
  useEffect(() => {
    async function loadKnowledge() {
      try {
        const res = await fetch('/api/knowledge')
        if (!res.ok) throw new Error('Failed to fetch knowledge')
        const { data } = await res.json()
        
        const newFormData = { ...formData }
        for (const item of data) {
          const dbKey = `${item.category}.${item.key}`
          const formField = DB_TO_FORM_MAP[dbKey]
          if (formField && formField in newFormData) {
            let value = item.value
            // Clean up country fields
            if (formField === 'countries' || formField === 'notShipTo') {
              value = cleanCountryData(value)
            }
            (newFormData as any)[formField] = value
          }
        }
        setFormData(newFormData)
      } catch (error) {
        console.error('Error loading knowledge:', error)
      } finally {
        setLoading(false)
      }
    }
    loadKnowledge()
  }, [])

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    try {
      // Save each form field to the knowledge base
      for (const [field, value] of Object.entries(formData)) {
        if (!value) continue // Skip empty fields
        const dbMapping = FORM_TO_DB_MAP[field]
        if (!dbMapping) continue
        
        await fetch('/api/knowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: dbMapping.category,
            key: dbMapping.key,
            value: value,
          }),
        })
      }
      alert('Training data saved successfully!')
    } catch (error) {
      console.error('Error saving:', error)
      alert('Failed to save training data')
    }
  }

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value })
  }

  const progress = (currentStep / STEPS.length) * 100

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <CollapsibleSection title="Company Name">
              <input
                type="text"
                className={formStyles.input}
                value={formData.companyName}
                onChange={(e) => updateField('companyName', e.target.value)}
                placeholder="e.g., Acme Corp"
              />
            </CollapsibleSection>
            <CollapsibleSection title="Products">
              <textarea
                className={`${formStyles.textarea} ${formStyles.textareaLarge}`}
                value={formData.products}
                onChange={(e) => updateField('products', e.target.value)}
                rows={8}
                placeholder="Describe your products (e.g., snuff, snus, pouches)..."
              />
            </CollapsibleSection>
            <CollapsibleSection title="Countries You Ship To">
              <textarea
                className={`${formStyles.textarea} ${formStyles.textareaLarge}`}
                value={formData.countries}
                onChange={(e) => updateField('countries', e.target.value)}
                rows={8}
                placeholder="List countries..."
              />
            </CollapsibleSection>
            <CollapsibleSection title="Countries You Do NOT Ship To">
              <textarea
                className={`${formStyles.textarea} ${formStyles.textareaLarge}`}
                value={formData.notShipTo}
                onChange={(e) => updateField('notShipTo', e.target.value)}
                rows={8}
                placeholder="List countries..."
              />
            </CollapsibleSection>
          </>
        )
      case 2:
        return (
          <>
            <CollapsibleSection title="Refund Policy">
              <textarea
                className={`${formStyles.textarea} ${formStyles.textareaLarge}`}
                value={formData.refundPolicy}
                onChange={(e) => updateField('refundPolicy', e.target.value)}
                rows={10}
                placeholder="Describe your refund policy..."
              />
            </CollapsibleSection>
            <CollapsibleSection title="Shipping Policy">
              <textarea
                className={`${formStyles.textarea} ${formStyles.textareaLarge}`}
                value={formData.shippingPolicy}
                onChange={(e) => updateField('shippingPolicy', e.target.value)}
                rows={10}
                placeholder="Describe your shipping policy..."
              />
            </CollapsibleSection>
            <CollapsibleSection title="Escalation Triggers">
              <textarea
                className={`${formStyles.textarea} ${formStyles.textareaLarge}`}
                value={formData.escalationTriggers}
                onChange={(e) => updateField('escalationTriggers', e.target.value)}
                rows={10}
                placeholder="When should issues be escalated to a human?"
              />
            </CollapsibleSection>
          </>
        )
      case 3:
        return (
          <>
            <CollapsibleSection title="What CAN Your Agents Do?">
              <textarea
                className={`${formStyles.textarea} ${formStyles.textareaLarge}`}
                value={formData.canDo}
                onChange={(e) => updateField('canDo', e.target.value)}
                rows={10}
                placeholder="List capabilities..."
              />
            </CollapsibleSection>
            <CollapsibleSection title="What CANNOT Your Agents Do?">
              <textarea
                className={`${formStyles.textarea} ${formStyles.textareaLarge}`}
                value={formData.cannotDo}
                onChange={(e) => updateField('cannotDo', e.target.value)}
                rows={10}
                placeholder="List limitations..."
              />
            </CollapsibleSection>
            <CollapsibleSection title="Tools Available">
              <textarea
                className={`${formStyles.textarea} ${formStyles.textareaLarge}`}
                value={formData.toolsAvailable}
                onChange={(e) => updateField('toolsAvailable', e.target.value)}
                rows={10}
                placeholder="What tools/integrations are available to agents?"
              />
            </CollapsibleSection>
          </>
        )
      case 4:
        return (
          <>
            <CollapsibleSection title="Disclose AI?">
              <input
                type="text"
                className={formStyles.input}
                value={formData.discloseAi}
                onChange={(e) => updateField('discloseAi', e.target.value)}
                placeholder="Yes/No - Should the agent disclose it's an AI?"
              />
            </CollapsibleSection>
            <CollapsibleSection title="Phrases to Include">
              <textarea
                className={`${formStyles.textarea} ${formStyles.textareaLarge}`}
                value={formData.phrasesInclude}
                onChange={(e) => updateField('phrasesInclude', e.target.value)}
                rows={10}
                placeholder="Phrases agents should use..."
              />
            </CollapsibleSection>
            <CollapsibleSection title="Phrases to Avoid">
              <textarea
                className={`${formStyles.textarea} ${formStyles.textareaLarge}`}
                value={formData.phrasesAvoid}
                onChange={(e) => updateField('phrasesAvoid', e.target.value)}
                rows={10}
                placeholder="Phrases agents should NOT use..."
              />
            </CollapsibleSection>
            <CollapsibleSection title="Sign-off: Happy Path">
              <textarea
                className={`${formStyles.textarea} ${formStyles.textareaLarge}`}
                value={formData.signOffHappyPath}
                onChange={(e) => updateField('signOffHappyPath', e.target.value)}
                rows={6}
                placeholder="Sign-offs for positive interactions..."
              />
            </CollapsibleSection>
            <CollapsibleSection title="Sign-off: De-escalation">
              <textarea
                className={`${formStyles.textarea} ${formStyles.textareaLarge}`}
                value={formData.signOffDeEscalation}
                onChange={(e) => updateField('signOffDeEscalation', e.target.value)}
                rows={6}
                placeholder="Sign-offs for complaint resolution..."
              />
            </CollapsibleSection>
            <CollapsibleSection title="Sign-off: Anxiety Management">
              <textarea
                className={`${formStyles.textarea} ${formStyles.textareaLarge}`}
                value={formData.signOffAnxietyManagement}
                onChange={(e) => updateField('signOffAnxietyManagement', e.target.value)}
                rows={6}
                placeholder="Sign-offs for worried customers..."
              />
            </CollapsibleSection>
            <CollapsibleSection title="Sign-off Rules">
              <textarea
                className={`${formStyles.textarea} ${formStyles.textareaLarge}`}
                value={formData.signOffRules}
                onChange={(e) => updateField('signOffRules', e.target.value)}
                rows={8}
                placeholder="General rules for sign-offs..."
              />
            </CollapsibleSection>
          </>
        )
      case 5:
        return (
          <>
            <CollapsibleSection title="Common Mistakes">
              <textarea
                className={`${formStyles.textarea} ${formStyles.textareaLarge}`}
                value={formData.commonMistakes}
                onChange={(e) => updateField('commonMistakes', e.target.value)}
                rows={10}
                placeholder="Common mistakes agents make..."
              />
            </CollapsibleSection>
            <CollapsibleSection title="Hallucination Examples">
              <textarea
                className={`${formStyles.textarea} ${formStyles.textareaLarge}`}
                value={formData.hallucinationExamples}
                onChange={(e) => updateField('hallucinationExamples', e.target.value)}
                rows={10}
                placeholder="Examples of incorrect information agents have generated..."
              />
            </CollapsibleSection>
            <CollapsibleSection title="Must Never Say">
              <textarea
                className={`${formStyles.textarea} ${formStyles.textareaLarge}`}
                value={formData.mustNeverSay}
                onChange={(e) => updateField('mustNeverSay', e.target.value)}
                rows={10}
                placeholder="Things agents must NEVER say..."
              />
            </CollapsibleSection>
          </>
        )
      default:
        return null
    }
  }

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
              } ${
                currentStep > step.id ? styles.wizardStepComplete : ''
              }`}
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
          <h2 className={styles.wizardFormTitle}>{STEPS[currentStep - 1].title}</h2>
          <div className={styles.wizardFormContent} key={currentStep}>
            {renderStepContent()}
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
              <button onClick={handleNext} className={btnStyles.primary}>
                Next
                <Icons.ChevronRight size={18} />
              </button>
            ) : (
              <button onClick={handleSubmit} className={btnStyles.primary}>
                <Icons.Check size={18} />
                Complete Training
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
