# 移动端终端输入方案设计

## 问题分析

### 当前实现
- 终端组件 (`src/components/Terminal/index.tsx`) 通过 iframe 加载 ttyd (port 7681)
- 使用 `allow="keyboard-input"` 和点击聚焦尝试解决移动端键盘问题
- **效果不佳**：移动端 iframe 无法正常接收键盘事件

### 根本原因
移动浏览器对 iframe 有安全限制，iframe 内的应用无法可靠地接收键盘事件。即使使用 `allow="keyboard-input"` Permission Policy，终端应用（ttyd）使用的原始键盘事件也无法正确传递。

---

## 方案：xterm.js + WebSocket 终端

### 架构设计

```
┌─────────────────┐     WebSocket      ┌──────────────────┐     PTY      ┌──────────┐
│  xterm.js       │ ←───────────────→  │  WebSocket Proxy │ ←───────────→  │   bash   │
│  (前端组件)      │    xterm 协议       │  (Go/Node 服务)   │   stdio    │  终端    │
└─────────────────┘                    └──────────────────┘              └──────────┘
```

### 核心组件

#### 1. xterm.js 前端
- 终端模拟器，负责渲染和输入处理
- 原生支持移动端虚拟键盘
- 需添加依赖：`xterm`, `xterm-addon-fit`, `@xterm/addon-webgl`

#### 2. WebSocket 代理服务
- 创建一个轻量级 WebSocket 服务
- 前端连接获取终端会话
- 后端创建 PTY (pseudo-terminal) 运行 bash
- 通过 WebSocket 传输数据

### 依赖安装
```bash
npm install xterm@^5.3.0 xterm-addon-fit@^0.8.0 @xterm/addon-webgl@^0.18.0
```

### 文件修改

| 文件 | 操作 |
|------|------|
| `src/components/Terminal/index.tsx` | 重写，使用 xterm.js 替代 iframe |
| `cmd/websocket-terminal/main.go` | 新建，WebSocket 代理服务 |
| `Makefile` | 添加构建命令 |
| `services/` | 添加 systemd service 配置 |

### WebSocket 代理服务设计

#### 协议
- 监听端口：待定（如 7682）
- WebSocket 路径：`/ws`
- 连接参数：无可

#### 实现要点（Go）
```go
// 伪代码结构
type TerminalServer struct {
    clients map[*WebSocketClient]bool
}

func (s *TerminalServer) handleWebSocket(ws *WebSocket) {
    // 1. 创建 PTY
    pty, err := pty.Start(&syscall.SysProcAttr{
        CmdSlice: []string{"/bin/bash"},
    })

    // 2. 转发 pty → websocket
    go func() {
        buf := make([]byte, 1024)
        for {
            n, _ := pty.Read(buf)
            if n == 0 { break }
            ws.Write(buf[:n])
        }
    }()

    // 3. 转发 websocket → pty
    go func() {
        for {
            _, data, _ := ws.ReadMessage()
            pty.Write(data)
        }
    }()
}
```

#### 现有方案参考
- **gotty**：Go 实现的 WebSocket 终端，源码参考 https://github.com/sorenisanerd/gotty
- **ttyd**：已在本项目运行，可研究其 WebSocket 处理方式

### 前端组件改造

```tsx
// src/components/Terminal/index.tsx 伪代码

import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

export function Terminal() {
  const terminalRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // 初始化 xterm
    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'SF Mono, monospace',
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    terminal.open(domElement);
    fitAddon.fit();

    // 连接 WebSocket
    const ws = new WebSocket(`ws://${deviceIP}:7682/ws`);
    ws.onopen = () => {
      terminal.onData(data => ws.send(data));
    };
    ws.onmessage = (event) => {
      terminal.write(event.data);
    };

    return () => {
      ws.close();
      terminal.dispose();
    };
  }, []);

  // ...
}
```

### 移动端适配
xterm.js 原生支持移动端：
- 自动检测并处理虚拟键盘弹出
- 正确的输入焦点管理
- 触摸滚动和选择支持

---

## 实施步骤（未来）

1. **Phase 1: WebSocket 代理服务**
   - 创建 `cmd/websocket-terminal/`
   - 实现基础 PTY + WebSocket 转发
   - 测试 PTY 正常工作

2. **Phase 2: 前端集成**
   - 安装 xterm.js 依赖
   - 重写 Terminal 组件
   - 添加 WebSocket 连接逻辑

3. **Phase 3: 服务配置**
   - 添加 systemd service
   - 更新 Makefile 构建
   - 添加端口配置

4. **Phase 4: 移动端测试**
   - iOS Safari 测试
   - Android Chrome 测试
   - 优化触摸交互

---

## 备选方案

### 方案 B: 移动端新窗口打开
- 移动端点击「新窗口打开」使用 `window.open()`
- 独立标签页有完整键盘支持
- App 内保留 iframe 仅桌面端使用

**优点**：实现简单，立即可用
**缺点**：用户离开 App，体验不连贯

### 方案 C: 混合方案
- 移动端：window.open 新窗口
- 桌面端：iframe
- 通过 User-Agent 或窗口大小检测设备类型

---

## 参考资料

- [xterm.js 文档](https://xtermjs.org/)
- [gotty - WebSocket Terminal](https://github.com/sorenisanerd/gotty)
- [ttyd - Terminal in Browser](https://github.com/tsl0922/ttyd)
- [node-pty - PTY for Node.js](https://github.com/Microsoft/node-pty)

---

## 更新记录

- 2026-03-28: 创建文档，移动端终端输入方案设计
