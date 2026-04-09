import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Bot,
  Users,
  MessageSquare,
  FlaskConical,
  ScrollText,
  Settings,
  ShieldAlert,
  Terminal,
  Folder,
  Puzzle,
  X,
} from 'lucide-react';
import { PageType } from '../../App';
import clsx from 'clsx';
import { useAppStore } from '../../stores/appStore';

interface ServiceStatus {
  running: boolean;
  pid: number | null;
  port: number;
}

interface SidebarProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
  serviceStatus: ServiceStatus | null;
}

const menuItems: { id: PageType; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: '概览', icon: LayoutDashboard },
  { id: 'ai', label: '模型配置', icon: Bot },
  { id: 'agents', label: '数字员工', icon: Users },
  { id: 'channels', label: '消息渠道', icon: MessageSquare },
  { id: 'skills', label: '技能管理', icon: Puzzle },
  { id: 'testing', label: '测试诊断', icon: FlaskConical },
  { id: 'logs', label: '应用日志', icon: ScrollText },
  { id: 'security', label: '安全防护', icon: ShieldAlert },
  { id: 'terminal', label: '终端控制', icon: Terminal },
  { id: 'filebrowser', label: '文件管理', icon: Folder },
  { id: 'settings', label: '系统设置', icon: Settings },
];

function SidebarContent({ currentPage, onNavigate, serviceStatus }: SidebarProps) {
  const isRunning = serviceStatus?.running ?? false;

  return (
    <>
      {/* Logo 区域 */}
      <div
        className="h-14 flex items-center px-6 titlebar-drag"
        style={{ borderBottom: '1px solid var(--border-primary)' }}
      >
        <div className="flex items-center gap-3 titlebar-no-drag">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-claw-400 to-claw-600 flex items-center justify-center">
            <span className="text-lg">🦞</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>iClaw虾窝</h1>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = currentPage === item.id;
            const Icon = item.icon;

            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all relative'
                  )}
                  style={{
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    backgroundColor: isActive ? 'var(--bg-elevated)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-claw-500 rounded-r-full"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <Icon size={18} className={isActive ? 'text-claw-400' : ''} />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 底部信息 */}
      <div className="p-4" style={{ borderTop: '1px solid var(--border-primary)' }}>
        <div className="px-4 py-3 rounded-lg" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className={clsx('status-dot', isRunning ? 'running' : 'stopped')} />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {isRunning ? '服务运行中' : '服务未启动'}
            </span>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>端口: {serviceStatus?.port ?? 18789}</p>
        </div>
      </div>
    </>
  );
}

// 桌面端固定侧边栏 (md: 及以上)
export function Sidebar({ currentPage, onNavigate, serviceStatus }: SidebarProps) {
  return (
    <aside
      className="hidden md:flex w-64 flex-col flex-shrink-0"
      style={{ backgroundColor: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-primary)' }}
    >
      <SidebarContent currentPage={currentPage} onNavigate={onNavigate} serviceStatus={serviceStatus} />
    </aside>
  );
}

// 移动端抽屉侧边栏
export function MobileSidebar({ currentPage, onNavigate, serviceStatus }: SidebarProps) {
  const { isSidebarOpen, closeSidebar } = useAppStore();

  const handleNavigate = (page: PageType) => {
    onNavigate(page);
    closeSidebar();
  };

  return (
    <AnimatePresence>
      {isSidebarOpen && (
        <>
          {/* 遮罩层 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={closeSidebar}
          />
          {/* 抽屉 */}
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-72 flex flex-col"
            style={{ backgroundColor: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-primary)' }}
          >
            {/* 关闭按钮 */}
            <div className="absolute top-4 right-4 titlebar-no-drag z-10">
              <button
                onClick={closeSidebar}
                className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-elevated)]"
                style={{ color: 'var(--text-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>
            <SidebarContent currentPage={currentPage} onNavigate={handleNavigate} serviceStatus={serviceStatus} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
