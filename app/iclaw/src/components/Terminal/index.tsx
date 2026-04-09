import { useEffect, useState, useRef } from 'react';
import { Terminal as TerminalIcon, RefreshCw, ExternalLink } from 'lucide-react';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

export function Terminal() {
  const isMobile = useIsMobile();
  const [deviceIP, setDeviceIP] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const fetchDeviceIP = async () => {
      try {
        const response = await fetch('/api/system/device-ip');
        const data = await response.json();
        setDeviceIP(data.ip);
      } catch (e) {
        setError('无法获取设备IP');
      } finally {
        setLoading(false);
      }
    };
    fetchDeviceIP();
  }, []);

  const terminalUrl = deviceIP ? `http://${deviceIP}:7681` : '';

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-claw-500" />
      </div>
    );
  }

  if (error || !terminalUrl) {
    return (
      <div className="h-full flex items-center justify-center text-content-secondary">
        <p>{error || '无法加载终端'}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-edge">
        <div className="flex items-center gap-2">
          <TerminalIcon size={16} className="text-content-secondary" />
          <span className="text-sm font-medium text-content-primary">Web Terminal</span>
        </div>
        {isMobile && (
          <span className="text-xs text-content-tertiary">点击终端区域激活输入</span>
        )}
        <a
          href={terminalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-content-secondary hover:text-content-primary flex items-center gap-1"
        >
          <ExternalLink size={12} />
          新窗口打开
        </a>
      </div>
      <div className="flex-1 bg-black relative">
        <iframe
          ref={iframeRef}
          src={terminalUrl}
          className="w-full h-full border-0"
          title="Web Terminal"
          // allow="keyboard-input" 让 iframe 获得键盘输入权限，使 noVNC 的虚拟键盘能在移动端正常工作
          allow="keyboard-input"
          // 点击 iframe 使其获得焦点，让 noVNC 能接收键盘事件
          onClick={() => iframeRef.current?.focus()}
        />
        {/* 移动端提示层 */}
        {isMobile && (
          <div
            className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none"
          >
            <span className="px-3 py-1.5 bg-black/70 text-white/60 text-xs rounded-lg">
              点击终端区域，然后使用弹出的键盘输入
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
