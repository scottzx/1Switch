# 🦞 虾池子 (iClaw)

**OpenClaw 的 Web 管理面板**，基于 **Go + Gin / React + TypeScript + Vite** 构建。

原 [OpenClaw Manager (Tauri)](https://github.com/VVillageMoonlight/openclaw-manager) 已停止维护，当前项目从上游 OpenClaw 复用了前端代码，重新开发了 Go 后端，并大幅扩展了功能。

[English](README_EN.md)

![Platform](https://img.shields.io/badge/platform-Web-blue)
![Go](https://img.shields.io/badge/Go-1.21+-00ADD8)
![React](https://img.shields.io/badge/React-18-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 📸 界面预览

![概览](pic/dashboard.png)

---

## ✨ 功能特性

| 模块 | 功能 |
|------|------|
| 📊 **概览** | 实时服务状态监控、进程内存统计、一键启动/停止/重启、实时日志 |
| 🤖 **模型配置** | 14+ AI 提供商、自定义 API 地址、主模型一键切换 |
| 🤝 **数字员工** | 多智能体管理、角色分工、模型覆盖、渠道绑定、沙箱隔离 |
| 📱 **消息渠道** | Telegram、Discord、Slack、飞书、WhatsApp、iMessage、微信、钉钉、QQ、Teams、Signal |
| 🧩 **技能管理** | 技能搜索与分类、安装/卸载/启用/禁用、可视化配置 |
| 🛡️ **安全防护** | IP 暴露检测、Token 认证、技能权限扫描、一键修复 |
| 🧪 **测试诊断** | 系统环境检查、AI 连接测试、渠道连通性测试 |
| 🖥️ **终端控制** | 嵌入式 Web Terminal（noVNC） |
| 📁 **文件管理** | 嵌入式文件浏览器 |
| 🎨 **主题切换** | 亮色 / 暗色双主题，持久化保存 |
| 📱 **移动端适配** | 抽屉式侧边栏、触控优化、安全区域适配 |
| 🔄 **PWA** | 支持添加到主屏幕、离线缓存 |

---

## 🏗️ 技术架构

```
iclaw/
├── cmd/admin-api/          # Go 后端入口
│   └── main.go
├── internal/               # Go 后端内部实现
│   ├── handler/           # HTTP handlers
│   ├── service/           # 业务逻辑
│   └── model/             # 数据模型
├── admin-api              # 编译后的后端二进制
├── src/                   # React 前端
│   ├── App.tsx
│   ├── components/
│   │   ├── Layout/        # 布局（侧边栏 + 顶栏）
│   │   ├── Dashboard/      # 概览
│   │   ├── AIConfig/       # AI 模型配置
│   │   ├── Agents/         # 数字员工
│   │   ├── Channels/       # 消息渠道
│   │   ├── Skills/         # 技能管理
│   │   ├── Security/       # 安全防护
│   │   ├── Testing/        # 测试诊断
│   │   ├── Logs/           # 应用日志
│   │   ├── Terminal/       # 终端控制
│   │   ├── FileBrowser/    # 文件管理
│   │   └── Settings/       # 系统设置
│   ├── stores/             # Zustand 状态管理
│   └── lib/                # 工具库
├── novnc/                 # noVNC (Web Terminal)
├── public/                # 静态资源（PWA icons、manifest）
└── scripts/                # 设备注册脚本
```

### 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React 18 | 用户界面 |
| 构建工具 | Vite | 快速开发与构建 |
| 样式 | TailwindCSS + CSS 变量 | 主题切换 + 原子化 CSS |
| 状态管理 | Zustand | 轻量级状态管理 |
| 动画 | Framer Motion | 流畅过渡动画 |
| 国际化 | react-i18next | 中英文支持 |
| PWA | vite-plugin-pwa + Workbox | 离线缓存、主屏幕图标 |
| 后端 | Go + Gin | 高性能 HTTP API |
| 终端 | noVNC + WebSocket | 嵌入式 Web Terminal |
| 设备注册 | Bash + Python | 设备自助上报系统 |

---

## 🚀 快速开始

### 方式一：直接下载

👉 **[下载最新版本](https://github.com/scottzx/iclaw-manager/releases/latest)**

包含 `admin-api` 后端二进制，下载后运行即可。

### 方式二：自行构建

#### 环境要求

- **Go** >= 1.21
- **Node.js** >= 18.0
- **npm** 或 **pnpm**

#### 构建后端

```bash
cd iclaw
go build -o admin-api ./cmd/admin-api
```

#### 构建前端

```bash
npm install
npm run build
```

构建产物在 `dist/`，将 `dist/` 和 `admin-api` 放在同一目录，运行 `./admin-api` 即可。

#### 开发模式

```bash
# 前端热重载开发
npm run dev

# 后端开发（需分别启动 admin-api）
go run ./cmd/admin-api
```

---

## 📁 项目结构（前端）

```
src/
├── App.tsx                  # 根组件 + 路由
├── main.tsx                 # 入口
├── components/
│   ├── Layout/
│   │   ├── Sidebar.tsx     # 桌面端固定侧边栏
│   │   ├── MobileSidebar.tsx# 移动端抽屉侧边栏
│   │   └── Header.tsx       # 顶栏
│   ├── Dashboard/           # 概览
│   ├── AIConfig/            # 模型配置
│   ├── Agents/              # 数字员工
│   ├── Channels/            # 消息渠道
│   ├── Skills/              # 技能管理
│   ├── Security/            # 安全防护
│   ├── Testing/             # 测试诊断
│   ├── Logs/                # 应用日志
│   ├── Terminal/            # 终端控制
│   ├── FileBrowser/         # 文件管理
│   └── Settings/            # 系统设置
├── stores/
│   └── appStore.ts          # Zustand 全局状态
├── lib/
│   ├── tauri.ts             # Tauri API 调用封装
│   ├── invoke-shim.ts        # invoke 兼容层
│   ├── ThemeContext.tsx      # 主题上下文
│   └── logger.ts            # 日志工具
├── i18n/
│   ├── zh.json              # 中文翻译
│   └── en.json              # 英文翻译
└── styles/
    └── globals.css          # 全局样式 + CSS 变量
```

---

## 🔌 API 接口

后端默认监听 `http://0.0.0.0:18789`，主要接口：

| 接口 | 说明 |
|------|------|
| `GET /api/system/info` | 获取系统信息 |
| `GET /api/service/status` | 服务运行状态 |
| `POST /api/service/start` | 启动服务 |
| `POST /api/service/stop` | 停止服务 |
| `POST /api/service/restart` | 重启服务 |
| `GET /api/logs` | 获取日志 |
| `GET /api/ai/config` | 获取 AI 配置 |
| `PUT /api/ai/config` | 保存 AI 配置 |
| `GET /api/channels` | 获取渠道配置 |
| `PUT /api/channels/:id` | 保存渠道配置 |
| `POST /api/diagnosis/run` | 运行诊断 |
| `GET /api/update/check` | 检查更新 |
| `POST /api/update/do` | 执行更新 |

---

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)

---

## 🔗 相关链接

- [OpenClaw](https://github.com/miaoxworld/openclaw) - OpenClaw 核心项目
- [OpenClawInstaller](https://github.com/miaoxworld/OpenClawInstaller) - 命令行安装器
- [iClaw Manager](https://github.com/scottzx/iclaw-manager) - 本项目

---

**Made with ❤️ by iClaw Team**
