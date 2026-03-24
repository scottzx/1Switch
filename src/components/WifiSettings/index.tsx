import { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, Lock, RefreshCw, Loader2, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import { api } from '../../lib/tauri';
import type { WifiNetwork } from '../../lib/types';

function getSignalBars(signal: number) {
  if (signal >= 70) return 4;
  if (signal >= 50) return 3;
  if (signal >= 30) return 2;
  return 1;
}

function getSecurityLabel(security: string) {
  if (!security || security === '--') return '开放';
  if (security.includes('WPA3')) return 'WPA3';
  if (security.includes('WPA2')) return 'WPA2';
  if (security.includes('WPA')) return 'WPA';
  if (security.includes('WEP')) return 'WEP';
  return '已加密';
}

export function WifiSettings() {
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [selectedSsid, setSelectedSsid] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [polling, setPolling] = useState(false);

  const scan = useCallback(async () => {
    setScanning(true);
    setError(null);
    try {
      const nets = await api.wifiScan() as WifiNetwork[];
      nets.sort((a, b) => b.signal - a.signal);
      setNetworks(nets);
    } catch {
      setError('扫描失败，请检查网络连接');
    } finally {
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    scan();
  }, [scan]);

  const handleConnect = async () => {
    if (!selectedSsid) return;
    setConnecting(true);
    setError(null);
    setSuccess(false);
    try {
      await api.wifiConnect(selectedSsid, password || undefined);
      setSuccess(true);
      setPolling(true);
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const status = await api.getApStatus() as { active: boolean };
          if (status.active) {
            clearInterval(poll);
            setPolling(false);
          }
        } catch {}
        if (attempts >= 30) {
          clearInterval(poll);
          setPolling(false);
        }
      }, 1000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '连接失败');
      setConnecting(false);
    }
  };

  const handleSelect = (ssid: string, security: string) => {
    setSelectedSsid(ssid);
    setPassword('');
    setError(null);
    setSuccess(false);
    if (security === '开放' || security === '--') {
      setSelectedSsid(ssid);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Wi-Fi 网络</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>选择网络并输入密码连接</p>
        </div>
        <button
          onClick={scan}
          disabled={scanning}
          className="p-2 rounded-lg transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
          title="重新扫描"
        >
          <RefreshCw size={16} className={scanning ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Network list */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-secondary)' }}
      >
        {scanning && networks.length === 0 ? (
          <div className="flex items-center justify-center py-12" style={{ color: 'var(--text-tertiary)' }}>
            <Loader2 size={20} className="animate-spin mr-2" />
            <span className="text-sm">正在扫描附近网络...</span>
          </div>
        ) : networks.length === 0 && !scanning ? (
          <div className="flex flex-col items-center justify-center py-12" style={{ color: 'var(--text-tertiary)' }}>
            <WifiOff size={28} className="mb-2" />
            <span className="text-sm">未发现附近网络</span>
            <button
              onClick={scan}
              className="mt-3 text-sm hover:underline"
              style={{ color: 'var(--claw-500)' }}
            >
              重新扫描
            </button>
          </div>
        ) : (
          networks.map((net) => {
            const isOpen = !net.security || net.security === '--';
            const isSelected = selectedSsid === net.ssid;
            const bars = getSignalBars(net.signal);
            return (
              <div key={net.bssid || net.ssid}>
                <button
                  onClick={() => handleSelect(net.ssid, isOpen ? '开放' : net.security)}
                  className="w-full flex items-center px-4 py-3.5 transition-colors text-left"
                  style={{
                    backgroundColor: isSelected ? 'var(--bg-elevated)' : 'transparent',
                  }}
                >
                  <div className="mr-3" style={{ color: 'var(--text-tertiary)' }}>
                    <Wifi size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-medium text-sm truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {net.ssid}
                      </span>
                      {isOpen && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: 'rgba(74, 222, 128, 0.1)', color: '#4ade80' }}
                        >
                          开放
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {getSecurityLabel(net.security)}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {net.frequency} MHz
                      </span>
                    </div>
                  </div>
                  <div className="flex items-end gap-0.5 mr-3">
                    {[1, 2, 3, 4].map((b) => (
                      <div
                        key={b}
                        className="w-1 rounded-sm"
                        style={{
                          height: `${b * 3 + 2}px`,
                          backgroundColor: b <= bars ? 'var(--claw-500)' : 'var(--bg-elevated)',
                        }}
                      />
                    ))}
                  </div>
                  <ChevronRight
                    size={14}
                    className="transition-transform"
                    style={{
                      color: 'var(--text-tertiary)',
                      transform: isSelected ? 'rotate(90deg)' : 'none',
                    }}
                  />
                </button>

                {/* Password input */}
                {isSelected && !isOpen && (
                  <div
                    className="px-4 pb-4 pt-1"
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Lock size={13} style={{ color: 'var(--text-tertiary)' }} />
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>输入密码</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Wi-Fi 密码"
                        className="flex-1 px-3 py-2 text-sm rounded-lg border"
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          borderColor: 'var(--border-secondary)',
                          color: 'var(--text-primary)',
                          outline: 'none',
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                      />
                      <button
                        onClick={handleConnect}
                        disabled={connecting || !password}
                        className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white bg-claw-500 hover:bg-claw-600 flex items-center gap-1.5"
                      >
                        {connecting ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            连接中
                          </>
                        ) : (
                          '连接'
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Open network quick connect */}
                {isSelected && isOpen && (
                  <div
                    className="px-4 pb-4 pt-1"
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                  >
                    <button
                      onClick={handleConnect}
                      disabled={connecting}
                      className="w-full py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors text-white bg-claw-500 hover:bg-claw-600 flex items-center justify-center gap-1.5"
                    >
                      {connecting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          连接中
                        </>
                      ) : (
                        '直接连接'
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Status messages */}
      {error && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
        >
          <XCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
          style={{ backgroundColor: 'rgba(74, 222, 128, 0.1)', color: '#4ade80' }}
        >
          <CheckCircle2 size={16} className="shrink-0" />
          {polling ? '已连接，正在跳转...' : '连接成功!'}
        </div>
      )}
    </div>
  );
}
