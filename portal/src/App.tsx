import { useState, useEffect } from 'react';
import ModuleSection from './components/ModuleSection';

interface Module {
  id: string;
  name: string;
  description: string;
  type: 'link' | 'route' | 'external';
  url?: string;
  status: 'available' | 'coming-soon';
}

const sections: { title: string; modules: Module[] }[] = [
  {
    title: 'AI Applications',
    modules: [
      {
        id: 'open-claude',
        name: 'OpenClaude',
        description: 'AI Agent core service. Fixed port 18789.',
        type: 'external',
        url: 'http://localhost:18789',
        status: 'available',
      },
      {
        id: 'iclaw',
        name: 'iClaw',
        description: 'OpenClaw device management and configuration console.',
        type: 'route',
        url: '/app/iclaw/',
        status: 'available',
      },
      {
        id: 'claude-code',
        name: 'Claude Code',
        description: 'AI programming assistant for intelligent code generation.',
        type: 'route',
        status: 'coming-soon',
      },
    ],
  },
  {
    title: 'Extended Applications',
    modules: [
      {
        id: 'qingliu',
        name: 'QingLiu',
        description: 'Enterprise no-code platform for rapid business application development.',
        type: 'route',
        status: 'coming-soon',
      },
    ],
  },
  {
    title: 'AI Configuration',
    modules: [
      {
        id: 'llm-router',
        name: 'LLM Router',
        description: 'Large language model routing and intelligent request distribution.',
        type: 'route',
        status: 'coming-soon',
      },
      {
        id: 'skillhub',
        name: 'Skillhub',
        description: 'AI skills center for management and configuration.',
        type: 'route',
        status: 'coming-soon',
      },
      {
        id: 'toolshub',
        name: 'Toolshub',
        description: 'AI tools center for extending capabilities.',
        type: 'route',
        status: 'coming-soon',
      },
    ],
  },
  {
    title: 'System Functions',
    modules: [
      {
        id: 'tailscale',
        name: 'Tailscale',
        description: 'Network tunneling and mesh VPN for secure remote access.',
        type: 'route',
        status: 'coming-soon',
      },
      {
        id: 'file-manager',
        name: 'File Manager',
        description: 'Device file browser and editor. Fixed port 8081.',
        type: 'external',
        url: 'http://localhost:8081',
        status: 'available',
      },
      {
        id: 'terminal',
        name: 'Terminal',
        description: 'Web-based terminal session management.',
        type: 'route',
        url: '/app/terminal/',
        status: 'available',
      },
      {
        id: 'ota',
        name: 'OTA Update',
        description: 'Remote device firmware upgrade. Fixed port 8089.',
        type: 'external',
        url: 'http://localhost:8089',
        status: 'available',
      },
    ],
  },
];

function ThemeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-8 h-8 flex items-center justify-center rounded text-content-secondary hover:text-content-primary hover:bg-surface-elevated transition-colors"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        /* Sun icon */
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="5" strokeWidth={1.5} />
          <path strokeLinecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeWidth={1.5} />
        </svg>
      ) : (
        /* Moon icon */
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  );
}

function App() {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <div className="min-h-screen bg-surface-app">
      {/* Header */}
      <header className="border-b border-edge">
        <div className="max-w-grid mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-medium text-content-primary tracking-tight">
                iClaw Portal
              </h1>
              <p className="text-xs text-content-tertiary mt-0.5">
                OpenClaw Management Interface
              </p>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
              <span className="text-2xs text-content-tertiary uppercase tracking-widest">
                v0.1.0
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-grid mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-6">
          {sections.map((section) => (
            <div key={section.title} className="col-span-12">
              <ModuleSection title={section.title} modules={section.modules} />
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-edge mt-auto">
        <div className="max-w-grid mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-2xs text-content-tertiary">
              OpenClaw Portal
            </span>
            <span className="text-2xs text-content-tertiary">
              Good design is as little design as possible.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
