# 一芥枢纽 (1Switch)

**AI Hub Ready to Use**, inspired by telephone exchange principles.

> 📞 The phone (framework) can be replaced at any time, but the exchange (access layer) doesn't need to be re-wired. Users simply plug the phone line into the exchange, and the rest is handled by routing.
> 1Switch is such an exchange.

[中文文档](README.md)

![Platform](https://img.shields.io/badge/platform-Web-blue)
![Go](https://img.shields.io/badge/Go-1.21+-00ADD8)
![React](https://img.shields.io/badge/React-18-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🌟 Core Positioning

**1Switch = Telephone Exchange for the AI Era**

Users simply plug "phone lines" (AI frameworks, channels, tools) into the hub. Configure once, always stable. Switching frameworks doesn't require re-wiring.

---

## 🏗️ Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│   Layer 3 · Aggregation Service Layer                    │
│   LLMs + Knowledge + Tools + Skills + Memory             │
│   ┌──────────┬──────────┬──────────┬──────────┐          │
│   │ Claude   │ GPT-4o   │ GLM-5.1  │ Qwen3    │          │
│   └──────────┴──────────┴──────────┴──────────┘          │
│   OpenAI / Zhipu / Alibaba / Baidu — Unified Access      │
├─────────────────────────────────────────────────────────┤
│   Layer 2 · Agent Gateway                               │
│   Independent configuration space for each agent         │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│   │  Agent A   │  │  Agent B   │  │  Agent C   │        │
│   │ OpenClaw  │  │  Hermes    │  │ Custom     │        │
│   │+Claude-4  │  │+GPT-4o    │  │+GLM-5.1    │        │
│   │+Code Tools│  │+Memory    │  │+Industry   │        │
│   └────────────┘  └────────────┘  └────────────┘        │
│   Switch frameworks freely, configurations migrate      │
├─────────────────────────────────────────────────────────┤
│   Layer 1 · Message Gateway                             │
│   ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐     │
│   │Feishu│  │DingDing│ │WhatsApp│ │Mobile │ │Bot   │     │
│   └──────┘  └──────┘  └──────┘  └──────┘  └──────┘     │
│   ★ Configure once, always stable ★                    │
└─────────────────────────────────────────────────────────┘
```

---

## 📸 Screenshots

![概览](pic/dashboard.png)

---

## ✨ Features

| Module | Description |
|--------|-------------|
| 📊 **Dashboard** | Real-time service monitoring, process stats, one-click start/stop/restart |
| 🤖 **AI Configuration** | 14+ AI providers, custom API endpoints, quick model switching |
| 🤝 **Digital Employees** | Multi-agent management, role assignment, model override, channel binding |
| 📱 **Messaging Channels** | Telegram, Discord, Slack, Feishu, WhatsApp, iMessage, WeChat, DingTalk, QQ |
| 🧩 **Skill Management** | Browse, install, configure, and manage skill plugins |
| 🛡️ **Security** | IP exposure detection, token auth, skill permission scan, one-click fix |
| 🧪 **Diagnostics** | System health check, AI connectivity test, channel connectivity test |
| 🖥️ **Terminal** | Embedded Web Terminal (noVNC) |
| 📁 **File Manager** | Embedded file browser |
| 🎨 **Themes** | Light / Dark mode with persistent preference |
| 📱 **Mobile** | Drawer sidebar, touch optimization |
| 🔄 **PWA** | Add to home screen, offline cache |

---

## 🚀 Quick Start

### Option 1: Download Pre-built Binaries

👉 **[Download Latest Release](https://github.com/scottzx/1switch-manager/releases/latest)**

### Option 2: Build from Source

#### Prerequisites

- **Go** >= 1.21
- **Node.js** >= 18.0
- **npm** or **pnpm**

#### Build Backend

```bash
cd 1switch-manager
go build -o admin-api ./cmd/admin-api
```

#### Build Frontend

```bash
npm install
npm run build
```

---

## 🔌 API

Backend listens on `http://0.0.0.0:18789`:

| Endpoint | Description |
|----------|-------------|
| `GET /api/system/info` | System info |
| `GET /api/service/status` | Service status |
| `POST /api/service/start` | Start service |
| `POST /api/service/stop` | Stop service |
| `POST /api/service/restart` | Restart service |
| `GET /logs` | Get logs |
| `GET /api/ai/config` | Get AI config |
| `PUT /api/ai/config` | Save AI config |
| `GET /api/channels` | Get channel config |
| `PUT /api/channels/:id` | Save channel config |
| `POST /api/diagnosis/run` | Run diagnostics |
| `GET /api/update/check` | Check updates |
| `POST /api/update/do` | Apply update |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE)

---

## 🔗 Links

- [OpenClaw](https://github.com/miaoxworld/openclaw) - OpenClaw core project
- [OpenClawInstaller](https://github.com/miaoxworld/OpenClawInstaller) - CLI installer
- [1Switch Manager](https://github.com/scottzx/1switch-manager) - This project

---

**Made with ❤️ by 1Switch Team**
