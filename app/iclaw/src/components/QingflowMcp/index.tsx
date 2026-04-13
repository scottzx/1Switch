import { useState } from 'react';
import { motion } from 'framer-motion';
import { SetupChecker } from './SetupChecker';
import { AppBrowser } from './components/AppBrowser';
import { RecordManager } from './components/RecordManager';
import { TaskCenter } from './components/TaskCenter';
import type { QingflowApp, QingflowSchema } from './types';

type TabType = 'apps' | 'records' | 'tasks' | 'analytics';

export function QingflowMcp() {
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

  // Setup 未完成，显示 SetupChecker（含 Step 1-4）
  if (!setupComplete) {
    return <SetupChecker onComplete={() => setSetupComplete(true)} />;
  }

  // 主功能页面
  return (
    <div className="h-full flex flex-col">
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
