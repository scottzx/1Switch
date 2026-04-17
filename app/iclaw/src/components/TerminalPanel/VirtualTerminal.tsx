import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import type { TerminalTab } from '../../stores/terminalStore';

interface VirtualTerminalProps {
  tab: TerminalTab;
}

export function VirtualTerminal({ tab }: VirtualTerminalProps) {
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [tab.output]);

  const getStatusColor = () => {
    switch (tab.status) {
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

  const getStatusText = () => {
    switch (tab.status) {
      case 'running':
        return '运行中';
      case 'done':
        return tab.exitCode === 0 ? '已完成' : '已退出';
      case 'error':
        return `错误 [${tab.exitCode}]`;
      default:
        return '空闲';
    }
  };

  const getLineColor = (line: string) => {
    if (line.startsWith('[ERR]') || line.toLowerCase().includes('error') || line.toLowerCase().includes('failed')) {
      return 'var(--terminal-error)';
    }
    if (line.toLowerCase().includes('warn')) {
      return 'var(--terminal-warning)';
    }
    if (line.toLowerCase().includes('info') || line.toLowerCase().includes('success') || line.toLowerCase().includes('done')) {
      return 'var(--terminal-running)';
    }
    return 'var(--terminal-text)';
  };

  return (
    <div
      className="h-full flex flex-col overflow-hidden terminal-scroll"
      style={{ backgroundColor: 'var(--terminal-bg)' }}
    >
      {/* 终端头部 */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{
          backgroundColor: 'var(--terminal-header-bg)',
          borderBottom: '1px solid var(--border-primary)',
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              'w-2.5 h-2.5 rounded-full flex-shrink-0',
              tab.status === 'running' && 'animate-pulse'
            )}
            style={{ backgroundColor: getStatusColor() }}
          />
          <span className="text-sm font-medium" style={{ color: 'var(--terminal-text)' }}>
            {tab.title}
          </span>
          <span className="text-xs" style={{ color: getStatusColor() }}>
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* 终端输出区域 */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-4 terminal-scroll"
        style={{ fontFamily: "'SF Mono', 'JetBrains Mono', monospace" }}
      >
        {tab.output.length === 0 ? (
          <div
            className="h-full flex items-center justify-center"
            style={{ color: 'var(--terminal-text-dim)' }}
          >
            <span>等待命令执行...</span>
          </div>
        ) : (
          tab.output.map((line, index) => (
            <div
              key={index}
              className="py-0.5 flex"
              style={{ color: getLineColor(line) }}
            >
              <span
                className="mr-3 select-none flex-shrink-0"
                style={{
                  color: 'var(--terminal-line-number)',
                  minWidth: '40px',
                }}
              >
                {String(index + 1).padStart(4, ' ')}
              </span>
              <span>{line}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
