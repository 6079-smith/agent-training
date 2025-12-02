import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Save, Tag } from 'lucide-react';
import { testCases } from '../lib/api';

export default function TestSuite() {
  const [cases, setCases] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    email_thread: '',
    customer_email: '',
    customer_name: '',
    subject: '',
    order_number: '',
    expected_behavior: '',
    tags: []
  });

  useEffect(() => {
    loadCases();
  }, []);

  async function loadCases() {
    try {
      const res = await testCases.getAll();
      setCases(res.data);
    } catch (error) {
      console.error('Failed to load test cases:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleNew() {
    setSelected(null);
    setForm({
      name: '',
      email_thread: '',
      customer_email: '',
      customer_name: '',
      subject: '',
      order_number: '',
      expected_behavior: '',
      tags: []
    });
    setShowForm(true);
  }

  function handleEdit(tc) {
    setSelected(tc);
    setForm({
      name: tc.name,
      email_thread: tc.email_thread,
      customer_email: tc.customer_email || '',
      customer_name: tc.customer_name || '',
      subject: tc.subject || '',
      order_number: tc.order_number || '',
      expected_behavior: tc.expected_behavior || '',
      tags: tc.tags || []
    });
    setShowForm(true);
  }

  async function handleSave() {
    try {
      if (selected) {
        await testCases.update(selected.id, form);
      } else {
        await testCases.create(form);
      }
      setShowForm(false);
      await loadCases();
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save test case');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this test case?')) return;
    try {
      await testCases.delete(id);
      await loadCases();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  }

  function addTag(tag) {
    if (tag && !form.tags.includes(tag)) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, tag] }));
    }
  }

  function removeTag(tag) {
    setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text)', margin: 0 }}>Test Suite</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Email examples to test your prompts against</p>
        </div>
        <button onClick={handleNew} className="button" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus style={{ width: '16px', height: '16px' }} />
          Add Test Case
        </button>
      </div>

      {/* Test Cases Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-3)' }}>
        {cases.map(tc => (
          <div key={tc.id} className="card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{tc.name}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button onClick={() => handleEdit(tc)} className="iconButton">
                  <Edit2 style={{ width: '14px', height: '14px' }} />
                </button>
                <button onClick={() => handleDelete(tc.id)} className="iconButton" style={{ color: 'var(--danger)' }}>
                  <Trash2 style={{ width: '14px', height: '14px' }} />
                </button>
              </div>
            </div>
            
            {tc.subject && (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Subject: {tc.subject}
              </p>
            )}
            
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '12px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {tc.email_thread.substring(0, 150)}...
            </p>
            
            {tc.tags && tc.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {tc.tags.map(tag => (
                  <span key={tag} className="badge">{tag}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {cases.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>No test cases yet. Add your first one!</p>
          <button onClick={handleNew} style={{ color: 'var(--link)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
            + Add Test Case
          </button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ background: 'var(--card)', borderRadius: '10px', maxWidth: '640px', width: '100%', maxHeight: '90vh', overflow: 'auto', border: '1px solid var(--card-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3)', borderBottom: '1px solid var(--card-border)' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'var(--text)', margin: 0 }}>
                {selected ? 'Edit Test Case' : 'New Test Case'}
              </h2>
              <button onClick={() => setShowForm(false)} className="iconButton">
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>
            
            <div style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Refund request - frustrated customer"
                  style={{ width: '100%' }}
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Customer Name</label>
                  <input
                    type="text"
                    value={form.customer_name}
                    onChange={(e) => setForm(prev => ({ ...prev, customer_name: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="label">Customer Email</label>
                  <input
                    type="email"
                    value={form.customer_email}
                    onChange={(e) => setForm(prev => ({ ...prev, customer_email: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Subject</label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm(prev => ({ ...prev, subject: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="label">Order Number</label>
                  <input
                    type="text"
                    value={form.order_number}
                    onChange={(e) => setForm(prev => ({ ...prev, order_number: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
              
              <div>
                <label className="label">Email Thread *</label>
                <textarea
                  value={form.email_thread}
                  onChange={(e) => setForm(prev => ({ ...prev, email_thread: e.target.value }))}
                  rows={8}
                  placeholder="Paste the full email thread here..."
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.875rem' }}
                />
              </div>
              
              <div>
                <label className="label">Expected Behavior</label>
                <textarea
                  value={form.expected_behavior}
                  onChange={(e) => setForm(prev => ({ ...prev, expected_behavior: e.target.value }))}
                  rows={3}
                  placeholder="What should the agent do? e.g., 'Should escalate to human because refund keyword present'"
                  style={{ width: '100%' }}
                />
              </div>
              
              <div>
                <label className="label">Tags</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                  {form.tags.map(tag => (
                    <span key={tag} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: 'rgba(68, 113, 186, 0.15)', color: 'var(--link)', fontSize: '0.875rem', borderRadius: '999px' }}>
                      {tag}
                      <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}>
                        <X style={{ width: '12px', height: '12px' }} />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Add tag and press Enter..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  {['refund', 'shipping', 'escalation', 'hallucination', 'tone'].map(tag => (
                    <button
                      key={tag}
                      onClick={() => addTag(tag)}
                      style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'var(--card-border)', color: 'var(--text-secondary)', borderRadius: '999px', border: 'none', cursor: 'pointer' }}
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
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
