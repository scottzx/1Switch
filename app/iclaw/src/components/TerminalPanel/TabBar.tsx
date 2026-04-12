import { X, ChevronDown, ChevronUp, Terminal } from 'lucide-react';
import clsx from 'clsx';
import { useTerminalStore } from '../../stores/terminalStore';

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, removeTab, isExpanded, toggleExpanded } =
    useTerminalStore();

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-900 border-t border-gray-700">
      {/* 标签栏头部 */}
      <div className="flex items-center justify-between px-4 py-1 bg-gray-800">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-gray-400" />
          <span className="text-xs text-gray-400 font-medium">
            终端 ({tabs.length})
          </span>
        </div>
        <button
          onClick={toggleExpanded}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
          title={isExpanded ? '收起' : '展开'}
        >
          {isExpanded ? (
            <ChevronDown size={16} className="text-gray-400" />
          ) : (
            <ChevronUp size={16} className="text-gray-400" />
          )}
        </button>
      </div>

      {/* 标签列表 */}
      {isExpanded && (
        <div className="flex items-center gap-1 px-2 py-1 overflow-x-auto bg-gray-900">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={clsx(
                'flex items-center gap-2 px-3 py-1 rounded text-sm cursor-pointer transition-colors group',
                activeTabId === tab.id
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <span
                className={clsx(
                  'w-2 h-2 rounded-full',
                  tab.status === 'running' && 'bg-blue-500 animate-pulse',
                  tab.status === 'done' && 'bg-green-500',
                  tab.status === 'error' && 'bg-red-500',
                  tab.status === 'idle' && 'bg-gray-500'
                )}
              />
              <span className="truncate max-w-[120px]">{tab.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeTab(tab.id);
                }}
                className="p-0.5 hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
