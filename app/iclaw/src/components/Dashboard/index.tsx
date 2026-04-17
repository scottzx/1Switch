import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { QuickActions } from './QuickActions';
import { SystemInfo } from './SystemInfo';
import { Setup } from '../Setup';
import { api, ServiceStatus } from '../../lib/tauri';
import { execApi } from '../../services/api';
import { Terminal, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import { EnvironmentStatus } from '../../App';
import { useTerminalStore } from '../../stores/terminalStore';

interface DashboardProps {
  envStatus: EnvironmentStatus | null;
  onSetupComplete: () => void;
}

export function Dashboard({ envStatus, onSetupComplete }: DashboardProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [logsExpanded, setLogsExpanded] = useState(true);
  const [autoRefreshLogs, setAutoRefreshLogs] = useState(true);
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const { addTab, appendOutput, setStatus: setTabStatus } = useTerminalStore();

  const fetchStatus = async () => {
    try {
      const result = await api.getServiceStatus();
      setStatus(result);
    } catch {
      // 静默处理
    }
  };

  const fetchLogs = async () => {
    try {
      const result = await api.getLogs(50);
      setLogs(result || []);
    } catch {
      // 静默处理
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchLogs();

    const logsInterval = autoRefreshLogs ? setInterval(fetchLogs, 2000) : null;

    return () => {
      if (logsInterval) clearInterval(logsInterval);
    };
  }, [autoRefreshLogs]);

  // 自动滚动到日志底部（仅在日志容器内部滚动，不影响页面）
  useEffect(() => {
    if (logsExpanded && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs, logsExpanded]);

  const handleStart = async () => {
    setActionLoading(true);
    const tabId = addTab('openclaw gateway start', 'Gateway start');
    try {
      await new Promise<void>((resolve, reject) => {
        const es = execApi.streamCommand(
          'openclaw gateway start',
          (data) => appendOutput(tabId, data.content),
          (data) => { if (data.status === 'running') setTabStatus(tabId, 'running'); },
          (data) => {
            setTabStatus(tabId, data.exitCode === 0 ? 'done' : 'error', data.exitCode);
            setActionLoading(false);
            fetchStatus();
            fetchLogs();
            resolve();
          }
        );
        es.onerror = () => {
          setTabStatus(tabId, 'error');
          appendOutput(tabId, '[错误: SSE 连接失败]');
          setActionLoading(false);
          reject(new Error('SSE 连接失败'));
        };
      });
    } catch (e) {
      console.error('启动失败:', e);
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    setActionLoading(true);
    const tabId = addTab('openclaw gateway stop', 'Gateway stop');
    try {
      await new Promise<void>((resolve, reject) => {
        const es = execApi.streamCommand(
          'openclaw gateway stop',
          (data) => appendOutput(tabId, data.content),
          (data) => { if (data.status === 'running') setTabStatus(tabId, 'running'); },
          (data) => {
            setTabStatus(tabId, data.exitCode === 0 ? 'done' : 'error', data.exitCode);
            setActionLoading(false);
            fetchStatus();
            fetchLogs();
            resolve();
          }
        );
        es.onerror = () => {
          setTabStatus(tabId, 'error');
          appendOutput(tabId, '[错误: SSE 连接失败]');
          setActionLoading(false);
          reject(new Error('SSE 连接失败'));
        };
      });
    } catch (e) {
      console.error('停止失败:', e);
      setActionLoading(false);
    }
  };

  const handleRestart = async () => {
    setActionLoading(true);
    const tabId = addTab('openclaw gateway restart', 'Gateway restart');
    try {
      await new Promise<void>((resolve, reject) => {
        const es = execApi.streamCommand(
          'openclaw gateway restart',
          (data) => appendOutput(tabId, data.content),
          (data) => { if (data.status === 'running') setTabStatus(tabId, 'running'); },
          (data) => {
            setTabStatus(tabId, data.exitCode === 0 ? 'done' : 'error', data.exitCode);
            setActionLoading(false);
            fetchStatus();
            fetchLogs();
            resolve();
          }
        );
        es.onerror = () => {
          setTabStatus(tabId, 'error');
          appendOutput(tabId, '[错误: SSE 连接失败]');
          setActionLoading(false);
          reject(new Error('SSE 连接失败'));
        };
      });
    } catch (e) {
      console.error('重启失败:', e);
      setActionLoading(false);
    }
  };

  const handleDoctor = async () => {
    const tabId = addTab('openclaw doctor', '诊断');
    try {
      await new Promise<void>((resolve, reject) => {
        const es = execApi.streamCommand(
          'openclaw doctor',
          (data) => appendOutput(tabId, data.content),
          (data) => { if (data.status === 'running') setTabStatus(tabId, 'running'); },
          (data) => {
            setTabStatus(tabId, data.exitCode === 0 ? 'done' : 'error', data.exitCode);
            resolve();
          }
        );
        es.onerror = () => {
          setTabStatus(tabId, 'error');
          appendOutput(tabId, '[错误: SSE 连接失败]');
          reject(new Error('SSE 连接失败'));
        };
      });
    } catch (e) {
      console.error('诊断失败:', e);
    }
  };

  const getLogLineClass = (line: string) => {
    if (line.includes('error') || line.includes('Error') || line.includes('ERROR')) {
      return 'text-red-400';
    }
    if (line.includes('warn') || line.includes('Warn') || line.includes('WARN')) {
      return 'text-yellow-400';
    }
    if (line.includes('info') || line.includes('Info') || line.includes('INFO')) {
      return 'text-green-400';
    }
    return 'text-content-secondary';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  const needsSetup = envStatus && !envStatus.ready;

  return (
    <div className="h-full overflow-y-auto scroll-container pr-2">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {needsSetup && (
          <motion.div variants={itemVariants}>
            <Setup onComplete={onSetupComplete} embedded />
          </motion.div>
        )}

        <motion.div variants={itemVariants}>
          <QuickActions
            status={status}
            loading={actionLoading}
            onStart={handleStart}
            onStop={handleStop}
            onRestart={handleRestart}
            onDoctor={handleDoctor}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <div className="bg-surface-card rounded-2xl border border-edge overflow-hidden">
            {/* 日志标题栏 */}
            <div 
              className="flex items-center justify-between px-4 py-3 bg-surface-elevated/50 cursor-pointer"
              onClick={() => setLogsExpanded(!logsExpanded)}
            >
              <div className="flex items-center gap-2">
                <Terminal size={16} className="text-content-tertiary" />
                <span className="text-sm font-medium text-content-primary">实时日志</span>
                <span className="text-xs text-content-tertiary">
                  ({logs.length} 行)
                </span>
              </div>
              <div className="flex items-center gap-3">
                {logsExpanded && (
                  <>
                    <label 
                      className="flex items-center gap-2 text-xs text-content-secondary"
                      onClick={e => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={autoRefreshLogs}
                        onChange={(e) => setAutoRefreshLogs(e.target.checked)}
                        className="w-3 h-3 rounded border-edge bg-surface-elevated text-claw-500"
                      />
                      {t('dashboard.autoRefresh')}
                    </label>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchLogs();
                      }}
                      className="text-content-tertiary hover:text-content-primary"
                      title="刷新日志"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </>
                )}
                {logsExpanded ? (
                  <ChevronUp size={16} className="text-content-tertiary" />
                ) : (
                  <ChevronDown size={16} className="text-content-tertiary" />
                )}
              </div>
            </div>

            {logsExpanded && (
              <div ref={logsContainerRef} className="h-64 overflow-y-auto p-4 font-mono text-xs leading-relaxed bg-surface-sidebar">
                {logs.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-content-tertiary">
                    <p>暂无日志，请先启动服务</p>
                  </div>
                ) : (
                  <>
                    {logs.map((line, index) => (
                      <div
                        key={index}
                        className={clsx('py-0.5 whitespace-pre-wrap break-all', getLogLineClass(line))}
                      >
                        {line}
                      </div>
                    ))}

                  </>
                )}
              </div>
            )}
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <SystemInfo />
        </motion.div>
      </motion.div>
    </div>
  );
}
