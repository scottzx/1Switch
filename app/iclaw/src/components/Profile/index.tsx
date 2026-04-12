import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Loader2,
    Edit3,
    Eye,
    Save,
    CheckCircle,
    XCircle,
    AlertTriangle,
    FileText,
    ChevronDown,
    RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';
import { invoke } from '../../lib/invoke-shim';

type TabMode = 'edit' | 'preview';

interface AgentInfo {
    id: string;
    name: string;
    emoji: string;
    workspace: string;
    isDefault: boolean;
}

export function Profile() {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<TabMode>('edit');
    const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(null);
    const [agents, setAgents] = useState<AgentInfo[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
    const [showAgentDropdown, setShowAgentDropdown] = useState(false);

    const fetchAgents = useCallback(async () => {
        try {
            const result = await invoke<AgentInfo[]>('get_agents_list');
            setAgents(result);
            // 如果还没有选中，自动选择默认的
            if (!selectedAgent && result.length > 0) {
                const defaultAgent = result.find((a: AgentInfo) => a.isDefault) || result[0];
                setSelectedAgent(defaultAgent);
            }
        } catch (e) {
            console.error('获取龙虾列表失败:', e);
        }
    }, []);

    const fetchIdentity = useCallback(async () => {
        if (!selectedAgent) return;
        setLoading(true);
        try {
            const result = await invoke<string>('get_identity', { workspace: selectedAgent.workspace });
            setContent(result);
        } catch (e) {
            console.error('获取龙虾档案失败:', e);
            setContent('');
        } finally {
            setLoading(false);
        }
    }, [selectedAgent]);

    useEffect(() => {
        fetchAgents();
    }, []);

    useEffect(() => {
        if (selectedAgent) {
            fetchIdentity();
        }
    }, [selectedAgent, fetchIdentity]);

    const handleSave = async () => {
        if (!selectedAgent) return;
        setSaving(true);
        setActionResult(null);
        try {
            await invoke<void>('save_identity', { content, workspace: selectedAgent.workspace });
            setActionResult({ success: true, message: `${selectedAgent.name} 的档案已保存` });
        } catch (e) {
            setActionResult({ success: false, message: String(e) });
        } finally {
            setSaving(false);
        }
    };

    const handleAgentSelect = (agent: AgentInfo) => {
        setSelectedAgent(agent);
        setShowAgentDropdown(false);
        setActionResult(null);
    };

    if (loading && !selectedAgent) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-claw-500" />
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto scroll-container pr-2">
            <div className="max-w-4xl">
                {/* 头部 */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-content-primary">龙虾档案</h2>
                        <p className="text-sm text-content-secondary">编辑 AI 助手身份档案</p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* 龙虾选择下拉 */}
                        <div className="relative">
                            <button
                                onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                                className="flex items-center gap-2 px-4 py-2 bg-surface-card border border-edge rounded-lg hover:border-claw-500 transition-colors"
                            >
                                {selectedAgent ? (
                                    <>
                                        <span className="text-lg">{selectedAgent.emoji}</span>
                                        <span className="text-sm text-content-primary">{selectedAgent.name}</span>
                                    </>
                                ) : (
                                    <span className="text-sm text-content-secondary">选择龙虾</span>
                                )}
                                <ChevronDown size={16} className="text-content-secondary" />
                            </button>

                            <AnimatePresence>
                                {showAgentDropdown && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        className="absolute right-0 top-full mt-2 w-64 bg-surface-card border border-edge rounded-xl shadow-xl z-50 overflow-hidden"
                                    >
                                        <div className="p-2">
                                            {agents.map((agent) => (
                                                <button
                                                    key={agent.id}
                                                    onClick={() => handleAgentSelect(agent)}
                                                    className={clsx(
                                                        'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left',
                                                        selectedAgent?.id === agent.id
                                                            ? 'bg-claw-500/20 text-content-primary'
                                                            : 'hover:bg-surface-elevated text-content-secondary'
                                                    )}
                                                >
                                                    <span className="text-xl">{agent.emoji}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{agent.name}</p>
                                                        <p className="text-xs text-content-tertiary truncate">{agent.workspace}</p>
                                                    </div>
                                                    {agent.isDefault && (
                                                        <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">默认</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="border-t border-edge p-2">
                                            <button
                                                onClick={() => { fetchAgents(); setShowAgentDropdown(false); }}
                                                className="w-full flex items-center justify-center gap-2 p-2 text-sm text-content-secondary hover:text-content-primary rounded-lg hover:bg-surface-elevated transition-colors"
                                            >
                                                <RefreshCw size={14} />
                                                刷新列表
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={saving || !selectedAgent}
                            className="btn-primary flex items-center gap-2"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {saving ? '保存中...' : '保存'}
                        </button>
                    </div>
                </div>

                {/* Tab 切换 */}
                <div className="flex gap-1 mb-4 bg-surface-card rounded-lg p-1 border border-edge w-fit">
                    <button
                        onClick={() => setActiveTab('edit')}
                        className={clsx(
                            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                            activeTab === 'edit'
                                ? 'bg-claw-500/20 text-claw-400'
                                : 'text-content-secondary hover:text-content-primary'
                        )}
                    >
                        <Edit3 size={16} />
                        编辑
                    </button>
                    <button
                        onClick={() => setActiveTab('preview')}
                        className={clsx(
                            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                            activeTab === 'preview'
                                ? 'bg-claw-500/20 text-claw-400'
                                : 'text-content-secondary hover:text-content-primary'
                        )}
                    >
                        <Eye size={16} />
                        预览
                    </button>
                </div>

                {/* 内容区 */}
                <div className="bg-surface-card rounded-2xl border border-edge overflow-hidden">
                    <AnimatePresence mode="wait">
                        {activeTab === 'edit' ? (
                            <motion.div
                                key="edit"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                {loading ? (
                                    <div className="h-96 flex items-center justify-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-claw-500" />
                                    </div>
                                ) : (
                                    <textarea
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        placeholder="在 IDENTITY.md 中编写龙虾档案...

# IDENTITY.md - 谁是我？

- **Name:** 你的名字
- **Creature:** 你是谁？AI？机器人？
- **Vibe:** 你给人什么感觉？
- **Emoji:** 你的标志
- **Avatar:** 头像路径"
                                        className="w-full h-96 p-5 bg-transparent text-content-primary resize-none focus:outline-none font-mono text-sm leading-relaxed"
                                        spellCheck={false}
                                    />
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="preview"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="p-5 min-h-96"
                            >
                                {loading ? (
                                    <div className="h-96 flex items-center justify-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-claw-500" />
                                    </div>
                                ) : content ? (
                                    <pre className="whitespace-pre-wrap text-content-primary text-sm leading-relaxed font-mono">
                                        {content}
                                    </pre>
                                ) : (
                                    <div className="h-96 flex flex-col items-center justify-center text-content-tertiary">
                                        <FileText size={48} className="mb-4 opacity-50" />
                                        <p>暂无档案内容</p>
                                        <p className="text-xs mt-1">切换到编辑模式创建档案</p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* 操作结果 */}
                <AnimatePresence>
                    {actionResult && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className={clsx(
                                'mt-4 p-3 rounded-lg border flex items-center gap-2',
                                actionResult.success
                                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                            )}
                        >
                            {actionResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
                            <span className="text-sm">{actionResult.message}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 提示 */}
                {selectedAgent && (
                    <div className="mt-6 p-4 bg-surface-card rounded-xl border border-edge">
                        <div className="flex items-start gap-3">
                            <AlertTriangle size={16} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-content-secondary">
                                <p className="font-medium text-content-primary mb-1">档案位置</p>
                                <p className="font-mono text-xs">{selectedAgent.workspace}/IDENTITY.md</p>
                                <p className="mt-2">档案内容会被 AI 助手读取，用于定义其身份、性格和行为方式。</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
