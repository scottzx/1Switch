package service

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"sync"

	"iclaw-admin-api/internal/model"
)

// FrpService FRP 服务
type FrpService struct {
	mu        sync.Mutex
	allocatedPorts map[int]bool // 记录已分配的端口
}

// 连接状态文件路径
const frpStatusFile = "/var/lib/iclaw/frp_status.json"

var frpInstance *FrpService
var frpOnce sync.Once

// GetFrpService 获取 FRP 服务单例
func GetFrpService() *FrpService {
	frpOnce.Do(func() {
		frpInstance = &FrpService{
			allocatedPorts: make(map[int]bool),
		}
	})
	return frpInstance
}

// saveStatus 保存连接状态到文件
func (s *FrpService) saveStatus(info *model.FrpStatus) error {
	// 确保目录存在
	os.MkdirAll("/var/lib/iclaw", 0755)
	data, err := json.Marshal(info)
	if err != nil {
		return err
	}
	return os.WriteFile(frpStatusFile, data, 0644)
}

// loadStatus 从文件加载连接状态
func (s *FrpService) loadStatus() *model.FrpStatus {
	data, err := os.ReadFile(frpStatusFile)
	if err != nil {
		return nil
	}
	var status model.FrpStatus
	if err := json.Unmarshal(data, &status); err != nil {
		return nil
	}
	return &status
}

// clearStatus 清除连接状态
func (s *FrpService) clearStatus() {
	os.Remove(frpStatusFile)
}

// GetSerial 获取设备序列号
func (s *FrpService) GetSerial(ctx context.Context) string {
	data, err := os.ReadFile("/var/lib/iclaw/serial")
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(data))
}

// allocatePort 分配一个可用端口 (从 20000 开始)
func (s *FrpService) allocatePort() int {
	basePort := 20000
	maxPort := 29999
	for port := basePort; port <= maxPort; port++ {
		if !s.allocatedPorts[port] {
			s.allocatedPorts[port] = true
			return port
		}
	}
	return 0 // 无可用端口
}

// releasePort 释放端口
func (s *FrpService) releasePort(port int) {
	delete(s.allocatedPorts, port)
}

// CheckInstalled 检查 frpc 是否已安装
func (s *FrpService) CheckInstalled(ctx context.Context) bool {
	cmd := exec.CommandContext(ctx, "which", "frpc")
	if err := cmd.Run(); err != nil {
		return false
	}
	return true
}

// Install 安装 frpc
func (s *FrpService) Install(ctx context.Context) *model.FrpInstallResult {
	// 使用打包在二进制目录的 frpc 安装包
	execPath, err := os.Executable()
	if err != nil {
		return &model.FrpInstallResult{Success: false, Error: fmt.Sprintf("failed to get exec path: %v", err)}
	}
	execDir := filepath.Dir(execPath)
	tarPath := filepath.Join(execDir, "internal", "frp_0.61.1_linux_arm64.tar.gz")

	// 如果打包的包不存在，尝试从 /tmp 获取
	if _, err := os.Stat(tarPath); os.IsNotExist(err) {
		tarPath = "/tmp/frp_0.61.1_linux_arm64.tar.gz"
	}

	// 检查安装包是否存在
	if _, err := os.Stat(tarPath); os.IsNotExist(err) {
		return &model.FrpInstallResult{Success: false, Error: fmt.Sprintf("frpc package not found at: %s", tarPath)}
	}

	// 解压 frpc (去掉顶层目录)
	cmd := exec.CommandContext(ctx, "tar", "xzf", tarPath, "-C", "/usr/local/bin", "--strip-components=1")
	if err := cmd.Run(); err != nil {
		return &model.FrpInstallResult{Success: false, Error: fmt.Sprintf("failed to extract frpc: %v", err)}
	}

	// 设置执行权限
	exec.CommandContext(ctx, "chmod", "+x", "/usr/local/bin/frpc").Run()

	return &model.FrpInstallResult{Success: true, Message: "frpc installed successfully"}
}

