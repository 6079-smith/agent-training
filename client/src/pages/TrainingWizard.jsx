import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, ChevronRight, ChevronLeft, Save } from 'lucide-react';
import { knowledgeBase } from '../lib/api';

const wizardSteps = [
  {
    id: 'business',
    title: 'Business Basics',
    questions: [
      { key: 'company_name', label: 'What is your company name?', type: 'text' },
      { key: 'products', label: 'What products do you sell? (e.g., snuff, snus, pouches)', type: 'textarea' },
      { key: 'ship_to_countries', label: 'Which countries do you ship to?', type: 'textarea' },
      { key: 'no_ship_countries', label: 'Which countries do you NOT ship to?', type: 'textarea' },
    ]
  },
  {
    id: 'policies',
    title: 'Policies',
    questions: [
      { key: 'refund_policy', label: 'What is your refund policy? (conditions, timeframes)', type: 'textarea' },
      { key: 'shipping_policy', label: 'What is your shipping policy? (carriers, timeframes by region)', type: 'textarea' },
      { key: 'escalation_triggers', label: 'What triggers mandatory escalation to a human? (keywords, situations)', type: 'textarea' },
    ]
  },
  {
    id: 'capabilities',
    title: 'Capabilities & Limitations',
    questions: [
      { key: 'can_do', label: 'What CAN your support team do? (e.g., issue refunds, update addresses, check tracking)', type: 'textarea' },
      { key: 'cannot_do', label: 'What can you NOT do? (e.g., contact couriers, monitor parcels, add to restock lists)', type: 'textarea' },
      { key: 'tools_available', label: 'What tools/data does the Agent have access to? (e.g., Shopify MCP, order lookup)', type: 'textarea' },
    ]
  },
  {
    id: 'tone',
    title: 'Tone & Brand',
    questions: [
      { key: 'sign_off_happy_path', label: 'Happy Path Sign-off (Standard Inquiries) - What should the Agent use for normal customer inquiries?', type: 'textarea' },
      { key: 'sign_off_de_escalation', label: 'De-Escalation Sign-off (Delays & Problems) - What should the Agent use when addressing delays and problems?', type: 'textarea' },
      { key: 'sign_off_anxiety_management', label: "We've Got Your Back Sign-off (Anxiety Management) - What should the Agent use for anxious or concerned customers?", type: 'textarea' },
      { key: 'sign_off_rules', label: 'Sign-off Rules (Do\'s and Don\'ts) - Include rules like: DO match customer\'s tone, DON\'t use "Happy Snuffing" for complaints, DO include tracking link', type: 'textarea' },
      { key: 'disclose_ai', label: 'Should the Agent disclose it is an AI?', type: 'select', options: ['Yes', 'No'] },
      { key: 'phrases_avoid', label: 'Any phrases to ALWAYS avoid?', type: 'textarea' },
      { key: 'phrases_include', label: 'Any phrases to ALWAYS include?', type: 'textarea' },
    ]
  },
  {
    id: 'failures',
    title: 'Known Failure Patterns',
    questions: [
      { key: 'hallucination_examples', label: 'Describe examples of hallucinated/wrong responses the Agent has given:', type: 'textarea' },
      { key: 'common_mistakes', label: 'What are the most common mistakes the Agent makes?', type: 'textarea' },
      { key: 'must_never_say', label: 'What must the Agent NEVER say or offer?', type: 'textarea' },
    ]
  }
];

