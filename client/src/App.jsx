import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { createContext, useContext, useState } from 'react'
import { 
  Wand2, 
  FileText, 
  TestTube, 
  Play, 
  BarChart3, 
  Settings,
  BookOpen,
  HelpCircle
} from 'lucide-react'

import TrainingWizard from './pages/TrainingWizard'
import PromptEditor from './pages/PromptEditor'
import TestSuite from './pages/TestSuite'
import Playground from './pages/Playground'
import Results from './pages/Results'
import Rules from './pages/Rules'
import Dashboard from './pages/Dashboard'
import Walkthrough from './pages/Walkthrough'

// Create context for navigation protection
const NavigationProtectionContext = createContext();

// Custom NavLink wrapper that checks for unsaved changes
function ProtectedNavLink({ to, children, ...props }) {
  const { hasUnsavedChanges, showUnsavedDialog, setPendingNavigation } = useContext(NavigationProtectionContext);
  const location = useLocation();
  
  const handleClick = (e) => {
    // Only intercept navigation if we have a valid hasUnsavedChanges function AND there are actual unsaved changes
    if (hasUnsavedChanges && typeof hasUnsavedChanges === 'function' && location.pathname !== to) {
      try {
        const hasChanges = hasUnsavedChanges();
        if (hasChanges) {
          e.preventDefault();
          setPendingNavigation(() => () => {
            window.location.href = to;
          });
          showUnsavedDialog();
          return;
        }
      } catch (error) {
        // If there's an error checking for unsaved changes, allow normal navigation
        console.error('Error checking unsaved changes:', error);
      }
    }
    // In all other cases (no function, no changes, same page, or error), allow normal navigation
  };
  
  return (
    <NavLink
      to={to}
      onClick={handleClick}
      {...props}
    >
      {children}
    </NavLink>
  );
}

const navItems = [
  { path: '/', icon: BarChart3, label: 'Dashboard' },
  { path: '/wizard', icon: Wand2, label: 'Training Wizard' },
  { path: '/prompts', icon: FileText, label: 'Prompt Editor' },
  { path: '/tests', icon: TestTube, label: 'Test Suite' },
  { path: '/playground', icon: Play, label: 'Playground' },
  { path: '/results', icon: BookOpen, label: 'Results' },
  { path: '/rules', icon: Settings, label: 'Evaluator Rules' },
  { path: '/walkthrough', icon: HelpCircle, label: 'Walkthrough' },
]

function App() {
  const [navigationProtection, setNavigationProtection] = useState({
    hasUnsavedChanges: null,
    showUnsavedDialog: null,
    setPendingNavigation: null
  });

  return (
    <NavigationProtectionContext.Provider value={navigationProtection}>
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside style={{ 
        width: 'var(--nav-width)', 
        background: 'var(--card)', 
        borderRight: '1px solid var(--card-border)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--card-border)' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text)', margin: 0 }}>
            CS Agent Optimizer
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Prompt Training Workbench
          </p>
        </div>
        
        <nav style={{ flex: 1, padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map(({ path, icon: Icon, label }) => (
            <ProtectedNavLink
              key={path}
              to={path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'background 0.2s',
                background: isActive ? 'rgba(68, 113, 186, 0.15)' : 'transparent',
                color: isActive ? 'var(--link)' : 'var(--text-secondary)',
              })}
            >
              <Icon style={{ width: '20px', height: '20px' }} />
              {label}
            </ProtectedNavLink>
          ))}
        </nav>
        
        <div style={{ padding: 'var(--space-3)', borderTop: '1px solid var(--card-border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Phase 1 • Local Development
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/wizard" element={<TrainingWizard setNavigationProtection={setNavigationProtection} />} />
          <Route path="/prompts" element={<PromptEditor />} />
          <Route path="/tests" element={<TestSuite />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/results" element={<Results />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/walkthrough" element={<Walkthrough />} />
        </Routes>
      </main>
      </div>
    </NavigationProtectionContext.Provider>
  )
}

export default App
