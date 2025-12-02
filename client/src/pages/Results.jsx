import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { evaluator, prompts } from '../lib/api';

export default function Results() {
  const [results, setResults] = useState([]);
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [summary, setSummary] = useState(null);
  const [expandedResult, setExpandedResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedVersion) {
      loadSummary(selectedVersion);
    }
  }, [selectedVersion]);

  async function loadData() {
    try {
      const [resultsRes, versionsRes] = await Promise.all([
        evaluator.getResults(),
        prompts.getAll()
      ]);
      setResults(resultsRes.data);
      setVersions(versionsRes.data);
      
      if (versionsRes.data.length > 0) {
        const active = versionsRes.data.find(v => v.is_active);
        setSelectedVersion(active?.id || versionsRes.data[0].id);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadSummary(versionId) {
    try {
      const res = await evaluator.getSummary(versionId);
      setSummary(res.data);
    } catch (error) {
      console.error('Failed to load summary:', error);
    }
  }

  const filteredResults = selectedVersion
    ? results.filter(r => r.prompt_version_id === selectedVersion)
    : results;

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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text)', margin: 0 }}>Results</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Evaluation history and performance metrics</p>
        </div>
        
        <select
          value={selectedVersion || ''}
          onChange={(e) => setSelectedVersion(e.target.value ? parseInt(e.target.value) : null)}
        >
          <option value="">All Versions</option>
          {versions.map(v => (
            <option key={v.id} value={v.id}>
              {v.name} {v.is_active ? '(Active)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      {summary && selectedVersion && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <SummaryCard
            label="Total Tests"
            value={summary.total_tests}
          />
          <SummaryCard
            label="Average Score"
            value={summary.avg_score ? parseFloat(summary.avg_score).toFixed(1) : 'N/A'}
            suffix="/10"
            color={
              summary.avg_score >= 7 ? 'green' :
              summary.avg_score >= 4 ? 'yellow' : 'red'
            }
          />
          <SummaryCard
            label="Min Score"
            value={summary.min_score || 'N/A'}
            suffix="/10"
          />
          <SummaryCard
            label="Max Score"
            value={summary.max_score || 'N/A'}
            suffix="/10"
          />
        </div>
      )}

      {/* Rule Performance */}
      {summary?.ruleCounts && Object.keys(summary.ruleCounts).length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'var(--text)', marginBottom: 'var(--space-3)' }}>Rule Performance</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(summary.ruleCounts).map(([rule, counts]) => {
              const total = counts.pass + counts.fail;
              const passRate = total > 0 ? (counts.pass / total) * 100 : 0;
              
              return (
                <div key={rule}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{rule}</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {counts.pass}/{total} passed ({passRate.toFixed(0)}%)
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--card-border)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div
                      style={{ 
                        height: '100%', 
                        borderRadius: '999px',
                        background: passRate >= 80 ? 'var(--btn-success)' : passRate >= 50 ? 'var(--warning)' : 'var(--danger)',
                        width: `${passRate}%` 
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Results List */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--card-border)' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'var(--text)', margin: 0 }}>Test Results</h2>
        </div>
        
        {filteredResults.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No results yet. Run some tests in the Playground!
          </div>
        ) : (
          <div>
            {filteredResults.map(result => (
              <div key={result.id} style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--card-border)' }}>
                <button
                  onClick={() => setExpandedResult(expandedResult === result.id ? null : result.id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ 
                      fontSize: '1.25rem', 
                      fontWeight: 'bold', 
                      color: result.evaluator_score >= 7 ? 'var(--btn-success)' : result.evaluator_score >= 4 ? 'var(--warning)' : 'var(--danger)'
                    }}>
                      {result.evaluator_score}/10
                    </div>
                    <div>
                      <p style={{ fontWeight: 500, color: 'var(--text)', margin: 0 }}>{result.test_case_name}</p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
                        {result.prompt_version_name} • {new Date(result.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {expandedResult === result.id ? (
                    <ChevronUp style={{ width: '20px', height: '20px', color: 'var(--text-muted)' }} />
                  ) : (
                    <ChevronDown style={{ width: '20px', height: '20px', color: 'var(--text-muted)' }} />
                  )}
                </button>
                
                {expandedResult === result.id && (
                  <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--card-border)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                      <div>
                        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Email Thread</p>
                        <pre style={{ fontSize: '0.75rem', background: 'var(--bg)', padding: '12px', borderRadius: '8px', overflow: 'auto', maxHeight: '192px', color: 'var(--text-muted)' }}>
                          {result.email_thread}
                        </pre>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Agent Response</p>
                        <div 
                          style={{ fontSize: '0.875rem', background: 'var(--bg)', padding: '12px', borderRadius: '8px', overflow: 'auto', maxHeight: '192px', color: 'var(--text-muted)' }}
                          dangerouslySetInnerHTML={{ __html: result.agent_response }}
                        />
                      </div>
                    </div>
                    
                    <div style={{ marginTop: 'var(--space-3)' }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Reasoning</p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>{result.evaluator_reasoning}</p>
                    </div>
                    
                    {result.rule_checks && (
                      <div style={{ marginTop: 'var(--space-3)' }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Rule Checks</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {Object.entries(result.rule_checks).map(([rule, check]) => (
                            <span
                              key={rule}
                              style={{
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                borderRadius: '999px',
                                background: check.status === 'PASS' ? 'rgba(70, 155, 59, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: check.status === 'PASS' ? 'var(--btn-success)' : 'var(--danger)'
                              }}
                            >
                              {rule}: {check.status}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, suffix = '', color = 'gray' }) {
  const colors = {
    green: 'var(--btn-success)',
    yellow: 'var(--warning)',
    red: 'var(--danger)',
    gray: 'var(--text)'
  };

  return (
    <div className="card">
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>{label}</p>
      <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: colors[color], margin: 0 }}>
        {value}{suffix}
      </p>
    </div>
  );
}
