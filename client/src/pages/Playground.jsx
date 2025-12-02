import { useState, useEffect } from 'react';
import { Play, Loader2, CheckCircle2, XCircle, Copy, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { prompts, generator, evaluator } from '../lib/api';

export default function Playground() {
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [emailThread, setEmailThread] = useState('');
  const [metadata, setMetadata] = useState({
    customerName: '',
    customerEmail: '',
    subject: ''
  });
  const [response, setResponse] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [improving, setImproving] = useState(false);

  useEffect(() => {
    loadVersions();
  }, []);

  async function loadVersions() {
    try {
      const res = await prompts.getAll();
      setVersions(res.data);
      const active = res.data.find(v => v.is_active);
      if (active) setSelectedVersion(active.id);
    } catch (error) {
      console.error('Failed to load versions:', error);
    }
  }

  async function handleRun() {
    if (!emailThread.trim()) {
      alert('Please enter an email thread');
      return;
    }

    setLoading(true);
    setResponse(null);
    setEvaluation(null);

    try {
      const res = await generator.run({
        promptVersionId: selectedVersion,
        emailThread,
        metadata
      });

      if (res.data.success) {
        setResponse(res.data.response);
      } else {
        alert('Failed to generate response: ' + res.data.error);
      }
    } catch (error) {
      console.error('Failed to run:', error);
      alert('Failed to generate response');
    } finally {
      setLoading(false);
    }
  }

  async function handleEvaluate() {
    if (!response) return;

    setEvaluating(true);
    try {
      const res = await evaluator.evaluate({
        emailThread,
        agentResponse: response
      });

      if (res.data.success) {
        setEvaluation(res.data.evaluation);
      } else {
        alert('Failed to evaluate: ' + res.data.error);
      }
    } catch (error) {
      console.error('Failed to evaluate:', error);
      alert('Failed to evaluate response');
    } finally {
      setEvaluating(false);
    }
  }

  function copyResponse() {
    if (response) {
      navigator.clipboard.writeText(response);
    }
  }

  async function handleAutoImprove() {
    if (!evaluation || !selectedVersion) return;

    setImproving(true);
    try {
      const res = await prompts.autoImprove({
        promptVersionId: selectedVersion,
        evaluation,
        emailThread,
        agentResponse: response
      });

      if (res.data) {
        const failedRulesList = res.data.failedRules.map(f => f.rule).join(', ');
        
        // Save the improved prompt as a new version
        const saveRes = await prompts.create({
          name: res.data.name,
          system_prompt: res.data.system_prompt,
          user_prompt: res.data.user_prompt,
          notes: res.data.notes
        });
        
        if (saveRes.data) {
          alert(`✨ Auto-Improvement Complete!\n\nFailed Rules Fixed: ${failedRulesList}\n\nOriginal Score: ${evaluation.overallScore}/10\n\nA new improved prompt version has been created: "${res.data.name}"\n\nYou can now:\n1. Test this new version in the Playground\n2. Review it in the Prompt Editor\n3. Compare it with the original\n\nTokens used: ${res.data.usage?.inputTokens || 0} in, ${res.data.usage?.outputTokens || 0} out`);
          
          // Reload versions to include the new one
          await loadVersions();
          
          // Optionally select the new version
          setSelectedVersion(saveRes.data.id);
          
          // Clear current test to encourage re-testing
          setResponse(null);
          setEvaluation(null);
        }
      }
    } catch (error) {
      console.error('Failed to auto-improve:', error);
      alert('Failed to generate prompt improvements. Make sure your ANTHROPIC_API_KEY is set in the server .env file.');
    } finally {
      setImproving(false);
    }
  }

  return (
    <div style={{ padding: 'var(--space-4)', height: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text)', margin: 0 }}>Playground</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Test prompts against emails in real-time</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-4)' }}>
        {/* Input Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div className="card">
            <label className="label">Prompt Version</label>
            <select
              value={selectedVersion || ''}
              onChange={(e) => setSelectedVersion(e.target.value ? parseInt(e.target.value) : null)}
              style={{ width: '100%' }}
            >
              <option value="">Select a version...</option>
              {versions.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} {v.is_active ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="card">
            <label className="label">Email Thread</label>
            <textarea
              value={emailThread}
              onChange={(e) => setEmailThread(e.target.value)}
              rows={16}
              placeholder="Paste the customer email thread here..."
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.875rem' }}
            />
          </div>

          <div className="card">
            <button
              onClick={() => setShowMetadata(!showMetadata)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: 0,
                fontSize: '0.875rem',
                fontWeight: 500
              }}
            >
              {showMetadata ? <ChevronDown style={{ width: '16px', height: '16px' }} /> : <ChevronRight style={{ width: '16px', height: '16px' }} />}
              Email Metadata (Optional)
            </button>
            
            {showMetadata && (
              <div style={{ marginTop: 'var(--space-3)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={metadata.customerName}
                    onChange={(e) => setMetadata(prev => ({ ...prev, customerName: e.target.value }))}
                  />
                  <input
                    type="email"
                    placeholder="Customer Email"
                    value={metadata.customerEmail}
                    onChange={(e) => setMetadata(prev => ({ ...prev, customerEmail: e.target.value }))}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Subject"
                  value={metadata.subject}
                  onChange={(e) => setMetadata(prev => ({ ...prev, subject: e.target.value }))}
                  style={{ width: '100%', marginTop: 'var(--space-2)' }}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'var(--space-2)', marginBottom: 0 }}>
                  These fields are used for personalization in the AI response
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleRun}
            disabled={loading || !selectedVersion}
            className="button"
            style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {loading ? (
              <>
                <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
                Generating...
              </>
            ) : (
              <>
                <Play style={{ width: '20px', height: '20px' }} />
                Generate Response
              </>
            )}
          </button>
        </div>

        {/* Output Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {/* Response */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label className="label" style={{ margin: 0 }}>Agent Response</label>
              {response && (
                <button onClick={copyResponse} className="iconButton">
                  <Copy style={{ width: '14px', height: '14px' }} />
                </button>
              )}
            </div>
            
            {response ? (
              <div 
                style={{ 
                  padding: 'var(--space-3)', 
                  background: 'var(--bg)', 
                  borderRadius: '8px', 
                  border: '1px solid var(--card-border)', 
                  color: 'var(--text-secondary)', 
                  fontSize: '0.875rem',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.6',
                  fontFamily: 'inherit'
                }}
              >
                {response}
              </div>
            ) : (
              <div style={{ height: '192px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                Response will appear here...
              </div>
            )}
          </div>

          {/* Evaluate Button */}
          {response && !evaluation && (
            <button
              onClick={handleEvaluate}
              disabled={evaluating}
              className="button success"
              style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {evaluating ? (
                <>
                  <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
                  Evaluating...
                </>
              ) : (
                <>
                  <CheckCircle2 style={{ width: '20px', height: '20px' }} />
                  Evaluate Response
                </>
              )}
            </button>
          )}

          {/* Auto-Improve Button */}
          {evaluation && (
            <button
              onClick={handleAutoImprove}
              disabled={improving}
              className="button"
              style={{ 
                width: '100%', 
                padding: '12px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none'
              }}
            >
              {improving ? (
                <>
                  <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles style={{ width: '20px', height: '20px' }} />
                  Auto-Improve Prompt
                </>
              )}
            </button>
          )}

          {/* Evaluation Results */}
          {evaluation && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                <label className="label" style={{ margin: 0 }}>Evaluation Results</label>
                <div style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 'bold', 
                  color: evaluation.overallScore >= 7 ? 'var(--btn-success)' : evaluation.overallScore >= 4 ? 'var(--warning)' : 'var(--danger)'
                }}>
                  {evaluation.overallScore}/10
                </div>
              </div>

              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>{evaluation.reasoning}</p>

              {/* Rule Checks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Rule Checks:</p>
                {Object.entries(evaluation.ruleChecks || {}).map(([rule, check]) => (
                  <div
                    key={rule}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      padding: '8px',
                      borderRadius: '8px',
                      background: check.status === 'PASS' ? 'rgba(70, 155, 59, 0.1)' : 'rgba(239, 68, 68, 0.1)'
                    }}
                  >
                    {check.status === 'PASS' ? (
                      <CheckCircle2 style={{ width: '16px', height: '16px', color: 'var(--btn-success)', marginTop: '2px' }} />
                    ) : (
                      <XCircle style={{ width: '16px', height: '16px', color: 'var(--danger)', marginTop: '2px' }} />
                    )}
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 500, color: check.status === 'PASS' ? 'var(--btn-success)' : 'var(--danger)', margin: 0 }}>
                        {rule}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{check.reason}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Suggestions */}
              {evaluation.suggestions && evaluation.suggestions.length > 0 && (
                <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--card-border)' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Suggestions:</p>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {evaluation.suggestions.map((s, i) => (
                      <li key={i} style={{ marginBottom: '4px' }}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
