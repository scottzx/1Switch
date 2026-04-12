import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Loader2,
    Edit3,
    Save,
    X,
    CheckCircle,
    XCircle,
    FileText,
    RefreshCw,
    File,
    BookOpen,
    Wrench,
    Users,
    Heart,
    Rocket,
    Sparkles,
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '../../services/api';

interface AgentInfo {
    id: string;
    name: string;
    emoji: string;
    workspace: string;
    isDefault: boolean;
}

// 档案文件定义
interface ProfileFile {
    name: string;
    chineseName: string;
    description: string;
    icon: React.ReactNode;
}

const profileFiles: ProfileFile[] = [
    { name: 'IDENTITY.md', chineseName: '身份档案', description: '名字、形象、emoji', icon: <Sparkles size={18} className="text-purple-400" /> },
    { name: 'SOUL.md', chineseName: '灵魂契约', description: '价值观、行为准则', icon: <BookOpen size={18} className="text-blue-400" /> },
    { name: 'TOOLS.md', chineseName: '工具备注', description: '相机、SSH、TTS', icon: <Wrench size={18} className="text-green-400" /> },
    { name: 'AGENTS.md', chineseName: '工作手册', description: '空间规则、群聊礼仪', icon: <File size={18} className="text-orange-400" /> },
    { name: 'USER.md', chineseName: '用户资料', description: '用户信息、时区', icon: <Users size={18} className="text-pink-400" /> },
    { name: 'BOOTSTRAP.md', chineseName: '初始化向导', description: '首次启动引导', icon: <Rocket size={18} className="text-yellow-400" /> },
    { name: 'HEARTBEAT.md', chineseName: '心跳任务', description: '周期性后台检查', icon: <Heart size={18} className="text-red-400" /> },
];

