import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ModuleSection from './components/ModuleSection';

interface Module {
  id: string;
  nameKey: string;
  descriptionKey: string;
  type: 'link' | 'route' | 'external';
  url?: string;
  status: 'available' | 'coming-soon';
}

const sections: { titleKey: string; modules: Module[] }[] = [
  {
    titleKey: 'sections.aiApplications',
    modules: [
      {
        id: 'open-claude',
        nameKey: 'modules.openClaude.name',
        descriptionKey: 'modules.openClaude.description',
        type: 'external',
        url: 'http://localhost:18789',
        status: 'available',
      },
      {
        id: 'iclaw',
        nameKey: 'modules.iclaw.name',
        descriptionKey: 'modules.iclaw.description',
        type: 'route',
        url: '/app/iclaw/',
        status: 'available',
      },
      {
        id: 'claude-code',
        nameKey: 'modules.claudeCode.name',
        descriptionKey: 'modules.claudeCode.description',
        type: 'route',
        status: 'coming-soon',
      },
    ],
  },
  {
    titleKey: 'sections.extendedApplications',
    modules: [
      {
        id: 'qingliu',
        nameKey: 'modules.qingliu.name',
        descriptionKey: 'modules.qingliu.description',
        type: 'route',
        status: 'coming-soon',
      },
    ],
  },
  {
    titleKey: 'sections.aiConfiguration',
    modules: [
      {
        id: 'llm-router',
        nameKey: 'modules.llmRouter.name',
        descriptionKey: 'modules.llmRouter.description',
        type: 'route',
        status: 'coming-soon',
      },
      {
        id: 'skillhub',
        nameKey: 'modules.skillhub.name',
        descriptionKey: 'modules.skillhub.description',
        type: 'route',
        status: 'coming-soon',
      },
      {
        id: 'toolshub',
        nameKey: 'modules.toolshub.name',
        descriptionKey: 'modules.toolshub.description',
        type: 'route',
        status: 'coming-soon',
      },
    ],
  },
  {
    titleKey: 'sections.systemFunctions',
    modules: [
      {
        id: 'tailscale',
        nameKey: 'modules.tailscale.name',
        descriptionKey: 'modules.tailscale.description',
        type: 'route',
        status: 'coming-soon',
      },
      {
        id: 'file-manager',
        nameKey: 'modules.fileManager.name',
        descriptionKey: 'modules.fileManager.description',
        type: 'external',
        url: 'http://localhost:8081',
        status: 'available',
      },
      {
        id: 'terminal',
        nameKey: 'modules.terminal.name',
        descriptionKey: 'modules.terminal.description',
        type: 'route',
        url: '/app/terminal/',
        status: 'available',
      },
      {
        id: 'ota',
        nameKey: 'modules.ota.name',
        descriptionKey: 'modules.ota.description',
        type: 'external',
        url: 'http://localhost:8089',
        status: 'available',
      },
    ],
  },
];

function ThemeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onToggle}
      className="w-8 h-8 flex items-center justify-center rounded text-content-secondary hover:text-content-primary hover:bg-surface-elevated transition-colors"
      title={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
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

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1.5 rounded text-content-secondary hover:text-content-primary hover:bg-surface-elevated transition-colors text-xs"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
        {i18n.language?.startsWith('zh') ? '中文' : 'EN'}
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-surface-card border border-edge rounded shadow-lg py-1 z-50 min-w-[80px]">
          <button
            onClick={() => changeLanguage('zh')}
            className="w-full px-3 py-1.5 text-left text-xs hover:bg-surface-elevated transition-colors text-content-primary"
          >
            中文
          </button>
          <button
            onClick={() => changeLanguage('en')}
            className="w-full px-3 py-1.5 text-left text-xs hover:bg-surface-elevated transition-colors text-content-primary"
          >
            English
          </button>
        </div>
      )}
    </div>
  );
}

function App() {
  const { t } = useTranslation();
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
                {t('header.title')}
              </h1>
              <p className="text-xs text-content-tertiary mt-0.5">
                {t('header.subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
              <LanguageSwitcher />
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
            <div key={section.titleKey} className="col-span-12">
              <ModuleSection titleKey={section.titleKey} modules={section.modules} />
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-edge mt-auto">
        <div className="max-w-grid mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-2xs text-content-tertiary">
              {t('footer.brand')}
            </span>
            <span className="text-2xs text-content-tertiary">
              {t('footer.tagline')}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
