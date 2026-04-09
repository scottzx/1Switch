import { Session } from '../services/api';
import { Terminal, Plus, Trash2, Circle } from 'lucide-react';

interface Props {
  sessions: Session[];
  selectedPort: number | null;
  onSelect: (port: number) => void;
  onCreate: () => void;
  onDelete: (name: string) => void;
  loading: boolean;
}

export function SessionList({ sessions, selectedPort, onSelect, onCreate, onDelete, loading }: Props) {
  return (
    <div className="session-list">
      <div className="session-list-header">
        <h2>终端会话</h2>
        <button onClick={onCreate} disabled={loading} title="新建会话">
          <Plus size={18} />
        </button>
      </div>

      <div className="session-items">
        {sessions.map((session) => (
          <div
            key={session.name}
            className={`session-item ${selectedPort === session.port ? 'active' : ''}`}
            onClick={() => onSelect(session.port)}
          >
            <div className="session-info">
              <Circle
                size={8}
                fill={session.status === 'running' ? '#4ade80' : '#6b7280'}
                color={session.status === 'running' ? '#4ade80' : '#6b7280'}
              />
              <span className="session-name">{session.name}</span>
              <span className="session-port">:{session.port}</span>
            </div>

            {session.port !== 7681 && (
              <button
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(session.name);
                }}
                title="删除会话"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}

        {sessions.length === 0 && !loading && (
          <div className="empty-state">
            <Terminal size={32} />
            <p>暂无会话</p>
          </div>
        )}
      </div>

      <style>{`
        .session-list {
          width: 240px;
          min-width: 240px;
          background: #16213e;
          border-right: 1px solid #0f3460;
          display: flex;
          flex-direction: column;
          height: 100vh;
        }

        .session-list-header {
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #0f3460;
        }

        .session-list-header h2 {
          font-size: 14px;
          font-weight: 600;
          color: #e0e0e0;
        }

        .session-list-header button {
          background: #0f3460;
          border: none;
          border-radius: 6px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #e0e0e0;
          cursor: pointer;
          transition: background 0.2s;
        }

        .session-list-header button:hover:not(:disabled) {
          background: #1a4a7a;
        }

        .session-list-header button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .session-items {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .session-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
          margin-bottom: 4px;
        }

        .session-item:hover {
          background: rgba(15, 52, 96, 0.5);
        }

        .session-item.active {
          background: #0f3460;
        }

        .session-info {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow: hidden;
        }

        .session-name {
          font-size: 13px;
          color: #e0e0e0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .session-port {
          font-size: 11px;
          color: #6b7280;
          font-family: monospace;
        }

        .delete-btn {
          background: transparent;
          border: none;
          color: #6b7280;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: all 0.2s;
        }

        .session-item:hover .delete-btn {
          opacity: 1;
        }

        .delete-btn:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          color: #6b7280;
        }

        .empty-state p {
          margin-top: 12px;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}
