package service

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"iclaw-admin-api/internal/model"
)

// FrpService FRP 服务
type FrpService struct {
	mu        sync.Mutex
	pid       int
	config    *model.FrpConnectRequest
	allocatedPorts map[int]bool // 记录已分配的端口
}

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
	// 查找 frpc 安装包的路径（按优先级）
	// 1. OTA 部署路径：/opt/iclaw/iclaw-manager/（dist.zip 解压后放置）
	// 2. 开发/旧版路径：$(dirname $exe)/internal/
	// 3. /tmp 路径（兜底）
	var tarPath string
	otaPath := "/opt/iclaw/iclaw-manager/frp_0.61.1_linux_arm64.tar.gz"

	execPath, err := os.Executable()
	if err == nil {
		execDir := filepath.Dir(execPath)
		devPath := filepath.Join(execDir, "internal", "frp_0.61.1_linux_arm64.tar.gz")

		// 按优先级尝试
		for _, p := range []string{otaPath, devPath, "/tmp/frp_0.61.1_linux_arm64.tar.gz"} {
			if _, err := os.Stat(p); err == nil {
				tarPath = p
				break
			}
		}
	} else {
		// 无法获取 exe 路径时，直接尝试 OTA 路径和 /tmp
		for _, p := range []string{otaPath, "/tmp/frp_0.61.1_linux_arm64.tar.gz"} {
			if _, err := os.Stat(p); err == nil {
				tarPath = p
				break
			}
		}
	}

	// 检查安装包是否存在
	if tarPath == "" {
		return &model.FrpInstallResult{Success: false, Error: fmt.Sprintf("frpc package not found")}
	}
	if _, err := os.Stat(tarPath); os.IsNotExist(err) {
		return &model.FrpInstallResult{Success: false, Error: fmt.Sprintf("frpc package not found")}
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

	status := &model.FrpStatus{
		Installed: s.CheckInstalled(ctx),
	}

	// 检查 frpc 是否在运行
	cmd := exec.CommandContext(ctx, "pgrep", "-f", "frpc")
	if err := cmd.Run(); err == nil {
		status.Connected = true
	}

	return status
}

// AllocatePort 分配 FRP 端口（只分配，不建立连接）
func (s *FrpService) AllocatePort(ctx context.Context, serial string) (*model.FrpConnectResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 调用远程 frps 服务器的 API
	frpsURL := "http://49.235.24.95:1420/api/frp/connect"

	// 构建请求体
	jsonData := fmt.Sprintf(`{"serial":"%s","local_port":22}`, serial)

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

	return &model.FrpConnectResponse{
		Success:    true,
		Server:     response.Server,
		RemotePort: response.Port,
		LocalPort:  22,
		Token:      response.Token,
		ProxyName:  serial,
		Link:       response.Link,
		Command:    response.Command,
	}, nil
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

	return &model.FrpConnectResponse{
		Success:    true,
		Server:     response.Server,
		RemotePort: response.Port,
		LocalPort:  req.LocalPort,
		Token:      response.Token,
		ProxyName:  req.Serial,
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

	return nil
}

// DeployConfig 创建 frpc.ini 配置文件并启动 frpc
func (s *FrpService) DeployConfig(ctx context.Context, serial string, localPort int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 调用 Connect API 获取配置
	frpsURL := "http://49.235.24.95:1420/api/frp/connect"
	jsonData := fmt.Sprintf(`{"serial":"%s","local_port":%d}`, serial, localPort)

	cmd := exec.CommandContext(ctx, "curl", "-s", "-X", "POST", frpsURL,
		"-H", "Content-Type: application/json",
		"-d", jsonData)

	output, err := cmd.Output()
	if err != nil {
		return fmt.Errorf("调用frps API失败: %v", err)
	}

	var response struct {
		Success bool   `json:"success"`
		Server  string `json:"server"`
		Port    int    `json:"port"`
		Token   string `json:"token"`
		Link    string `json:"link"`
		Command string `json:"command"`
		Error   string `json:"error"`
	}

	if err := json.Unmarshal(output, &response); err != nil {
		return fmt.Errorf("解析响应失败: %v", err)
	}

	if !response.Success {
		return fmt.Errorf("frps返回错误: %s", response.Error)
	}

	// 生成 frpc.ini 配置
	configContent := fmt.Sprintf(`[common]
server_addr = %s
server_port = 7000
token = %s

[ssh]
type = tcp
local_ip = 127.0.0.1
local_port = %d
remote_port = %d
`, response.Server, response.Token, localPort, response.Port)

	// 创建配置目录
	if _, err := s.runCommand(ctx, "mkdir -p /var/lib/iclaw"); err != nil {
		return fmt.Errorf("创建配置目录失败: %v", err)
	}

	// 写入配置文件
	configCmd := exec.CommandContext(ctx, "tee", "/var/lib/iclaw/frpc.ini")
	configCmd.Stdin = strings.NewReader(configContent)
	if err := configCmd.Run(); err != nil {
		return fmt.Errorf("写入配置文件失败: %v", err)
	}

	// 停止旧进程
	s.runCommand(ctx, "pkill -f 'frpc -c' 2>/dev/null || true")

	// 启动 frpc
	frpcCmd := exec.CommandContext(ctx, "nohup", "frpc", "-c", "/var/lib/iclaw/frpc.ini")
	frpcCmd.Stdout, _ = os.Stdout, os.Stdout
	frpcCmd.Stderr, _ = os.Stderr, os.Stderr
	if err := frpcCmd.Start(); err != nil {
		return fmt.Errorf("启动frpc失败: %v", err)
	}

	return nil
}

// GetDeviceSerial 获取设备序列号
func (s *FrpService) GetDeviceSerial(ctx context.Context) string {
	// 读取 /var/lib/iclaw/serial
	output, err := exec.CommandContext(ctx, "cat", "/var/lib/iclaw/serial").Output()
	if err == nil {
		serial := strings.TrimSpace(string(output))
		if serial != "" {
			return serial
		}
	}

	// 备用方案：读取 DMI 信息
	for _, path := range []string{
		"/sys/class/dmi/id/product_uuid",
		"/sys/firmware/devicetree/base/serial-number",
	} {
		output, err := exec.CommandContext(ctx, "cat", path).Output()
		if err == nil {
			serial := strings.TrimSpace(string(output))
			if serial != "" {
				return serial
			}
		}
	}

	return ""
}

// runCommand 执行 shell 命令
func (s *FrpService) runCommand(ctx context.Context, cmd string) (string, error) {
	execCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	parts := []string{"-c", cmd}
	cmdExec := exec.CommandContext(execCtx, "/bin/sh", parts...)
	output, err := cmdExec.CombinedOutput()
	if err != nil {
		return "", err
	}
	return string(output), nil
}

func generateToken(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[i%len(charset)]
	}
	return string(b)
}
