import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Sidebar, MobileSidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { Dashboard } from './components/Dashboard';
import { AIConfig } from './components/AIConfig';
import { Profile } from './components/Profile';
import { Channels } from './components/Channels';
import { Skills } from './components/Skills';
import { Settings } from './components/Settings';
import { Security } from './components/Security';
import { Testing } from './components/Testing';
import { Logs } from './components/Logs';
import { Terminal } from './components/Terminal';
import { FileBrowser } from './components/FileBrowser';
import { TerminalPanel } from './components/TerminalPanel';
import { appLogger } from './lib/logger';
import { api } from './lib/tauri';
import { execApi } from './services/api';
import { useTerminalStore } from './stores/terminalStore';
import { ThemeProvider } from './lib/ThemeContext';
import { Download, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export type PageType = 'dashboard' | 'profile' | 'ai' | 'channels' | 'skills' | 'testing' | 'logs' | 'security' | 'settings' | 'terminal' | 'filebrowser';

const PAGE_TYPE_KEYS: PageType[] = ['dashboard', 'profile', 'ai', 'channels', 'skills', 'testing', 'logs', 'security', 'settings', 'terminal', 'filebrowser'];

export interface EnvironmentStatus {
  node_installed: boolean;
  node_version: string | null;
  node_version_ok: boolean;
  openclaw_installed: boolean;
  openclaw_version: string | null;
  config_dir_exists: boolean;
  ready: boolean;
  os: string;
}

interface ServiceStatus {
  running: boolean;
  pid: number | null;
  port: number;
}

interface UpdateInfo {
  update_available: boolean;
  current_version: string | null;
  latest_version: string | null;
  error: string | null;
}

interface UpdateResult {
  success: boolean;
  message: string;
  error?: string;
}

function App() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [isReady, setIsReady] = useState<boolean | null>(null);
  const [envStatus, setEnvStatus] = useState<EnvironmentStatus | null>(null);
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null);

  const [updateInfo] = useState<UpdateInfo | null>(null);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateResult | null>(null);
  const [refreshLoading, setRefreshLoading] = useState(false);

  useEffect(() => {
    const path = location.pathname.slice(1) as PageType;
    if (PAGE_TYPE_KEYS.includes(path)) {
      setCurrentPage(path);
    }
  }, [location.pathname]);

  const checkEnvironment = useCallback(async () => {
    appLogger.info('开始检查系统环境...');
    try {
      const info = await api.getSystemInfo();
      const status: EnvironmentStatus = {
        node_installed: !!info.node_version,
        node_version: info.node_version ?? null,
        node_version_ok: true,
        openclaw_installed: info.openclaw_installed,
        openclaw_version: info.openclaw_version ?? null,
        config_dir_exists: true,
        ready: info.openclaw_installed,
        os: info.os,
      };
      appLogger.info('环境检查完成', status);
      setEnvStatus(status);

      // 同时获取服务状态
      try {
        const serviceStatus = await api.getServiceStatus();
        setServiceStatus({ running: serviceStatus.running, pid: serviceStatus.pid, port: serviceStatus.port });
      } catch (e) {
        appLogger.warn('获取服务状态失败', e);
      }

      setIsReady(true);
    } catch (e) {
      appLogger.error('环境检查失败', e);
      setIsReady(true);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshLoading(true);
    try {
      await checkEnvironment();
      const status = await api.getServiceStatus();
      setServiceStatus({ running: status.running, pid: status.pid, port: status.port });
    } catch (e) {
      appLogger.error('刷新状态失败', e);
    } finally {
      setRefreshLoading(false);
    }
  }, [checkEnvironment]);

  const handleUpdate = async () => {
    setUpdating(true);
    setUpdateResult(null);

    const { addTab, appendOutput, setStatus: setTabStatus } = useTerminalStore.getState();
    const tabId = addTab('openclaw update', 'OpenClaw 更新');

    try {
      await new Promise<void>((resolve, reject) => {
        const es = execApi.streamCommand(
          'openclaw update',
          (data) => appendOutput(tabId, data.content),
          (data) => { if (data.status === 'running') setTabStatus(tabId, 'running'); },
          (data) => {
            setTabStatus(tabId, data.exitCode === 0 ? 'done' : 'error', data.exitCode);
            if (data.exitCode === 0) {
              setUpdateResult({ success: true, message: '更新完成' });
              checkEnvironment();
              setTimeout(() => {
                setShowUpdateBanner(false);
                setUpdateResult(null);
              }, 3000);
            } else {
              setUpdateResult({
                success: false,
                message: t('app.updateError'),
                error: `Exit code: ${data.exitCode}`,
              });
            }
            setUpdating(false);
            resolve();
          }
        );
        es.onerror = () => {
          setTabStatus(tabId, 'error');
          appendOutput(tabId, '[错误: SSE 连接失败]');
          setUpdateResult({ success: false, message: t('app.updateError'), error: 'SSE 连接失败' });
          setUpdating(false);
          reject(new Error('SSE 连接失败'));
        };
      });
    } catch (e) {
      console.error('更新失败:', e);
      setUpdating(false);
    }
  };

  useEffect(() => {
    appLogger.info('🦞 App 组件已挂载');
    checkEnvironment();
  }, [checkEnvironment]);

  const handleSetupComplete = useCallback(() => {
    appLogger.info('安装向导完成');
    checkEnvironment();
  }, [checkEnvironment]);

  const handleNavigate = (page: PageType) => {
    appLogger.action('页面切换', { from: currentPage, to: page });
    setCurrentPage(page);
    navigate(`/${page}`);
  };

  const renderPage = () => {
    const pageVariants = {
      initial: { opacity: 0, x: 20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -20 },
    };

    const pages: Record<PageType, JSX.Element> = {
      dashboard: <Dashboard envStatus={envStatus} onSetupComplete={handleSetupComplete} />,
      profile: <Profile />,
      ai: <AIConfig />,
      channels: <Channels />,
      skills: <Skills />,
      testing: <Testing />,
      logs: <Logs />,
      security: <Security />,
      settings: <Settings />,
      terminal: <Terminal />,
      filebrowser: <FileBrowser />,
    };

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          {pages[currentPage]}
        </motion.div>
      </AnimatePresence>
    );
  };

  if (isReady === null) {
    return (
      <ThemeProvider>
        <div className="flex h-screen items-center justify-center" style={{ backgroundColor: 'var(--bg-app)' }}>
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-claw-500 to-claw-700 mb-4 animate-pulse">
              <span className="text-3xl">🦞</span>
            </div>
            <p style={{ color: 'var(--text-tertiary)' }}>正在启动...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-app)' }}>

        <AnimatePresence>
          {showUpdateBanner && updateInfo?.update_available && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-claw-600 to-purple-600 shadow-lg"
            >
              <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {updateResult?.success ? (
                    <CheckCircle size={20} className="text-green-300" />
                  ) : updateResult && !updateResult.success ? (
                    <AlertCircle size={20} className="text-red-300" />
                  ) : (
                    <Download size={20} className="text-white" />
                  )}
                  <div>
                    {updateResult ? (
                      <p className={`text-sm font-medium ${updateResult.success ? 'text-green-100' : 'text-red-100'}`}>
                        {updateResult.message}
                      </p>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-white">
                          发现新版本 OpenClaw {updateInfo.latest_version}
                        </p>
                        <p className="text-xs text-white/70">
                          当前版本: {updateInfo.current_version}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!updateResult && (
                    <button
                      onClick={handleUpdate}
                      disabled={updating}
                      className="px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {updating ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          更新中...
                        </>
                      ) : (
                        <>
                          <Download size={14} />
                          立即更新
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowUpdateBanner(false);
                      setUpdateResult(null);
                    }}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/70 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Sidebar currentPage={currentPage} onNavigate={handleNavigate} serviceStatus={serviceStatus} />

        <MobileSidebar currentPage={currentPage} onNavigate={handleNavigate} serviceStatus={serviceStatus} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Header currentPage={currentPage} onRefresh={handleRefresh} refreshLoading={refreshLoading} />

          <main className="flex-1 overflow-hidden p-6 pb-0 flex flex-col">
            <div className="flex-1 overflow-hidden">
              {renderPage()}
            </div>
            <TerminalPanel />
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