// GetStatus 获取 FRP 状态
func (s *FrpService) GetStatus(ctx context.Context) *model.FrpStatus {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 先检查 frpc 进程是否在运行 (使用 "frpc " 带空格避免匹配 pgrep 自身)
	cmd := exec.CommandContext(ctx, "pgrep", "-f", "frpc ")
	running := cmd.Run() == nil

	// 如果进程在运行，返回保存的状态信息
	if running {
		if saved := s.loadStatus(); saved != nil {
			saved.Installed = s.CheckInstalled(ctx)
			saved.Connected = true
			return saved
		}
	}

	// 否则返回基础状态
	return &model.FrpStatus{
		Installed: s.CheckInstalled(ctx),
		Connected: running,
	}
}

// Connect 连接到 FRP 服务器 (代理到远程 frps)
func (s *FrpService) Connect(ctx context.Context, req *model.FrpConnectRequest) (*model.FrpConnectResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 调用远程 frps 服务器的 API
	frpsURL := "http://49.235.24.95:1420/api/frp/connect"

	// 构建请求体
	jsonData := fmt.Sprintf(`{"serial":"%s","local_port":%d}`, req.Serial, req.LocalPort)

	// 发送 HTTP 请求
	cmd := exec.CommandContext(ctx, "curl", "-s", "-X", "POST", frpsURL,
		"-H", "Content-Type: application/json",
		"-d", jsonData)

	output, err := cmd.Output()
	if err != nil {
		return &model.FrpConnectResponse{
			Success: false,
			Error:   fmt.Sprintf("failed to call frps: %v", err),
		}, err
	}

	// 解析响应 JSON
	var response struct {
		Success    bool   `json:"success"`
		Server     string `json:"server"`
		Port       int    `json:"port"`
		Token      string `json:"token"`
		Link       string `json:"link"`
		Command    string `json:"command"`
		Message    string `json:"message"`
		Error      string `json:"error"`
	}

	if err := json.Unmarshal(output, &response); err != nil {
		return &model.FrpConnectResponse{
			Success: false,
			Error:   fmt.Sprintf("failed to parse response: %v", err),
		}, err
	}

	if !response.Success {
		return &model.FrpConnectResponse{
			Success: false,
			Error:   response.Error,
		}, fmt.Errorf(response.Error)
	}

	// 使用远程 API 返回的 server 地址启动本地 frpc
	frpcConfig := fmt.Sprintf(`[common]
server_addr = %s
server_port = 7000
token = %s

[ssh]
type = tcp
local_ip = 127.0.0.1
local_port = %d
remote_port = %d
`, response.Server, response.Token, req.LocalPort, response.Port)

	// 写入临时配置文件
	configFile := "/tmp/frpc.ini"
	if err := os.WriteFile(configFile, []byte(frpcConfig), 0644); err != nil {
		return &model.FrpConnectResponse{
			Success: false,
			Error:   fmt.Sprintf("failed to write config: %v", err),
		}, err
	}

	// 启动本地 frpc (使用新的进程组，避免被父进程影响)
	cmd = exec.CommandContext(ctx, "frpc", "-c", configFile)
	cmd.SysProcAttr = &syscall.SysProcAttr{
		Setpgid: true,
	}
	if err := cmd.Start(); err != nil {
		return &model.FrpConnectResponse{
			Success: false,
			Error:   fmt.Sprintf("failed to start frpc: %v", err),
		}, err
	}
	// 立即分离子进程，不等待其结束
	go cmd.Wait()

	// 保存连接状态
	status := &model.FrpStatus{
		Installed:  true,
		Connected:  true,
		Server:     response.Server,
		RemotePort: response.Port,
		LocalPort:  req.LocalPort,
		Token:      response.Token,
		Link:       response.Link,
		Command:    response.Command,
	}
	s.saveStatus(status)

	return &model.FrpConnectResponse{
		Success:    true,
		Server:     response.Server,
		RemotePort: response.Port,
		LocalPort:  req.LocalPort,
		Token:      response.Token,
		Link:       response.Link,
		Command:    response.Command,
	}, nil
}

// Disconnect 断开 FRP 连接
func (s *FrpService) Disconnect(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 停止 frpc 进程
	exec.CommandContext(ctx, "pkill", "-f", "frpc").Run()

	// 清除保存的状态
	s.clearStatus()

	return nil
}

func generateToken(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[i%len(charset)]
	}
	return string(b)
}
