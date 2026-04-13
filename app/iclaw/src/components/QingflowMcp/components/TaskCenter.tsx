import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, RotateCcw, Clock, ChevronRight, History } from 'lucide-react';
import useQingflow from '../hooks/useQingflow';
import type { QingflowTask, TaskBoxType } from '../types';

const TASK_BOX_OPTIONS: { value: TaskBoxType; label: string }[] = [
  { value: 'todo', label: '待办' },
  { value: 'initiated', label: '我发起' },
  { value: 'cc', label: '抄送' },
  { value: 'done', label: '已办' },
];

const FLOW_STATUS_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'in_progress', label: '进行中' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已拒绝' },
  { value: 'pending_fix', label: '待修正' },
  { value: 'overdue', label: '已逾期' },
  { value: 'due_soon', label: '即将到期' },
];

export function TaskCenter() {
  const qingflow = useQingflow();
  const [tasks, setTasks] = useState<QingflowTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskBox, setTaskBox] = useState<TaskBoxType>('todo');
  const [flowStatus, setFlowStatus] = useState('all');
  const [selectedTask, setSelectedTask] = useState<QingflowTask | null>(null);
  const [taskDetail, setTaskDetail] = useState<unknown>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [taskBox, flowStatus]);

  const loadTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await qingflow.listTasks(taskBox, flowStatus as any, 50);
      if (result.ok && result.data) {
        const data = result.data as { tasks?: QingflowTask[] };
        setTasks(data.tasks || []);
      } else {
        setError(result.error || 'Failed to load tasks');
      }
    } catch (err) {
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskSelect = async (task: QingflowTask) => {
    setSelectedTask(task);
    setLoadingDetail(true);

    try {
      const result = await qingflow.getTask(task.app_key, task.record_id, task.workflow_node_id);
      if (result.ok) {
        setTaskDetail(result.data);
      }
    } catch (err) {
      setError('Failed to load task detail');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleAction = async (action: 'approve' | 'reject' | 'revert' | 'transfer') => {
    if (!selectedTask) return;

    if (!confirm(`确定要${action === 'approve' ? '同意' : action === 'reject' ? '拒绝' : action === 'revert' ? '回退' : '转交'}吗？`)) {
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const result = await qingflow.executeTaskAction(
        selectedTask.app_key,
        selectedTask.record_id,
        selectedTask.workflow_node_id,
        action
      );

      if (result.ok) {
        await loadTasks();
        setSelectedTask(null);
        setTaskDetail(null);
      } else {
        setError(result.error || 'Action failed');
      }
    } catch (err) {
      setError('Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const getTaskBoxIcon = (box: TaskBoxType) => {
    switch (box) {
      case 'todo':
        return <Clock size={14} />;
      case 'initiated':
        return <ChevronRight size={14} />;
      case 'cc':
        return null;
      case 'done':
        return <CheckCircle size={14} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'var(--text-success)';
      case 'rejected':
        return 'var(--text-error)';
      case 'pending_fix':
        return 'var(--text-warning)';
      case 'overdue':
        return 'var(--text-error)';
      case 'due_soon':
        return 'var(--text-warning)';
      default:
        return 'var(--text-secondary)';
    }
  };

  return (
    <div className="flex h-full gap-4">
      {/* Task List */}
      <div
        className="w-80 flex flex-col rounded-xl"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}
      >
        {/* Filter Header */}
        <div className="p-4" style={{ borderBottom: '1px solid var(--border-primary)' }}>
          <div className="flex items-center gap-2 mb-3">
            {TASK_BOX_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setTaskBox(option.value)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                style={{
                  backgroundColor: taskBox === option.value ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                  color: taskBox === option.value ? 'white' : 'var(--text-secondary)',
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          <select
            value={flowStatus}
            onChange={(e) => setFlowStatus(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)',
            }}
          >
            {FLOW_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                暂无任务
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {tasks.map((task) => (
                <button
                  key={task.task_id}
                  onClick={() => handleTaskSelect(task)}
                  className="w-full p-3 rounded-lg text-left transition-colors"
                  style={{
                    backgroundColor: selectedTask?.task_id === task.task_id ? 'var(--bg-elevated)' : 'transparent',
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {task.title}
                      </p>
                      <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-tertiary)' }}>
                        {task.app_name} · {task.node_name}
                      </p>
                    </div>
                    {getTaskBoxIcon(task.task_box) && (
                      <div style={{ color: 'var(--text-tertiary)' }}>
                        {getTaskBoxIcon(task.task_box)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        color: getStatusColor(task.flow_status),
                      }}
                    >
                      {task.flow_status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Refresh Button */}
        <div className="p-3" style={{ borderTop: '1px solid var(--border-primary)' }}>
          <button
            onClick={loadTasks}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
        </div>
      </div>

      {/* Task Detail */}
      <div
        className="flex-1 rounded-xl"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}
      >
        {!selectedTask ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <History size={32} style={{ color: 'var(--text-tertiary)' }} />
              <p className="mt-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                选择一个任务查看详情
              </p>
            </div>
          </div>
        ) : loadingDetail ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Detail Header */}
            <div className="p-4" style={{ borderBottom: '1px solid var(--border-primary)' }}>
              <h3 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
                {selectedTask.title}
              </h3>
              <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
                {selectedTask.app_name} · {selectedTask.node_name}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span
                  className="text-xs px-2 py-1 rounded"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    color: getStatusColor(selectedTask.flow_status),
                  }}
                >
                  {selectedTask.flow_status}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  创建于 {new Date(selectedTask.create_time).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Detail Content */}
            <div className="flex-1 overflow-auto p-4">
              {taskDetail && typeof taskDetail === 'object' ? (
                <div className="space-y-3">
                  {Object.entries(taskDetail).map(([key, value]) => (
                    <div key={key}>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
                        {key}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        {typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  暂无详情
                </p>
              )}
            </div>

            {/* Action Buttons */}
            {taskBox === 'todo' && (
              <div className="p-4 flex items-center gap-3" style={{ borderTop: '1px solid var(--border-primary)' }}>
                <button
                  onClick={() => handleAction('approve')}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--text-success)', color: 'white' }}
                >
                  <CheckCircle size={14} />
                  同意
                </button>
                <button
                  onClick={() => handleAction('reject')}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--text-error)', color: 'white' }}
                >
                  <XCircle size={14} />
                  拒绝
                </button>
                <button
                  onClick={() => handleAction('revert')}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                >
                  <RotateCcw size={14} />
                  回退
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TaskCenter;
