import ModuleSection from './components/ModuleSection';

interface Module {
  id: string;
  name: string;
  description: string;
  type: 'link' | 'route' | 'external';
  url?: string;
  status: 'available' | 'coming-soon';
  icon?: string;
}

const sections: { title: string; icon: string; modules: Module[] }[] = [
  {
    title: 'AI应用',
    icon: '🤖',
    modules: [
      {
        id: 'open-claude',
        name: 'OpenClaude',
        description: 'AI Agent 核心服务，固定端口 18789',
        type: 'external',
        url: 'http://localhost:18789',
        status: 'available',
        icon: '🤖',
      },
      {
        id: 'iclaw',
        name: 'iclaw',
        description: 'OpenClaw 设备管理与配置界面',
        type: 'route',
        url: '/app/iclaw/',
        status: 'available',
        icon: '🦐',
      },
      {
        id: 'claude-code',
        name: 'Claude Code',
        description: 'AI 编程助手，智能代码生成与调试',
        type: 'route',
        status: 'coming-soon',
        icon: '💻',
      },
    ],
  },
  {
    title: '拓展应用',
    icon: '🚀',
    modules: [
      {
        id: 'qingliu',
        name: '轻流-AI无代码平台',
        description: '企业级无代码开发平台，快速构建业务应用',
        type: 'route',
        status: 'coming-soon',
        icon: '🔧',
      },
    ],
  },
  {
    title: 'AI配置',
    icon: '⚙️',
    modules: [
      {
        id: 'llm-router',
        name: 'LLM Router',
        description: '大模型路由配置，智能分配 AI 请求',
        type: 'route',
        status: 'coming-soon',
        icon: '🔀',
      },
      {
        id: 'skillhub',
        name: 'Skillhub',
        description: 'AI 技能中心，管理与配置 AI 技能',
        type: 'route',
        status: 'coming-soon',
        icon: '🧩',
      },
      {
        id: 'toolshub',
        name: 'Toolshub',
        description: 'AI 工具中心，扩展 AI 能力边界',
        type: 'route',
        status: 'coming-soon',
        icon: '🛠️',
      },
    ],
  },
  {
    title: '系统功能',
    icon: '🖥️',
    modules: [
      {
        id: 'tailscale',
        name: 'Tailscale',
        description: '内网穿透与组网，安全远程访问',
        type: 'route',
        status: 'coming-soon',
        icon: '🌐',
      },
      {
        id: 'file-manager',
        name: '文件管理',
        description: '设备文件浏览与编辑，固定端口 8081',
        type: 'external',
        url: 'http://localhost:8081',
        status: 'available',
        icon: '📁',
      },
      {
        id: 'terminal',
        name: '终端管理',
        description: 'Web Terminal 会话管理，远程shell访问',
        type: 'route',
        url: '/app/terminal/',
        status: 'available',
        icon: '🖥️',
      },
      {
        id: 'ota',
        name: 'OTA远程更新',
        description: '设备固件远程升级，固定端口 8089',
        type: 'external',
        url: 'http://localhost:8089',
        status: 'available',
        icon: '📦',
      },
    ],
  },
];

function App() {
  return (
    <div className="min-h-screen flex flex-col items-center p-8 bg-surface-app">
      {/* 背景渐变 */}
      <div className="fixed inset-0 bg-gradient-radial pointer-events-none" />

      {/* Logo / 标题区 */}
      <div className="text-center mb-10 animate-fade-in">
        <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-claw-400 to-claw-600 bg-clip-text text-transparent">
          iClaw 统一门户
        </h1>
        <p className="text-content-secondary text-lg">OpenClaw Management Portal</p>
      </div>

      {/* 模块列表 */}
      <div className="w-full max-w-5xl animate-slide-up">
        {sections.map((section) => (
          <ModuleSection
            key={section.title}
            title={section.title}
            icon={section.icon}
            modules={section.modules}
          />
        ))}
      </div>

      {/* 底部信息 */}
      <div className="mt-12 text-content-tertiary text-sm animate-fade-in">
        <p>OpenClaw Portal &bull; v0.1.0</p>
      </div>
    </div>
  );
}

export default App;
