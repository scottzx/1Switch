import { useEffect, useRef } from 'react';
import { useTerminalStore, type TerminalTab } from '../../stores/terminalStore';

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
        return 'text-blue-400';
      case 'done':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusText = () => {
    switch (tab.status) {
      case 'running':
        return '运行中';
      case 'done':
        return tab.exitCode === 0 ? '已完成' : '已退出';
      case 'error':
        return '错误';
      default:
        return '空闲';
    }
  };

  const getLineColor = (line: string) => {
    if (line.startsWith('[ERR]') || line.toLowerCase().includes('error')) {
      return 'text-red-400';
    }
    if (line.toLowerCase().includes('warn')) {
      return 'text-yellow-400';
    }
    if (line.toLowerCase().includes('info')) {
      return 'text-green-400';
    }
    return 'text-gray-100';
  };

  return (
    <div className="h-full flex flex-col bg-black rounded-lg overflow-hidden">
      {/* 终端头部 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">{tab.title}</span>
          <span className={`text-xs ${getStatusColor()}`}>
            [{getStatusText()}]
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-mono">{tab.command}</span>
        </div>
      </div>

      {/* 终端输出区域 */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-sm leading-relaxed"
      >
        {tab.output.length === 0 ? (
          <div className="text-gray-500 h-full flex items-center justify-center">
            <span>等待命令执行...</span>
          </div>
        ) : (
          tab.output.map((line, index) => (
            <div key={index} className={`py-0.5 ${getLineColor(line)}`}>
              <span className="text-gray-600 mr-3 select-none">
                {String(index + 1).padStart(4, ' ')}
              </span>
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
