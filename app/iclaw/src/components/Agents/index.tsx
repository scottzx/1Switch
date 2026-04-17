import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Plus,
    Trash2,
    Check,
    Loader2,
    ChevronRight,
    Bot,
    Crown,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Link,
    Settings2,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import clsx from 'clsx';
import { invoke } from '../../lib/invoke-shim';

// ============ 类型定义 ============

interface AgentBinding {
    channel: string;
    accountId: string | null;
}

interface AgentConfig {
    id: string;
    name: string;
    emoji: string;
    theme: string | null;
    workspace: string;
    agentDir: string | null;
    model: string | null;
    isDefault: boolean;
    sandboxMode: string;
    toolsProfile: string | null;
    toolsAllow: string[];
    toolsDeny: string[];
    bindings: AgentBinding[];
    mentionPatterns: string[];
    subagentAllow: string[];
}

const channelOptions = [
    { id: 'telegram', label: 'Telegram', emoji: '✈️' },
    { id: 'discord', label: 'Discord', emoji: '🎮' },
    { id: 'whatsapp', label: 'WhatsApp', emoji: '💬' },
    { id: 'slack', label: 'Slack', emoji: '💼' },
    { id: 'feishu', label: '飞书', emoji: '🐦' },
    { id: 'wechat', label: '微信', emoji: '🟢' },
    { id: 'dingtalk', label: '钉钉', emoji: '🔵' },
    { id: 'imessage', label: 'iMessage', emoji: '🍎' },
    { id: 'msteams', label: 'MS Teams', emoji: '🟦' },
    { id: 'signal', label: 'Signal', emoji: '🔒' },
];

const emojiOptions = ['🤖', '👨‍💻', '👩‍💼', '🧑‍🔬', '📊', '📝', '🎯', '🛡️', '🔧', '🌐', '💡', '🎨', '📋', '🏗️', '🚀', '⚡'];

const sandboxOptions = [
    { value: 'off', label: '关闭', desc: '完全访问' },
    { value: 'non-main', label: '非主会话', desc: '仅子代理沙箱' },
    { value: 'all', label: '全部', desc: '所有会话沙箱化' },
];

// ============ 新建 Agent 对话框（极简）============

interface NewAgentDialogProps {
    existingIds: string[];
    onClose: () => void;
    onCreated: (agent: AgentConfig) => void;
}

