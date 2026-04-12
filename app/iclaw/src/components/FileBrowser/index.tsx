import { ExternalLink } from 'lucide-react';
import { Folder } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

export function FileBrowser() {
  const deviceHost = useAppStore((state) => state.deviceHost);
  const fileBrowserUrl = `http://${deviceHost}:8081`;

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
