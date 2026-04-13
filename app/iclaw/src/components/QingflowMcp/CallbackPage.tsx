import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/tauri';

export function CallbackPage() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      // 1. 保存 token 到文件
      api.saveQingflowToken(token).catch(console.error);

      // 2. 通过 postMessage 发送给 opener
      if (window.opener) {
        window.opener.postMessage({ type: 'QINGFLOW_TOKEN', token }, '*');
      }
    }

    // 3. 显示成功消息并关闭
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
