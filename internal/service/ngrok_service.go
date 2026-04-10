package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os/exec"
	"regexp"
	"strings"
	"sync"
	"time"

	"iclaw-admin-api/internal/model"
)

// NgrokService ngrok 服务
type NgrokService struct {
	mu        sync.Mutex
	pid       int
	publicURL string
}

var ngrokInstance *NgrokService
var ngrokOnce sync.Once

// GetNgrokService 获取 ngrok 服务单例
func GetNgrokService() *NgrokService {
	ngrokOnce.Do(func() {
		ngrokInstance = &NgrokService{}
	})
	return ngrokInstance
}

// CheckNgrokInstalled 检查 ngrok 是否已安装
func (s *NgrokService) CheckNgrokInstalled(ctx context.Context) bool {
	cmd := exec.CommandContext(ctx, "which", "ngrok")
	if err := cmd.Run(); err != nil {
		return false
	}
	return true
}

// GetStatus 获取 ngrok 状态
func (s *NgrokService) GetStatus(ctx context.Context) *model.NgrokStatus {
	status := &model.NgrokStatus{
		Installed: s.CheckNgrokInstalled(ctx),
	}

	if !status.Installed {
		return status
	}

	// 检查 ngrok 进程是否在运行
	ngrokExists, pid := s.isNgrokRunning(ctx)
	if !ngrokExists {
		return status
	}

	status.Running = true
	status.PID = pid

	// 获取 public URL
	url, err := s.getPublicURL(ctx)
	if err == nil && url != "" {
		status.PublicURL = url
	}

	return status
}

// Start 启动 ngrok 隧道
func (s *NgrokService) Start(ctx context.Context) (*model.NgrokStatus, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 检查是否已运行
	if running, _ := s.isNgrokRunning(ctx); running {
		return s.GetStatus(ctx), nil
	}

	// 检查是否安装
	if !s.CheckNgrokInstalled(ctx) {
		return &model.NgrokStatus{
			Installed: false,
			Error:    "ngrok not installed",
		}, fmt.Errorf("ngrok not installed")
	}

	// 启动 ngrok tcp 22
	cmd := exec.CommandContext(ctx, "ngrok", "tcp", "22", "--log", "stdout")
	cmd.Stdout = nil
	cmd.Stderr = nil

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("failed to start ngrok: %w", err)
	}

	// 等待 ngrok 启动并获取 URL
	time.Sleep(3 * time.Second)

	// 检查进程是否仍在运行
	if running, _ := s.isNgrokRunning(ctx); !running {
		return nil, fmt.Errorf("ngrok process terminated")
	}

	// 获取 PID
	ngrokExists, pid := s.isNgrokRunning(ctx)
	if ngrokExists {
		s.pid = pid
	}

	// 获取 public URL
	url, err := s.getPublicURL(ctx)
	if err == nil && url != "" {
		s.publicURL = url
	}

	return s.GetStatus(ctx), nil
}

// Stop 停止 ngrok 隧道
func (s *NgrokService) Stop(ctx context.Context) (*model.NgrokStatus, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if running, _ := s.isNgrokRunning(ctx); !running {
		s.pid = 0
		s.publicURL = ""
		return &model.NgrokStatus{
			Installed: s.CheckNgrokInstalled(ctx),
			Running:   false,
		}, nil
	}

	// 使用 kill 命令停止进程
	pid := s.pid
	if pid > 0 {
		cmd := exec.CommandContext(ctx, "kill", fmt.Sprintf("%d", pid))
		if err := cmd.Run(); err != nil {
			// 尝试使用 pkill
			cmd = exec.CommandContext(ctx, "pkill", "-f", "ngrok tcp 22")
			cmd.Run()
		}
	}

	// 等待进程结束
	time.Sleep(1 * time.Second)

	s.pid = 0
	s.publicURL = ""

	return &model.NgrokStatus{
		Installed: s.CheckNgrokInstalled(ctx),
		Running:   false,
	}, nil
}

