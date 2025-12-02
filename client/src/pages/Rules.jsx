import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import { evaluator } from '../lib/api';

export default function Rules() {
  const [rules, setRules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    description: '',
    check_prompt: '',
    priority: 0
  });

  useEffect(() => {
    loadRules();
  }, []);

  async function loadRules() {
    try {
      const res = await evaluator.getRules();
      setRules(res.data);
    } catch (error) {
      console.error('Failed to load rules:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleNew() {
    setSelected(null);
    setForm({
      name: '',
      description: '',
      check_prompt: '',
      priority: 0
    });
    setShowForm(true);
  }

  function handleEdit(rule) {
    setSelected(rule);
    setForm({
      name: rule.name,
      description: rule.description || '',
      check_prompt: rule.check_prompt,
      priority: rule.priority || 0
    });
    setShowForm(true);
  }

  async function handleSave() {
    try {
      if (selected) {
        await evaluator.updateRule(selected.id, { ...form, is_active: selected.is_active });
      } else {
        await evaluator.createRule(form);
      }
      setShowForm(false);
      await loadRules();
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save rule');
    }
  }

  async function handleToggle(rule) {
    try {
      await evaluator.updateRule(rule.id, {
        ...rule,
        is_active: !rule.is_active
      });
      await loadRules();
    } catch (error) {
      console.error('Failed to toggle:', error);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this rule?')) return;
    try {
      await evaluator.deleteRule(id);
      await loadRules();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ width: '32px', height: '32px', border: '2px solid var(--card-border)', borderTopColor: 'var(--link)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text)', margin: 0 }}>Evaluator Rules</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Define what the AI Evaluator checks for</p>
        </div>
        <button onClick={handleNew} className="button" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus style={{ width: '16px', height: '16px' }} />
          Add Rule
        </button>
      </div>

      {/* Rules List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {rules.map(rule => (
          <div key={rule.id} className="card" style={{ opacity: rule.is_active ? 1 : 0.6 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h3 style={{ fontWeight: 500, color: 'var(--text)', margin: 0 }}>{rule.name}</h3>
                  {rule.priority > 0 && (
                    <span style={{ padding: '2px 8px', background: 'rgba(68, 113, 186, 0.15)', color: 'var(--link)', fontSize: '0.75rem', borderRadius: '999px' }}>
                      Priority: {rule.priority}
                    </span>
                  )}
                </div>
                {rule.description && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{rule.description}</p>
                )}
                <div style={{ marginTop: '12px', padding: '12px', background: 'var(--bg)', borderRadius: '8px' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Check Prompt:</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontFamily: 'monospace', margin: 0 }}>{rule.check_prompt}</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
                <button
                  onClick={() => handleToggle(rule)}
                  style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: rule.is_active ? 'var(--btn-success)' : 'var(--text-muted)' }}
                  title={rule.is_active ? 'Active' : 'Inactive'}
                >
                  {rule.is_active ? (
                    <ToggleRight style={{ width: '24px', height: '24px' }} />
                  ) : (
                    <ToggleLeft style={{ width: '24px', height: '24px' }} />
                  )}
                </button>
                <button onClick={() => handleEdit(rule)} className="iconButton">
                  <Edit2 style={{ width: '14px', height: '14px' }} />
                </button>
                <button onClick={() => handleDelete(rule.id)} className="iconButton" style={{ color: 'var(--danger)' }}>
                  <Trash2 style={{ width: '14px', height: '14px' }} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {rules.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>No rules defined yet.</p>
          <button onClick={handleNew} style={{ color: 'var(--link)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
            + Add your first rule
          </button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ background: 'var(--card)', borderRadius: '10px', maxWidth: '640px', width: '100%', maxHeight: '90vh', overflow: 'auto', border: '1px solid var(--card-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3)', borderBottom: '1px solid var(--card-border)' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'var(--text)', margin: 0 }}>
                {selected ? 'Edit Rule' : 'New Rule'}
              </h2>
              <button onClick={() => setShowForm(false)} className="iconButton">
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>
            
            <div style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Rule Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Escalation on Refund Keywords"
                  style={{ width: '100%' }}
                />
              </div>
              
              <div>
                <label className="label">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of what this rule checks"
                  style={{ width: '100%' }}
                />
              </div>
              
              <div>
                <label className="label">Check Prompt *</label>
                <textarea
                  value={form.check_prompt}
                  onChange={(e) => setForm(prev => ({ ...prev, check_prompt: e.target.value }))}
                  rows={6}
                  placeholder="Instructions for the evaluator to check this rule. Should end with 'Return PASS if... FAIL if...'"
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.875rem' }}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  The evaluator will use this prompt to determine if the rule passes or fails.
                </p>
              </div>
              
              <div>
                <label className="label">Priority</label>
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                  min="0"
                  style={{ width: '128px' }}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Higher priority rules are checked first. Default is 0.
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: 'var(--space-3)', borderTop: '1px solid var(--card-border)' }}>
              <button
                onClick={() => setShowForm(false)}
                style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button onClick={handleSave} className="button">
                <Save style={{ width: '16px', height: '16px' }} />
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
