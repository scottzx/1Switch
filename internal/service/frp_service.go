package service

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sync"

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
	if tarPath == "" || _, err := os.Stat(tarPath); os.IsNotExist(err) {
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

func generateToken(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[i%len(charset)]
	}
	return string(b)
}
