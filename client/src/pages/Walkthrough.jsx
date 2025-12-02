import { BookOpen, GraduationCap, FileText, FlaskConical, Play, BarChart3, Shield, ArrowRight } from 'lucide-react';

export default function Walkthrough() {
  return (
    <div style={{ padding: 'var(--space-4)', height: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text)', margin: 0 }}>App Walkthrough</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Learn how to use the CS Agent Prompt Optimizer</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', maxWidth: '800px' }}>
        
        {/* Training Wizard */}
        <Section
          icon={<GraduationCap style={{ width: '20px', height: '20px' }} />}
          title="1. Training Wizard"
          subtitle="Start Here"
          purpose="Teach the AI evaluator about your business context."
        >
          <ol style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            <li style={{ marginBottom: '8px' }}>Navigate to <strong>Training Wizard</strong> in the sidebar</li>
            <li style={{ marginBottom: '8px' }}>Complete the 4 steps:
              <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                <li><strong>Business Info</strong> – Enter your company name, industry, and description</li>
                <li><strong>Products/Services</strong> – List what you sell (name, description, price)</li>
                <li><strong>Policies</strong> – Add your business policies (refunds, shipping, etc.)</li>
                <li><strong>Brand Voice</strong> – Define tone, phrases to use/avoid, examples</li>
              </ul>
            </li>
            <li>Click <strong>Complete Training</strong> to save</li>
          </ol>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '12px', fontStyle: 'italic' }}>
            This context helps the evaluator understand what's correct for your business.
          </p>
        </Section>

        {/* Prompt Editor */}
        <Section
          icon={<FileText style={{ width: '20px', height: '20px' }} />}
          title="2. Prompt Editor"
          purpose="Manage different versions of your CS agent's system prompt."
        >
          <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            <li style={{ marginBottom: '8px' }}><strong>View versions</strong> in the left sidebar</li>
            <li style={{ marginBottom: '8px' }}><strong>Create new versions</strong> to experiment with different prompts</li>
            <li style={{ marginBottom: '8px' }}><strong>Set Active</strong> to mark which version should be used</li>
          </ul>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '12px', fontStyle: 'italic' }}>
            The prompt text is what gets sent to Claude when generating responses.
          </p>
        </Section>

        {/* Test Suite */}
        <Section
          icon={<FlaskConical style={{ width: '20px', height: '20px' }} />}
          title="3. Test Suite"
          purpose="Create reusable test cases (sample emails)."
        >
          <ol style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            <li style={{ marginBottom: '8px' }}>Click <strong>Add Test Case</strong></li>
            <li style={{ marginBottom: '8px' }}>Enter:
              <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                <li><strong>Name</strong> – e.g., "Refund Request - Within Policy"</li>
                <li><strong>Email Thread</strong> – The customer email content</li>
                <li><strong>Expected Behavior</strong> – What a good response should do</li>
              </ul>
            </li>
            <li>Save the test case</li>
          </ol>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '12px', fontStyle: 'italic' }}>
            These become your regression tests to ensure prompt changes don't break things.
          </p>
        </Section>

        {/* Playground */}
        <Section
          icon={<Play style={{ width: '20px', height: '20px' }} />}
          title="4. Playground"
          purpose="Test prompts against emails in real-time."
        >
          <ol style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            <li style={{ marginBottom: '8px' }}>Select a <strong>Prompt Version</strong> from the dropdown</li>
            <li style={{ marginBottom: '8px' }}>Enter <strong>Email Metadata</strong> (customer name, email, subject)</li>
            <li style={{ marginBottom: '8px' }}>Paste the <strong>Email Thread</strong></li>
            <li style={{ marginBottom: '8px' }}>Click <strong>Generate Response</strong> – Claude generates a reply</li>
            <li>Click <strong>Evaluate Response</strong> – AI scores it against your rules</li>
          </ol>
        </Section>

        {/* Results */}
        <Section
          icon={<BarChart3 style={{ width: '20px', height: '20px' }} />}
          title="5. Results"
          purpose="View evaluation history and track performance."
        >
          <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            <li style={{ marginBottom: '8px' }}>See <strong>scores over time</strong> for each prompt version</li>
            <li style={{ marginBottom: '8px' }}>View <strong>rule performance</strong> (which rules pass/fail most)</li>
            <li style={{ marginBottom: '8px' }}>Expand results to see full email, response, and reasoning</li>
            <li>Compare versions to find your best-performing prompt</li>
          </ul>
        </Section>

        {/* Evaluator Rules */}
        <Section
          icon={<Shield style={{ width: '20px', height: '20px' }} />}
          title="6. Evaluator Rules"
          purpose="Define what the AI checks for when scoring responses."
        >
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '12px' }}>
            Pre-seeded rules check for:
          </p>
          <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            <li style={{ marginBottom: '4px' }}>Hallucinations (making up info)</li>
            <li style={{ marginBottom: '4px' }}>Proper escalation triggers</li>
            <li style={{ marginBottom: '4px' }}>Professional tone</li>
            <li style={{ marginBottom: '4px' }}>Policy compliance</li>
          </ul>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '12px', fontStyle: 'italic' }}>
            You can add/edit/disable rules to match your quality standards.
          </p>
        </Section>

        {/* Complete Workflow */}
        <div className="card" style={{ background: 'rgba(68, 113, 186, 0.1)', border: '1px solid rgba(68, 113, 186, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'var(--space-3)' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--link)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <ArrowRight style={{ width: '20px', height: '20px' }} />
            </div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'var(--text)', margin: 0 }}>Complete Optimization Workflow</h2>
          </div>
          
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text)', margin: '0 0 8px 0' }}>Phase 1: Foundation Setup</h3>
            <ol style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <li style={{ marginBottom: '8px' }}><strong>Complete Training Wizard</strong> – Teach the AI evaluator about your business context, policies, and brand voice</li>
            </ol>
          </div>
          
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text)', margin: '0 0 8px 0' }}>Phase 2: Import & Baseline</h3>
            <ol style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.875rem' }} start="2">
              <li style={{ marginBottom: '8px' }}><strong>Import Current Prompts</strong> – Add your existing Make.com System and User prompts to the Prompt Editor</li>
              <li style={{ marginBottom: '8px' }}><strong>Set Baseline Version</strong> – Mark your current prompts as the active version</li>
              <li style={{ marginBottom: '8px' }}><strong>Add Test Cases</strong> – Import historical customer emails representing common scenarios (refunds, shipping, escalations, etc.)</li>
            </ol>
          </div>
          
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text)', margin: '0 0 8px 0' }}>Phase 3: Testing & Evaluation</h3>
            <ol style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.875rem' }} start="5">
              <li style={{ marginBottom: '8px' }}><strong>Test in Playground</strong> – Generate responses to sample emails and get instant AI evaluation scores</li>
              <li style={{ marginBottom: '8px' }}><strong>Run Full Test Suite</strong> – Test your active prompts against all imported test cases for comprehensive evaluation</li>
              <li style={{ marginBottom: '8px' }}><strong>Review Evaluation Results</strong> – Analyze scores, rule compliance, and detailed feedback from the AI evaluator</li>
            </ol>
          </div>
          
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text)', margin: '0 0 8px 0' }}>Phase 4: Iteration & Improvement</h3>
            <ol style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.875rem' }} start="8">
              <li style={{ marginBottom: '8px' }}><strong>Edit Prompts Based on Feedback</strong> – Refine your prompts using insights from evaluation results</li>
              <li style={{ marginBottom: '8px' }}><strong>Create New Versions</strong> – Save iterative improvements as separate versions for comparison</li>
              <li style={{ marginBottom: '8px' }}><strong>Compare Performance</strong> – Track improvements across versions using the Results dashboard</li>
              <li style={{ marginBottom: '8px' }}><strong>Repeat Testing</strong> – Continue the test-evaluate-improve cycle until satisfied with performance</li>
            </ol>
          </div>
          
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text)', margin: '0 0 8px 0' }}>Phase 5: Deployment</h3>
            <ol style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.875rem' }} start="12">
              <li style={{ marginBottom: '8px' }}><strong>Select Best Version</strong> – Choose your highest-performing prompt version based on consistent test results</li>
              <li style={{ marginBottom: '8px' }}><strong>Export to Make.com</strong> – Copy the optimized System and User prompts from the Prompt Editor</li>
              <li><strong>Deploy & Monitor</strong> – Paste into your Make.com Agent configuration and monitor real-world performance</li>
            </ol>
          </div>
          
          <div style={{ marginTop: 'var(--space-3)', padding: '12px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '6px' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--link)', fontWeight: 500 }}>
              🎯 <strong>Key Output:</strong> Production-ready prompts that consistently generate high-quality, on-brand customer service responses following all your business rules.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

function Section({ icon, title, subtitle, purpose, children }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'var(--space-2)' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--link)' }}>
          {icon}
        </div>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'var(--text)', margin: 0 }}>
            {title}
            {subtitle && <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: 'var(--btn-success)', fontWeight: 500 }}>({subtitle})</span>}
          </h2>
        </div>
      </div>
      <p style={{ fontSize: '0.875rem', color: 'var(--link)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>
        {purpose}
      </p>
      {children}
    </div>
  );
}