export default function TrainingWizard({ setNavigationProtection }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [initialAnswers, setInitialAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [isNavigatingAway, setIsNavigatingAway] = useState(false);

  // Define hasUnsavedChanges early so it can be used in useEffects
  const hasUnsavedChanges = useCallback(() => {
    return JSON.stringify(answers) !== JSON.stringify(initialAnswers);
  }, [answers, initialAnswers]);

  useEffect(() => {
    loadExistingData();
  }, []);

  // Update global navigation protection
  useEffect(() => {
    if (setNavigationProtection) {
      setNavigationProtection({
        hasUnsavedChanges,
        showUnsavedDialog: () => setShowUnsavedDialog(true),
        setPendingNavigation
      });
    }
  }, [hasUnsavedChanges, setPendingNavigation, setNavigationProtection]);

  // Browser navigation protection
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Simple navigation protection - check location changes
  useEffect(() => {
    const handleLocationChange = () => {
      if (hasUnsavedChanges() && !isNavigatingAway && location.pathname !== '/wizard') {
        // User is trying to navigate away with unsaved changes
        setPendingNavigation(() => () => {
          setIsNavigatingAway(true);
          // Navigation will continue after user decision
        });
        setShowUnsavedDialog(true);
        return false;
      }
    };

    // This will be triggered when component unmounts ( navigation away
    return handleLocationChange;
  }, [location, hasUnsavedChanges, isNavigatingAway]);

  async function loadExistingData() {
    console.log('TrainingWizard: Loading existing data...');
    try {
      const [kbRes, progressRes] = await Promise.all([
        knowledgeBase.getAll(),
        knowledgeBase.getWizardProgress()
      ]);

      console.log('TrainingWizard: Data loaded successfully', { kbRes, progressRes });

      // Flatten knowledge base into answers
      const existingAnswers = {};
      for (const [category, items] of Object.entries(kbRes.data)) {
        for (const [key, value] of Object.entries(items)) {
          existingAnswers[key] = value;
        }
      }
      setAnswers(existingAnswers);
      setInitialAnswers(existingAnswers);
      
      if (progressRes.data.current_step) {
        setCurrentStep(progressRes.data.current_step);
      }
    } catch (error) {
      console.error('TrainingWizard: Failed to load existing data:', error);
      // Set empty initial state so component still renders
      setAnswers({});
      setInitialAnswers({});
    } finally {
      console.log('TrainingWizard: Setting loading to false');
      setLoading(false);
    }
  }

  function handleChange(key, value) {
    setAnswers(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function saveProgress() {
    setSaving(true);
    try {
      // Convert answers to knowledge base entries
      const entries = [];
      for (const step of wizardSteps) {
        for (const q of step.questions) {
          if (answers[q.key]) {
            entries.push({
              category: step.id,
              key: q.key,
              value: answers[q.key]
            });
          }
        }
      }

      await knowledgeBase.bulkUpsert(entries);
      await knowledgeBase.updateWizardProgress({
        current_step: currentStep,
        completed: currentStep === wizardSteps.length - 1
      });

      setInitialAnswers(answers);
      setSaved(true);
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save progress. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAndNavigate() {
    await saveProgress();
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
    setShowUnsavedDialog(false);
  }

  function handleDisregardAndNavigate() {
    setAnswers(initialAnswers);
    setSaved(true);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
    setShowUnsavedDialog(false);
  }

  function handleCancelNavigation() {
    setPendingNavigation(null);
    setShowUnsavedDialog(false);
  }

  function handleSaveAndNavigateAway() {
    handleSaveAndNavigate();
    setIsNavigatingAway(false);
  }

  function handleDisregardAndNavigateAway() {
    handleDisregardAndNavigate();
    setIsNavigatingAway(false);
  }

  async function handleNext() {
    if (hasUnsavedChanges()) {
      setPendingNavigation(() => () => {
        if (currentStep < wizardSteps.length - 1) {
          setCurrentStep(prev => prev + 1);
        }
      });
      setShowUnsavedDialog(true);
    } else {
      if (currentStep < wizardSteps.length - 1) {
        setCurrentStep(prev => prev + 1);
      }
    }
  }

  function handlePrev() {
    if (hasUnsavedChanges()) {
      setPendingNavigation(() => () => {
        if (currentStep > 0) {
          setCurrentStep(prev => prev - 1);
        }
      });
      setShowUnsavedDialog(true);
    } else {
      if (currentStep > 0) {
        setCurrentStep(prev => prev - 1);
      }
    }
  }

  async function handleComplete() {
    await saveProgress();
    await knowledgeBase.updateWizardProgress({
      current_step: wizardSteps.length - 1,
      completed: true
    });
    alert('Training Wizard complete! The AI Evaluator now has your business context.');
  }

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ width: '32px', height: '32px', border: '2px solid var(--card-border)', borderTopColor: 'var(--link)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  const step = wizardSteps[currentStep];

  return (
    <div style={{ padding: 'var(--space-4)', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text)', margin: 0 }}>Training Wizard</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Teach the AI Evaluator about your business</p>
      </div>

      {/* Progress Steps */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-4)', overflowX: 'auto', paddingBottom: '8px' }}>
        {wizardSteps.map((s, i) => (
          <button
            key={s.id}
            onClick={() => {
              if (hasUnsavedChanges() && i !== currentStep) {
                setPendingNavigation(() => () => setCurrentStep(i));
                setShowUnsavedDialog(true);
              } else if (i !== currentStep) {
                setCurrentStep(i);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              border: 'none',
              cursor: 'pointer',
              background: i === currentStep 
                ? 'rgba(68, 113, 186, 0.15)' 
                : i < currentStep 
                  ? 'rgba(70, 155, 59, 0.15)' 
                  : 'var(--card)',
              color: i === currentStep 
                ? 'var(--link)' 
                : i < currentStep 
                  ? 'var(--btn-success)' 
                  : 'var(--text-muted)',
            }}
          >
            {i < currentStep ? (
              <CheckCircle2 style={{ width: '16px', height: '16px' }} />
            ) : (
              <span style={{ 
                width: '20px', 
                height: '20px', 
                borderRadius: '50%', 
                background: 'var(--card-border)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '0.75rem' 
              }}>
                {i + 1}
              </span>
            )}
            {s.title}
          </button>
        ))}
      </div>

      {/* Current Step Form */}
      <div className="card">
        <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'var(--text)', marginBottom: 'var(--space-4)' }}>{step.title}</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {step.questions.map(q => (
            <div key={q.key}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                {q.label}
              </label>
              
              {q.type === 'text' && (
                <input
                  type="text"
                  value={answers[q.key] || ''}
                  onChange={(e) => handleChange(q.key, e.target.value)}
                  style={{ width: '100%' }}
                />
              )}
              
              {q.type === 'textarea' && (
                <textarea
                  value={answers[q.key] || ''}
                  onChange={(e) => handleChange(q.key, e.target.value)}
                  rows={4}
                  style={{ width: '100%' }}
                />
              )}
              
              {q.type === 'select' && (
                <select
                  value={answers[q.key] || ''}
                  onChange={(e) => handleChange(q.key, e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">Select...</option>
                  {q.options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--card-border)' }}>
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="button"
          >
            <ChevronLeft style={{ width: '16px', height: '16px' }} />
            Previous
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={saveProgress}
              disabled={saving}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '8px 16px', 
                background: 'transparent', 
                border: 'none', 
                color: 'var(--text-secondary)', 
                cursor: 'pointer' 
              }}
            >
              <Save style={{ width: '16px', height: '16px' }} />
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Progress'}
            </button>

            {currentStep === wizardSteps.length - 1 ? (
              <button
                onClick={handleComplete}
                disabled={saving}
                className="button success"
              >
                <CheckCircle2 style={{ width: '16px', height: '16px' }} />
                Complete Wizard
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={saving}
                className="button"
              >
                Next
                <ChevronRight style={{ width: '16px', height: '16px' }} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Unsaved Changes Dialog */}
      {showUnsavedDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="card" style={{
            maxWidth: '500px',
            width: '100%',
            padding: 'var(--space-4)',
            position: 'relative',
            background: 'var(--card)',
            border: '1px solid var(--card-border)',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: 'var(--text)',
              margin: '0 0 var(--space-3) 0'
            }}>
              Unsaved Changes
            </h3>
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              margin: '0 0 var(--space-4) 0',
              lineHeight: '1.5'
            }}>
              {isNavigatingAway 
                ? 'You have unsaved changes. Would you like to save them before leaving this page?'
                : 'You have unsaved changes. Would you like to save them before navigating away?'
              }
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 'var(--space-3)',
              paddingTop: 'var(--space-3)',
              borderTop: '1px solid var(--card-border)'
            }}>
              <button
                onClick={handleCancelNavigation}
                style={{
                  background: '#9ca3af',
                  border: '1px solid #6b7280',
                  color: '#6b7280',
                  padding: '8px 16px',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  borderRadius: '6px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={isNavigatingAway ? handleDisregardAndNavigateAway : handleDisregardAndNavigate}
                style={{
                  background: '#dc2626',
                  border: '1px solid #dc2626',
                  color: 'white',
                  padding: '8px 16px',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  borderRadius: '6px'
                }}
              >
                {isNavigatingAway ? 'Discard & Leave' : 'Disregard Changes'}
              </button>
              <button
                onClick={isNavigatingAway ? handleSaveAndNavigateAway : handleSaveAndNavigate}
                disabled={saving}
                style={{
                  background: 'var(--link)',
                  border: '1px solid var(--link)',
                  color: 'white',
                  padding: '8px 16px',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  borderRadius: '6px'
                }}
              >
                {saving ? 'Saving...' : (isNavigatingAway ? 'Save & Leave' : 'Save & Continue')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
