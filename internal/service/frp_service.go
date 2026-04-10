package service

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"sync"

	"iclaw-admin-api/internal/model"
)

// FrpService FRP 服务
type FrpService struct {
	mu        sync.Mutex
	pid       int
	config    *model.FrpConnectRequest
}

var frpInstance *FrpService
var frpOnce sync.Once

// GetFrpService 获取 FRP 服务单例
func GetFrpService() *FrpService {
	frpOnce.Do(func() {
		frpInstance = &FrpService{}
	})
	return frpInstance
}

// GetStatus 获取 FRP 状态
func (s *FrpService) GetStatus(ctx context.Context) *model.FrpStatus {
	s.mu.Lock()
	defer s.mu.Unlock()

	status := &model.FrpStatus{}

	if s.pid > 0 && s.config != nil {
		// 检查进程是否还在运行
		cmd := exec.CommandContext(ctx, "ps", "-p", fmt.Sprintf("%d", s.pid))
		if err := cmd.Run(); err == nil {
			status.Connected = true
			status.Server = s.config.Server
			status.RemotePort = s.config.ServerPort
			status.LocalPort = s.config.LocalPort
			status.Token = s.config.Token
			status.Link = fmt.Sprintf("ssh://user@%s:%d", s.config.Server, s.config.ServerPort)
			status.Command = fmt.Sprintf("ssh user@%s -p %d", s.config.Server, s.config.ServerPort)
			return status
		}
	}

	// 进程不在运行
	s.pid = 0
	s.config = nil
	return status
}

// Connect 连接到 FRP 服务器
func (s *FrpService) Connect(ctx context.Context, req *model.FrpConnectRequest) (*model.FrpConnectResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 如果已连接，先断开
	if s.pid > 0 {
		s.stopProcess(ctx)
	}

	// 生成随机 token
	token := generateToken(12)

	// 构建 frpc 配置
	frpcConfig := fmt.Sprintf(`[common]
server_addr = %s
server_port = %d
token = %s

[ssh]
type = tcp
local_ip = 127.0.0.1
local_port = %d
remote_port = 0
`, req.Server, req.ServerPort, token, req.LocalPort)

	// 写入临时配置文件
	configFile := "/tmp/frpc.ini"
	if err := os.WriteFile(configFile, []byte(frpcConfig), 0644); err != nil {
		return &model.FrpConnectResponse{
			Success: false,
			Error:   fmt.Sprintf("failed to write config: %v", err),
		}, err
	}

	// 启动 frpc
	cmd := exec.CommandContext(ctx, "frpc", "-c", configFile)
	if err := cmd.Start(); err != nil {
		return &model.FrpConnectResponse{
			Success: false,
			Error:   fmt.Sprintf("failed to start frpc: %v", err),
		}, err
	}

	s.pid = cmd.Process.Pid
	s.config = &model.FrpConnectRequest{
		Server:     req.Server,
		ServerPort: req.ServerPort,
		Token:      token,
		LocalPort:  req.LocalPort,
	}

	// 获取分配的远程端口（从 frpc 输出或配置中获取）
	remotePort := s.config.ServerPort // 实际端口需要从 frpc 输出解析

	return &model.FrpConnectResponse{
		Success:    true,
		Server:     req.Server,
		RemotePort: remotePort,
		LocalPort:  req.LocalPort,
		Token:      token,
		Link:       fmt.Sprintf("ssh://user@%s:%d", req.Server, remotePort),
		Command:    fmt.Sprintf("ssh user@%s -p %d", req.Server, remotePort),
	}, nil
}

// Disconnect 断开 FRP 连接
func (s *FrpService) Disconnect(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.stopProcess(ctx)
	s.pid = 0
	s.config = nil

	return nil
}

func (s *FrpService) stopProcess(ctx context.Context) {
	if s.pid > 0 {
		cmd := exec.CommandContext(ctx, "kill", fmt.Sprintf("%d", s.pid))
		cmd.Run()
		// 也尝试用 pkill
		exec.CommandContext(ctx, "pkill", "-f", "frpc").Run()
	}
}

func generateToken(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[i%len(charset)]
	}
	return string(b)
}
