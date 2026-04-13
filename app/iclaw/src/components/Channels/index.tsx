import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessagesSquare,
  MessageSquare,
  Check,
  X,
  QrCode,
  CheckCircle,
  XCircle,
  Play,
  Copy,
  ChevronUp,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '../../lib/tauri';
import { execApi } from '../../services/api';
import { useTerminalStore } from '../../stores/terminalStore';

interface ChannelConfig {
  id: string;
  channel_type: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

interface ChannelInfoDefinition {
  name: string;
  icon: React.ReactNode;
  color: string;
  docUrl?: string;
}

interface TestResult {
  success: boolean;
  message: string;
  error: string | null;
}

export function Channels() {
  const { t } = useTranslation();

  const channelInfo: Record<string, ChannelInfoDefinition> = {
    feishu: {
      name: t('channels.feishu.name'),
      icon: <MessagesSquare size={20} />,
      color: 'text-blue-500',
      docUrl: 'https://docs.openclaw.ai/zh-CN/channels/feishu',
    },
    qqbot: {
      name: 'QQ Bot',
      icon: <MessageSquare size={20} />,
      color: 'text-blue-500',
      docUrl: 'https://docs.openclaw.ai/channels/qqbot',
    },
    wechat: {
      name: t('channels.wechat.name'),
      icon: <MessageSquare size={20} />,
      color: 'text-emerald-400',
      docUrl: 'https://www.npmjs.com/package/@tencent-weixin/openclaw-weixin',
    },
  };

  const [channels, setChannels] = useState<ChannelConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // 获取渠道配置
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const result = await api.getChannelsConfig();
        // 只保留 feishu, qqbot, wechat 三个渠道
        const filtered = result.filter((c: ChannelConfig) =>
          ['feishu', 'qqbot', 'wechat'].includes(c.channel_type)
        );
        setChannels(filtered);
      } catch (e) {
        console.error('获取渠道配置失败:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchChannels();
  }, []);

  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [checkingPlugin, setCheckingPlugin] = useState(false);
  const [pluginInstalled, setPluginInstalled] = useState<boolean | null>(null);
  const [checkingQQPlugin, setCheckingQQPlugin] = useState(false);
  const [qqPluginInstalled, setQqPluginInstalled] = useState<boolean | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // 表单状态
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [pairingCode, setPairingCode] = useState('');

  // 终端状态
  const { addTab, appendOutput, setStatus: setTabStatus } = useTerminalStore();

  // 通过 SSE 执行命令并在终端显示
  const runCommand = (cmd: string, title: string) => {
    const tabId = addTab(cmd, title);

    execApi.streamCommand(
      cmd,
      (data) => appendOutput(tabId, data.content),
      (data) => {
        if (data.status === 'running') setTabStatus(tabId, 'running');
      },
      (data) => {
        setTabStatus(tabId, data.exitCode === 0 ? 'done' : 'error', data.exitCode);
      }
    );
  };

  // 重启网关 - 使用后端 API
  const handleRestartGateway = async () => {
    const tabId = addTab('openclaw gateway restart', '重启网关');
    try {
      await api.restartService();
      appendOutput(tabId, '网关重启请求已发送\n');
      setTabStatus(tabId, 'done');
    } catch (e) {
      appendOutput(tabId, `重启失败: ${e}\n`);
      setTabStatus(tabId, 'error');
    }
  };

  // 审批配对
  const handleApprovePairing = () => {
    if (!pairingCode.trim()) {
      setTestResult({
        success: false,
        message: '请输入配对码',
        error: null,
      });
      return;
    }
    runCommand(`openclaw pairing approve feishu ${pairingCode}`, '审批配对');
  };

