import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export function CallbackPage() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      // 通过 postMessage 发送给 opener（AuthPanel 会处理保存和登录）
      if (window.opener) {
        window.opener.postMessage({ type: 'QINGFLOW_TOKEN', token }, '*');
      }
    }

    // 显示成功消息并关闭
    const timer = setTimeout(() => window.close(), 3000);
    return () => clearTimeout(timer);
  }, [searchParams]);

  return (
    <div
      className="flex flex-col items-center justify-center h-screen gap-4"
      style={{ backgroundColor: 'var(--bg-app)' }}
    >
      <div className="text-4xl">✅</div>
      <h1 className="text-xl font-medium" style={{ color: 'var(--text-primary)' }}>
        登录成功！
      </h1>
      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
        正在关闭窗口...
      </p>
    </div>
  );
}

export default CallbackPage;