// Install 安装 ngrok (linux amd64)
func (s *NgrokService) Install(ctx context.Context) (*model.NgrokInstallResult, error) {
	// 下载 ngrok
	cmd := exec.CommandContext(ctx, "curl", "-s", "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz")
	cmd2 := exec.CommandContext(ctx, "tar", "xzf", "-", "-C", "/usr/local/bin")

	cmdOut, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to get stdout pipe: %w", err)
	}
	cmd2.Stdin = cmdOut

	// 执行下载和解压
	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("failed to download ngrok: %w", err)
	}
	if err := cmd2.Start(); err != nil {
		return nil, fmt.Errorf("failed to extract ngrok: %w", err)
	}

	// 等待完成
	if err := cmd.Wait(); err != nil {
		return nil, fmt.Errorf("download failed: %w", err)
	}
	if err := cmd2.Wait(); err != nil {
		return nil, fmt.Errorf("extract failed: %w", err)
	}

	// 设置执行权限
	exec.CommandContext(ctx, "chmod", "+x", "/usr/local/bin/ngrok").Run()

	return &model.NgrokInstallResult{
		Success: true,
		Message: "ngrok installed successfully",
	}, nil
}

// isNgrokRunning 检查 ngrok 进程是否在运行
func (s *NgrokService) isNgrokRunning(ctx context.Context) (bool, int) {
	cmd := exec.CommandContext(ctx, "pgrep", "-f", "ngrok.*tcp")
	output, err := cmd.Output()
	if err != nil {
		// 尝试 pgrep
		cmd = exec.CommandContext(ctx, "bash", "-c", "ps aux | grep 'ngrok tcp' | grep -v grep")
		output, err = cmd.Output()
		if err != nil {
			return false, 0
		}
	}

	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	for _, line := range lines {
		fields := strings.Fields(line)
		if len(fields) > 1 {
			var pid int
			if _, err := fmt.Sscanf(fields[1], "%d", &pid); err == nil && pid > 0 {
				// 检查是否是 ngrok tcp 22
				if strings.Contains(line, "ngrok") && strings.Contains(line, "tcp") {
					return true, pid
				}
			}
		}
	}

	// 如果 s.pid > 0，检查该 PID 是否仍存在
	if s.pid > 0 {
		cmd = exec.CommandContext(ctx, "ps", "-p", fmt.Sprintf("%d", s.pid))
		if err := cmd.Run(); err == nil {
			return true, s.pid
		}
	}

	return false, 0
}

// getPublicURL 从 ngrok API 获取公网地址
func (s *NgrokService) getPublicURL(ctx context.Context) (string, error) {
	// ngrok API 地址
	apiURL := "http://127.0.0.1:4040/api/status"

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(apiURL)
	if err != nil {
		// 尝试从进程输出获取 URL
		return s.getURLFromPs(ctx)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return s.getURLFromPs(ctx)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return s.getURLFromPs(ctx)
	}

	// 解析 JSON 响应
	var result struct {
		Tunnels []struct {
			URL string `json:"public_url"`
		} `json:"tunnels"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return s.getURLFromPs(ctx)
	}

	for _, tunnel := range result.Tunnels {
		if strings.HasPrefix(tunnel.URL, "tcp://") {
			return tunnel.URL, nil
		}
	}

	return s.getURLFromPs(ctx)
}

// getURLFromPs 从 ps 输出中尝试获取 ngrok URL
func (s *NgrokService) getURLFromPs(ctx context.Context) (string, error) {
	if s.publicURL != "" {
		return s.publicURL, nil
	}

	cmd := exec.CommandContext(ctx, "bash", "-c", "ps aux | grep ngrok | grep -v grep")
	output, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("ngrok not found in process list")
	}

	// 尝试从输出中提取 URL
	re := regexp.MustCompile(`tcp://[\w\-\.]+:\d+`)
	matches := re.FindString(string(output))
	if matches != "" {
		s.publicURL = matches
		return matches, nil
	}

	return "", fmt.Errorf("URL not found")
}