  const togglePasswordVisibility = (key: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // 检查飞书插件/配置状态 - 飞书是内置的，直接通过配置文件检测
  const checkFeishuPlugin = () => {
    setCheckingPlugin(true);
    setPluginInstalled(null);

    // 通过检查配置文件来判断
    const feishuChannel = channels.find((c) => c.id === 'feishu');
    if (feishuChannel) {
      // 检查是否有有效的 appId 配置（递归检查嵌套结构）
      const hasAppId = (obj: Record<string, unknown>): boolean => {
        for (const value of Object.values(obj)) {
          if (typeof value === 'string' && value.length > 0) return true;
          if (value && typeof value === 'object') {
            if (hasAppId(value as Record<string, unknown>)) return true;
          }
        }
        return false;
      };

      const configured = feishuChannel.enabled && hasAppId(feishuChannel.config);
      setPluginInstalled(configured);
    } else {
      // 飞书是内置渠道，只要配置文件存在就算已安装
      setPluginInstalled(true);
    }
    setCheckingPlugin(false);
  };

  // 检查 QQ 插件/配置状态
  const checkQQPlugin = () => {
    setCheckingQQPlugin(true);
    setQqPluginInstalled(null);

    const qqChannel = channels.find((c) => c.id === 'qqbot');
    if (qqChannel) {
      const hasAppId = (obj: Record<string, unknown>): boolean => {
        for (const value of Object.values(obj)) {
          if (typeof value === 'string' && value.length > 0) return true;
          if (value && typeof value === 'object') {
            if (hasAppId(value as Record<string, unknown>)) return true;
          }
        }
        return false;
      };

      const configured = qqChannel.enabled && hasAppId(qqChannel.config);
      setQqPluginInstalled(configured);
    } else {
      setQqPluginInstalled(false);
    }
    setCheckingQQPlugin(false);
  };

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannel(channelId);
    setTestResult(null);
    setDrawerOpen(true);
    setPairingCode('');

    // 如果是飞书，检查插件状态
    if (channelId === 'feishu') {
      checkFeishuPlugin();
    }

    // 如果是 QQ，检查插件状态
    if (channelId === 'qqbot') {
      checkQQPlugin();
    }

    // 填充已有配置到表单
    const channel = channels.find((c) => c.id === channelId);
    if (channel && channel.config) {
      const filled: Record<string, string> = {};

      // 递归提取配置值（处理嵌套结构如 accounts.main.appSecret）
      const extractConfig = (obj: Record<string, unknown>, prefix = '') => {
        Object.entries(obj).forEach(([key, value]) => {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          if (typeof value === 'string') {
            filled[key] = value;
            console.log(`[Channels] 提取配置: ${fullKey} = "${value}"`);
          } else if (typeof value === 'boolean') {
            filled[key] = value ? 'true' : 'false';
          } else if (value && typeof value === 'object') {
            // 处理 secrets 引用对象 {id, provider, source}
            const secretObj = value as Record<string, unknown>;
            if (secretObj.id && typeof secretObj.id === 'string' && secretObj.provider && secretObj.source) {
              // 这是一个 secrets 引用，直接用 id 的值填充到 appSecret 字段
              if (key === 'appSecret' || key === 'clientSecret') {
                filled[key] = secretObj.id;
              } else {
                filled[key] = `[Secrets: ${secretObj.id}]`;
              }
              console.log(`[Channels] 提取配置(secrets引用): ${fullKey} = "${secretObj.id}"`);
            } else {
              // 其他嵌套对象继续递归
              extractConfig(secretObj, fullKey);
            }
          }
        });
      };

      console.log('[Channels] 原始配置:', JSON.stringify(channel.config, null, 2));
      extractConfig(channel.config);
      console.log('[Channels] 填充后的表单数据:', filled);
      setFormData(filled);
    } else {
      setFormData({});
    }
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedChannel(null);
    setTestResult(null);
    setFormData({});
    setSaveSuccessMsg(null);
    setQqPluginInstalled(null);
  };

