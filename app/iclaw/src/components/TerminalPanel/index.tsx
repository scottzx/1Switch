import { useTerminalStore } from '../../stores/terminalStore';
import { TabBar } from './TabBar';
import { TerminalTab } from './TerminalTab';

export function TerminalPanel() {
  const { tabs, isExpanded } = useTerminalStore();

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div
      className="flex flex-col border-t border-edge bg-surface-sidebar transition-all duration-300"
      style={{
        height: isExpanded ? '300px' : '44px',
      }}
    >
      <TabBar />
      {isExpanded && <TerminalTab />}
    </div>
  );
}
