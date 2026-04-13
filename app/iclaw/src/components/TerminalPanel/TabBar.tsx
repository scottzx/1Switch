import { X } from 'lucide-react';
import { useTerminalStore } from '../../stores/terminalStore';

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, removeTab, isExpanded } =
    useTerminalStore();

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div style={{ backgroundColor: 'var(--terminal-header-bg)' }}>
      {/* 标签列表 */}
      {isExpanded && (
        <div
          className="flex items-center gap-1 px-2 py-1 overflow-x-auto"
          style={{ backgroundColor: 'var(--terminal-bg)' }}
        >
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className="flex items-center gap-2 px-3 py-1 rounded text-sm cursor-pointer transition-colors group"
              style={{
                backgroundColor: activeTabId === tab.id ? 'var(--bg-elevated)' : 'transparent',
                color: activeTabId === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              <span
                className={tab.status === 'running' ? 'animate-pulse' : ''}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor:
                    tab.status === 'running' ? 'var(--terminal-running)' :
                    tab.status === 'done' ? 'var(--terminal-running)' :
                    tab.status === 'error' ? 'var(--terminal-error)' :
                    'var(--text-tertiary)',
                }}
              />
              <span className="truncate max-w-[120px]">{tab.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeTab(tab.id);
                }}
                className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: 'transparent' }}
              >
                <X size={12} style={{ color: 'var(--text-tertiary)' }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