export function Profile() {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(null);
    const [agents, setAgents] = useState<AgentInfo[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
    const [showAgentDropdown, setShowAgentDropdown] = useState(false);
    const [selectedFile, setSelectedFile] = useState<ProfileFile>(profileFiles[0]);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editContent, setEditContent] = useState('');

    const fetchAgents = useCallback(async () => {
        try {
            const result = await api.getAgents() as unknown as AgentInfo[];
            setAgents(result);
            if (!selectedAgent && result.length > 0) {
                const defaultAgent = result.find((a: AgentInfo) => a.isDefault) || result[0];
                setSelectedAgent(defaultAgent);
            }
        } catch (e) {
            console.error('获取龙虾列表失败:', e);
        }
    }, [selectedAgent]);

    const fetchProfileFile = useCallback(async (fileName: string) => {
        if (!selectedAgent) return;
        setLoading(true);
        try {
            const result = await api.getProfileFile(fileName, selectedAgent.workspace);
            setContent(result.content || '');
        } catch (e) {
            console.error('获取档案内容失败:', e);
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
            fetchProfileFile(selectedFile.name);
        }
    }, [selectedAgent, selectedFile, fetchProfileFile]);

    const handleEdit = () => {
        setEditContent(content);
        setEditModalOpen(true);
    };

    const handleSave = async () => {
        if (!selectedAgent) return;
        setSaving(true);
        setActionResult(null);
        try {
            await api.saveProfileFile(selectedFile.name, editContent, selectedAgent.workspace);
            setContent(editContent);
            setEditModalOpen(false);
            setActionResult({ success: true, message: `${selectedFile.chineseName} 已保存` });
        } catch (e) {
            setActionResult({ success: false, message: String(e) });
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditModalOpen(false);
        setEditContent('');
    };

    if (loading && !selectedAgent) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-claw-500" />
            </div>
        );
    }

    return (
        <div className="h-full flex">
            {/* 左侧档案导航 */}
            <div className="w-56 flex-shrink-0 bg-surface-card border-r border-edge flex flex-col">
                {/* 导航标题 */}
                <div className="p-4 border-b border-edge">
                    <h3 className="text-sm font-medium text-content-primary">档案文件</h3>
                    <p className="text-xs text-content-tertiary mt-1">选择要查看的档案</p>
                </div>

                {/* 龙虾选择 */}
                <div className="p-3 border-b border-edge">
                    <div className="relative">
                        <button
                            onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                            className="w-full flex items-center gap-2 px-3 py-2 bg-surface-elevated border border-edge rounded-lg hover:border-claw-500 transition-colors"
                        >
                            {selectedAgent ? (
                                <>
                                    <span className="text-base">{selectedAgent.emoji}</span>
                                    <span className="text-sm text-content-primary flex-1 truncate text-left">{selectedAgent.name}</span>
                                </>
                            ) : (
                                <span className="text-sm text-content-secondary">选择龙虾</span>
                            )}
                        </button>

                        <AnimatePresence>
                            {showAgentDropdown && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    className="absolute top-full left-0 right-0 mt-1 bg-surface-card border border-edge rounded-lg shadow-xl z-50 overflow-hidden"
                                >
                                    <div className="p-1 max-h-64 overflow-y-auto">
                                        {agents.map((agent) => (
                                            <button
                                                key={agent.id}
                                                onClick={() => {
                                                    setSelectedAgent(agent);
                                                    setShowAgentDropdown(false);
                                                    setActionResult(null);
                                                }}
                                                className={clsx(
                                                    'w-full flex items-center gap-2 p-2 rounded-md transition-colors text-left',
                                                    selectedAgent?.id === agent.id
                                                        ? 'bg-claw-500/20 text-content-primary'
                                                        : 'hover:bg-surface-elevated text-content-secondary'
                                                )}
                                            >
                                                <span className="text-lg">{agent.emoji}</span>
                                                <span className="text-sm flex-1 truncate">{agent.name}</span>
                                                {agent.isDefault && (
                                                    <span className="text-xs px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-400">默认</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="border-t border-edge p-1">
                                        <button
                                            onClick={() => { fetchAgents(); setShowAgentDropdown(false); }}
                                            className="w-full flex items-center justify-center gap-1 p-2 text-xs text-content-secondary hover:text-content-primary rounded hover:bg-surface-elevated"
                                        >
                                            <RefreshCw size={12} />
                                            刷新
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* 文件列表 */}
                <div className="flex-1 overflow-y-auto p-2">
                    {profileFiles.map((file) => (
                        <button
                            key={file.name}
                            onClick={() => {
                                setSelectedFile(file);
                                setActionResult(null);
                            }}
                            className={clsx(
                                'w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left mb-1',
                                selectedFile?.name === file.name
                                    ? 'bg-claw-500/20 border border-claw-500/30'
                                    : 'hover:bg-surface-elevated border border-transparent'
                            )}
                        >
                            <span className="flex-shrink-0">{file.icon}</span>
                            <div className="flex-1 min-w-0">
                                <p className={clsx(
                                    'text-sm font-medium truncate',
                                    selectedFile?.name === file.name ? 'text-content-primary' : 'text-content-secondary'
                                )}>
                                    {file.chineseName}
                                </p>
                                <p className="text-xs text-content-tertiary truncate">{file.description}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* 右侧内容区 */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* 顶部操作栏 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-edge bg-surface-card">
                    <div>
                        <h2 className="text-lg font-semibold text-content-primary flex items-center gap-2">
                            {selectedFile.icon}
                            {selectedFile.chineseName}
                        </h2>
                        <p className="text-xs text-content-tertiary mt-0.5">{selectedAgent?.workspace}/{selectedFile.name}</p>
                    </div>

                    <button
                        onClick={handleEdit}
                        disabled={loading}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Edit3 size={16} />
                        编辑
                    </button>
                </div>

                {/* 预览内容区 */}
                <div className="flex-1 overflow-hidden p-6">
                    <div className="h-full bg-surface-card rounded-2xl border border-edge overflow-hidden">
                        {loading ? (
                            <div className="h-full flex items-center justify-center">
                                <Loader2 className="w-8 h-8 animate-spin text-claw-500" />
                            </div>
                        ) : content ? (
                            <pre className="h-full overflow-y-auto p-5 whitespace-pre-wrap text-content-primary text-sm leading-relaxed font-mono">
                                {content}
                            </pre>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-content-tertiary">
                                <FileText size={48} className="mb-4 opacity-50" />
                                <p>暂无档案内容</p>
                                <p className="text-xs mt-1">点击上方"编辑"按钮创建档案</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 操作结果 */}
                <AnimatePresence>
                    {actionResult && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className={clsx(
                                'mx-6 mb-4 p-3 rounded-lg border flex items-center gap-2',
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
            </div>

            {/* 编辑弹窗 */}
            <AnimatePresence>
                {editModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6"
                        onClick={handleCancel}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-3xl h-[70vh] bg-surface-card rounded-2xl border border-edge shadow-2xl flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* 弹窗标题 */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-edge">
                                <div className="flex items-center gap-3">
                                    {selectedFile.icon}
                                    <div>
                                        <h3 className="text-lg font-semibold text-content-primary">编辑 {selectedFile.chineseName}</h3>
                                        <p className="text-xs text-content-tertiary">{selectedFile.name}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCancel}
                                    className="p-2 hover:bg-surface-elevated rounded-lg transition-colors text-content-secondary"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* 编辑内容 */}
                            <div className="flex-1 overflow-hidden p-4">
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="w-full h-full bg-surface-elevated rounded-xl p-4 text-content-primary resize-none focus:outline-none font-mono text-sm leading-relaxed border border-edge"
                                    spellCheck={false}
                                    autoFocus
                                />
                            </div>

                            {/* 弹窗底部操作 */}
                            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-edge">
                                <button
                                    onClick={handleCancel}
                                    className="px-4 py-2 text-sm text-content-secondary hover:text-content-primary hover:bg-surface-elevated rounded-lg transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="btn-primary flex items-center gap-2"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    {saving ? '保存中...' : '保存'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
