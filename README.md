# 一芥枢纽 (1Switch)

**开箱即用的 AI 中枢**，受电话交换台原理启发。

> 📞 电话机（框架）可以随时更换，但交换台（接入层）不需要跟着重新布线。用户只需要把电话线插到交换台上，剩下的交给交换台去路由。
> 一芥枢纽就是这样一座交换台。

[English](README_EN.md)

![Platform](https://img.shields.io/badge/platform-Web-blue)
![Go](https://img.shields.io/badge/Go-1.21+-00ADD8)
![React](https://img.shields.io/badge/React-18-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🌟 核心定位

**1Switch = AI 时代的电话交换台**

用户只需把"电话线"（AI 框架、渠道、工具）插到枢纽上，配置一次，永远稳定。切换框架不需要重新布线。

---

## 🏗️ 三层架构

```
┌─────────────────────────────────────────────────────────┐
│   第3层 · 聚合服务层                                      │
│   大模型 + 知识 + 工具 + 技能 + 记忆                       │
│   ┌──────────┬──────────┬──────────┬──────────┐           │
│   │ Claude   │ GPT-4o   │ GLM-5.1  │ Qwen3    │           │
│   └──────────┴──────────┴──────────┴──────────┘           │
│   OpenAI / 智谱 / 阿里 / 百度 ——— 统一接入，透明计费         │
├─────────────────────────────────────────────────────────┤
│   第2层 · 智能体网关 (Agent Gateway)                      │
│   每一个智能体的独立配置空间                                │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│   │  Agent A   │  │  Agent B   │  │  Agent C   │        │
│   │ OpenClaw  │  │  Hermes    │  │  自研框架   │        │
│   │+Claude-4  │  │+GPT-4o    │  │+GLM-5.1    │        │
│   │+代码工具   │  │+记忆工具   │  │+行业知识   │        │
│   └────────────┘  └────────────┘  └────────────┘        │
│   框架随意切换，配置跟随迁移                                │
├─────────────────────────────────────────────────────────┤
│   第1层 · 消息网关 (Message Gateway)                      │
│   ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐     │
│   │ 飞书  │  │ 钉钉  │  │WhatsApp│  │ 手机  │  │机器人│     │
│   └──────┘  └──────┘  └──────┘  └──────┘  └──────┘     │
│   ★ 只配一次，永远稳定 ★                                  │
└─────────────────────────────────────────────────────────┘
```

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

## 🚀 快速开始

### 方式一：直接下载

👉 **[下载最新版本](https://github.com/scottzx/1switch-manager/releases/latest)**

包含 `admin-api` 后端二进制，下载后运行即可。

### 方式二：自行构建

#### 环境要求

- **Go** >= 1.21
- **Node.js** >= 18.0
- **npm** 或 **pnpm**

#### 构建后端

```bash
cd 1switch-manager
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

## 🔌 API 接口

后端默认监听 `http://0.0.0.0:18789`，主要接口：

| 接口 | 说明 |
|------|------|
| `GET /api/system/info` | 获取系统信息 |
| `GET /api/service/status` | 服务运行状态 |
| `POST /api/service/start` | 启动服务 |
| `POST /api/service/stop` | 停止服务 |
| `POST /api/service/restart` | 重启服务 |
| `GET /logs` | 获取日志 |
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
- [1Switch Manager](https://github.com/scottzx/1switch-manager) - 本项目

---

**Made with ❤️ by 1Switch Team**
