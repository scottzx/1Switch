import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Hash,
  Slack,
  MessagesSquare,
  MessageSquare,
  Check,
  X,
  Loader2,
  ChevronRight,
  ChevronDown,
  Apple,
  Bell,
  Eye,
  EyeOff,
  Play,
  QrCode,
  CheckCircle,
  XCircle,
  Download,
  Package,
  AlertTriangle,
  Trash2,
  ExternalLink,
  Users,
  Plus,
  Minus,
  CircleDot,
  Frame,
  Network,
  Send,
  Phone,
  Message,
  Triangle,
  Gem,
  Twitch,
  Volume2,
  Globe,
  Zap,
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '../../lib/tauri';
import { invoke } from '../../lib/invoke-shim';

interface FeishuPluginStatus {
  installed: boolean;
  version: string | null;
  plugin_name: string | null;
}

interface QQBotPluginStatus {
  installed: boolean;
  version: string | null;
  plugin_name: string | null;
}

interface ChannelConfig {
  id: string;
  channel_type: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

// 渠道配置字段定义
interface ChannelField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'select';
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
}

interface ChannelInfoDefinition {
  name: string;
  icon: React.ReactNode;
  color: string;
  fields: ChannelField[];
  helpText?: string;
  docUrl?: string;
}

interface TestResult {
  success: boolean;
  message: string;
  error: string | null;
}

