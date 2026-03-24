import { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Wifi,
  RefreshCw,
  Activity,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Play,
  Square,
} from 'lucide-react';
import { api } from '../../lib/tauri';
import type { SystemInfo, SystemUsage, SystemStatus, ApStatus, NetworkInterface } from '../../lib/types';

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  colorClass,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  unit?: string;
  colorClass: string;
}) {
  return (
    <div
      className="rounded-2xl p-5 border"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-secondary)' }}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}
        >
          <Icon size={20} className="text-white" />
        </div>
        <div>
          <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {value}
            {unit && <span className="text-sm font-normal" style={{ color: 'var(--text-tertiary)' }}>{unit}</span>}
          </div>
          <div className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</div>
        </div>
      </div>
    </div>
  );
}

function ServiceRow({
  name,
  active,
  running,
}: {
  name: string;
  active: boolean;
  running: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: 'var(--border-secondary)' }}>
      <div className="flex items-center gap-2">
        {running ? (
          <CheckCircle2 size={15} className="text-green-400" />
        ) : active ? (
          <AlertCircle size={15} className="text-amber-400" />
        ) : (
          <XCircle size={15} style={{ color: 'var(--text-tertiary)' }} />
        )}
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{name}</span>
      </div>
      <span
        className="text-xs px-2 py-0.5 rounded-full"
        style={{
          backgroundColor: running ? 'rgba(74, 222, 128, 0.1)' : active ? 'rgba(251, 191, 36, 0.1)' : 'var(--bg-elevated)',
          color: running ? '#4ade80' : active ? '#fbbf24' : 'var(--text-tertiary)',
        }}
      >
        {running ? '运行中' : active ? '激活' : '停止'}
      </span>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}天 ${h}小时 ${m}分钟`;
  if (h > 0) return `${h}小时 ${m}分钟`;
  return `${m}分钟`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export function Network() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [usage, setUsage] = useState<SystemUsage | null>(null);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [apStatus, setApStatus] = useState<ApStatus | null>(null);
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apLoading, setApLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [infoData, usageData, statusData, apData, interfacesData] = await Promise.all([
        api.getDeviceSystemInfo() as Promise<SystemInfo>,
        api.getSystemUsage() as Promise<SystemUsage>,
        api.getSystemStatus() as Promise<SystemStatus>,
        api.getApStatus() as Promise<ApStatus>,
        api.getNetworkInterfaces() as Promise<NetworkInterface[]>,
      ]);
      setInfo(infoData);
      setUsage(usageData);
      setStatus(statusData);
      setApStatus(apData);
      setInterfaces(interfacesData);
    } catch (err) {
      setError('无法连接到设备，请检查网络连接');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleApToggle = async () => {
    setApLoading(true);
    try {
      if (apStatus?.active) {
        await api.stopAp();
      } else {
        await api.startAp();
      }
      await fetchData();
    } catch (err) {
      console.error('AP控制失败:', err);
    } finally {
      setApLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3" style={{ color: 'var(--text-tertiary)' }}>
          <RefreshCw size={20} className="animate-spin" />
          <span>加载中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle size={40} className="mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
          <button
            onClick={fetchData}
            className="mt-3 px-4 py-2 rounded-lg text-sm font-medium text-white bg-claw-500 hover:bg-claw-600 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>设备状态大盘</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {info?.hostname} · {info?.os}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {apStatus?.active ? (
            <span
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
              style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--claw-500)' }}
            >
              <Wifi size={12} />
              AP 模式: {apStatus.ssid}
            </span>
          ) : (
            <span
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
              style={{ backgroundColor: 'rgba(74, 222, 128, 0.1)', color: '#4ade80' }}
            >
              <Wifi size={12} />
              已连接
            </span>
          )}
          <button
            onClick={fetchData}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-elevated)' }}
            title="刷新"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* System stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Cpu}
          label="CPU 使用率"
          value={usage?.cpu_percent ?? 0}
          unit="%"
          colorClass="bg-indigo-500"
        />
        <StatCard
          icon={MemoryStick}
          label="内存使用"
          value={usage ? `${usage.memory_percent.toFixed(0)}%` : '—'}
          unit=""
          colorClass="bg-purple-500"
        />
        <StatCard
          icon={HardDrive}
          label="磁盘使用"
          value={usage ? `${usage.disk_percent.toFixed(0)}%` : '—'}
          unit=""
          colorClass="bg-amber-500"
        />
        <StatCard
          icon={Activity}
          label="运行时间"
          value={info ? formatUptime(info.uptime) : '—'}
          colorClass="bg-emerald-500"
        />
      </div>

      {/* Detail row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CPU / Memory bars */}
        <div
          className="rounded-2xl p-5 lg:col-span-2 space-y-5"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-secondary)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>资源使用详情</h2>

          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span style={{ color: 'var(--text-secondary)' }}>CPU</span>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{usage?.cpu_percent.toFixed(1)}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${usage?.cpu_percent ?? 0}%` }}
              />
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{info?.cpu_model}</div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span style={{ color: 'var(--text-secondary)' }}>内存</span>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {usage ? `${formatBytes(usage.memory_used)} / ${formatBytes(usage.memory_total)}` : '—'}
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${usage?.memory_percent ?? 0}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span style={{ color: 'var(--text-secondary)' }}>磁盘</span>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {usage
                  ? `${(usage.disk_used / 1024 ** 3).toFixed(1)} GB / ${(usage.disk_total / 1024 ** 3).toFixed(1)} GB`
                  : '—'}
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${usage?.disk_percent ?? 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Services */}
        <div
          className="rounded-2xl p-5"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-secondary)' }}
        >
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>服务状态</h2>
          <div className="divide-y" style={{ borderColor: 'var(--border-secondary)' }}>
            {status?.services.map((svc) => (
              <ServiceRow
                key={svc.name}
                name={svc.name === 'openclaw' ? 'OpenClaw AI' : svc.name === 'adminApi' ? 'Admin API' : svc.name}
                active={svc.active}
                running={svc.running}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Network Interfaces */}
      <div
        className="rounded-2xl p-5"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-secondary)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>网络接口</h2>
          <button
            onClick={fetchData}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-elevated)' }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
        <div className="space-y-3">
          {interfaces.map((iface) => (
            <div
              key={iface.name}
              className="flex items-center justify-between p-3 rounded-xl"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: iface.state === 'up' ? 'rgba(74, 222, 128, 0.1)' : 'var(--bg-card)' }}
                >
                  <Wifi size={16} style={{ color: iface.state === 'up' ? '#4ade80' : 'var(--text-tertiary)' }} />
                </div>
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{iface.name}</div>
                  <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{iface.type} · {iface.mac}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{iface.ip}</div>
                <div
                  className="text-xs px-2 py-0.5 rounded-full inline-block mt-1"
                  style={{
                    backgroundColor: iface.state === 'up' ? 'rgba(74, 222, 128, 0.1)' : 'var(--bg-card)',
                    color: iface.state === 'up' ? '#4ade80' : 'var(--text-tertiary)',
                  }}
                >
                  {iface.state === 'up' ? '已连接' : '未连接'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AP Control */}
      <div
        className="rounded-2xl p-5"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-secondary)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>AP 热点控制</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {apStatus?.active ? `已开启: ${apStatus.ssid} (${apStatus.ip})` : '当前未开启 AP 模式'}
            </p>
          </div>
          <button
            onClick={handleApToggle}
            disabled={apLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            style={{
              backgroundColor: apStatus?.active ? 'rgba(239, 68, 68, 0.1)' : 'rgba(74, 222, 128, 0.1)',
              color: apStatus?.active ? '#ef4444' : '#4ade80',
            }}
          >
            {apLoading ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : apStatus?.active ? (
              <Square size={14} />
            ) : (
              <Play size={14} />
            )}
            {apStatus?.active ? '关闭 AP' : '启动 AP'}
          </button>
        </div>
      </div>

      {/* System info */}
      <div
        className="rounded-2xl p-5"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-secondary)' }}
      >
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>系统信息</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>内核版本</div>
            <div className="font-mono mt-0.5" style={{ color: 'var(--text-primary)' }}>{info?.kernel}</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>CPU 核心</div>
            <div className="font-mono mt-0.5" style={{ color: 'var(--text-primary)' }}>{info?.cpu_cores}</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>内存总量</div>
            <div className="font-mono mt-0.5" style={{ color: 'var(--text-primary)' }}>{info ? formatBytes(info.memory_total) : '—'}</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>OpenClaw</div>
            <div className="font-mono mt-0.5" style={{ color: 'var(--text-primary)' }}>v1.0.0</div>
          </div>
        </div>
      </div>
    </div>
  );
}
