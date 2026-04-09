import { useState, useEffect, useCallback } from 'react';
import { SessionList } from './components/SessionList';
import { TerminalView } from './components/TerminalView';
import { listSessions, createSession, deleteSession, Session } from './services/api';

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedPort, setSelectedPort] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceIP, setDeviceIP] = useState('localhost');

  useEffect(() => {
    // 获取设备 IP
    fetch('/api/system/device-ip')
      .then((res) => res.json())
      .then((data) => {
        if (data.ip) setDeviceIP(data.ip);
      })
      .catch(() => {
        // fallback to localhost for local testing
      });
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const data = await listSessions();
      setSessions(data);
      setError(null);
    } catch (err) {
      setError('获取会话列表失败');
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const handleSelect = (port: number) => {
    setSelectedPort(port);
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const result = await createSession();
      await fetchSessions();
      setSelectedPort(result.port);
      setError(null);
    } catch (err) {
      setError('创建会话失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`确定要删除会话 "${name}" 吗？`)) return;

    setLoading(true);
    try {
      await deleteSession(name);
      await fetchSessions();
      if (sessions.length <= 1) {
        setSelectedPort(null);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除会话失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <SessionList
        sessions={sessions}
        selectedPort={selectedPort}
        onSelect={handleSelect}
        onCreate={handleCreate}
        onDelete={handleDelete}
        loading={loading}
      />
      <TerminalView port={selectedPort} deviceIP={deviceIP} />

      {error && (
        <div className="error-toast" onClick={() => setError(null)}>
          {error}
        </div>
      )}

      <style>{`
        .app {
          display: flex;
          height: 100vh;
          overflow: hidden;
        }

        .error-toast {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #ef4444;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          z-index: 1000;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }
      `}</style>
    </div>
  );
}

export default App;