export function Channels() {
  const { t } = useTranslation();

  // 定义主渠道（飞书、QQ、微信）
  const primaryChannelIds = ['feishu', 'qqbot', 'wechat'];

  const channelInfo: Record<string, ChannelInfoDefinition> = {
    // ============ 主渠道 ============
    feishu: {
      name: t('channels.feishu.name'),
      icon: <MessagesSquare size={20} />,
      color: 'text-blue-500',
      fields: [
        { key: 'appId', label: 'App ID', type: 'text', placeholder: t('channels.feishu.appIdPlaceholder'), required: true },
        { key: 'appSecret', label: 'App Secret', type: 'password', placeholder: t('channels.feishu.appSecretPlaceholder'), required: true },
        { key: 'testChatId', label: t('channels.feishu.testChatId'), type: 'text', placeholder: t('channels.feishu.testChatIdPlaceholder') },
        { key: 'connectionMode', label: t('channels.feishu.connectionMode'), type: 'select', options: [
          { value: 'websocket', label: t('channels.feishu.websocket') },
          { value: 'webhook', label: t('channels.feishu.webhook') },
        ]},
        { key: 'domain', label: t('channels.feishu.domain'), type: 'select', options: [
          { value: 'feishu', label: t('channels.feishu.domestic') },
          { value: 'lark', label: t('channels.feishu.overseas') },
        ]},
        { key: 'requireMention', label: t('channels.feishu.requireMention'), type: 'select', options: [
          { value: 'true', label: t('channels.feishu.yes') },
          { value: 'false', label: t('channels.feishu.no') },
        ]},
      ],
      helpText: '通过 WebSocket 连接的 Feishu/Lark 机器人（内置插件），无需暴露公共 webhook URL',
      docUrl: 'https://docs.openclaw.ai/zh-CN/channels/feishu',
    },
    qqbot: {
      name: 'QQ Bot',
      icon: <MessageSquare size={20} />,
      color: 'text-sky-400',
      fields: [
        { key: 'appId', label: 'AppID', type: 'text', placeholder: 'QQ 机器人 AppID', required: true },
        { key: 'clientSecret', label: 'ClientSecret', type: 'password', placeholder: 'QQ 机器人 ClientSecret', required: true },
      ],
      helpText: 'QQ Bot API；支持私聊、群聊和富媒体（内置插件）。从 q.qq.com 获取 AppID 和 ClientSecret',
      docUrl: 'https://docs.openclaw.ai/channels/qqbot',
    },
    wechat: {
      name: t('channels.wechat.name'),
      icon: <MessageSquare size={20} />,
      color: 'text-green-600',
      fields: [],
      helpText: '通过二维码登录的 Tencent iLink Bot 插件；仅支持私聊。需先安装插件：openclaw plugins install "@tencent-weixin/openclaw-weixin"',
      docUrl: 'https://www.npmjs.com/package/@tencent-weixin/openclaw-weixin',
    },
    // ============ 其次渠道 ============
    // 按用户提供的顺序排列
    bluebubbles: {
      name: 'BlueBubbles',
      icon: <CircleDot size={20} />,
      color: 'text-blue-400',
      fields: [],
      helpText: 'iMessage 推荐方案；使用 BlueBubbles macOS 服务器 REST API（内置插件）',
      docUrl: 'https://bluebubbles.app/',
    },
    discord: {
      name: 'Discord',
      icon: <Hash size={20} />,
      color: 'text-indigo-400',
      fields: [
        { key: 'botToken', label: 'Bot Token', type: 'password', placeholder: 'Discord Bot Token', required: true },
        { key: 'testChannelId', label: t('channels.discord.testChannelId'), type: 'text', placeholder: t('channels.discord.testChannelIdPlaceholder') },
        { key: 'dmPolicy', label: t('channels.discord.dmPolicy'), type: 'select', options: [
          { value: 'pairing', label: t('channels.policyPairing') },
          { value: 'open', label: t('channels.policyOpen') },
          { value: 'disabled', label: t('channels.policyDisabled') },
        ]},
      ],
      helpText: 'Discord Bot API + Gateway 网关；支持服务器、渠道和私信',
      docUrl: 'https://discord.com/developers/docs/intro',
    },
    google_chat: {
      name: 'Google Chat',
      icon: <MessageSquare size={20} />,
      color: 'text-blue-500',
      fields: [
        { key: 'webhookUrl', label: 'Webhook URL', type: 'text', placeholder: 'https://chat.googleapis.com/...', required: true },
      ],
      helpText: '通过 HTTP webhook 连接的 Google Chat API 应用',
      docUrl: 'https://developers.google.com/chat',
    },
    imessage: {
      name: 'iMessage (legacy)',
      icon: <Apple size={20} />,
      color: 'text-green-400',
      fields: [
        { key: 'dmPolicy', label: t('channels.imessage.dmPolicy'), type: 'select', options: [
          { value: 'pairing', label: t('channels.policyPairing') },
          { value: 'open', label: t('channels.policyOpen') },
          { value: 'disabled', label: t('channels.policyDisabled') },
        ]},
        { key: 'groupPolicy', label: t('channels.imessage.groupPolicy'), type: 'select', options: [
          { value: 'allowlist', label: t('channels.groupAllowlist') },
          { value: 'open', label: t('channels.groupOpen') },
          { value: 'disabled', label: t('channels.policyDisabled') },
        ]},
      ],
      helpText: '通过 imsg CLI 的旧版 macOS 集成（已弃用，新部署请使用 BlueBubbles）',
      docUrl: 'https://support.apple.com/guide/messages/welcome/mac',
    },
    irc: {
      name: 'IRC',
      icon: <Hash size={20} />,
      color: 'text-gray-400',
      fields: [
        { key: 'server', label: 'Server', type: 'text', placeholder: 'irc.libera.chat', required: true },
        { key: 'port', label: 'Port', type: 'text', placeholder: '6697', required: true },
        { key: 'nickname', label: 'Nickname', type: 'text', placeholder: 'YourNickname', required: true },
        { key: 'password', label: 'Password', type: 'password', placeholder: 'Server Password (optional)' },
      ],
      helpText: '经典 IRC 服务器；支持渠道和私信，并带有配对 / allowlist 控制',
      docUrl: 'https://en.wikipedia.org/wiki/Internet_Relay_Chat',
    },
    line: {
      name: 'LINE',
      icon: <MessageCircle size={20} />,
      color: 'text-green-500',
      fields: [
        { key: 'channelSecret', label: 'Channel Secret', type: 'password', placeholder: 'LINE Channel Secret', required: true },
        { key: 'channelAccessToken', label: 'Channel Access Token', type: 'password', placeholder: 'LINE Channel Access Token', required: true },
      ],
      helpText: 'LINE Messaging API 机器人（内置插件）',
      docUrl: 'https://developers.line.biz/',
    },
    matrix: {
      name: 'Matrix',
      icon: <Network size={20} />,
      color: 'text-orange-400',
      fields: [
        { key: 'homeserver', label: 'Homeserver', type: 'text', placeholder: 'https://matrix.org', required: true },
        { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Matrix Access Token', required: true },
      ],
      helpText: 'Matrix 协议（内置插件）',
      docUrl: 'https://matrix.org/docs/',
    },
    mattermost: {
      name: 'Mattermost',
      icon: <MessageSquare size={20} />,
      color: 'text-blue-500',
      fields: [
        { key: 'serverUrl', label: 'Server URL', type: 'text', placeholder: 'https://mattermost.example.com', required: true },
        { key: 'botToken', label: 'Bot Token', type: 'password', placeholder: 'Mattermost Bot Token', required: true },
      ],
      helpText: 'Bot API + WebSocket；支持渠道、群组、私信（内置插件）',
      docUrl: 'https://developers.mattermost.com/',
    },
    msteams: {
      name: 'Microsoft Teams',
      icon: <Users size={20} />,
      color: 'text-purple-400',
      fields: [
        { key: 'tenantId', label: 'Tenant ID', type: 'text', placeholder: 'Microsoft Teams Tenant ID', required: true },
        { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Microsoft Teams Client ID', required: true },
        { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Microsoft Teams Client Secret', required: true },
      ],
      helpText: 'Bot Framework；支持企业场景（内置插件）',
      docUrl: 'https://docs.microsoft.com/en-us/microsoftteams/platform/',
    },
    nextcloud_talk: {
      name: 'Nextcloud Talk',
      icon: <MessageSquare size={20} />,
      color: 'text-blue-400',
      fields: [
        { key: 'serverUrl', label: 'Server URL', type: 'text', placeholder: 'https://nextcloud.example.com', required: true },
        { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Nextcloud Talk Access Token', required: true },
      ],
      helpText: '通过 Nextcloud Talk 的自托管聊天（内置插件）',
      docUrl: 'https://nextcloud-talk.readthedocs.io/',
    },
    nostr: {
      name: 'Nostr',
      icon: <Zap size={20} />,
      color: 'text-orange-400',
      fields: [
        { key: 'relayUrl', label: 'Relay URL', type: 'text', placeholder: 'wss://relay.example.com', required: true },
        { key: 'privateKey', label: 'Private Key', type: 'password', placeholder: 'nsec...', required: true },
      ],
      helpText: '通过 NIP-04 的去中心化私信（内置插件）',
      docUrl: 'https://nostrbuild.com/',
    },
    signal: {
      name: 'Signal',
      icon: <MessageCircle size={20} />,
      color: 'text-green-500',
      fields: [
        { key: 'phoneNumber', label: 'Phone Number', type: 'text', placeholder: 'Signal 注册手机号', required: true },
      ],
      helpText: 'signal-cli；注重隐私',
      docUrl: 'https://signal.org/',
    },
    slack: {
      name: 'Slack',
      icon: <Slack size={20} />,
      color: 'text-purple-400',
      fields: [
        { key: 'botToken', label: 'Bot Token', type: 'password', placeholder: 'xoxb-...', required: true },
        { key: 'appToken', label: 'App Token', type: 'password', placeholder: 'xapp-...' },
        { key: 'testChannelId', label: t('channels.slack.testChannelId'), type: 'text', placeholder: t('channels.slack.testChannelIdPlaceholder') },
      ],
      helpText: 'Bolt SDK；适用于工作区应用',
      docUrl: 'https://api.slack.com/start',
    },
    synology_chat: {
      name: 'Synology Chat',
      icon: <MessageSquare size={20} />,
      color: 'text-blue-400',
      fields: [
        { key: 'webhookUrl', label: 'Webhook URL', type: 'text', placeholder: 'https://synology.example.com/webapi/...', required: true },
      ],
      helpText: '通过 outgoing + incoming webhook 连接的 Synology NAS Chat（内置插件）',
      docUrl: 'https://www.synology.com/',
    },
    telegram: {
      name: 'Telegram',
      icon: <MessageCircle size={20} />,
      color: 'text-blue-400',
      fields: [
        { key: 'botToken', label: 'Bot Token', type: 'password', placeholder: t('channels.telegram.botTokenPlaceholder'), required: true },
        { key: 'userId', label: 'User ID', type: 'text', placeholder: t('channels.telegram.userIdPlaceholder'), required: true },
        { key: 'dmPolicy', label: t('channels.telegram.dmPolicy'), type: 'select', options: [
          { value: 'pairing', label: t('channels.policyPairing') },
          { value: 'open', label: t('channels.policyOpen') },
          { value: 'disabled', label: t('channels.policyDisabled') },
        ]},
        { key: 'groupPolicy', label: t('channels.telegram.groupPolicy'), type: 'select', options: [
          { value: 'allowlist', label: t('channels.groupAllowlist') },
          { value: 'open', label: t('channels.groupOpen') },
          { value: 'disabled', label: t('channels.policyDisabled') },
        ]},
      ],
      helpText: '通过 grammY 的 Bot API；支持群组',
      docUrl: 'https://core.telegram.org/bots/tutorial',
    },
    tlon: {
      name: 'Tlon',
      icon: <Triangle size={20} />,
      color: 'text-orange-400',
      fields: [
        { key: 'shipUrl', label: 'Ship URL', type: 'text', placeholder: 'https://your-ship.example.com', required: true },
        { key: 'cookie', label: 'Cookie', type: 'password', placeholder: 'Urbit cookie', required: true },
      ],
      helpText: '基于 Urbit 的消息工具（内置插件）',
      docUrl: 'https://tlon.io/',
    },
    twitch: {
      name: 'Twitch',
      icon: <Twitch size={20} />,
      color: 'text-purple-500',
      fields: [
        { key: 'nickname', label: 'Bot Nickname', type: 'text', placeholder: 'YourBot', required: true },
        { key: 'oauthToken', label: 'OAuth Token', type: 'password', placeholder: 'oauth:...', required: true },
        { key: 'channel', label: 'Channel', type: 'text', placeholder: 'Channel to join', required: true },
      ],
      helpText: '通过 IRC 连接的 Twitch 聊天（内置插件）',
      docUrl: 'https://dev.twitch.tv/',
    },
    voice_call: {
      name: 'Voice Call',
      icon: <Phone size={20} />,
      color: 'text-green-500',
      fields: [
        { key: 'provider', label: 'Provider', type: 'select', options: [
          { value: 'twilio', label: 'Twilio' },
          { value: 'plivo', label: 'Plivo' },
        ], required: true },
        { key: 'accountSid', label: 'Account SID', type: 'text', placeholder: 'Account SID', required: true },
        { key: 'authToken', label: 'Auth Token', type: 'password', placeholder: 'Auth Token', required: true },
        { key: 'fromNumber', label: 'From Number', type: 'text', placeholder: '+1234567890', required: true },
      ],
      helpText: '通过 Plivo 或 Twilio 提供电话能力（插件，需单独安装）',
      docUrl: 'https://www.twilio.com/',
    },
    webchat: {
      name: 'WebChat',
      icon: <Globe size={20} />,
      color: 'text-purple-400',
      fields: [
        { key: 'port', label: 'Port', type: 'text', placeholder: '8080', required: true },
      ],
      helpText: '通过 WebSocket 的 Gateway 网关 WebChat UI',
      docUrl: '',
    },
    whatsapp: {
      name: 'WhatsApp',
      icon: <MessageCircle size={20} />,
      color: 'text-green-500',
      fields: [
        { key: 'dmPolicy', label: t('channels.whatsapp.dmPolicy'), type: 'select', options: [
          { value: 'pairing', label: t('channels.policyPairing') },
          { value: 'open', label: t('channels.policyOpen') },
          { value: 'disabled', label: t('channels.policyDisabled') },
        ]},
        { key: 'groupPolicy', label: t('channels.whatsapp.groupPolicy'), type: 'select', options: [
          { value: 'allowlist', label: t('channels.groupAllowlist') },
          { value: 'open', label: t('channels.groupOpen') },
          { value: 'disabled', label: t('channels.policyDisabled') },
        ]},
      ],
      helpText: '最流行；使用 Baileys，并需要二维码配对',
      docUrl: 'https://business.whatsapp.com/developers',
    },
    zalo: {
      name: 'Zalo',
      icon: <MessageCircle size={20} />,
      color: 'text-blue-500',
      fields: [
        { key: 'appId', label: 'App ID', type: 'text', placeholder: 'Zalo App ID', required: true },
        { key: 'appSecret', label: 'App Secret', type: 'password', placeholder: 'Zalo App Secret', required: true },
      ],
      helpText: 'Zalo Bot API；越南流行的消息工具（内置插件）',
      docUrl: 'https://developers.zalo.me/',
    },
    zalo_personal: {
      name: 'Zalo Personal',
      icon: <MessageCircle size={20} />,
      color: 'text-blue-500',
      fields: [
        { key: 'qrCode', label: 'QR Code', type: 'text', placeholder: 'Scan QR to login' },
      ],
      helpText: '通过二维码登录的 Zalo 个人账号（内置插件）',
      docUrl: 'https://zalo.me/',
    },
  };

  const [channels, setChannels] = useState<ChannelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // 弹窗状态
  const [showModal, setShowModal] = useState(false);

  // 其次渠道折叠状态
  const [showSecondary, setShowSecondary] = useState(false);

  // 飞书插件状态
  const [feishuPluginStatus, setFeishuPluginStatus] = useState<FeishuPluginStatus | null>(null);
  const [feishuPluginLoading, setFeishuPluginLoading] = useState(false);
  const [feishuPluginInstalling, setFeishuPluginInstalling] = useState(false);

  // QQ Bot 插件状态
  const [qqbotPluginStatus, setQqbotPluginStatus] = useState<QQBotPluginStatus | null>(null);
  const [qqbotPluginLoading, setQqbotPluginLoading] = useState(false);
  const [qqbotPluginInstalling, setQqbotPluginInstalling] = useState(false);

  // 跟踪哪些密码字段显示明文
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  const togglePasswordVisibility = (fieldKey: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(fieldKey)) {
        next.delete(fieldKey);
      } else {
        next.add(fieldKey);
      }
      return next;
    });
  };

  // 检查飞书插件状态
  const checkFeishuPlugin = async () => {
    setFeishuPluginLoading(true);
    try {
      const status = await invoke<FeishuPluginStatus>('check_feishu_plugin');
      setFeishuPluginStatus(status);
    } catch (e) {
      console.error('检查飞书插件失败:', e);
      setFeishuPluginStatus({ installed: false, version: null, plugin_name: null });
    } finally {
      setFeishuPluginLoading(false);
    }
  };

  // 安装飞书插件
  const handleInstallFeishuPlugin = async () => {
    setFeishuPluginInstalling(true);
    try {
      const result = await invoke<string>('install_feishu_plugin');
      alert(result);
      // 刷新插件状态
      await checkFeishuPlugin();
    } catch (e) {
      alert(t('setup.installFailed', { error: e }));
    } finally {
      setFeishuPluginInstalling(false);
    }
  };

  // 检查 QQ Bot 插件状态
  const checkQQBotPlugin = async () => {
    setQqbotPluginLoading(true);
    try {
      const status = await invoke<QQBotPluginStatus>('check_qqbot_plugin');
      setQqbotPluginStatus(status);
    } catch (e) {
      console.error('检查 QQ Bot 插件失败:', e);
      setQqbotPluginStatus({ installed: false, version: null, plugin_name: null });
    } finally {
      setQqbotPluginLoading(false);
    }
  };

  // 安装 QQ Bot 插件
  const handleInstallQQBotPlugin = async () => {
    setQqbotPluginInstalling(true);
    try {
      const result = await invoke<string>('install_qqbot_plugin');
      alert(result);
      // 刷新插件状态
      await checkQQBotPlugin();
    } catch (e) {
      alert('安装失败: ' + e);
    } finally {
      setQqbotPluginInstalling(false);
    }
  };

  // 显示清空确认
  const handleShowClearConfirm = () => {
    if (!selectedChannel) return;
    setShowClearConfirm(true);
  };

  // 执行清空渠道配置
  const handleClearConfig = async () => {
    if (!selectedChannel) return;

    const channel = channels.find((c) => c.id === selectedChannel);
    const channelName = channel ? channelInfo[channel.channel_type]?.name || channel.channel_type : selectedChannel;

    setShowClearConfirm(false);
    setClearing(true);
    try {
      await api.clearChannelConfig(selectedChannel);
      // 清空表单
      setConfigForm({});
      // 刷新列表
      await fetchChannels();
      setTestResult({
        success: true,
        message: t('channels.configCleared', { name: channelName }),
        error: null,
      });
    } catch (e) {
      setTestResult({
        success: false,
        message: t('channels.clearFailed'),
        error: String(e),
      });
    } finally {
      setClearing(false);
    }
  };

  // 快速测试
  const handleQuickTest = async () => {
    if (!selectedChannel) return;

    setTesting(true);
    setTestResult(null);

    try {
      const result = await invoke<{
        success: boolean;
        channel: string;
        message: string;
        error: string | null;
      }>('test_channel', { channelType: selectedChannel });

      setTestResult({
        success: result.success,
        message: result.message,
        error: result.error,
      });
    } catch (e) {
      setTestResult({
        success: false,
        message: t('channels.testFailed'),
        error: String(e),
      });
    } finally {
      setTesting(false);
    }
  };

  // WhatsApp 扫码登录
  const handleWhatsAppLogin = async () => {
    setLoginLoading(true);
    try {
      // 调用后端命令启动 WhatsApp 登录
      await api.startChannelLogin('whatsapp');

      // 开始轮询检查登录状态
      const pollInterval = setInterval(async () => {
        try {
          const result = await api.testChannel('whatsapp');

          if (result.success) {
            clearInterval(pollInterval);
            setLoginLoading(false);
            // 刷新渠道列表
            await fetchChannels();
            setTestResult({
              success: true,
              message: t('channels.whatsapp.loginSuccess'),
              error: null,
            });
          }
        } catch {
          // 继续轮询
        }
      }, 3000); // 每3秒检查一次

      // 60秒后停止轮询
      setTimeout(() => {
        clearInterval(pollInterval);
        setLoginLoading(false);
      }, 60000);

      alert('请在弹出的终端窗口中扫描二维码完成登录\n\n登录成功后界面会自动更新');
    } catch (e) {
      alert(t('channels.whatsapp.loginFailed') + e);
      setLoginLoading(false);
    }
  };

  const fetchChannels = async () => {
    try {
      const result = await invoke<ChannelConfig[]>('get_channels_config');
      console.log('[fetchChannels] 获取到渠道数量:', result.length);
      console.log('[fetchChannels] 渠道列表:', JSON.stringify(result, null, 2));
      setChannels(result);
      return result;
    } catch (e) {
      console.error('[fetchChannels] 获取渠道配置失败:', e);
      return [];
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const result = await fetchChannels();

        // 自动选择第一个已配置的渠道
        const configured = result.find((c) => c.enabled);
        if (configured) {
          handleChannelSelect(configured.id, result);
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleChannelSelect = (channelId: string, channelList?: ChannelConfig[]) => {
    setSelectedChannel(channelId);
    setTestResult(null); // 清除测试结果
    setShowModal(true); // 打开弹窗

    const list = channelList || channels;
    const channel = list.find((c) => c.id === channelId);

    if (channel) {
      const form: Record<string, string> = {};
      Object.entries(channel.config).forEach(([key, value]) => {
        // 处理布尔值
        if (typeof value === 'boolean') {
          form[key] = value ? 'true' : 'false';
        } else {
          form[key] = String(value ?? '');
        }
      });
      setConfigForm(form);

      // 如果选择的是飞书渠道，检查插件状态
      if (channel.channel_type === 'feishu') {
        checkFeishuPlugin();
      }
      // 如果选择的是 QQ 渠道，检查插件状态
      if (channel.channel_type === 'qqbot') {
        checkQQBotPlugin();
      }
    } else {
      setConfigForm({});
    }
  };

  const handleSave = async () => {
    if (!selectedChannel) return;

    setSaving(true);
    try {
      const channel = channels.find((c) => c.id === selectedChannel);
      if (!channel) return;

      // 转换表单值
      const config: Record<string, unknown> = {};
      Object.entries(configForm).forEach(([key, value]) => {
        if (value === 'true') {
          config[key] = true;
        } else if (value === 'false') {
          config[key] = false;
        } else if (value) {
          config[key] = value;
        }
      });

      await api.saveChannelConfig({
        ...channel!,
        config,
      });

      // 刷新列表
      await fetchChannels();

      alert('渠道配置已保存！');
    } catch (e) {
      console.error('保存失败:', e);
      alert(t('channels.saveFailed', { error: e }));
    } finally {
      setSaving(false);
    }
  };

  const currentChannel = channels.find((c) => c.id === selectedChannel);
  const currentInfo = currentChannel ? channelInfo[currentChannel.channel_type] : null;

  // 检查渠道是否有有效配置
  const hasValidConfig = (channel: ChannelConfig) => {
    const info = channelInfo[channel.channel_type];
    if (!info) {
      console.warn(`[hasValidConfig] channel_type not found: ${channel.channel_type}`);
      return channel.enabled;
    }

    // 检查是否有必填字段已填写
    const requiredFields = info.fields.filter((f) => f.required);
    if (requiredFields.length === 0) return channel.enabled;

    // 确保所有必填字段都有值
    return requiredFields.every((field) => {
      const value = channel.config[field.key];
      const hasValue = value !== undefined && value !== null && value !== '';
      console.log(`[hasValidConfig] ${channel.channel_type}.${field.key} = ${JSON.stringify(value)}, hasValue: ${hasValue}`);
      return hasValue;
    });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-claw-500" />
      </div>
    );
  }

  // 分离主渠道和次渠道
  const primaryChannels = channels.filter((c) => primaryChannelIds.includes(c.channel_type));
  const secondaryChannels = channels.filter((c) => !primaryChannelIds.includes(c.channel_type));

  // 渲染渠道卡片
  const renderChannelCard = (channel: ChannelConfig, isLarge = false) => {
    const info = channelInfo[channel.channel_type] || {
      name: channel.channel_type,
      icon: <MessageSquare size={20} />,
      color: 'text-content-secondary',
      fields: [],
    };
    const isConfigured = hasValidConfig(channel);
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

  return (
    <div className="h-full overflow-y-auto scroll-container pr-2">
      <div className="max-w-5xl">
        <h2 className="text-lg font-semibold text-content-primary mb-6 px-1">
          消息渠道
        </h2>

        {/* 主渠道卡片 */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-content-secondary mb-4 px-1 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-claw-500" />
            主渠道
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {primaryChannels.map((channel) => renderChannelCard(channel, true))}
          </div>
        </div>

        {/* 其次渠道 - 可折叠 */}
        <div>
          <button
            onClick={() => setShowSecondary(!showSecondary)}
            className="w-full flex items-center justify-between px-1 py-2 mb-4 text-sm font-medium text-content-secondary hover:text-content-primary transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-content-tertiary" />
              其次渠道
            </span>
            <motion.div
              animate={{ rotate: showSecondary ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={18} />
            </motion.div>
          </button>

          <AnimatePresence>
            {showSecondary && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {secondaryChannels.map((channel) => renderChannelCard(channel, false))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 配置弹窗 */}
        <AnimatePresence>
          {showModal && currentChannel && currentInfo && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* 背景遮罩 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowModal(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />

              {/* 弹窗内容 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="relative w-full max-w-2xl max-h-[85vh] bg-surface-card rounded-2xl border border-edge shadow-2xl overflow-hidden flex flex-col"
              >
                {/* 弹窗头部 */}
                <div className="flex items-center gap-4 p-6 border-b border-edge shrink-0">
                  <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center bg-surface-elevated', currentInfo.color)}>
                    {currentInfo.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-content-primary">
                      配置 {currentInfo.name}
                    </h3>
                    {currentInfo.helpText && (
                      <p className="text-xs text-content-tertiary mt-0.5">{currentInfo.helpText}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 rounded-lg hover:bg-surface-elevated transition-colors text-content-secondary hover:text-content-primary"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* 弹窗内容区 */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-4">
                    {/* 飞书插件状态提示 */}
                    {currentChannel.channel_type === 'feishu' && (
                      <div className="mb-4">
                        {feishuPluginLoading ? (
                          <div className="p-4 bg-surface-elevated rounded-xl border border-edge flex items-center gap-3">
                            <Loader2 size={20} className="animate-spin text-content-secondary" />
                            <span className="text-content-secondary">正在检查飞书插件状态...</span>
                          </div>
                        ) : feishuPluginStatus?.installed ? (
                          <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/30 flex items-center gap-3">
                            <Package size={20} className="text-green-400" />
                            <div className="flex-1">
                              <p className="text-green-400 font-medium">飞书插件已安装</p>
                              <p className="text-xs text-content-secondary mt-0.5">
                                {feishuPluginStatus.plugin_name || '@openclaw/feishu'}
                                {feishuPluginStatus.version && ` v${feishuPluginStatus.version}`}
                              </p>
                            </div>
                            <CheckCircle size={16} className="text-green-400" />
                          </div>
                        ) : (
                          <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/30">
                            <div className="flex items-start gap-3">
                              <AlertTriangle size={20} className="text-amber-400 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-amber-400 font-medium">需要安装飞书插件</p>
                                <p className="text-xs text-content-secondary mt-1">
                                  飞书渠道需要先安装 @openclaw/feishu 插件才能使用。
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    onClick={handleInstallFeishuPlugin}
                                    disabled={feishuPluginInstalling}
                                    className="btn-primary flex items-center gap-2 text-sm py-2"
                                  >
                                    {feishuPluginInstalling ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                      <Download size={14} />
                                    )}
                                    {feishuPluginInstalling ? t('channels.feishu.installing') : t('channels.feishu.installPlugin')}
                                  </button>
                                  <button
                                    onClick={checkFeishuPlugin}
                                    disabled={feishuPluginLoading}
                                    className="btn-secondary flex items-center gap-2 text-sm py-2"
                                  >
                                    {t('channels.feishu.refreshStatus')}
                                  </button>
                                </div>
                                <p className="text-xs text-content-tertiary mt-2">
                                  或手动执行: <code className="px-1.5 py-0.5 bg-surface-elevated rounded text-content-secondary">openclaw plugins install @openclaw/feishu</code>
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* QQ Bot 插件状态提示 */}
                    {currentChannel.channel_type === 'qqbot' && (
                      <div className="mb-4">
                        {qqbotPluginLoading ? (
                          <div className="p-4 bg-surface-elevated rounded-xl border border-edge flex items-center gap-3">
                            <Loader2 size={20} className="animate-spin text-content-secondary" />
                            <span className="text-content-secondary">正在检查 QQ Bot 插件状态...</span>
                          </div>
                        ) : qqbotPluginStatus?.installed ? (
                          <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/30 flex items-center gap-3">
                            <Package size={20} className="text-green-400" />
                            <div className="flex-1">
                              <p className="text-green-400 font-medium">QQ Bot 插件已安装</p>
                              <p className="text-xs text-content-secondary mt-0.5">
                                {qqbotPluginStatus.plugin_name || '@sliverp/qqbot'}
                                {qqbotPluginStatus.version && ` v${qqbotPluginStatus.version}`}
                              </p>
                            </div>
                            <CheckCircle size={16} className="text-green-400" />
                          </div>
                        ) : (
                          <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/30">
                            <div className="flex items-start gap-3">
                              <AlertTriangle size={20} className="text-amber-400 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-amber-400 font-medium">需要安装 QQ Bot 插件</p>
                                <p className="text-xs text-content-secondary mt-1">
                                  QQ 渠道需要先安装 @sliverp/qqbot 插件才能使用。
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    onClick={handleInstallQQBotPlugin}
                                    disabled={qqbotPluginInstalling}
                                    className="btn-primary flex items-center gap-2 text-sm py-2"
                                  >
                                    {qqbotPluginInstalling ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                      <Download size={14} />
                                    )}
                                    {qqbotPluginInstalling ? '安装中...' : '一键安装插件'}
                                  </button>
                                  <button
                                    onClick={checkQQBotPlugin}
                                    disabled={qqbotPluginLoading}
                                    className="btn-secondary flex items-center gap-2 text-sm py-2"
                                  >
                                    刷新状态
                                  </button>
                                </div>
                                <p className="text-xs text-content-tertiary mt-2">
                                  或手动执行: <code className="px-1.5 py-0.5 bg-surface-elevated rounded text-content-secondary">openclaw plugins install @sliverp/qqbot@latest</code>
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 配置字段 */}
                    {currentInfo.fields.length > 0 ? (
                      currentInfo.fields.map((field) => (
                        <div key={field.key}>
                          <label className="block text-sm text-content-secondary mb-2">
                            {field.label}
                            {field.required && <span className="text-red-400 ml-1">*</span>}
                            {configForm[field.key] && (
                              <span className="ml-2 text-green-500 text-xs">✓</span>
                            )}
                          </label>

                          {field.type === 'select' ? (
                            <select
                              value={configForm[field.key] || ''}
                              onChange={(e) =>
                                setConfigForm({ ...configForm, [field.key]: e.target.value })
                              }
                              className="input-base"
                            >
                              <option value="">{t('channels.pleaseSelect')}</option>
                              {field.options?.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : field.type === 'password' ? (
                            <div className="relative">
                              <input
                                type={visiblePasswords.has(field.key) ? 'text' : 'password'}
                                value={configForm[field.key] || ''}
                                onChange={(e) =>
                                  setConfigForm({ ...configForm, [field.key]: e.target.value })
                                }
                                placeholder={field.placeholder}
                                className="input-base pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(field.key)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-content-tertiary hover:text-content-primary transition-colors"
                                title={visiblePasswords.has(field.key) ? '隐藏' : '显示'}
                              >
                                {visiblePasswords.has(field.key) ? (
                                  <EyeOff size={18} />
                                ) : (
                                  <Eye size={18} />
                                )}
                              </button>
                            </div>
                          ) : (
                            <input
                              type={field.type}
                              value={configForm[field.key] || ''}
                              onChange={(e) =>
                                setConfigForm({ ...configForm, [field.key]: e.target.value })
                              }
                              placeholder={field.placeholder}
                              className="input-base"
                            />
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-content-tertiary">
                        <p>该渠道暂无配置选项</p>
                        <p className="text-xs mt-2">请参考官方文档进行配置</p>
                      </div>
                    )}

                    {/* WhatsApp 特殊处理：扫码登录按钮 */}
                    {currentChannel.channel_type === 'whatsapp' && (
                      <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/30">
                        <div className="flex items-center gap-3 mb-3">
                          <QrCode size={24} className="text-green-400" />
                          <div>
                            <p className="text-content-primary font-medium">扫码登录</p>
                            <p className="text-xs text-content-secondary">WhatsApp 需要扫描二维码登录</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleWhatsAppLogin}
                            disabled={loginLoading}
                            className="flex-1 btn-secondary flex items-center justify-center gap-2"
                          >
                            {loginLoading ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <QrCode size={16} />
                            )}
                            {loginLoading ? t('channels.whatsapp.waitingLogin') : t('channels.whatsapp.startLogin')}
                          </button>
                          <button
                            onClick={async () => {
                              await fetchChannels();
                              handleQuickTest();
                            }}
                            disabled={testing}
                            className="btn-secondary flex items-center justify-center gap-2 px-4"
                            title={t('channels.feishu.refreshStatus')}
                          >
                            {testing ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Check size={16} />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-content-tertiary mt-2 text-center">
                          登录成功后点击右侧按钮刷新状态，或运行: openclaw channels login --channel whatsapp
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
                          <CheckCircle size={20} className="text-green-400 mt-0.5" />
                        ) : (
                          <XCircle size={20} className="text-red-400 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className={clsx(
                            'font-medium',
                            testResult.success ? 'text-green-400' : 'text-red-400'
                          )}>
                            {testResult.success ? t('channels.testSuccess') : t('channels.testFailed')}
                          </p>
                          <p className="text-sm text-content-secondary mt-1">{testResult.message}</p>
                          {testResult.error && (
                            <p className="text-xs text-red-300 mt-2 whitespace-pre-wrap">
                              {testResult.error}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* 弹窗底部操作栏 */}
                <div className="p-6 border-t border-edge bg-surface-elevated/50 shrink-0">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="btn-primary flex items-center justify-center gap-2 text-sm px-4 py-2.5"
                    >
                      {saving ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Check size={15} />
                      )}
                      保存配置
                    </button>

                    {/* 快速测试按钮 */}
                    <button
                      onClick={handleQuickTest}
                      disabled={testing}
                      className="btn-secondary flex items-center justify-center gap-2 text-sm px-4 py-2.5"
                    >
                      {testing ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Play size={15} />
                      )}
                      快速测试
                    </button>

                    {/* 清空配置按钮 */}
                    {!showClearConfirm ? (
                      <button
                        onClick={handleShowClearConfirm}
                        disabled={clearing}
                        className="btn-secondary flex items-center justify-center gap-2 text-sm px-4 py-2.5 text-red-400 hover:text-red-300 hover:border-red-500/50"
                      >
                        {clearing ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                        清空配置
                      </button>
                    ) : (
                      <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-red-500/20 rounded-lg border border-red-500/50">
                        <span className="text-sm text-red-300">确定清空？</span>
                        <button
                          onClick={handleClearConfig}
                          className="px-2 py-1 text-xs bg-red-500 text-content-primary rounded hover:bg-red-600 transition-colors"
                        >
                          确定
                        </button>
                        <button
                          onClick={() => setShowClearConfirm(false)}
                          className="px-2 py-1 text-xs bg-surface-elevated text-content-secondary rounded hover:bg-surface-elevated transition-colors"
                        >
                          取消
                        </button>
                      </div>
                    )}

                    {/* 配置说明按钮 */}
                    <button
                      onClick={async () => {
                        const docUrl = currentInfo?.docUrl;
                        if (docUrl) {
                          window.open(docUrl, '_blank');
                        }
                      }}
                      className="btn-secondary flex items-center justify-center gap-2 text-sm px-4 py-2.5 text-blue-400 hover:text-blue-300 hover:border-blue-500/50"
                    >
                      <ExternalLink size={15} />
                      配置说明
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
