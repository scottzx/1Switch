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

export function CronPopup({ onClose }: CronPopupProps) {
  const [cronTasks, setCronTasks] = useState<ParsedCronTask[]>([]);
  const [timers, setTimers] = useState<ParsedTimer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCronData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cronResult, timersResult] = await Promise.allSettled([
        cronApi.listTasks(),
        cronApi.listTimers(),
      ]);

      // Parse crontab
      if (cronResult.status === 'fulfilled' && cronResult.value) {
        const tasks = parseCrontab(cronResult.value);
        setCronTasks(tasks);
      }

      // Parse systemd timers
      if (timersResult.status === 'fulfilled') {
        const parsed = parseSystemdTimers(timersResult.value);
        setTimers(parsed);
      }

      if (cronResult.status === 'rejected') {
        setError('Failed to load cron tasks');
      }
    } catch (e) {
      setError('Failed to load cron data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCronData();
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      {/* Popup - centered horizontally */}
      <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 w-[640px] max-h-[80vh] rounded-xl shadow-xl border bg-surface-card border-edge flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-edge">
          <div className="flex items-center gap-2">
            {/* Clock icon */}
            <svg className="w-4 h-4 text-content-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span className="font-medium text-content-primary">定时任务</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadCronData}
              className="p-1.5 rounded-lg transition-colors bg-surface-elevated hover:bg-surface-elevated/80 text-content-secondary"
              title="Refresh"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors hover:bg-surface-elevated text-content-tertiary"
              title="Close"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-6">
          {loading ? (
            <div className="text-sm text-content-tertiary text-center py-8">Loading...</div>
          ) : error ? (
            <div className="text-sm text-red-500 text-center py-8">{error}</div>
          ) : (
            <>
              {/* Crontab section */}
              {cronTasks.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-content-secondary uppercase tracking-wider mb-3">
                    Crontab 任务
                  </h4>
                  <div className="space-y-2">
                    {cronTasks.map((task, index) => (
                      <div key={index} className="bg-surface-elevated rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-accent/10 text-accent">
                            {task.schedule}
                          </span>
                        </div>
                        <code className="text-xs text-content-primary font-mono break-all">
                          {task.command}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Systemd timers section */}
              {timers.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-content-secondary uppercase tracking-wider mb-3">
                    Systemd 定时器
                  </h4>
                  <div className="bg-surface-elevated rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-edge">
                          <th className="text-left px-3 py-2 text-content-secondary font-medium">下次执行</th>
                          <th className="text-left px-3 py-2 text-content-secondary font-medium">剩余</th>
                          <th className="text-left px-3 py-2 text-content-secondary font-medium">上次执行</th>
                          <th className="text-left px-3 py-2 text-content-secondary font-medium">服务单元</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timers.map((timer, index) => (
                          <tr key={index} className="border-b border-edge/50 last:border-b-0 hover:bg-surface-card/50">
                            <td className="px-3 py-2 text-content-primary font-mono">{timer.next}</td>
                            <td className="px-3 py-2 text-accent font-mono">{timer.left}</td>
                            <td className="px-3 py-2 text-content-tertiary font-mono">{timer.last}</td>
                            <td className="px-3 py-2 text-content-primary">
                              <div className="font-medium">{timer.unit}</div>
                              <div className="text-content-tertiary text-[10px]">{timer.activates}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {cronTasks.length === 0 && timers.length === 0 && (
                <div className="text-sm text-content-tertiary text-center py-8">
                  暂无定时任务
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// Parse crontab output into structured tasks
function parseCrontab(output: string): ParsedCronTask[] {
  const lines = output.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  return lines.map(line => {
    // Simple parsing: first space-separated chunk is schedule, rest is command
    const parts = line.trim().split(/\s+/);
    let schedule = '';
    let command = '';

    if (line.startsWith('@')) {
      // @reboot, @hourly, etc.
      schedule = parts[0];
      command = parts.slice(1).join(' ');
    } else {
      // Standard cron: minute hour day month weekday
      // Find the first 5 fields that look like schedule parts
      const scheduleParts: string[] = [];
      const cmdParts: string[] = [];
      let isSchedule = true;

      for (let i = 0; i < parts.length; i++) {
        if (isSchedule && scheduleParts.length < 5) {
          scheduleParts.push(parts[i]);
        } else {
          isSchedule = false;
          cmdParts.push(parts[i]);
        }
      }

      schedule = scheduleParts.join(' ');
      command = cmdParts.join(' ');
    }

    return { schedule, command, raw: line };
  });
}

// Parse systemctl list-timers output
function parseSystemdTimers(output: string): ParsedTimer[] {
  const lines = output.split('\n');
  const timers: ParsedTimer[] = [];

  // Skip header and footer lines
  for (const line of lines) {
    if (!line.trim() || line.includes('listed.') || line.includes('Pass --all')) continue;

    // Match timer lines: NEXT LEFT LAST PASSED UNIT ACTIVATES
    // Example: Tue 2026-04-14 12:34:51 CST  27min Tue 2026-04-14 11:30:51 CST     36min ago anacron.timer                  anacron.service
    const match = line.match(/^(.+?)\s{2,}(.+?)\s{2,}(.+?)\s{2,}(.+?)\s{2,}([\w.-]+)\s{2,}([\w.-]+)$/);
    if (match) {
      timers.push({
        next: match[1].trim(),
        left: match[2].trim(),
        last: match[3].trim(),
        unit: match[5].trim(),
        activates: match[6].trim(),
      });
    }
  }

  return timers;
}
