import { useEffect, useState } from 'react';
import { Folder, RefreshCw, ExternalLink } from 'lucide-react';

export function FileBrowser() {
  const [deviceIP, setDeviceIP] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const fileBrowserUrl = deviceIP ? `http://${deviceIP}:8081` : '';

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-claw-500" />
      </div>
    );
  }

  if (error || !fileBrowserUrl) {
    return (
      <div className="h-full flex items-center justify-center text-content-secondary">
        <p>{error || '无法加载文件浏览器'}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-edge">
        <div className="flex items-center gap-2">
          <Folder size={16} className="text-content-secondary" />
          <span className="text-sm font-medium text-content-primary">FileBrowser</span>
          <span className="text-xs text-content-tertiary">(admin / Admin@123456)</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={fileBrowserUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-content-secondary hover:text-content-primary flex items-center gap-1"
          >
            <ExternalLink size={12} />
            新窗口打开
          </a>
        </div>
      </div>
      <div className="flex-1">
        <iframe
          src={fileBrowserUrl}
          className="w-full h-full border-0"
          title="FileBrowser"
        />
      </div>
    </div>
  );
}