  const handleSave = async () => {
    if (!selectedChannel) return;

    setSaving(true);
    try {
      // 构建嵌套结构配置
      const config: Record<string, unknown> = {};

      if (selectedChannel === 'feishu' || selectedChannel === 'qqbot') {
        // 飞书和 QQ 使用嵌套结构 accounts.main
        config.enabled = true;
        config.dmPolicy = 'pairing';
        if (selectedChannel === 'feishu') {
          config.connectionMode = 'websocket';
          config.domain = 'feishu';
          config.requireMention = false;
        }
        config.accounts = {
          main: {
            appId: formData.appId || '',
            appSecret: formData.appSecret || '',
          },
        };
      } else {
        // 其他渠道直接使用表单数据
        Object.assign(config, formData);
      }

      console.log('[Channels] 保存配置:', JSON.stringify(config, null, 2));
      console.log('[Channels] 表单数据:', formData);

      await api.saveChannelConfig({
        id: selectedChannel,
        channel_type: selectedChannel,
        enabled: true,
        config,
      });

      // 刷新渠道列表
      const result = await api.getChannelsConfig();
      const filtered = result.filter((c: ChannelConfig) =>
        ['feishu', 'qqbot', 'wechat'].includes(c.channel_type)
      );
      setChannels(filtered);

      setSaveSuccessMsg('配置已保存到 ~/.openclaw/openclaw.json');
    } catch (e) {
      setTestResult({
        success: false,
        message: '保存失败',
        error: String(e),
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-claw-500" />
      </div>
    );
  }

  const currentChannel = channels.find((c) => c.id === selectedChannel);
  const currentInfo = currentChannel ? channelInfo[currentChannel.channel_type] : null;

  const renderChannelCard = (channel: ChannelConfig, isLarge = false) => {
    const info = channelInfo[channel.channel_type] || {
      name: channel.channel_type,
      icon: <MessageSquare size={20} />,
      color: 'text-content-secondary',
    };
    const isConfigured = channel.enabled;
    const isSelected = selectedChannel === channel.id;

    return (
      <motion.button
        key={channel.id}
        onClick={() => handleChannelSelect(channel.id)}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={clsx(
          'relative rounded-2xl border transition-all text-left',
          isLarge ? 'p-5' : 'p-4',
          isSelected
            ? 'bg-surface-elevated border-claw-500'
            : 'bg-surface-card border-edge hover:border-claw-500/50'
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={clsx(
              'rounded-xl flex items-center justify-center shrink-0',
              isLarge ? 'w-12 h-12' : 'w-10 h-10',
              isConfigured ? 'bg-green-500/10' : 'bg-surface-elevated'
            )}
          >
            <span className={info.color}>{info.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className={clsx(
              'font-medium',
              isLarge ? 'text-base' : 'text-sm',
              isSelected ? 'text-content-primary' : 'text-content-secondary'
            )}>
              {info.name}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {isConfigured ? (
                <>
                  <Check size={12} className="text-green-400" />
                  <span className="text-xs text-green-400">{t('channels.configured')}</span>
                </>
              ) : (
                <>
                  <X size={12} className="text-content-tertiary" />
                  <span className="text-xs text-content-tertiary">未配置</span>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.button>
    );
  };

  const renderFormField = (key: string, label: string, type: 'text' | 'password', placeholder: string) => {
    const value = formData[key];

    return (
      <div key={key}>
        <label className="block text-sm font-medium text-content-primary mb-2">{label}</label>
        <div className="relative">
          <input
            type={visiblePasswords.has(key) ? 'text' : type}
            value={value || ''}
            onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
            placeholder={placeholder}
            className="w-full px-4 py-3 pr-10 rounded-xl text-sm border-2 outline-none transition-colors"
            style={{
              backgroundColor: 'var(--bg-base)',
              borderColor: value ? 'var(--accent)' : 'var(--border-primary)',
              color: 'var(--text-primary)',
            }}
          />
          {type === 'password' && (
            <button
              type="button"
              onClick={() => togglePasswordVisibility(key)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {visiblePasswords.has(key) ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto scroll-container pr-2">
      <div className="max-w-5xl">
        <h2 className="text-lg font-semibold text-content-primary mb-6 px-1">
          消息渠道
        </h2>

        {/* 渠道卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {channels.map((channel) => renderChannelCard(channel, true))}
        </div>

        {/* 内嵌展开面板 */}
        <AnimatePresence>
          {drawerOpen && currentChannel && currentInfo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div
                className="mt-4 rounded-2xl border border-edge overflow-hidden"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}
              >
                {/* 面板头部 */}
                <div
                  className="flex items-center gap-4 px-5 py-4"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderBottom: '1px solid var(--border-primary)',
                  }}
                >
                  <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', currentInfo.color)}>
                    {currentInfo.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-content-primary">
                      {currentInfo.name}
                    </h3>
                  </div>
                  <button
                    onClick={handleCloseDrawer}
                    className="p-2 rounded-lg transition-colors"
                    style={{ backgroundColor: 'transparent' }}
                  >
                    <ChevronUp size={18} className="text-content-tertiary" />
                  </button>
                </div>

                {/* 面板内容 */}
                <div className="p-5 space-y-4">
                  {/* 飞书配置说明 */}
                  {currentChannel.channel_type === 'feishu' && (
                    <>
                      <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                        <div className="flex items-start gap-3 mb-4">
                          <MessagesSquare size={22} className="text-blue-400 mt-0.5" />
                          <div>
                            <p className="text-content-primary font-medium">飞书配置说明</p>
                            <p className="text-xs text-content-secondary mt-0.5">
                              通过 WebSocket 连接的 Feishu/Lark 机器人，无需暴露公共 webhook URL
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {[
                            { step: 1, title: '创建飞书应用', desc: '打开飞书开放平台创建企业自建应用', link: 'https://open.feishu.cn/app', linkText: '飞书开放平台' },
                            { step: 2, title: '配置权限', desc: '在权限管理中添加批量权限 JSON' },
                            { step: 3, title: '开启机器人能力', desc: '在应用能力中添加机器人，设置机器人名称' },
                            { step: 4, title: '配置事件订阅', desc: '选择「使用长连接接收事件」(WebSocket)，添加事件: im.message.receive_v1' },
                          ].map((item) => (
                            <div key={item.step} className="flex items-start gap-2">
                              <span className="text-xs text-blue-400 font-medium w-5">{item.step}.</span>
                              <div className="flex-1">
                                <p className="text-xs text-content-secondary">{item.title}</p>
                                {item.desc && <p className="text-xs text-content-tertiary mt-0.5">{item.desc}</p>}
                                {item.link && (
                                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">{item.linkText}</a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 飞书是内置的，只需要检测配置状态 */}
                      <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-content-primary">飞书 (内置)</span>
                            {checkingPlugin && (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            )}
                            {!checkingPlugin && pluginInstalled === true && (
                              <>
                                <CheckCircle size={16} className="text-green-400" />
                                <span className="text-xs text-green-400">已配置</span>
                              </>
                            )}
                            {!checkingPlugin && pluginInstalled === false && (
                              <>
                                <XCircle size={16} className="text-orange-400" />
                                <span className="text-xs text-orange-400">未配置</span>
                              </>
                            )}
                            {!checkingPlugin && pluginInstalled === null && (
                              <span className="text-xs text-content-tertiary">点击检测</span>
                            )}
                          </div>
                          <button
                            onClick={checkFeishuPlugin}
                            disabled={checkingPlugin}
                            className="text-xs px-3 py-1.5 rounded-lg border transition-all"
                            style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
                          >
                            {checkingPlugin ? '检测中...' : '检测配置'}
                          </button>
                        </div>
                      </div>

                      {/* 配置表单 - 仅已配置时显示 */}
                      {pluginInstalled === true && (
                        <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                          <p className="text-sm font-medium text-content-primary mb-3">填写渠道参数</p>
                          <div className="space-y-3">
                            {renderFormField('appId', 'App ID', 'text', 'cli_xxx')}
                            {renderFormField('appSecret', 'App Secret', 'text', 'App Secret')}
                          </div>
                          <p className="text-xs text-content-tertiary mt-3 mb-3">
                            配置将自动写入 ~/.openclaw/openclaw.json
                          </p>
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full flex items-center justify-center gap-2 text-sm py-2.5 rounded-xl font-medium transition-all"
                            style={{ backgroundColor: 'var(--accent)', color: 'var(--text-primary)' }}
                          >
                            {saving ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Check size={15} />
                            )}
                            保存配置
                          </button>
                          {saveSuccessMsg && (
                            <div className="mt-3 p-3 rounded-xl bg-green-500/10 border border-green-500/30 flex items-start gap-2">
                              <CheckCircle size={16} className="text-green-400 mt-0.5 shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{saveSuccessMsg}</p>
                              </div>
                              <button
                                onClick={() => setSaveSuccessMsg(null)}
                                className="text-green-400 hover:text-green-300"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 步骤 5: 运行网关 */}
                      <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                        <p className="text-sm font-medium text-content-primary mb-3">运行网关</p>
                        <button
                          onClick={handleRestartGateway}
                          className="w-full flex items-center justify-center gap-2 text-sm py-2.5 rounded-xl font-medium transition-all"
                          style={{ backgroundColor: 'var(--accent)', color: 'var(--text-primary)' }}
                        >
                          <Play size={15} />
                          重启网关
                        </button>
                      </div>

                      {/* 步骤 6: 审批配对 */}
                      <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                        <p className="text-sm font-medium text-content-primary mb-3">审批配对</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={pairingCode}
                            onChange={(e) => setPairingCode(e.target.value)}
                            placeholder="配对码"
                            className="flex-1 px-4 py-2.5 rounded-xl text-sm border-2 outline-none transition-colors"
                            style={{
                              backgroundColor: 'var(--bg-base)',
                              borderColor: 'var(--border-primary)',
                              color: 'var(--text-primary)',
                            }}
                          />
                          <button
                            onClick={handleApprovePairing}
                            className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                            style={{ backgroundColor: 'var(--accent)', color: 'var(--text-primary)' }}
                          >
                            审批
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* QQ Bot 配置说明 */}
                  {currentChannel.channel_type === 'qqbot' && (
                    <>
                      <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                        <div className="flex items-start gap-3 mb-4">
                          <MessageSquare size={22} className="text-blue-400 mt-0.5" />
                          <div>
                            <p className="text-content-primary font-medium">QQ Bot 配置说明</p>
                            <p className="text-xs text-content-secondary mt-0.5">
                              QQ Bot API；支持私聊、群聊和富媒体
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {[
                            { step: 1, title: '前往 QQ 开放平台创建机器人', desc: '打开 q.qq.com 创建应用并开启机器人能力', link: 'https://q.qq.com', linkText: 'q.qq.com' },
                            { step: 2, title: '获取 AppID 和 AppSecret', desc: '在机器人设置页面查找凭证，AppSecret 只会显示一次，请妥善保存' },
                          ].map((item) => (
                            <div key={item.step} className="flex items-start gap-2">
                              <span className="text-xs text-blue-400 font-medium w-5">{item.step}.</span>
                              <div className="flex-1">
                                <p className="text-xs text-content-secondary">{item.title}</p>
                                {item.desc && <p className="text-xs text-content-tertiary mt-0.5">{item.desc}</p>}
                                {item.link && (
                                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">{item.linkText}</a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* QQ 插件安装命令 */}
                      <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-medium text-content-primary">安装插件</p>
                          <button
                            onClick={() => navigator.clipboard.writeText('openclaw plugins install @openclaw/qqbot')}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors"
                            style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
                          >
                            <Copy size={12} />
                            复制
                          </button>
                        </div>
                        <code className="block px-3 py-2 rounded text-xs font-mono" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-secondary)' }}>
                          openclaw plugins install @openclaw/qqbot
                        </code>
                        <p className="text-xs text-content-tertiary mt-2">
                          请通过 SSH 在终端中执行以上命令
                        </p>
                      </div>

                      {/* QQ 配置状态 */}
                      <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-content-primary">QQ Bot</span>
                            {checkingQQPlugin && (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            )}
                            {!checkingQQPlugin && qqPluginInstalled === true && (
                              <>
                                <CheckCircle size={16} className="text-green-400" />
                                <span className="text-xs text-green-400">已配置</span>
                              </>
                            )}
                            {!checkingQQPlugin && qqPluginInstalled === false && (
                              <>
                                <XCircle size={16} className="text-orange-400" />
                                <span className="text-xs text-orange-400">未配置</span>
                              </>
                            )}
                            {!checkingQQPlugin && qqPluginInstalled === null && (
                              <span className="text-xs text-content-tertiary">点击检测</span>
                            )}
                          </div>
                          <button
                            onClick={checkQQPlugin}
                            disabled={checkingQQPlugin}
                            className="text-xs px-3 py-1.5 rounded-lg border transition-all"
                            style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
                          >
                            {checkingQQPlugin ? '检测中...' : '检测配置'}
                          </button>
                        </div>
                      </div>

                      {/* 配置表单 - 仅已配置时显示 */}
                      {qqPluginInstalled === true && (
                        <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                          <p className="text-sm font-medium text-content-primary mb-3">填写渠道参数</p>
                          <div className="space-y-3">
                            {renderFormField('appId', 'AppID', 'text', 'QQ 机器人 AppID')}
                            {renderFormField('clientSecret', 'ClientSecret', 'text', 'QQ 机器人 ClientSecret')}
                          </div>
                          <p className="text-xs text-content-tertiary mt-3 mb-3">
                            配置将自动写入 ~/.openclaw/openclaw.json
                          </p>
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full flex items-center justify-center gap-2 text-sm py-2.5 rounded-xl font-medium transition-all"
                            style={{ backgroundColor: 'var(--accent)', color: 'var(--text-primary)' }}
                          >
                            {saving ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Check size={15} />
                            )}
                            保存配置
                          </button>
                          {saveSuccessMsg && (
                            <div className="mt-3 p-3 rounded-xl bg-green-500/10 border border-green-500/30 flex items-start gap-2">
                              <CheckCircle size={16} className="text-green-400 mt-0.5 shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{saveSuccessMsg}</p>
                              </div>
                              <button
                                onClick={() => setSaveSuccessMsg(null)}
                                className="text-green-400 hover:text-green-300"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 步骤: 重启网关 */}
                      <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                        <p className="text-sm font-medium text-content-primary mb-3">运行网关</p>
                        <button
                          onClick={handleRestartGateway}
                          className="w-full flex items-center justify-center gap-2 text-sm py-2.5 rounded-xl font-medium transition-all"
                          style={{ backgroundColor: 'var(--accent)', color: 'var(--text-primary)' }}
                        >
                          <Play size={15} />
                          重启网关
                        </button>
                      </div>
                    </>
                  )}

                  {/* WeChat 扫码登录说明 */}
                  {currentChannel.channel_type === 'wechat' && (
                    <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                      <div className="flex items-start gap-3 mb-4">
                        <QrCode size={22} className="text-emerald-400 mt-0.5" />
                        <div>
                          <p className="text-content-primary font-medium">微信配置说明</p>
                          <p className="text-xs text-content-primary mt-0.5" style={{ opacity: 0.7 }}>
                            通过二维码登录的 Tencent iLink Bot 插件；仅支持私聊
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {[
                          { step: 1, title: '安装插件', cmd: 'openclaw plugins install "@tencent-weixin/openclaw-weixin"' },
                          { step: 2, title: '启用插件', cmd: 'openclaw config set plugins.entries.openclaw-weixin.enabled true' },
                          { step: 3, title: '扫码登录', cmd: 'openclaw channels login --channel openclaw-weixin' },
                          { step: 4, title: '重启网关', cmd: 'openclaw gateway restart' },
                        ].map((item) => (
                          <div key={item.step} className="flex items-start gap-2">
                            <span className="text-xs text-emerald-400 font-medium w-5">{item.step}.</span>
                            <div className="flex-1">
                              <p className="text-xs text-content-primary" style={{ opacity: 0.8 }}>{item.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <code className="flex-1 px-2 py-1.5 rounded text-content-primary text-xs font-mono" style={{ backgroundColor: 'var(--bg-base)', opacity: 0.8 }}>
                                  {item.cmd}
                                </code>
                                <button
                                  onClick={() => navigator.clipboard.writeText(item.cmd)}
                                  className="p-1.5 rounded transition-colors"
                                  style={{ color: 'var(--text-secondary)' }}
                                  title="复制命令"
                                >
                                  <Copy size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <p className="text-xs mt-4" style={{ color: 'var(--text-secondary)' }}>
                        扫码后授权凭证会自动保存本地。详情参考：<a href="https://www.npmjs.com/package/@tencent-weixin/openclaw-weixin" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">npm 文档</a>
                      </p>
                    </div>
                  )}

                  {/* 测试结果显示 */}
                  {testResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={clsx(
                        'p-4 rounded-xl flex items-start gap-3',
                        testResult.success ? 'bg-green-500/10' : 'bg-red-500/10'
                      )}
                    >
                      {testResult.success ? (
                        <CheckCircle size={18} className="text-green-400 mt-0.5" />
                      ) : (
                        <XCircle size={18} className="text-red-400 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className={clsx('font-medium text-sm', testResult.success ? 'text-green-400' : 'text-red-400')}>
                          {testResult.success ? t('channels.testSuccess') : t('channels.testFailed')}
                        </p>
                        <p className="text-sm text-content-secondary mt-0.5">{testResult.message}</p>
                        {testResult.error && (
                          <p className="text-xs text-red-300 mt-2 whitespace-pre-wrap">{testResult.error}</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
