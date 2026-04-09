import { Link } from 'react-router-dom';

function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        iClaw 统一门户
      </h1>
      <p style={{ color: '#888', marginBottom: '3rem' }}>OpenClaw Management Portal</p>

      <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '600px', width: '100%' }}>
        <Link
          to="/app/iclaw/"
          style={{
            display: 'block',
            padding: '2rem',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '16px',
            textDecoration: 'none',
            color: 'inherit',
            border: '1px solid rgba(255,255,255,0.1)',
            transition: 'all 0.2s',
          }}
        >
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#fff' }}>进入管理系统</h2>
          <p style={{ color: '#888' }}>访问 OpenClaw 设备管理与配置界面</p>
        </Link>
      </div>
    </div>
  );
}

export default App;
