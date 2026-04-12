import { useState, useRef, useEffect } from 'react';
import { useTerminalStore } from '../../stores/terminalStore';
import { TerminalTab } from './TerminalTab';
import { Terminal, ChevronUp, ChevronDown, ChevronDown as DropdownIcon } from 'lucide-react';
import clsx from 'clsx';

export function TerminalPanel() {
  const { tabs, activeTabId, isExpanded, toggleExpanded, setActiveTab } = useTerminalStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'var(--terminal-running)';
      case 'done':
        return '#22c55e';
      case 'error':
        return 'var(--terminal-error)';
      default:
        return 'var(--text-tertiary)';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return '运行中';
      case 'done':
        return '已完成';
      case 'error':
        return '错误';
      default:
        return '空闲';
    }
  };

  return (
    <div
      className="flex flex-col border-t"
      style={{
        height: isExpanded ? '280px' : '44px',
        backgroundColor: 'var(--terminal-bg)',
        borderColor: 'var(--border-primary)',
      }}
    >
      {/* 标题栏 */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{
          backgroundColor: 'var(--terminal-header-bg)',
          borderBottom: '1px solid var(--border-primary)',
        }}
      >
        <div className="flex items-center gap-2">
          <Terminal size={14} style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            终端
          </span>
          {tabs.length > 0 && (
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              ({tabs.length})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Tab 下拉选择器 */}
          {tabs.length > 0 && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-primary)',
                }}
              >
                <span
                  className={clsx(
                    'w-2 h-2 rounded-full flex-shrink-0',
                    activeTab?.status === 'running' && 'animate-pulse'
                  )}
                  style={{ backgroundColor: getStatusColor(activeTab?.status || 'idle') }}
                />
                <span style={{ color: 'var(--text-primary)' }}>{activeTab?.title}</span>
                <span className="font-mono text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                  {activeTab?.command}
                </span>
                <span style={{ color: 'var(--text-tertiary)' }}>
                  [{getStatusText(activeTab?.status || 'idle')}]
                </span>
                <DropdownIcon size={12} style={{ color: 'var(--text-tertiary)' }} />
              </button>

              {/* 下拉列表 */}
              {dropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-1 min-w-[300px] rounded-lg shadow-lg z-50 overflow-hidden"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-primary)',
                  }}
                >
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setDropdownOpen(false);
                      }}
                      className={clsx(
                        'w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors',
                        tab.id === activeTabId
                          ? 'bg-[var(--accent)]/10'
                          : 'hover:bg-[var(--accent)]/5'
                      )}
                    >
                      <span
                        className={clsx(
                          'w-2 h-2 rounded-full flex-shrink-0',
                          tab.status === 'running' && 'animate-pulse'
                        )}
                        style={{ backgroundColor: getStatusColor(tab.status) }}
                      />
                      <span className="truncate" style={{ color: 'var(--text-primary)' }}>
                        {tab.title}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={toggleExpanded}
            className="p-1 rounded transition-colors hover:bg-opacity-50"
            style={{ backgroundColor: 'transparent' }}
          >
            {isExpanded ? (
              <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} />
            ) : (
              <ChevronUp size={16} style={{ color: 'var(--text-tertiary)' }} />
            )}
          </button>
        </div>
      </div>

      {/* 内容区 */}
      {isExpanded && (
        tabs.length > 0 ? (
          <TerminalTab />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Terminal size={32} className="mx-auto mb-2 opacity-50" style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>等待命令执行...</p>
              <p className="text-xs mt-1 opacity-70" style={{ color: 'var(--text-tertiary)' }}>
                点击上方按钮执行操作
              </p>
            </div>
          </div>
        )
      )}
    </div>
  );
}
