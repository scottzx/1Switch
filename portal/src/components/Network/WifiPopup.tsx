import { useState, useEffect, useMemo } from 'react';
import { networkApi, WifiNetwork } from '../../services/api';

interface WifiPopupProps {
  onClose: () => void;
}

interface GroupedWifiNetwork extends WifiNetwork {
  bssids: string[];
  apCount: number;
}

function WifiIcon({ size = 16, style = {} }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M5 12.859a10 10 0 0 1 14 0" />
      <path d="M8.5 16.429a5 5 0 0 1 7 0" />
      <path d="M12 20h.01" />
    </svg>
  );
}

function WifiOffIcon({ size = 16, style = {} }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M12 20h.01" />
      <path d="M8.5 16.429a5 5 0 0 1 7 0" />
      <path d="M5 12.859a10 10 0 0 1 5.17-2.69" />
      <path d="M19 12.859a10 10 0 0 0-2.007-1.523" />
      <path d="M2 8.82a15 15 0 0 1 4.177-2.643" />
      <path d="M22 8.82a15 15 0 0 0-11.288-3.764" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

function RefreshIcon({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

function LoaderIcon({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function LockIcon({ size = 14, style = {} }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h8.25a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function UnlockIcon({ size = 14, style = {} }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h16.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function SignalDot({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

export function WifiPopup({ onClose }: WifiPopupProps) {
  const [wifiStatus, setWifiStatus] = useState<{ connected: boolean; ssid?: string; signal?: number } | null>(null);
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<WifiNetwork | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const groupedNetworks = useMemo<GroupedWifiNetwork[]>(() => {
    const groups = new Map<string, GroupedWifiNetwork>();
    for (const network of networks) {
      const key = network.ssid;
      if (!key) continue;
      if (groups.has(key)) {
        const existing = groups.get(key)!;
        if (network.signal > existing.signal) {
          existing.signal = network.signal;
        }
        existing.bssids.push(network.bssid);
        existing.apCount = existing.bssids.length;
      } else {
        groups.set(key, {
          ...network,
          bssids: [network.bssid],
          apCount: 1,
        });
      }
    }
    return Array.from(groups.values());
  }, [networks]);

  useEffect(() => {
    loadWifiStatus();
    scanNetworks();
  }, []);

  const loadWifiStatus = async () => {
    try {
      const status = await networkApi.wifiStatus();
      setWifiStatus({ connected: status.connected, ssid: status.ssid, signal: status.signal });
    } catch (e) {
      setWifiStatus({ connected: false });
    }
  };

  const scanNetworks = async () => {
    setScanning(true);
    setError(null);
    try {
      const result = await networkApi.wifiScan();
      setNetworks(result);
    } catch (e) {
      setError('Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const handleConnect = async () => {
    if (!selectedNetwork) return;
    setConnecting(selectedNetwork.ssid);
    setError(null);
    try {
      await networkApi.wifiConnect(selectedNetwork.ssid, password || undefined);
      await loadWifiStatus();
      setSelectedNetwork(null);
      setPassword('');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Connection failed');
    } finally {
      setConnecting(null);
    }
  };

  const handleNetworkClick = (network: WifiNetwork) => {
    setSelectedNetwork(network);
    setPassword('');
  };

  const getSignalColor = (signal: number) => {
    if (signal > 70) return '#22c55e';
    if (signal > 40) return '#eab308';
    return '#ef4444';
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      {/* Popup */}
      <div className="fixed top-14 right-4 z-50 w-80 max-h-[calc(100vh-8rem)] rounded-xl shadow-xl border border-edge bg-surface-card flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-edge">
          <div className="flex items-center gap-2">
            {wifiStatus?.connected ? (
              <WifiIcon size={16} style={{ color: '#22c55e' }} />
            ) : (
              <WifiOffIcon size={16} style={{ color: 'var(--text-content-tertiary)' }} />
            )}
            <span className="font-medium text-content-primary">Wi-Fi</span>
          </div>
          <button
            onClick={scanNetworks}
            disabled={scanning}
            className="p-1.5 rounded-lg transition-colors disabled:opacity-50 text-content-secondary hover:bg-surface-elevated"
            title="Scan"
          >
            <RefreshIcon size={14} className={scanning ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Current Status */}
        {wifiStatus?.connected && (
          <div className="p-4 border-b border-edge">
            <div className="text-xs mb-1 text-content-tertiary">Connected to</div>
            <div className="flex items-center gap-2">
              <WifiIcon size={14} style={{ color: '#22c55e' }} />
              <span className="font-medium text-content-primary">{wifiStatus.ssid}</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mx-4 mt-3 p-2 rounded-lg text-xs bg-surface-elevated text-red-500">{error}</div>
        )}

        {/* Network List */}
        <div className="flex-1 overflow-y-auto p-2">
          {scanning && groupedNetworks.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <LoaderIcon size={20} className="animate-spin text-content-tertiary" />
            </div>
          ) : groupedNetworks.length === 0 ? (
            <div className="text-center py-8 text-sm text-content-tertiary">No networks found</div>
          ) : (
            <div className="space-y-1">
              {groupedNetworks.map((network) => (
                <button
                  key={network.ssid}
                  onClick={() => handleNetworkClick(network)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-surface-elevated text-content-primary"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {network.security === 'Open' || network.security === '' ? (
                      <UnlockIcon size={14} style={{ color: 'var(--text-content-tertiary)' }} />
                    ) : (
                      <LockIcon size={14} style={{ color: 'var(--text-content-tertiary)' }} />
                    )}
                    <span className="truncate text-sm">{network.ssid}</span>
                    {network.apCount > 1 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-surface-elevated text-content-tertiary">{network.apCount} APs</span>
                    )}
                  </div>
                  <SignalDot size={14} color={getSignalColor(network.signal)} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Password Input for Selected Network */}
        {selectedNetwork && (
          <div className="p-4 border-t border-edge">
            <div className="text-sm mb-2 truncate text-content-primary">Connect to "{selectedNetwork.ssid}"</div>
            {(selectedNetwork.security === 'Open' || selectedNetwork.security === '') ? (
              <div className="flex gap-2">
                <button onClick={() => setSelectedNetwork(null)} className="flex-1 px-4 py-2 rounded-lg text-sm bg-surface-elevated text-content-secondary">Cancel</button>
                <button onClick={handleConnect} disabled={connecting !== null} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 bg-accent-cyan text-black">
                  {connecting ? <LoaderIcon size={14} className="animate-spin mx-auto" /> : 'Connect'}
                </button>
              </div>
            ) : (
              <>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-3 py-2 rounded-lg text-sm mb-2 bg-surface-elevated text-content-primary border border-edge"
                  onKeyDown={e => e.key === 'Enter' && handleConnect()}
                />
                <div className="flex gap-2">
                  <button onClick={() => setSelectedNetwork(null)} className="flex-1 px-4 py-2 rounded-lg text-sm bg-surface-elevated text-content-secondary">Cancel</button>
                  <button
                    onClick={handleConnect}
                    disabled={connecting !== null || password.length < 8}
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    style={{ backgroundColor: password.length >= 8 ? '#22c55e' : undefined, color: password.length >= 8 ? 'white' : 'var(--text-content-secondary)' }}
                  >
                    {connecting ? <LoaderIcon size={14} className="animate-spin mx-auto" /> : 'Connect'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
