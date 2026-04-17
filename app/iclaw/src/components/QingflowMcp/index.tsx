import { useState } from 'react';
import { motion } from 'framer-motion';
import { SetupChecker } from './SetupChecker';
import { AppBrowser } from './components/AppBrowser';
import { RecordManager } from './components/RecordManager';
import { TaskCenter } from './components/TaskCenter';
import type { QingflowApp, QingflowSchema } from './types';
import { ArrowLeft, Boxes, Plug, ChevronRight } from 'lucide-react';

type TabType = 'apps' | 'records' | 'tasks' | 'analytics';
type ViewMode = 'list' | 'config';

export function QingflowMcp() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [setupComplete, setSetupComplete] = useState(false);
  const [selectedApp, setSelectedApp] = useState<QingflowApp | null>(null);
  const [currentSchema, setCurrentSchema] = useState<QingflowSchema | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('apps');

  const tabs: { id: TabType; label: string }[] = [
    { id: 'apps', label: '应用' },
    { id: 'records', label: '记录' },
    { id: 'tasks', label: '任务' },
    { id: 'analytics', label: '分析' },
  ];

  // 拓展功能列表视图
  if (viewMode === 'list') {
    return (
      <div className="h-full p-6">
        <div className="max-w-4xl mx-auto">
          {/* 页面标题 */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <Boxes size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  拓展功能
                </h1>
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  探索更多功能模块
                </p>
              </div>
            </div>
          </div>

          {/* 模块列表 */}
          <div className="space-y-3">
            {/* 轻流 MCP */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onClick={() => setViewMode('config')}
              className="w-full p-4 rounded-xl text-left transition-all hover:scale-[1.01]"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-primary)',
              }}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                  <Plug size={24} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                    轻流 MCP
                  </h3>
                  <p className="text-sm truncate" style={{ color: 'var(--text-tertiary)' }}>
                    连接轻流平台，自动化业务流程
                  </p>
                </div>
                <ChevronRight size={20} className="text-[var(--text-tertiary)]" />
              </div>
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // Setup 未完成，显示 SetupChecker（含 Step 1-4）
  if (!setupComplete) {
    return <SetupChecker onComplete={() => setSetupComplete(true)} />;
  }

  // 主功能页面
  return (
    <div className="h-full flex flex-col">
      {/* 返回按钮 */}
      <div className="px-4 pt-4">
        <button
          onClick={() => setViewMode('list')}
          className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-[var(--bg-card)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">返回拓展功能</span>
        </button>
      </div>

      {/* Tab Navigation */}
      <div
        className="mx-4 flex items-center gap-1 p-1 rounded-lg"
        style={{ backgroundColor: 'var(--bg-card)' }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2 text-sm font-medium rounded-md transition-colors"
            style={{
              backgroundColor: activeTab === tab.id ? 'var(--bg-elevated)' : 'transparent',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden mt-4 mx-4 mb-4">
        {activeTab === 'apps' ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full rounded-xl"
            style={{ backgroundColor: 'var(--bg-card)' }}
          >
            <AppBrowser selectedAppKey={selectedApp?.app_key} onAppSelect={setSelectedApp} />
          </motion.div>
        ) : activeTab === 'records' ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full rounded-xl"
            style={{ backgroundColor: 'var(--bg-card)' }}
          >
            <RecordManager app={selectedApp} schema={currentSchema} onSchemaLoad={setCurrentSchema} />
          </motion.div>
        ) : activeTab === 'tasks' ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full rounded-xl"
            style={{ backgroundColor: 'var(--bg-card)' }}
          >
            <TaskCenter />
          </motion.div>
        ) : activeTab === 'analytics' ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full flex items-center justify-center rounded-xl"
            style={{ backgroundColor: 'var(--bg-card)' }}
          >
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              >
                📊
              </div>
              <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                数据分析
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                选择一个应用后，可使用 DSL 语法进行分组统计、趋势分析等高级操作。
              </p>
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

export default QingflowMcp;
