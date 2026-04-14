import { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Activity,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../lib/tauri';
import type { SystemInfo, SystemUsage } from '../../lib/types';

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
    <div className="bg-surface-card rounded-2xl p-5 border border-edge">
      <div className="flex items-start gap-4">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}
        >
          <Icon size={20} className="text-white" />
        </div>
        <div>
          <div className="text-lg md:text-2xl font-bold tabular-nums text-content-primary">
            {value}
            {unit && (
              <span className="text-sm font-normal text-content-tertiary">{unit}</span>
            )}
          </div>
          <div className="text-sm mt-0.5 text-content-secondary">{label}</div>
        </div>
      </div>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}天 ${h}小时`;
  if (h > 0) return `${h}小时 ${m}分钟`;
  return `${m}分钟`;
}

interface DeviceStatsProps {
  compact?: boolean;
}

export function DeviceStats(_props: DeviceStatsProps) {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [usage, setUsage] = useState<SystemUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [infoData, usageData] = await Promise.all([
        api.getDeviceSystemInfo() as Promise<SystemInfo>,
        api.getSystemUsage() as Promise<SystemUsage>,
      ]);
      setInfo(infoData);
      setUsage(usageData);
    } catch (err) {
      setError('无法获取设备状态');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <RefreshCw size={20} className="animate-spin text-content-tertiary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-32 text-content-secondary">
        <AlertCircle size={20} className="mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  // 简化显示 - 只显示4个小卡片
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        icon={Cpu}
        label="CPU"
        value={usage?.cpu_percent?.toFixed(0) ?? 0}
        unit="%"
        colorClass="bg-indigo-500"
      />
      <StatCard
        icon={MemoryStick}
        label="内存"
        value={usage?.memory_percent?.toFixed(0) ?? 0}
        unit="%"
        colorClass="bg-purple-500"
      />
      <StatCard
        icon={HardDrive}
        label="磁盘"
        value={usage?.disk_percent?.toFixed(0) ?? 0}
        unit="%"
        colorClass="bg-amber-500"
      />
      <StatCard
        icon={Activity}
        label="运行时"
        value={info ? formatUptime(info.uptime) : '--'}
        colorClass="bg-emerald-500"
      />
    </div>
  );
}
