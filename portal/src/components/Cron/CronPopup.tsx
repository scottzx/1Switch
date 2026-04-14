import { useState, useEffect } from 'react';
import { cronApi } from '../../services/api';

interface CronPopupProps {
  onClose: () => void;
}

interface ParsedCronTask {
  schedule: string;
  command: string;
  raw: string;
}

interface ParsedTimer {
  next: string;
  left: string;
  last: string;
  unit: string;
  activates: string;
}

type TabType = 'crontab' | 'systemd';

export function CronPopup({ onClose }: CronPopupProps) {
  const [activeTab, setActiveTab] = useState<TabType>('crontab');
  const [cronTasks, setCronTasks] = useState<ParsedCronTask[]>([]);
  const [timers, setTimers] = useState<ParsedTimer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cronResult, timersResult] = await Promise.allSettled([
        cronApi.listTasks(),
        cronApi.listTimers(),
      ]);

      if (cronResult.status === 'fulfilled') {
        setCronTasks(parseCrontab(cronResult.value));
      }
      if (timersResult.status === 'fulfilled') {
        setTimers(parseSystemdTimers(timersResult.value));
      }
      if (cronResult.status === 'rejected' && timersResult.status === 'rejected') {
        setError('获取失败');
      }
    } catch {
      setError('获取失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 w-[700px] max-h-[80vh] rounded-xl shadow-xl border bg-surface-card border-edge overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-edge">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-content-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span className="font-medium text-content-primary">定时任务</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-elevated text-content-tertiary"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-edge">
          <button
            onClick={() => setActiveTab('crontab')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'crontab'
                ? 'text-accent border-b-2 border-accent bg-surface-elevated/50'
                : 'text-content-secondary hover:text-content-primary hover:bg-surface-elevated/30'
            }`}
          >
            Crontab 任务 ({cronTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('systemd')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'systemd'
                ? 'text-accent border-b-2 border-accent bg-surface-elevated/50'
                : 'text-content-secondary hover:text-content-primary hover:bg-surface-elevated/30'
            }`}
          >
            Systemd 定时器 ({timers.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="text-sm text-content-tertiary text-center py-8">Loading...</div>
          ) : error ? (
            <div className="text-sm text-red-500 text-center py-8">{error}</div>
          ) : (
            <>
              {activeTab === 'crontab' && (
                <CrontabTab tasks={cronTasks} expandedLog={expandedLog} onToggleLog={setExpandedLog} />
              )}
              {activeTab === 'systemd' && (
                <SystemdTab timers={timers} />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function CrontabTab({ tasks, expandedLog, onToggleLog }: { tasks: ParsedCronTask[]; expandedLog: string | null; onToggleLog: (log: string | null) => void }) {
  if (tasks.length === 0) {
    return <div className="text-sm text-content-tertiary text-center py-8">暂无 Crontab 任务</div>;
  }

  return (
    <div className="space-y-3">
      {tasks.map((task, index) => (
        <div key={index} className="bg-surface-elevated rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-accent/10 text-accent">
              {task.schedule}
            </span>
            <span className="text-xs text-content-tertiary">执行命令</span>
          </div>
          <div className="text-xs text-content-primary font-mono bg-surface-card rounded p-2 mb-2 break-all">
            {task.command}
          </div>
          <button
            onClick={() => onToggleLog(expandedLog === task.raw ? null : task.raw)}
            className="text-xs text-accent hover:underline"
          >
            {expandedLog === task.raw ? '收起日志命令' : '查看完整命令'}
          </button>
          {expandedLog === task.raw && (
            <div className="mt-2 text-xs text-content-secondary font-mono bg-surface-card rounded p-2 break-all">
              {task.raw}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SystemdTab({ timers }: { timers: ParsedTimer[] }) {
  if (timers.length === 0) {
    return <div className="text-sm text-content-tertiary text-center py-8">暂无 Systemd 定时器</div>;
  }

  return (
    <div className="bg-surface-elevated rounded-lg overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-edge bg-surface-card/50">
            <th className="text-left px-3 py-2 text-content-secondary font-medium">下次执行</th>
            <th className="text-left px-3 py-2 text-content-secondary font-medium">剩余</th>
            <th className="text-left px-3 py-2 text-content-secondary font-medium">上次执行</th>
            <th className="text-left px-3 py-2 text-content-secondary font-medium">服务单元</th>
          </tr>
        </thead>
        <tbody>
          {timers.map((timer, index) => (
            <tr key={index} className="border-b border-edge/50 last:border-b-0 hover:bg-surface-card/50">
              <td className="px-3 py-2 text-content-primary font-mono whitespace-nowrap">{timer.next}</td>
              <td className="px-3 py-2 text-accent font-mono whitespace-nowrap">{timer.left}</td>
              <td className="px-3 py-2 text-content-tertiary font-mono whitespace-nowrap">{timer.last}</td>
              <td className="px-3 py-2 text-content-primary">
                <div className="font-medium">{timer.unit}</div>
                <div className="text-content-tertiary text-[10px]">{timer.activates}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function parseCrontab(output: string): ParsedCronTask[] {
  const lines = output.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  return lines.map(line => {
    const parts = line.trim().split(/\s+/);
    let schedule = '';
    let command = '';

    if (line.startsWith('@')) {
      schedule = parts[0];
      command = parts.slice(1).join(' ');
    } else {
      schedule = parts.slice(0, 5).join(' ');
      command = parts.slice(5).join(' ');
    }

    return { schedule, command, raw: line };
  });
}

function parseSystemdTimers(output: string): ParsedTimer[] {
  const lines = output.split('\n');
  const timers: ParsedTimer[] = [];

  for (const line of lines) {
    if (!line.trim() || line.includes('listed.') || line.includes('Pass --all')) continue;

    // Try to parse timer line
    const parts = line.trim().split(/\s{2,}/);
    if (parts.length >= 6) {
      timers.push({
        next: parts[0] || '',
        left: parts[1] || '',
        last: parts[2] || '',
        unit: parts[4] || '',
        activates: parts[5] || '',
      });
    }
  }

  return timers;
}