function NewAgentDialog({ existingIds, onClose, onCreated }: NewAgentDialogProps) {
    const [id, setId] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleCreate = () => {
        const cleanId = id.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
        if (!cleanId) { setError('请输入 ID'); return; }
        if (existingIds.includes(cleanId)) { setError('该 ID 已存在'); return; }
        if (!name.trim()) { setError('请输入名称'); return; }

        const newAgent: AgentConfig = {
            id: cleanId,
            name: name.trim(),
            emoji: '🤖',
            theme: null,
            workspace: `~/.openclaw/workspace-${cleanId}`,
            agentDir: null,
            model: null,
            isDefault: false,
            sandboxMode: 'off',
            toolsProfile: null,
            toolsAllow: [],
            toolsDeny: [],
            bindings: [],
            mentionPatterns: [`@${cleanId}`],
            subagentAllow: [],
        };
        onCreated(newAgent);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="bg-surface-sidebar rounded-2xl border border-edge w-full max-w-sm overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="px-6 py-4 border-b border-edge">
                    <h2 className="text-lg font-semibold text-content-primary flex items-center gap-2">
                        <Plus size={20} className="text-claw-400" />
                        新建虚拟员工
                    </h2>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm text-content-secondary mb-1">ID <span className="text-red-400">*</span></label>
                        <input value={id} onChange={e => { setId(e.target.value); setError(null); }}
                            placeholder="如: assistant, coder"
                            className="input-base" />
                        <p className="text-xs text-gray-600 mt-1">小写字母、数字和连字符</p>
                    </div>
                    <div>
                        <label className="block text-sm text-content-secondary mb-1">名称 <span className="text-red-400">*</span></label>
                        <input value={name} onChange={e => { setName(e.target.value); setError(null); }}
                            placeholder="如: 助手小李"
                            className="input-base" />
                    </div>
                    {error && (
                        <p className="text-red-400 text-sm flex items-center gap-1">
                            <AlertTriangle size={14} /> {error}
                        </p>
                    )}
                </div>
                <div className="px-6 py-4 border-t border-edge flex justify-end gap-3">
                    <button onClick={onClose} className="btn-secondary">取消</button>
                    <button onClick={handleCreate} className="btn-primary flex items-center gap-2">
                        <Plus size={16} /> 创建
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ============ 主组件 ============

export function Agents() {
    const [agents, setAgents] = useState<AgentConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [form, setForm] = useState<AgentConfig | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(null);
    const [showNewDialog, setShowNewDialog] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const fetchAgents = useCallback(async () => {
        try {
            const result = await invoke<AgentConfig[]>('get_agents_list');
            setAgents(result);
            return result;
        } catch (e) {
            console.error('获取 Agent 列表失败:', e);
            return [];
        }
    }, []);

    useEffect(() => {
        fetchAgents().then(() => setLoading(false));
    }, [fetchAgents]);

    const selectAgent = (id: string) => {
        setSelectedId(id);
        setActionResult(null);
        setShowAdvanced(false);
        const agent = agents.find(a => a.id === id);
        if (agent) setForm({ ...agent });
    };

    const updateForm = (patch: Partial<AgentConfig>) => {
        if (form) setForm({ ...form, ...patch });
    };

    const handleSave = async () => {
        if (!form) return;
        setSaving(true);
        setActionResult(null);
        try {
            await invoke<string>('save_agent', { agent: form });
            setActionResult({ success: true, message: `${form.name} 已保存` });
            const updated = await fetchAgents();
            const refreshed = updated.find(a => a.id === form.id);
            if (refreshed) setForm({ ...refreshed });
        } catch (e) {
            setActionResult({ success: false, message: String(e) });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!form || form.id === 'main') return;
        setDeleting(true);
        setActionResult(null);
        try {
            await invoke<string>('delete_agent', { agentId: form.id });
            setActionResult({ success: true, message: `${form.name} 已删除` });
            setSelectedId(null);
            setForm(null);
            await fetchAgents();
        } catch (e) {
            setActionResult({ success: false, message: String(e) });
        } finally {
            setDeleting(false);
        }
    };

    const handleNewAgent = async (agent: AgentConfig) => {
        setShowNewDialog(false);
        try {
            await invoke<string>('save_agent', { agent });
            const updated = await fetchAgents();
            selectAgent(agent.id);
            const fresh = updated.find(a => a.id === agent.id);
            if (fresh) setForm({ ...fresh });
        } catch (e) {
            setActionResult({ success: false, message: String(e) });
        }
    };

    const toggleBinding = (channelId: string) => {
        if (!form) return;
        const exists = form.bindings.some(b => b.channel === channelId);
        if (exists) {
            updateForm({ bindings: form.bindings.filter(b => b.channel !== channelId) });
        } else {
            updateForm({ bindings: [...form.bindings, { channel: channelId, accountId: null }] });
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-claw-500" />
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto scroll-container pr-2">
            <div className="max-w-5xl">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 左栏：Agent 列表 */}
                    <div className="lg:col-span-1 space-y-2">
                        {agents.map(agent => {
                            const isSelected = selectedId === agent.id;
                            return (
                                <button
                                    key={agent.id}
                                    onClick={() => selectAgent(agent.id)}
                                    className={clsx(
                                        'w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left',
                                        isSelected ? 'bg-surface-elevated border-claw-500' : 'bg-surface-card border-edge hover:border-edge'
                                    )}
                                >
                                    <div className="w-11 h-11 rounded-xl bg-surface-elevated flex items-center justify-center text-xl">
                                        {agent.emoji}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className={clsx('text-sm font-medium truncate', isSelected ? 'text-content-primary' : 'text-content-secondary')}>
                                                {agent.name}
                                            </p>
                                            {agent.isDefault && (
                                                <Crown size={13} className="text-yellow-500 flex-shrink-0" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 mt-1">
                                            {agent.bindings.length > 0 ? (
                                                agent.bindings.slice(0, 2).map(b => (
                                                    <span key={b.channel} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-elevated text-content-secondary">
                                                        {channelOptions.find(c => c.id === b.channel)?.emoji} {b.channel}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-content-tertiary">未绑定渠道</span>
                                            )}
                                            {agent.bindings.length > 2 && (
                                                <span className="text-[10px] text-content-tertiary">+{agent.bindings.length - 2}</span>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className={isSelected ? 'text-claw-400' : 'text-gray-600'} />
                                </button>
                            );
                        })}

                        <button
                            onClick={() => setShowNewDialog(true)}
                            className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-edge text-content-tertiary hover:border-claw-500 hover:text-claw-400 transition-all"
                        >
                            <Plus size={18} />
                            <span className="text-sm">新建虚拟员工</span>
                        </button>
                    </div>

                    {/* 右栏：配置面板 */}
                    <div className="lg:col-span-2">
                        {form ? (
                            <motion.div
                                key={selectedId}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-4"
                            >
                                {/* 基本信息 */}
                                <div className="bg-surface-card rounded-2xl p-5 border border-edge">
                                    <h4 className="text-sm font-medium text-content-secondary flex items-center gap-2 mb-4">
                                        <Bot size={16} className="text-claw-400" />
                                        基本信息
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-xs text-content-tertiary mb-1">名称</label>
                                            <input value={form.name} onChange={e => updateForm({ name: e.target.value })}
                                                className="input-base" />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-xs text-content-tertiary mb-1">ID</label>
                                            <input value={form.id} disabled className="input-base opacity-60 cursor-not-allowed" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs text-content-tertiary mb-1">Emoji</label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {emojiOptions.map(e => (
                                                    <button key={e} onClick={() => updateForm({ emoji: e })}
                                                        className={clsx('w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all',
                                                            form.emoji === e ? 'bg-claw-500/30 ring-1 ring-claw-500' : 'bg-surface-elevated hover:bg-surface-elevated')}>
                                                        {e}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs text-content-tertiary mb-1">模型</label>
                                            <input value={form.model || ''} onChange={e => updateForm({ model: e.target.value || null })}
                                                placeholder="如: anthropic/claude-sonnet-4-5"
                                                className="input-base" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs text-content-tertiary mb-1">工作空间</label>
                                            <input value={form.workspace} onChange={e => updateForm({ workspace: e.target.value })}
                                                className="input-base" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs text-content-tertiary mb-1">工具 Profile</label>
                                            <select value={form.toolsProfile || ''} onChange={e => updateForm({ toolsProfile: e.target.value || null })}
                                                className="input-base">
                                                <option value="">默认</option>
                                                <option value="coding">coding</option>
                                                <option value="full">full</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* 渠道绑定 */}
                                <div className="bg-surface-card rounded-2xl p-5 border border-edge">
                                    <h4 className="text-sm font-medium text-content-secondary flex items-center gap-2 mb-4">
                                        <Link size={16} className="text-claw-400" />
                                        渠道绑定
                                    </h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {channelOptions.map(ch => {
                                            const bound = form.bindings.some(b => b.channel === ch.id);
                                            return (
                                                <button
                                                    key={ch.id}
                                                    onClick={() => toggleBinding(ch.id)}
                                                    className={clsx(
                                                        'flex items-center gap-2 p-3 rounded-xl border transition-all text-sm text-left',
                                                        bound
                                                            ? 'bg-claw-500/15 border-claw-500/50 text-content-primary'
                                                            : 'bg-surface-elevated border-edge text-content-secondary hover:border-edge'
                                                    )}
                                                >
                                                    <span className="text-base">{ch.emoji}</span>
                                                    <span className="truncate">{ch.label}</span>
                                                    {bound && <Check size={14} className="ml-auto text-claw-400" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 高级设置 */}
                                <div className="bg-surface-card rounded-2xl border border-edge overflow-hidden">
                                    <button
                                        onClick={() => setShowAdvanced(!showAdvanced)}
                                        className="w-full px-5 py-4 flex items-center justify-between text-sm font-medium text-content-secondary hover:bg-surface-elevated transition-colors"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Settings2 size={16} className="text-claw-400" />
                                            高级设置
                                        </span>
                                        {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                    <AnimatePresence>
                                        {showAdvanced && (
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: 'auto' }}
                                                exit={{ height: 0 }}
                                                className="overflow-hidden"
                                            >
                                                    <div className="px-5 pb-5 space-y-4 border-t border-edge pt-4">
                                                        <div>
                                                            <label className="block text-xs text-content-tertiary mb-1">角色描述</label>
                                                            <textarea value={form.theme || ''} onChange={e => updateForm({ theme: e.target.value || null })}
                                                                placeholder="描述这个虚拟员工的角色..."
                                                                className="input-base resize-none h-16" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-content-tertiary mb-1">沙箱模式</label>
                                                            <div className="flex gap-2">
                                                                {sandboxOptions.map(opt => (
                                                                    <button key={opt.value} onClick={() => updateForm({ sandboxMode: opt.value })}
                                                                        className={clsx(
                                                                            'flex-1 p-2 rounded-lg border text-center transition-all text-xs',
                                                                            form.sandboxMode === opt.value
                                                                                ? 'bg-claw-500/15 border-claw-500/50 text-content-primary'
                                                                                : 'bg-surface-elevated border-edge text-content-secondary hover:border-edge'
                                                                        )}>
                                                                        <p className="font-medium">{opt.label}</p>
                                                                        <p className="text-[10px] text-content-tertiary mt-0.5">{opt.desc}</p>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* 操作按钮 */}
                                <div className="flex items-center gap-3">
                                    <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                        {saving ? '保存中...' : '保存'}
                                    </button>
                                    {form.id !== 'main' && (
                                        <button onClick={handleDelete} disabled={deleting}
                                            className="btn-secondary flex items-center gap-2 text-red-400 hover:text-red-300 hover:border-red-500/50">
                                            {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                            {deleting ? '删除中...' : '删除'}
                                        </button>
                                    )}
                                </div>

                                {/* 操作结果 */}
                                <AnimatePresence>
                                    {actionResult && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                            className={clsx(
                                                'p-3 rounded-lg border flex items-center gap-2',
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
                            </motion.div>
                        ) : (
                            <div className="bg-surface-card rounded-2xl p-6 border border-edge flex flex-col items-center justify-center h-64">
                                <Users size={48} className="text-gray-600 mb-4" />
                                <p className="text-content-tertiary text-sm">选择一个虚拟员工</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 新建对话框 */}
            <AnimatePresence>
                {showNewDialog && (
                    <NewAgentDialog
                        existingIds={agents.map(a => a.id)}
                        onClose={() => setShowNewDialog(false)}
                        onCreated={handleNewAgent}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
