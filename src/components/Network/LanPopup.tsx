import { useState, useEffect } from 'react';
import { networkApi } from '../../services/api';
import { Copy, Check, Network } from 'lucide-react';

interface LanPopupProps {
  onClose: () => void;
}

export function LanPopup({ onClose }: LanPopupProps) {
  const [lanStatus, setLanStatus] = useState<{ connected: boolean; ip: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLanStatus();
  }, []);

  const loadLanStatus = async () => {
    try {
      const interfaces = await networkApi.interfaces();
      // Find ethernet interface with IP
      const ethernet = interfaces.find(i => i.type === 'ethernet' && i.ip);
      if (ethernet) {
        setLanStatus({ connected: true, ip: ethernet.ip });
      } else {
        setLanStatus({ connected: false, ip: '' });
      }
    } catch (e) {
      console.error('Failed to get LAN status:', e);
      setLanStatus({ connected: false, ip: '' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (lanStatus?.ip) {
      await navigator.clipboard.writeText(lanStatus.ip);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div
        className="absolute top-14 right-4 w-72 rounded-xl shadow-xl border p-4"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-primary)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-3">
          <Network size={16} style={{ color: 'var(--text-secondary)' }} />
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>LAN</span>
        </div>

        {loading ? (
          <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading...</div>
        ) : lanStatus?.connected ? (
          <div>
            <div className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              Connected
            </div>
            <div className="flex items-center gap-2">
              <code
                className="flex-1 px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--bg-overlay)',
                  color: 'var(--text-primary)',
                }}
              >
                {lanStatus.ip}
              </code>
              <button
                onClick={handleCopy}
                className="p-2 rounded-lg transition-colors"
                style={{
                  backgroundColor: 'var(--bg-overlay)',
                  color: copied ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                }}
                title="Copy IP"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Not Connected
          </div>
        )}
      </div>
    </div>
  );
}
