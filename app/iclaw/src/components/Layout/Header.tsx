import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PageType } from '../../App';
import { RefreshCw, ExternalLink, Loader2, Sun, Moon, Menu, Network, Wifi, WifiOff } from 'lucide-react';
import { useTheme } from '../../lib/ThemeContext';
import { useAppStore } from '../../stores/appStore';
import { LanPopup } from '../Network/LanPopup';
import { WifiPopup } from '../Network/WifiPopup';
import { networkApi } from '../../services/api';

interface HeaderProps {
  currentPage: PageType;
  onRefresh: () => void;
  refreshLoading?: boolean;
}

const pageTitles: Record<PageType, { title: string; description: string }> = {
  dashboard: { title: '概览', description: '服务状态、日志与快捷操作' },
  profile: { title: '龙虾档案', description: '编辑 AI 助手身份档案' },
  ai: { title: '模型配置', description: '配置 AI 提供商和模型' },
  channels: { title: '消息渠道', description: '配置 Telegram、Discord、飞书等' },
  skills: { title: '技能管理', description: '管理内置、官方、社区与自定义技能' },
  'qingflow-mcp': { title: '轻流MCP', description: '轻流工作流管理与审批' },
  testing: { title: '测试诊断', description: '系统诊断与问题排查' },
  logs: { title: '应用日志', description: '查看 Manager 应用的控制台日志' },
  security: { title: '安全防护', description: '安全风险检测与一键修复' },
  settings: { title: '系统设置', description: '身份配置与高级选项' },
  terminal: { title: '终端控制', description: 'Web Terminal' },
  filebrowser: { title: '文件管理', description: '文件浏览器' },
};

export function Header({ currentPage, onRefresh, refreshLoading }: HeaderProps) {
  const { t } = useTranslation();
  const fallback = pageTitles[currentPage];
  const title = t(`header.${currentPage}.title`, { defaultValue: fallback.title });
  const description = t(`header.${currentPage}.description`, { defaultValue: fallback.description });
  const [opening, setOpening] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { openSidebar, deviceHost } = useAppStore();
  const [showLanPopup, setShowLanPopup] = useState(false);
  const [showWifiPopup, setShowWifiPopup] = useState(false);
  const [lanConnected, setLanConnected] = useState(false);
  const [wifiConnected, setWifiConnected] = useState(false);

  const handleOpenDashboard = async () => {
    setOpening(true);
    try {
      const tokenResponse = await fetch('/api/gateway/token');
      const tokenData = await tokenResponse.json();
      const dashboardUrl = `http://${deviceHost}:18789?token=${tokenData.token}`;
      window.open(dashboardUrl, '_blank');
    } catch (e) {
      console.error('打开 Dashboard 失败:', e);
      window.open('/', '_blank');
    } finally {
      setOpening(false);
    }
  };

  // Load network status periodically
  useEffect(() => {
    const loadNetworkStatus = async () => {
      try {
        const [interfaces, wifiStatus] = await Promise.all([
          networkApi.interfaces(),
          networkApi.wifiStatus()
        ]);
        // Check if any ethernet interface is connected
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
    <>
    <header
      className="h-14 flex items-center justify-between px-6 titlebar-drag backdrop-blur-sm"
      style={{
        backgroundColor: 'var(--bg-overlay)',
        borderBottom: '1px solid var(--border-primary)',
      }}
    >
      {/* 左侧：汉堡菜单 + 页面标题 */}
      <div className="flex items-center gap-3 titlebar-no-drag">
        {/* 移动端汉堡菜单按钮 */}
        <button
          onClick={openSidebar}
          className="md:hidden p-2 -ml-2 rounded-lg transition-colors hover:bg-[var(--bg-elevated)]"
          style={{ color: 'var(--text-secondary)' }}
          title="打开菜单"
        >
          <Menu size={22} />
        </button>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          <p className="text-xs hidden sm:block" style={{ color: 'var(--text-tertiary)' }}>{description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 titlebar-no-drag">
        {/* LAN */}
        <button
          onClick={() => setShowLanPopup(true)}
          className="icon-button"
          style={{ color: lanConnected ? '#22c55e' : 'var(--text-tertiary)' }}
          title="LAN"
        >
          <Network size={16} />
        </button>

        {/* Wi-Fi */}
        <button
          onClick={() => setShowWifiPopup(true)}
          className="icon-button"
          style={{ color: wifiConnected ? '#22c55e' : 'var(--text-tertiary)' }}
          title="Wi-Fi"
        >
          {wifiConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
        </button>

        {/* 主题切换 */}
        <button
          onClick={toggleTheme}
          className="icon-button"
          style={{ color: 'var(--text-secondary)' }}
          title={theme === 'light' ? '切换到暗色模式' : '切换到亮色模式'}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        <button
          onClick={onRefresh}
          disabled={refreshLoading}
          className="icon-button"
          style={{ color: 'var(--text-secondary)' }}
          title="刷新状态"
        >
          <RefreshCw size={16} className={refreshLoading ? 'animate-spin' : ''} />
        </button>
        <button
          onClick={handleOpenDashboard}
          disabled={opening}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text-secondary)',
          }}
          title="打开 Web Dashboard"
        >
          {opening ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
          <span>Dashboard</span>
        </button>
      </div>
    </header>

    {/* LAN Popup */}
    {showLanPopup && <LanPopup onClose={() => setShowLanPopup(false)} />}

    {/* WiFi Popup */}
    {showWifiPopup && <WifiPopup onClose={() => setShowWifiPopup(false)} />}
    </>
  );
}
