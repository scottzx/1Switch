import { useState } from 'react';
import { execApi } from '../../services/api';

interface QuickCommandPopupProps {
  onClose: () => void;
}

export function QuickCommandPopup({ onClose }: QuickCommandPopupProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleDeployTtyd = async () => {
    setLoading(true);
    setResult(null);
    try {
      const cmd = `apt-get install -y tmux
systemctl stop iclaw-ttyd 2>/dev/null; killall ttyd 2>/dev/null || true
mkdir -p /etc/systemd/system
cat > /etc/systemd/system/iclaw-ttyd.service << 'EOF'
[Unit]
Description=iClaw Terminal
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/ttyd -p 7681 -W tmux new -A -s web-ttyd
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
chmod 644 /etc/systemd/system/iclaw-ttyd.service
systemctl daemon-reload && systemctl enable iclaw-ttyd && systemctl restart iclaw-ttyd`;
      const res = await execApi.exec(cmd);
      if (res.exitCode !== 0) {
        setResult({ type: 'error', text: `失败: ${res.output || '命令执行失败'}` });
      } else {
        setResult({ type: 'success', text: '部署成功' });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setResult({ type: 'error', text: `失败: ${msg}` });
    } finally {
      setLoading(false);
    }
  };

  const handleDeployFrpc = async () => {
    setLoading(true);
    setResult(null);
    try {
      // 1. 获取设备序列号
      const deviceRes = await fetch('/api/deviceinfo');
      const device = await deviceRes.json();

      // 2. 调用服务器 API 获取配置（服务器在此刻分配端口）
      const connectRes = await fetch('/api/frp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serial: device.serial, local_port: 22 }),
      });
      const portData = await connectRes.json();

      if (!portData.success) {
        setResult({ type: 'error', text: portData.error || '获取端口失败' });
        return;
      }

      // 3. 写入 frpc.ini (remote_port = 0，由服务器分配)
      const configContent = `[common]
server_addr = ${portData.server}
server_port = 7000
token = ${portData.token}

[${portData.proxy_name}]
type = tcp
local_ip = 127.0.0.1
local_port = 22
remote_port = 0
`;
      const writeCmd = `mkdir -p /var/lib/iclaw && cat > /var/lib/iclaw/frpc.ini << 'EOF'\n${configContent}EOF`;
      const writeRes = await execApi.exec(writeCmd);
      if (writeRes.exitCode !== 0) {
        setResult({ type: 'error', text: `写入配置失败: ${writeRes.output || '命令执行失败'}` });
        return;
      }

      // 4. 启动 frpc
      const startCmd = `killall frpc 2>/dev/null || true; nohup frpc -c /var/lib/iclaw/frpc.ini > /dev/null 2>&1 &`;
      const startRes = await execApi.exec(startCmd);
      if (startRes.exitCode !== 0) {
        setResult({ type: 'error', text: `启动 frpc 失败: ${startRes.output || '命令执行失败'}` });
        return;
      }

      setResult({ type: 'success', text: `FRP 配置已写入，端口由服务器自动分配` });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setResult({ type: 'error', text: `失败: ${msg}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-[10vh]">
        <div className="w-full h-full rounded-xl shadow-2xl border border-black bg-surface-card overflow-hidden flex flex-col max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-black shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <span className="font-semibold text-content-primary text-base">快捷指令</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-elevated text-content-tertiary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            <div className="grid grid-cols-4 auto-rows-min gap-6">
              <div className="bg-white rounded-xl p-6 flex flex-col border border-black">
                {/* 标题行：icon + 标题 */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <span className="font-medium text-content-primary text-sm">部署 Web Terminal</span>
                </div>

                {/* 分隔线 */}
                <div className="border-t border-black/10 mb-3" />

                {/* 内容行：描述 + 按钮 */}
                <div className="flex items-center justify-between gap-4">
                  <div className="text-xs text-content-tertiary leading-relaxed flex-1">
                    将 ttyd 服务部署为 ttyd + tmux 模式，监听 7681 端口
                  </div>
                  <button
                    onClick={handleDeployTtyd}
                    disabled={loading}
                    className="w-9 h-9 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-400 hover:bg-green-500/30 disabled:opacity-50 transition-colors shrink-0"
                  >
                    {loading ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {/* 结果 */}
                {result && (
                  <>
                    <div className="border-t border-black/10 mt-3 mb-2" />
                  <div className={`text-xs px-2 py-1 rounded-lg ${
                    result.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {result.text}
                  </div>
                  </>
                )}
              </div>

              {/* FRP 配置卡片 */}
              <div className="bg-white rounded-xl p-6 flex flex-col border border-black">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
                    </svg>
                  </div>
                  <span className="font-medium text-content-primary text-sm">创建 FRP 配置</span>
                </div>
                <div className="border-t border-black/10 mb-3" />
                <div className="flex items-center justify-between gap-4">
                  <div className="text-xs text-content-tertiary leading-relaxed flex-1">
                    创建 frpc.ini 并启动 FRP 客户端，连接远程服务器
                  </div>
                  <button
                    onClick={handleDeployFrpc}
                    disabled={loading}
                    className="w-9 h-9 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-400 hover:bg-green-500/30 disabled:opacity-50 transition-colors shrink-0"
                  >
                    {loading ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
