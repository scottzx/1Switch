import { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

interface Props {
  port: number | null;
  deviceIP: string;
}

export function TerminalView({ port, deviceIP }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current && port) {
      iframeRef.current.src = `http://${deviceIP}:${port}`;
    }
  }, [port, deviceIP]);

  if (!port) {
    return (
      <div className="terminal-placeholder">
        <Terminal size={48} />
        <p>选择一个会话开始</p>
        <style>{`
          .terminal-placeholder {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #6b7280;
            background: #1a1a2e;
          }
          .terminal-placeholder p {
            margin-top: 16px;
            font-size: 14px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="terminal-view">
      <iframe
        ref={iframeRef}
        title="Terminal"
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
      <style>{`
        .terminal-view {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #0a0a0a;
        }
        .terminal-view iframe {
          flex: 1;
          border: none;
          width: 100%;
          height: 100%;
        }
      `}</style>
    </div>
  );
}
