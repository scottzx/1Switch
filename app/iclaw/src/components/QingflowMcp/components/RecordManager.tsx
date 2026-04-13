import { useState, useEffect } from 'react';
import { RefreshCw, Plus, Trash2, Edit2, Table } from 'lucide-react';
import useQingflow from '../hooks/useQingflow';
import type { QingflowApp, QingflowView, QingflowSchema, QingflowRecord } from '../types';

interface RecordManagerProps {
  app: QingflowApp | null;
  schema?: QingflowSchema | null;
  onSchemaLoad?: (schema: QingflowSchema) => void;
}

export function RecordManager({ app, schema, onSchemaLoad }: RecordManagerProps) {
  const qingflow = useQingflow();
  const [records, setRecords] = useState<QingflowRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<QingflowView | null>(null);
  const [currentSchema, setCurrentSchema] = useState<QingflowSchema | null>(schema || null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (app) {
      loadSchema();
    }
  }, [app]);

  useEffect(() => {
    if (app && currentView && mode === 'list') {
      loadRecords();
    }
  }, [currentView, app]);

  const loadSchema = async () => {
    if (!app) return;

    setLoading(true);
    setError(null);

    try {
      // First get app to get views
      const appResult = await qingflow.getApp(app.app_key);
      if (!appResult.ok) {
        setError(appResult.error || 'Failed to load app');
        return;
      }

      const appData = appResult.data as { accessible_views?: QingflowView[] };
      const views = appData.accessible_views || [];

      if (views.length === 0) {
        setError('No views available for this app');
        return;
      }

      // Select first view by default
      const defaultView = views[0];
      setCurrentView(defaultView);

      // Load schema for the view
      const schemaResult = await qingflow.getRecordSchema(app.app_key, 'browse', defaultView.view_id);
      if (schemaResult.ok) {
        const schemaData = schemaResult.data as QingflowSchema;
        setCurrentSchema(schemaData);
        onSchemaLoad?.(schemaData);
      }
    } catch (err) {
      setError('Failed to load schema');
    } finally {
      setLoading(false);
    }
  };

  const loadRecords = async () => {
    if (!app || !currentView) return;

    setLoading(true);
    setError(null);

    try {
      const result = await qingflow.listRecords(app.app_key, currentView.view_id, 50);
      if (result.ok && result.data) {
        const data = result.data as { records?: QingflowRecord[]; totalCount?: number };
        setRecords(data.records || []);
        setTotalCount(data.totalCount || 0);
      } else {
        setError(result.error || 'Failed to load records');
      }
    } catch (err) {
      setError('Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  const handleViewChange = async (view: QingflowView) => {
    setCurrentView(view);
    setLoading(true);

    try {
      const schemaResult = await qingflow.getRecordSchema(app!.app_key, 'browse', view.view_id);
      if (schemaResult.ok) {
        const schemaData = schemaResult.data as QingflowSchema;
        setCurrentSchema(schemaData);
        onSchemaLoad?.(schemaData);
      }
    } catch (err) {
      setError('Failed to load view schema');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!app) return;

    setLoading(true);
    setError(null);

    try {
      // Get applicant schema for creation
      const schemaResult = await qingflow.getRecordSchema(app.app_key, 'applicant');
      if (!schemaResult.ok) {
        setError(schemaResult.error || 'Failed to load creation schema');
        return;
      }

      setMode('create');
      setFormData({});
      setCurrentSchema(schemaResult.data as QingflowSchema);
    } catch (err) {
      setError('Failed to prepare creation form');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (record: QingflowRecord) => {
    if (!app) return;

    setSelectedRecordId(record.id);
    setFormData(record.fields);
    setMode('edit');
  };

  const handleDelete = async (recordId: string) => {
    if (!app || !confirm('确定要删除这条记录吗？')) return;

    setLoading(true);
    setError(null);

    try {
      const result = await qingflow.deleteRecord(app.app_key, recordId);
      if (result.ok) {
        await loadRecords();
      } else {
        setError(result.error || 'Failed to delete record');
      }
    } catch (err) {
      setError('Failed to delete record');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!app) return;

    setLoading(true);
    setError(null);

    try {
      // Create a temp file with fields
      const fieldsJson = JSON.stringify(formData);
      // Note: In real implementation, we'd need to write this file via a service
      // For now, we'll use a simplified approach

      if (mode === 'create') {
        const result = await qingflow.insertRecord(app.app_key, fieldsJson);
        if (result.ok) {
          setMode('list');
          loadRecords();
        } else {
          setError(result.error || 'Failed to create record');
        }
      } else if (mode === 'edit' && selectedRecordId) {
        const result = await qingflow.updateRecord(app.app_key, selectedRecordId, fieldsJson);
        if (result.ok) {
          setMode('list');
          loadRecords();
        } else {
          setError(result.error || 'Failed to update record');
        }
      }
    } catch (err) {
      setError('Failed to save record');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setMode('list');
    setFormData({});
    setSelectedRecordId(null);
  };

  const renderFieldInput = (field: { field_id: string; name: string; type: string; required?: boolean; options?: { label: string; value: string }[] }) => {
    const value = formData[field.field_id];

    if (field.type === 'select' || field.type === 'radio') {
      return (
        <select
          value={(value as string) || ''}
          onChange={(e) => setFormData({ ...formData, [field.field_id]: e.target.value })}
          className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-primary)',
            color: 'var(--text-primary)',
          }}
        >
          <option value="">请选择</option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === 'checkbox') {
      return (
        <input
          type="checkbox"
          checked={(value as boolean) || false}
          onChange={(e) => setFormData({ ...formData, [field.field_id]: e.target.checked })}
          className="w-5 h-5 rounded"
        />
      );
    }

    if (field.type === 'number') {
      return (
        <input
          type="number"
          value={(value as number) || ''}
          onChange={(e) => setFormData({ ...formData, [field.field_id]: Number(e.target.value) })}
          className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-primary)',
            color: 'var(--text-primary)',
          }}
        />
      );
    }

    if (field.type === 'textarea' || field.type === 'richtext') {
      return (
        <textarea
          value={(value as string) || ''}
          onChange={(e) => setFormData({ ...formData, [field.field_id]: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 text-sm rounded-lg border outline-none resize-none"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-primary)',
            color: 'var(--text-primary)',
          }}
        />
      );
    }

    // Default to text input
    return (
      <input
        type="text"
        value={(value as string) || ''}
        onChange={(e) => setFormData({ ...formData, [field.field_id]: e.target.value })}
        className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-primary)',
          color: 'var(--text-primary)',
        }}
      />
    );
  };

  if (!app) {
    return (
      <div
        className="flex items-center justify-center h-full rounded-lg"
        style={{ backgroundColor: 'var(--bg-card)' }}
      >
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          请先选择一个应用
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4" style={{ borderBottom: '1px solid var(--border-primary)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Table size={16} style={{ color: 'var(--text-secondary)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {currentView?.name || '记录管理'}
            </span>
            <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}>
              {totalCount} 条
            </span>
          </div>

          <div className="flex items-center gap-2">
            {mode === 'list' && (
              <>
                <button
                  onClick={handleCreate}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
                  style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
                >
                  <Plus size={14} />
                  新建
                </button>
                <button
                  onClick={loadRecords}
                  disabled={loading}
                  className="p-2 rounded-lg transition-colors"
                  style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
              </>
            )}
            {(mode === 'create' || mode === 'edit') && (
              <>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
                  style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                >
                  取消
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
                >
                  {loading ? '保存中...' : '保存'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* View Selector */}
        {app.accessible_views && app.accessible_views.length > 0 && mode === 'list' && (
          <div className="flex items-center gap-2 overflow-x-auto">
            {app.accessible_views.map((view) => (
              <button
                key={view.view_id}
                onClick={() => handleViewChange(view)}
                className="px-3 py-1 text-xs rounded-lg whitespace-nowrap transition-colors"
                style={{
                  backgroundColor: currentView?.view_id === view.view_id ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                  color: currentView?.view_id === view.view_id ? 'white' : 'var(--text-secondary)',
                }}
              >
                {view.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div
          className="mx-4 mt-4 p-3 rounded-lg text-sm"
          style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-error)' }}
        >
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {mode === 'list' ? (
          // Record List
          <div className="space-y-2">
            {loading && records.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
              </div>
            ) : records.length === 0 ? (
              <div
                className="flex items-center justify-center h-32 rounded-lg"
                style={{ backgroundColor: 'var(--bg-card)' }}
              >
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  暂无记录
                </p>
              </div>
            ) : (
              records.map((record) => (
                <div
                  key={record.id}
                  className="p-4 rounded-lg flex items-start justify-between"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-primary)',
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {record.fields.title || record.fields.name || `#${record.id}`}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      ID: {record.id}
                      {record.create_time && ` · ${new Date(record.create_time).toLocaleString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <button
                      onClick={() => handleEdit(record)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
                      title="编辑"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: 'var(--text-error)' }}
                      title="删除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          // Create/Edit Form
          <div className="space-y-4 max-w-lg">
            {currentSchema?.fields.map((field) => (
              <div key={field.field_id}>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  {field.name}
                  {field.required && <span style={{ color: 'var(--text-error)' }}> *</span>}
                </label>
                {renderFieldInput(field)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default RecordManager;
