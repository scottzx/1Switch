package service

import (
	"fmt"
	"os/exec"
	"strconv"
	"strings"
)

const DefaultTerminalPort = 7681

// SessionInfo 终端会话信息
type SessionInfo struct {
	Name   string `json:"name"`
	Port   int    `json:"port"`
	Status string `json:"status"` // "running" / "stopped"
}

// GetDefaultPort 获取默认端口
func GetDefaultPort() int {
	return DefaultTerminalPort
}

// ListSessions 列出所有终端会话
func ListSessions() ([]SessionInfo, error) {
	var sessions []SessionInfo

	// 收集所有 tmux 会话
	tmuxSessions := make(map[string]bool)
	out, err := exec.Command("tmux", "list-sessions", "-F", "#{session_name}").Output()
	if err == nil {
		for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
			if line != "" {
				tmuxSessions[line] = true
			}
		}
	}

	// 默认会话 (7681) - 总是显示
	defaultSession := SessionInfo{
		Name:   "default",
		Port:   DefaultTerminalPort,
		Status: "stopped",
	}
	if CheckPortInUse(DefaultTerminalPort) {
		defaultSession.Status = "running"
	}
	sessions = append(sessions, defaultSession)

	// 检查 7682+ 端口
	for port := DefaultTerminalPort + 1; port <= DefaultTerminalPort+10; port++ {
		if CheckPortInUse(uint16(port)) {
			sessionName := fmt.Sprintf("ttyd-%d", port)
			if _, exists := tmuxSessions[sessionName]; exists {
				sessions = append(sessions, SessionInfo{
					Name:   sessionName,
					Port:   port,
					Status: "running",
				})
			}
		}
	}

	return sessions, nil
}

// CreateSession 创建新的终端会话
func CreateSession(name string) (int, error) {
	// 找到可用端口
	port := DefaultTerminalPort + 1
	for port <= DefaultTerminalPort+10 {
		if !CheckPortInUse(uint16(port)) {
			break
		}
		port++
	}

	if port > DefaultTerminalPort+10 {
		return 0, fmt.Errorf("无可用端口")
	}

	// 启动 ttyd 实例 (通过 systemd template)
	cmd := exec.Command("systemctl", "start", fmt.Sprintf("ttyd@%d", port))
	if err := cmd.Run(); err != nil {
		// 如果 systemd 启动失败，尝试直接启动
		directCmd := exec.Command("/usr/local/bin/ttyd", "-p", strconv.Itoa(port), "tmux", "new", "-A", "-s", fmt.Sprintf("ttyd-%d", port))
		if err := directCmd.Start(); err != nil {
			return 0, fmt.Errorf("创建会话失败: %v", err)
		}
	}

	return port, nil
}

// DeleteSession 删除终端会话
func DeleteSession(name string) error {
	var port int

	// 解析会话名获取端口
	if strings.HasPrefix(name, "ttyd-") {
		portStr := strings.TrimPrefix(name, "ttyd-")
		port, _ = strconv.Atoi(portStr)
	}

	// 保护默认端口
	if port == DefaultTerminalPort || name == "default" {
		return fmt.Errorf("默认会话不可删除")
	}

	if port == 0 {
		return fmt.Errorf("无效的会话名称")
	}

	// 停止 ttyd 实例
	cmd := exec.Command("systemctl", "stop", fmt.Sprintf("ttyd@%d", port))
	cmd.Run() // 忽略错误，尝试其他方式

	// 直接 kill ttyd 进程
	pids := GetPidsOnPort(uint16(port))
	for _, pid := range pids {
		KillProcess(pid, true)
	}

	// 杀掉 tmux 会话
	exec.Command("tmux", "kill-session", "-t", name).Run()

	return nil
}

// GetSessionByPort 根据端口获取会话信息
func GetSessionByPort(port int) (*SessionInfo, error) {
	sessions, err := ListSessions()
	if err != nil {
		return nil, err
	}

	for _, s := range sessions {
		if s.Port == port {
			return &s, nil
		}
	}

	return nil, fmt.Errorf("会话不存在")
}
