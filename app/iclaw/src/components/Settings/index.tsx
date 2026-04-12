import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  User,
  Shield,
  Save,
  Loader2,
  FolderOpen,
  FileCode,
  Trash2,
  AlertTriangle,
  X,
  Globe,
  Download,
  ScrollText,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../lib/tauri';
import { useTerminalStore } from '../../stores/terminalStore';
import { execApi } from '../../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function SettingsModal({ isOpen, onClose, title, icon, children }: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-surface-card rounded-2xl border border-edge max-w-lg w-full mx-4 shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center gap-3 p-4 border-b border-edge">
          <div className="w-10 h-10 rounded-xl bg-claw-500/20 flex items-center justify-center">
            {icon}
          </div>
          <h3 className="text-lg font-semibold text-content-primary flex-1">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-elevated transition-colors text-content-secondary hover:text-content-primary"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

// 日志查看器组件
function LogsViewer() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const result = await api.getLogs(200);
      setLogs(result || []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-content-tertiary">实时日志 /tmp/openclaw-gateway.log ({logs.length} 行)</p>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-surface-elevated transition-colors text-content-secondary hover:text-content-primary disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      <div className="bg-surface-elevated rounded-lg border border-edge p-3 h-64 overflow-y-auto font-mono text-xs">
        {logs.length === 0 && !loading ? (
          <div className="h-full flex items-center justify-center text-content-tertiary">
            暂无日志
          </div>
        ) : (
          logs.map((line, index) => (
            <div key={index} className={`py-0.5 ${getLogLineClass(line)}`}>
              <span className="text-gray-600 mr-2">{index + 1}</span>
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// 语言设置内容
function LanguageSettings() {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-content-secondary mb-2">{t('settings.displayLanguage')}</label>
        <select
          value={i18n.language?.startsWith('zh') ? 'zh' : 'en'}
          onChange={(e) => changeLanguage(e.target.value)}
          className="input-base w-full"
        >
          <option value="zh">中文</option>
          <option value="en">English</option>
        </select>
      </div>
    </div>
  );
}

// 身份配置内容
function IdentitySettings() {
  const { t } = useTranslation();
  const [identity, setIdentity] = useState({
    botName: 'Clawd',
    userName: '主人',
    timezone: 'Asia/Shanghai',
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-content-secondary mb-2">AI 助手名称</label>
        <input
          type="text"
          value={identity.botName}
          onChange={(e) => setIdentity({ ...identity, botName: e.target.value })}
          placeholder="Clawd"
          className="input-base w-full"
        />
      </div>
      <div>
        <label className="block text-sm text-content-secondary mb-2">你的称呼</label>
        <input
          type="text"
          value={identity.userName}
          onChange={(e) => setIdentity({ ...identity, userName: e.target.value })}
          placeholder={t('settings.yourNamePlaceholder')}
          className="input-base w-full"
        />
      </div>
      <div>
        <label className="block text-sm text-content-secondary mb-2">时区</label>
        <select
          value={identity.timezone}
          onChange={(e) => setIdentity({ ...identity, timezone: e.target.value })}
          className="input-base w-full"
        >
          <option value="Asia/Shanghai">Asia/Shanghai</option>
          <option value="Asia/Hong_Kong">Asia/Hong_Kong</option>
          <option value="Asia/Tokyo">Asia/Tokyo</option>
          <option value="America/New_York">America/New_York</option>
          <option value="America/Los_Angeles">America/Los_Angeles</option>
          <option value="Europe/London">Europe/London</option>
          <option value="UTC">UTC</option>
        </select>
      </div>
    </div>
  );
}

// 安全设置内容
function SecuritySettings() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-surface-elevated rounded-lg">
        <div>
          <p className="text-sm text-content-primary">启用白名单</p>
          <p className="text-xs text-content-tertiary">只允许白名单用户访问</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" />
          <div className="w-11 h-6 bg-surface-elevated peer-focus:ring-2 peer-focus:ring-claw-500/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-claw-500"></div>
        </label>
      </div>
      <div className="flex items-center justify-between p-4 bg-surface-elevated rounded-lg">
        <div>
          <p className="text-sm text-content-primary">文件访问权限</p>
          <p className="text-xs text-content-tertiary">允许 AI 读写本地文件</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" defaultChecked />
          <div className="w-11 h-6 bg-claw-500 peer-focus:ring-2 peer-focus:ring-claw-500/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
        </label>
      </div>
    </div>
  );
}

// 高级设置内容
function AdvancedSettings() {
  const [deviceIP, setDeviceIP] = useState<string>('');

  useEffect(() => {
    const fetchDeviceIP = async () => {
      try {
        const response = await fetch('/api/system/device-ip');
        const data = await response.json();
        setDeviceIP(data.ip);
      } catch {
        // ignore
      }
    };
    fetchDeviceIP();
  }, []);

  const openConfigDir = async () => {
    try {
      const info = await api.getSystemInfo();
      const configDir = info.config_dir || '~/.openclaw';
      // 替换 ~ 为空，因为 file manager 使用的绝对路径
      const path = configDir.replace(/^~/, '');
      window.location.href = `http://${deviceIP}:8081${path}`;
    } catch (e) {
      console.error('获取配置目录失败:', e);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={openConfigDir}
        disabled={!deviceIP}
        className="w-full flex items-center gap-3 p-4 bg-surface-elevated rounded-lg hover:bg-surface-elevated transition-colors text-left disabled:opacity-50"
      >
        <FolderOpen size={18} className="text-content-secondary" />
        <div className="flex-1">
          <p className="text-sm text-content-primary">打开配置目录</p>
          <p className="text-xs text-content-tertiary">~/.openclaw</p>
        </div>
      </button>
    </div>
  );
}

// OTA 更新组件
function OtaUpdate() {
  const [deviceIP, setDeviceIP] = useState<string>('');

  useEffect(() => {
    const fetchDeviceIP = async () => {
      try {
        const response = await fetch('/api/system/device-ip');
        const data = await response.json();
        setDeviceIP(data.ip);
      } catch {
        // ignore
      }
    };
    fetchDeviceIP();
  }, []);

  return (
    <div className="space-y-4">
      <button
        onClick={() => deviceIP && (window.location.href = `http://${deviceIP}:8089`)}
        disabled={!deviceIP}
        className="w-full flex items-center gap-3 p-4 bg-surface-elevated rounded-lg hover:bg-surface-elevated transition-colors text-left disabled:opacity-50"
      >
        <Download size={18} className="text-green-400" />
        <div className="flex-1">
          <p className="text-sm text-content-primary">OTA 系统更新</p>
          <p className="text-xs text-content-tertiary">设备升级</p>
        </div>
      </button>
    </div>
  );
}

// 危险操作内容
function DangerZone({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { addTab, appendOutput, setStatus: setTabStatus } = useTerminalStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const [uninstalling, setUninstalling] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleUninstall = async () => {
    setUninstalling(true);
    const tabId = addTab('openclaw uninstall', 'OpenClaw 卸载');

    try {
      await new Promise<void>((resolve, reject) => {
        const es = execApi.streamCommand(
          'openclaw uninstall',
          (data) => appendOutput(tabId, data.content),
          (data) => { if (data.status === 'running') setTabStatus(tabId, 'running'); },
          (data) => {
            setTabStatus(tabId, data.exitCode === 0 ? 'done' : 'error', data.exitCode);
            if (data.exitCode === 0) {
              setResult({ success: true, message: '卸载完成' });
            } else {
              setResult({ success: false, message: '卸载失败' });
            }
            setUninstalling(false);
            resolve();
          }
        );
        es.onerror = () => {
          setTabStatus(tabId, 'error');
          appendOutput(tabId, '[错误: SSE 连接失败]');
          setResult({ success: false, message: 'SSE 连接失败' });
          setUninstalling(false);
          reject(new Error('SSE 连接失败'));
        };
      });
    } catch {
      setUninstalling(false);
    }
  };

  return (
    <div className="space-y-4">
      {!result ? !showConfirm ? (
        <>
          <p className="text-sm text-content-secondary mb-4">
            确定要卸载 OpenClaw 吗？此操作将：
          </p>
          <ul className="text-sm text-content-secondary mb-4 space-y-2">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
              {t('settings.uninstallAction1')}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
              {t('settings.uninstallAction2')}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
              {t('settings.uninstallAction3')}
            </li>
          </ul>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-surface-elevated hover:bg-surface-elevated text-content-primary rounded-lg transition-colors"
            >
              {t('settings.cancel')}
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-content-primary rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={16} />
              确认卸载
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-red-300 mb-4">
            最后确认：此操作不可逆，数据将被清除。
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 px-4 py-2.5 bg-surface-elevated hover:bg-surface-elevated text-content-primary rounded-lg transition-colors"
            >
              返回
            </button>
            <button
              onClick={handleUninstall}
              disabled={uninstalling}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-content-primary rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {uninstalling ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  卸载中...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  确认卸载
                </>
              )}
            </button>
          </div>
        </>
      ) : (
        <div className={`p-4 rounded-lg ${result.success ? 'bg-green-900/30 border border-green-800' : 'bg-red-900/30 border border-red-800'}`}>
          <p className={`text-sm ${result.success ? 'text-green-300' : 'text-red-300'}`}>
            {result.message}
          </p>
          {result.success && (
            <p className="text-xs text-content-secondary mt-3">
              对话框将自动关闭...
            </p>
          )}
          {result.success && setTimeout(onClose, 2000)}
        </div>
      )}
    </div>
  );
}

interface SettingsProps {
  onEnvironmentChange?: () => void;
}

export function Settings({ onEnvironmentChange }: SettingsProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      alert(t('settings.settingsSaved'));
    } catch (e) {
      console.error('保存失败:', e);
    } finally {
      setSaving(false);
    }
  };

  const settingsCards = [
    {
      id: 'logs',
      label: '应用日志',
      icon: <ScrollText size={20} className="text-blue-400" />,
      description: '查看实时运行日志',
      modalTitle: '应用日志',
      modalIcon: <ScrollText size={20} className="text-blue-400" />,
    },
    {
      id: 'language',
      label: '语言设置',
      icon: <Globe size={20} className="text-blue-400" />,
      description: '界面语言和时区',
      modalTitle: '语言设置',
      modalIcon: <Globe size={20} className="text-blue-400" />,
    },
    {
      id: 'security',
      label: '安全设置',
      icon: <Shield size={20} className="text-amber-400" />,
      description: '权限和访问控制',
      modalTitle: '安全设置',
      modalIcon: <Shield size={20} className="text-amber-400" />,
    },
    {
      id: 'advanced',
      label: '高级设置',
      icon: <FileCode size={20} className="text-purple-400" />,
      description: '配置文件和目录',
      modalTitle: '高级设置',
      modalIcon: <FileCode size={20} className="text-purple-400" />,
    },
    {
      id: 'ota',
      label: '系统更新',
      icon: <Download size={20} className="text-green-400" />,
      description: 'OTA 设备升级',
      modalTitle: '系统更新',
      modalIcon: <Download size={20} className="text-green-400" />,
    },
    {
      id: 'danger',
      label: '危险操作',
      icon: <AlertTriangle size={20} className="text-red-400" />,
      description: '卸载和重置',
      modalTitle: '危险操作',
      modalIcon: <AlertTriangle size={20} className="text-red-400" />,
    },
  ];

  const renderModalContent = (id: string) => {
    switch (id) {
      case 'logs':
        return <LogsViewer />;
      case 'language':
        return <LanguageSettings />;
      case 'security':
        return <SecuritySettings />;
      case 'advanced':
        return <AdvancedSettings />;
      case 'ota':
        return <OtaUpdate />;
      case 'danger':
        return <DangerZone onClose={() => setActiveModal(null)} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full overflow-y-auto scroll-container pr-2">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-content-primary">系统设置</h2>
            <p className="text-xs text-content-tertiary mt-1">管理应用配置和选项</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {t('settings.saveSettings')}
          </button>
        </div>

        {/* 设置卡片网格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {settingsCards.map((card) => (
            <button
              key={card.id}
              onClick={() => setActiveModal(card.id)}
              className="bg-surface-card rounded-2xl p-5 border border-edge hover:border-claw-500/50 transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-xl bg-surface-elevated flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                {card.icon}
              </div>
              <h3 className="text-sm font-medium text-content-primary mb-1">{card.label}</h3>
              <p className="text-xs text-content-tertiary">{card.description}</p>
            </button>
          ))}
        </div>

        {/* Modal */}
        {activeModal && (
          <SettingsModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            title={settingsCards.find((c) => c.id === activeModal)?.modalTitle || ''}
            icon={settingsCards.find((c) => c.id === activeModal)?.modalIcon}
          >
            {renderModalContent(activeModal)}
          </SettingsModal>
        )}
      </div>
    </div>
  );
}
