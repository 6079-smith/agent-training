import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Wand2, 
  FileText, 
  TestTube, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Clock
} from 'lucide-react';
import { health, prompts, testCases, knowledgeBase, evaluator } from '../lib/api';

export default function Dashboard() {
  const [stats, setStats] = useState({
    dbConnected: false,
    wizardComplete: false,
    promptVersions: 0,
    testCasesCount: 0,
    avgScore: null,
    loading: true
  });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const [healthRes, promptsRes, testsRes, wizardRes, resultsRes] = await Promise.all([
        health.check().catch(() => ({ data: { database: 'disconnected' } })),
        prompts.getAll().catch(() => ({ data: [] })),
        testCases.getAll().catch(() => ({ data: [] })),
        knowledgeBase.getWizardProgress().catch(() => ({ data: { completed: false } })),
        evaluator.getResults().catch(() => ({ data: [] }))
      ]);

      const results = resultsRes.data;
      const avgScore = results.length > 0 
        ? (results.reduce((sum, r) => sum + (r.evaluator_score || 0), 0) / results.length).toFixed(1)
        : null;

      setStats({
        dbConnected: healthRes.data.database === 'connected',
        wizardComplete: wizardRes.data.completed,
        promptVersions: promptsRes.data.length,
        testCasesCount: testsRes.data.length,
        avgScore,
        loading: false
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  }

  if (stats.loading) {
    return (
      <div style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ width: '32px', height: '32px', border: '2px solid var(--card-border)', borderTopColor: 'var(--link)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text)', margin: 0 }}>Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Overview of your prompt optimization progress</p>
      </div>

      {/* Status Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <StatusCard
          icon={stats.dbConnected ? CheckCircle2 : AlertCircle}
          label="Database"
          value={stats.dbConnected ? 'Connected' : 'Disconnected'}
          color={stats.dbConnected ? 'green' : 'red'}
        />
        <StatusCard
          icon={Wand2}
          label="Training Wizard"
          value={stats.wizardComplete ? 'Complete' : 'Incomplete'}
          color={stats.wizardComplete ? 'green' : 'yellow'}
        />
        <StatusCard
          icon={FileText}
          label="Prompt Versions"
          value={stats.promptVersions}
          color="blue"
        />
        <StatusCard
          icon={TestTube}
          label="Test Cases"
          value={stats.testCasesCount}
          color="purple"
        />
      </div>

      {/* Average Score */}
      {stats.avgScore && (
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ padding: '12px', background: 'rgba(68, 113, 186, 0.15)', borderRadius: '8px' }}>
              <TrendingUp style={{ width: '24px', height: '24px', color: 'var(--link)' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>Average Evaluation Score</p>
              <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--text)', margin: 0 }}>{stats.avgScore}/10</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card">
        <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'var(--text)', marginBottom: 'var(--space-3)' }}>Quick Actions</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {!stats.wizardComplete && (
            <QuickAction
              to="/wizard"
              icon={Wand2}
              title="Complete Training Wizard"
              description="Set up your business context for the AI evaluator"
              priority
            />
          )}
          
          {stats.promptVersions === 0 && (
            <QuickAction
              to="/prompts"
              icon={FileText}
              title="Create Your First Prompt Version"
              description="Import your current Make.com prompts to start testing"
            />
          )}
          
          {stats.testCasesCount === 0 && (
            <QuickAction
              to="/tests"
              icon={TestTube}
              title="Add Test Cases"
              description="Import historical email examples to test against"
            />
          )}
          
          <QuickAction
            to="/playground"
            icon={Clock}
            title="Quick Test"
            description="Test a prompt against an email without saving"
          />
        </div>
      </div>
    </div>
  );
}

function StatusCard({ icon: Icon, label, value, color }) {
  const colors = {
    green: { bg: 'rgba(70, 155, 59, 0.15)', text: 'var(--btn-success)' },
    red: { bg: 'rgba(239, 68, 68, 0.15)', text: 'var(--danger)' },
    yellow: { bg: 'rgba(245, 158, 11, 0.15)', text: 'var(--warning)' },
    blue: { bg: 'rgba(68, 113, 186, 0.15)', text: 'var(--link)' },
    purple: { bg: 'rgba(139, 92, 246, 0.15)', text: '#8B5CF6' },
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <div style={{ padding: '12px', background: colors[color].bg, borderRadius: '8px' }}>
          <Icon style={{ width: '20px', height: '20px', color: colors[color].text }} />
        </div>
        <div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>{label}</p>
          <p style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text)', margin: 0 }}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, title, description, priority }) {
  return (
    <Link
      to={to}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3)',
        borderRadius: '8px',
        border: '1px solid var(--card-border)',
        textDecoration: 'none',
        background: priority ? 'rgba(68, 113, 186, 0.1)' : 'transparent',
        transition: 'background 0.2s',
      }}
    >
      <div style={{ 
        padding: '8px', 
        borderRadius: '8px', 
        background: priority ? 'rgba(68, 113, 186, 0.15)' : 'var(--card)' 
      }}>
        <Icon style={{ width: '20px', height: '20px', color: priority ? 'var(--link)' : 'var(--text-secondary)' }} />
      </div>
      <div>
        <p style={{ fontWeight: 500, color: priority ? 'var(--link)' : 'var(--text)', margin: 0 }}>{title}</p>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>{description}</p>
      </div>
    </Link>
  );
}
