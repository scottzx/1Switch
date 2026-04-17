import { useTerminalStore } from '../../stores/terminalStore';
import { VirtualTerminal } from './VirtualTerminal';

export function TerminalTab() {
  const { tabs, activeTabId } = useTerminalStore();

  if (tabs.length === 0) {
    return null;
  }

  const activeTab = tabs.find((t) => t.id === activeTabId);

  if (!activeTab) {
    return null;
  }

  return (
    <div className="flex-1 overflow-hidden">
      <VirtualTerminal tab={activeTab} />
    </div>
  );
}
