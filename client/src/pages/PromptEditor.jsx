import { useState, useEffect } from 'react';
import { Plus, Save, Check, Trash2, Copy, Star, Wand2 } from 'lucide-react';
import { prompts } from '../lib/api';

export default function PromptEditor() {
  const [versions, setVersions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState({
    name: '',
    system_prompt: '',
    user_prompt: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadVersions();
  }, []);

  async function loadVersions() {
    try {
      const res = await prompts.getAll();
      setVersions(res.data);
      if (res.data.length > 0 && !selected) {
        selectVersion(res.data[0]);
      }
    } catch (error) {
      console.error('Failed to load prompts:', error);
    } finally {
      setLoading(false);
    }
  }

  function selectVersion(version) {
    setSelected(version);
    setEditing({
      name: version.name,
      system_prompt: version.system_prompt,
      user_prompt: version.user_prompt,
      notes: version.notes || ''
    });
  }

  function handleNew() {
    setSelected(null);
    setEditing({
      name: `Version ${versions.length + 1}`,
      system_prompt: '',
      user_prompt: '',
      notes: ''
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (selected) {
        await prompts.update(selected.id, editing);
      } else {
        const res = await prompts.create(editing);
        setSelected(res.data);
      }
      await loadVersions();
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save prompt version');
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate() {
    if (!selected) return;
    try {
      await prompts.activate(selected.id);
      await loadVersions();
    } catch (error) {
      console.error('Failed to activate:', error);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (!confirm('Are you sure you want to delete this version?')) return;
    
    try {
      await prompts.delete(selected.id);
      setSelected(null);
      setEditing({ name: '', system_prompt: '', user_prompt: '', notes: '' });
      await loadVersions();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  }

  function handleCopy(text) {
    navigator.clipboard.writeText(text);
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await prompts.generate();
      setSelected(null);
      setEditing({
        name: res.data.name,
        system_prompt: res.data.system_prompt,
        user_prompt: res.data.user_prompt,
        notes: res.data.notes
      });
    } catch (error) {
      console.error('Failed to generate prompt:', error);
      alert('Failed to generate prompt from training data. Make sure you\'ve completed the Training Wizard first.');
    } finally {
      setGenerating(false);
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
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Version List Sidebar */}
      <div style={{ width: '256px', borderRight: '1px solid var(--card-border)', background: 'var(--card)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={handleGenerate} disabled={generating} className="button" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--link)', color: 'white' }}>
            <Wand2 style={{ width: '16px', height: '16px' }} />
            {generating ? 'Generating...' : 'Generate from Training'}
          </button>
          <button onClick={handleNew} className="button" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Plus style={{ width: '16px', height: '16px' }} />
            New Blank Version
          </button>
        </div>
        
        <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
          {versions.map(v => (
            <button
              key={v.id}
              onClick={() => selectVersion(v)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '4px',
                border: 'none',
                cursor: 'pointer',
                background: selected?.id === v.id ? 'rgba(68, 113, 186, 0.15)' : 'transparent',
                color: selected?.id === v.id ? 'var(--link)' : 'var(--text)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {v.is_active && <Star style={{ width: '16px', height: '16px', color: 'var(--warning)', fill: 'var(--warning)' }} />}
                <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {new Date(v.created_at).toLocaleDateString()}
              </div>
            </button>
          ))}
          
          {versions.length === 0 && (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0' }}>
              No prompt versions yet.<br />Create your first one!
            </p>
          )}
        </div>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-4)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <input
              type="text"
              value={editing.name}
              onChange={(e) => setEditing(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Version name..."
              style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text)', background: 'transparent', border: 'none', outline: 'none', padding: 0 }}
            />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {selected && !selected.is_active && (
                <button
                  onClick={handleActivate}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'transparent', border: 'none', color: 'var(--warning)', cursor: 'pointer', borderRadius: '8px' }}
                >
                  <Star style={{ width: '16px', height: '16px' }} />
                  Set Active
                </button>
              )}
              
              {selected && (
                <button
                  onClick={handleDelete}
                  className="iconButton"
                  style={{ color: 'var(--danger)' }}
                >
                  <Trash2 style={{ width: '16px', height: '16px' }} />
                </button>
              )}
              
              <button onClick={handleSave} disabled={saving} className="button">
                {saving ? 'Saving...' : <><Save style={{ width: '16px', height: '16px' }} /> Save</>}
              </button>
            </div>
          </div>

          {/* System Prompt */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>System Prompt</label>
              <button onClick={() => handleCopy(editing.system_prompt)} className="iconButton">
                <Copy style={{ width: '14px', height: '14px' }} />
              </button>
            </div>
            <textarea
              value={editing.system_prompt}
              onChange={(e) => setEditing(prev => ({ ...prev, system_prompt: e.target.value }))}
              rows={10}
              placeholder="Enter your system prompt here..."
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.875rem' }}
            />
          </div>

          {/* User Prompt */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>User Prompt</label>
              <button onClick={() => handleCopy(editing.user_prompt)} className="iconButton">
                <Copy style={{ width: '14px', height: '14px' }} />
              </button>
            </div>
            <textarea
              value={editing.user_prompt}
              onChange={(e) => setEditing(prev => ({ ...prev, user_prompt: e.target.value }))}
              rows={20}
              placeholder="Enter your user prompt here... Use {{13.thread}}, {{14.to[].email}}, {{14.subject}}, {{14.fromName}} as placeholders."
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.875rem' }}
            />
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Notes</label>
            <textarea
              value={editing.notes}
              onChange={(e) => setEditing(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              placeholder="What changes did you make in this version?"
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
