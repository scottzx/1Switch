import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Loader2,
    Edit3,
    Eye,
    Save,
    CheckCircle,
    XCircle,
    FileText,
    ChevronDown,
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

type TabMode = 'edit' | 'preview';

interface AgentInfo {
    id: string;
    name: string;
    emoji: string;
    workspace: string;
    isDefault: boolean;
}

// 档案文件定义（固定列表，无需从 API 获取）
interface ProfileFile {
    name: string;
    chineseName: string;
    description: string;
}

const profileFiles: ProfileFile[] = [
    { name: 'IDENTITY.md', chineseName: '身份档案', description: '龙虾的名字、形象、emoji 和头像' },
    { name: 'SOUL.md', chineseName: '灵魂契约', description: '核心价值观、行为准则和个性风格' },
    { name: 'TOOLS.md', chineseName: '工具备注', description: '本地工具配置：相机、SSH、TTS 等' },
    { name: 'AGENTS.md', chineseName: '工作手册', description: '工作空间规则、内存管理、群聊礼仪' },
    { name: 'USER.md', chineseName: '用户资料', description: '用户信息、时区偏好、上下文' },
    { name: 'BOOTSTRAP.md', chineseName: '初始化向导', description: '首次启动引导（配置完成后会自动删除）' },
    { name: 'HEARTBEAT.md', chineseName: '心跳任务', description: '周期性后台检查任务' },
];

// 档案文件图标映射
const fileIcons: Record<string, React.ReactNode> = {
    'IDENTITY.md': <Sparkles size={16} className="text-purple-400" />,
    'SOUL.md': <BookOpen size={16} className="text-blue-400" />,
    'TOOLS.md': <Wrench size={16} className="text-green-400" />,
    'AGENTS.md': <File size={16} className="text-orange-400" />,
    'USER.md': <Users size={16} className="text-pink-400" />,
    'BOOTSTRAP.md': <Rocket size={16} className="text-yellow-400" />,
    'HEARTBEAT.md': <Heart size={16} className="text-red-400" />,
};

export function Profile() {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<TabMode>('edit');
    const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(null);
    const [agents, setAgents] = useState<AgentInfo[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
    const [showAgentDropdown, setShowAgentDropdown] = useState(false);
    const [selectedFile, setSelectedFile] = useState<ProfileFile | null>(null);
    const [showFileDropdown, setShowFileDropdown] = useState(false);

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
        if (selectedAgent && !selectedFile) {
            // 默认选择第一个文件
            setSelectedFile(profileFiles[0]);
        }
    }, [selectedAgent, selectedFile]);

    useEffect(() => {
        if (selectedFile) {
            fetchProfileFile(selectedFile.name);
        }
    }, [selectedFile, fetchProfileFile]);

    const handleSave = async () => {
        if (!selectedAgent || !selectedFile) return;
        setSaving(true);
        setActionResult(null);
        try {
            await api.saveProfileFile(selectedFile.name, content, selectedAgent.workspace);
            setActionResult({ success: true, message: `${selectedFile.chineseName} 已保存` });
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
        setSelectedFile(null);
    };

    const handleFileSelect = (file: ProfileFile) => {
        setSelectedFile(file);
        setShowFileDropdown(false);
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
                        <p className="text-sm text-content-secondary">编辑 AI 助手档案配置</p>
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

                        {/* 档案文件选择下拉 */}
                        {selectedAgent && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowFileDropdown(!showFileDropdown)}
                                    className="flex items-center gap-2 px-4 py-2 bg-surface-card border border-edge rounded-lg hover:border-claw-500 transition-colors"
                                >
                                    {selectedFile ? (
                                        <>
                                            {fileIcons[selectedFile.name]}
                                            <span className="text-sm text-content-primary">{selectedFile.chineseName}</span>
                                        </>
                                    ) : (
                                        <span className="text-sm text-content-secondary">选择档案</span>
                                    )}
                                    <ChevronDown size={16} className="text-content-secondary" />
                                </button>

                                <AnimatePresence>
                                    {showFileDropdown && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            className="absolute right-0 top-full mt-2 w-72 bg-surface-card border border-edge rounded-xl shadow-xl z-50 overflow-hidden"
                                        >
                                            <div className="p-2">
                                                {profileFiles.map((file) => (
                                                    <button
                                                        key={file.name}
                                                        onClick={() => handleFileSelect(file)}
                                                        className={clsx(
                                                            'w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left',
                                                            selectedFile?.name === file.name
                                                                ? 'bg-claw-500/20 text-content-primary'
                                                                : 'hover:bg-surface-elevated text-content-secondary'
                                                        )}
                                                    >
                                                        <span className="mt-0.5">{fileIcons[file.name]}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-content-primary">{file.chineseName}</p>
                                                            <p className="text-xs text-content-tertiary mt-0.5">{file.description}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        <button
                            onClick={handleSave}
                            disabled={saving || !selectedAgent || !selectedFile}
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
                                        placeholder="选择左侧档案文件开始编辑..."
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

                {/* 档案说明 */}
                {selectedFile && (
                    <div className="mt-6 p-4 bg-surface-card rounded-xl border border-edge">
                        <div className="flex items-start gap-3">
                            <FileText size={16} className="text-claw-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-content-secondary">
                                <p className="font-medium text-content-primary mb-1">{selectedFile.chineseName}</p>
                                <p className="font-mono text-xs text-content-tertiary mb-2">{selectedAgent?.workspace}/{selectedFile.name}</p>
                                <p>{selectedFile.description}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
