import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ModuleSection from './components/ModuleSection';
import { LanPopup } from './components/Network/LanPopup';
import { WifiPopup } from './components/Network/WifiPopup';
import { networkApi, systemApi } from './services/api';

interface Module {
  id: string;
  nameKey: string;
  descriptionKey: string;
  type: 'link' | 'route' | 'external';
  url?: string;
  status: 'available' | 'coming-soon';
}

// 根据设备 IP 动态构建所有模块（按正确顺序：AI 应用 > 扩展应用 > AI 生态 > 系统功能）
function buildAllSections(deviceIp: string): { titleKey: string; modules: Module[] }[] {
  return [
    {
      titleKey: 'sections.aiApplications',
      modules: [
        {
          id: 'open-claude',
          nameKey: 'modules.openClaude.name',
          descriptionKey: 'modules.openClaude.description',
          type: 'external',
          url: `http://${deviceIp}:18789`, // 动态获取 IP
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
          type: 'external',
          url: `http://${deviceIp}:7681`,
          status: 'available',
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
      titleKey: 'sections.aiEcosystem',
      modules: [
        {
          id: 'xfusion',
          nameKey: 'modules.xfusion.name',
          descriptionKey: 'modules.xfusion.description',
          type: 'external',
          url: 'https://llm.azopenai.com/', // 硬编码域名
          status: 'available',
        },
        {
          id: 'clawhub',
          nameKey: 'modules.clawhub.name',
          descriptionKey: 'modules.clawhub.description',
          type: 'external',
          url: 'https://clawhub.ai/', // 硬编码域名
          status: 'available',
        },
        {
          id: 'skillatlas',
          nameKey: 'modules.skillatlas.name',
          descriptionKey: 'modules.skillatlas.description',
          type: 'external',
          url: 'https://ai.skillatlas.cn/', // 硬编码域名
          status: 'available',
        },
      ],
    },
    {
      titleKey: 'sections.aiTips',
      modules: [
        {
          id: 'openclaw-docs',
          nameKey: 'modules.openclawDocs.name',
          descriptionKey: 'modules.openclawDocs.description',
          type: 'external',
          url: 'https://docs.openclaw.ai/zh-CN', // 硬编码域名
          status: 'available',
        },
        {
          id: 'iclaw-manual',
          nameKey: 'modules.iclawManual.name',
          descriptionKey: 'modules.iclawManual.description',
          type: 'external',
          url: 'https://my.feishu.cn/wiki/XaVHwwfD5i6Lzhky9PFcLOJwnHd?from=from_copylink', // 硬编码域名
          status: 'available',
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
          url: `http://${deviceIp}:8081`, // 动态获取 IP
          status: 'available',
        },
        {
          id: 'terminal',
          nameKey: 'modules.terminal.name',
          descriptionKey: 'modules.terminal.description',
          type: 'external',
          url: `http://${deviceIp}:7681`,
          status: 'available',
        },
        {
          id: 'ota',
          nameKey: 'modules.ota.name',
          descriptionKey: 'modules.ota.description',
          type: 'external',
          url: `http://${deviceIp}:8089`, // 动态获取 IP
          status: 'available',
        },
      ],
    },
  ];
}

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

  const [showLanPopup, setShowLanPopup] = useState(false);
  const [showWifiPopup, setShowWifiPopup] = useState(false);
  const [lanConnected, setLanConnected] = useState(false);
  const [wifiConnected, setWifiConnected] = useState(false);
  const [deviceIp, setDeviceIp] = useState<string>('');
  const [sections, setSections] = useState<{ titleKey: string; modules: Module[] }[]>([]);

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // 获取设备 IP 并构建所有模块
  useEffect(() => {
    const loadDeviceIp = async () => {
      try {
        const ip = await systemApi.getDeviceIp();
        setDeviceIp(ip);
        setSections(buildAllSections(ip));
      } catch (e) {
        // 使用默认值
        setSections(buildAllSections('localhost'));
      }
    };
    loadDeviceIp();
  }, []);

  useEffect(() => {
    const loadNetworkStatus = async () => {
      try {
        const [interfaces, wifiStatus] = await Promise.all([
          networkApi.interfaces(),
          networkApi.wifiStatus()
        ]);
        const ethernetConnected = interfaces.some(i => i.type === 'ethernet' && i.state === 'up' && i.ip);
        setLanConnected(ethernetConnected);
        setWifiConnected(wifiStatus.connected);
      } catch (e) {
        // Silently fail
      }
    };

    loadNetworkStatus();
    const interval = setInterval(loadNetworkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

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

              {/* LAN */}
              <button
                onClick={() => setShowLanPopup(true)}
                className="icon-button"
                style={{ color: lanConnected ? '#22c55e' : 'var(--text-content-tertiary)' }}
                title="LAN"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="16" y="16" width="6" height="6" rx="1" />
                  <rect x="2" y="16" width="6" height="6" rx="1" />
                  <rect x="9" y="2" width="6" height="6" rx="1" />
                  <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
                  <path d="M12 12V8" />
                </svg>
              </button>

              {/* Wi-Fi */}
              <button
                onClick={() => setShowWifiPopup(true)}
                className="icon-button"
                style={{ color: wifiConnected ? '#22c55e' : 'var(--text-content-tertiary)' }}
                title="Wi-Fi"
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.859a10 10 0 0 1 14 0" />
                  <path d="M8.5 16.429a5 5 0 0 1 7 0" />
                  <path d="M12 20h.01" />
                </svg>
              </button>

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

      {/* LAN Popup */}
      {showLanPopup && <LanPopup onClose={() => setShowLanPopup(false)} />}

      {/* WiFi Popup */}
      {showWifiPopup && <WifiPopup onClose={() => setShowWifiPopup(false)} />}
    </div>
  );
}

export default App;
