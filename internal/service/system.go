package service

import (
	"fmt"
	"net"
	"os"
	"runtime"
	"strings"
	"sync"
	"time"

	"iclaw-admin-api/internal/model"
)

var (
	cachedSystemInfo    *model.SystemInfo
	systemInfoCacheOnce sync.Once
)

// GetDeviceIP 获取设备 IP 地址
func GetDeviceIP() (string, error) {
	// 获取本机 IP 地址
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "", err
	}

	for _, addr := range addrs {
		// 检查是否是 IP 地址（排除 loopback）
		if ipNet, ok := addr.(*net.IPNet); ok && !ipNet.IP.IsLoopback() {
			if ipNet.IP.To4() != nil {
				return ipNet.IP.String(), nil
			}
		}
	}

	// 如果没找到，尝试通过连接获取
	conn, err := net.Dial("udp", "8.8.8.8:80")
	if err != nil {
		return "", err
	}
	defer conn.Close()

	localAddr := conn.LocalAddr().(*net.UDPAddr)
	return localAddr.IP.String(), nil
}

// InitSystemInfoCache 初始化系统信息缓存（服务启动时调用一次）
func InitSystemInfoCache() {
	systemInfoCacheOnce.Do(func() {
		cachedSystemInfo, _ = getSystemInfoImpl()
	})
}

// GetSystemInfo 获取系统信息（优先返回缓存）
func GetSystemInfo() (*model.SystemInfo, error) {
	if cachedSystemInfo != nil {
		return cachedSystemInfo, nil
	}
	InitSystemInfoCache()
	if cachedSystemInfo != nil {
		return cachedSystemInfo, nil
	}
	return getSystemInfoImpl()
}

// getSystemInfoImpl 实际获取系统信息的逻辑
func getSystemInfoImpl() (*model.SystemInfo, error) {
	configDir := GetConfigDir()

	info := &model.SystemInfo{
		OS:               runtime.GOOS,
		Arch:             runtime.GOARCH,
		ConfigDir:        configDir,
		OpenClawInstalled: IsOpenClawInstalled(),
	}

	// OS Version
	if runtime.GOOS == "darwin" {
		if out, err := ExecuteCommand("sw_vers", "-productVersion"); err == nil {
			info.OSVersion = strings.TrimSpace(out)
		}
	} else if runtime.GOOS == "linux" {
		if out, err := ExecuteCommand("cat", "/etc/os-release"); err == nil {
			lines := strings.Split(out, "\n")
			for _, line := range lines {
				if strings.HasPrefix(line, "VERSION=") {
					info.OSVersion = strings.Trim(strings.TrimSpace(line[len("VERSION="):]), "\"")
					break
				}
			}
			if info.OSVersion == "" {
				for _, line := range lines {
					if strings.HasPrefix(line, "PRETTY_NAME=") {
						info.OSVersion = strings.Trim(strings.TrimSpace(line[len("PRETTY_NAME="):]), "\"")
						break
					}
				}
			}
		}
	} else if runtime.GOOS == "windows" {
		if out, err := ExecuteCommand("cmd", "/c", "ver"); err == nil {
			info.OSVersion = strings.TrimSpace(out)
		}
	}

	// OpenClaw version
	if info.OpenClawInstalled {
		if version, err := GetOpenClawVersion(); err == nil {
			info.OpenClawVersion = &version
		}
	}

	// Node version
	if version, err := GetNodeVersion(); err == nil {
		info.NodeVersion = &version
	}

	return info, nil
}

// GetServiceStatus 获取服务状态
func GetServiceStatus() (*model.ServiceStatus, error) {
	pids := GetPidsOnPort(ServicePort)
	running := len(pids) > 0

	status := &model.ServiceStatus{
		Running: running,
		Port:    ServicePort,
	}

	if running && len(pids) > 0 {
		pid := pids[0]
		status.Pid = &pid

		// 获取进程启动后的运行时间（秒）
		if uptime, err := getProcessUptime(int(pid)); err == nil {
			status.UptimeSeconds = &uptime
		}

		// 获取内存使用（MB）
		if memMB, err := getProcessMemoryMB(int(pid)); err == nil {
			memMBFloat := float64(memMB)
			status.MemoryMb = &memMBFloat
		}
	}

	return status, nil
}

// getProcessUptime 获取进程运行时间（秒）
func getProcessUptime(pid int) (uint64, error) {
	var uptime uint64

	if runtime.GOOS == "darwin" || runtime.GOOS == "linux" {
		// 使用 ps 获取 elapsed time，格式为 [[dd-]hh:]mm:ss
		out, err := ExecuteCommand("ps", "-o", "etime=", "-p", fmt.Sprintf("%d", pid))
		if err != nil {
			return 0, err
		}
		etime := strings.TrimSpace(out)

		// 解析时间
		uptime = parseElapsedTime(etime)
	} else if runtime.GOOS == "windows" {
		// Windows 上使用 tasklist
		_, err := ExecuteCommand("tasklist", "/FI", fmt.Sprintf("PID eq %d", pid), "/FO", "CSV", "/NH")
		if err != nil {
			return 0, err
		}
		// Windows 解析较复杂，这里返回 0
		uptime = 0
	}

	return uptime, nil
}

// parseElapsedTime 解析 ps etime 输出 (格式: [[dd-]hh:]mm:ss)
func parseElapsedTime(etime string) uint64 {
	parts := strings.Split(etime, ":")
	if len(parts) < 2 {
		return 0
	}

	var seconds uint64
	var minutes uint64
	var hours uint64
	var days uint64

	if len(parts) == 4 {
		// dd-hh:mm:ss
		fmt.Sscanf(parts[0], "%d", &days)
		fmt.Sscanf(parts[1], "%d", &hours)
		fmt.Sscanf(parts[2], "%d", &minutes)
		fmt.Sscanf(parts[3], "%d", &seconds)
	} else if len(parts) == 3 {
		// hh:mm:ss
		fmt.Sscanf(parts[0], "%d", &hours)
		fmt.Sscanf(parts[1], "%d", &minutes)
		fmt.Sscanf(parts[2], "%d", &seconds)
	} else if len(parts) == 2 {
		// mm:ss
		fmt.Sscanf(parts[0], "%d", &minutes)
		fmt.Sscanf(parts[1], "%d", &seconds)
	}

	return days*86400 + hours*3600 + minutes*60 + seconds
}

// getProcessMemoryMB 获取进程内存使用（MB）
func getProcessMemoryMB(pid int) (uint64, error) {
	if runtime.GOOS == "darwin" || runtime.GOOS == "linux" {
		out, err := ExecuteCommand("ps", "-o", "rss=", "-p", fmt.Sprintf("%d", pid))
		if err != nil {
			return 0, err
		}
		var rss uint64
		fmt.Sscanf(strings.TrimSpace(out), "%d", &rss)
		return rss / 1024, nil // Convert KB to MB
	} else if runtime.GOOS == "windows" {
		out, err := ExecuteCommand("tasklist", "/FI", fmt.Sprintf("PID eq %d", pid), "/FO", "CSV", "/NH")
		if err != nil {
			return 0, err
		}
		// Windows 格式: "imagename","pid","sessionname","sessionnum","memusage"
		parts := strings.Split(strings.TrimSpace(out), ",")
		if len(parts) >= 5 {
			var mem uint64
			fmt.Sscanf(strings.Trim(parts[4], " \""), "%d", &mem)
			return mem / 1024, nil // Convert KB to MB
		}
	}
	return 0, nil
}

// StartService 启动服务
func StartService() (string, error) {
	// 检查是否已经运行
	status, err := GetServiceStatus()
	if err != nil {
		return "", err
	}
	if status.Running {
		return "", fmt.Errorf("服务已在运行中")
	}

	// 检查 openclaw 命令是否存在
	if !IsOpenClawInstalled() {
		return "", fmt.Errorf("找不到 openclaw 命令，请先通过 npm install -g openclaw 安装")
	}

	// 后台启动 gateway
	configDir := GetConfigDir()
	logDir := configDir + "/logs"
	os.MkdirAll(logDir, 0755)

	var cmd string
	if isWindows {
		cmd = fmt.Sprintf(`start /b cmd /c "openclaw gateway > %s\gateway.log 2> %s\gateway.err.log"`, logDir, logDir)
	} else {
		cmd = fmt.Sprintf(`nohup openclaw gateway > %s/gateway.log 2> %s/gateway.err.log &`, logDir, logDir)
	}

	if _, err := ExecuteCommand(cmd); err != nil {
		return "", fmt.Errorf("启动服务失败: %v", err)
	}

	// 等待端口开始监听
	for i := 1; i <= 30; i++ {
		time.Sleep(time.Second)
		if CheckPortInUse(ServicePort) {
			pids := GetPidsOnPort(ServicePort)
			if len(pids) > 0 {
				return fmt.Sprintf("服务已启动，PID: %d", pids[0]), nil
			}
			return "服务已启动", nil
		}
	}

	return "", fmt.Errorf("服务启动超时（30秒），请检查 openclaw 日志")
}

// StopService 停止服务
func StopService() (string, error) {
	pids := GetPidsOnPort(ServicePort)
	if len(pids) == 0 {
		return "服务未在运行", nil
	}

	// 优雅终止
	for _, pid := range pids {
		KillProcess(pid, false)
	}
	time.Sleep(2 * time.Second)

	// 检查是否已停止
	remaining := GetPidsOnPort(ServicePort)
	if len(remaining) == 0 {
		return "服务已停止", nil
	}

	// 强制终止
	for _, pid := range remaining {
		KillProcess(pid, true)
	}
	time.Sleep(time.Second)

	stillRunning := GetPidsOnPort(ServicePort)
	if len(stillRunning) == 0 {
		return "服务已停止", nil
	}

	return "", fmt.Errorf("无法停止服务，仍有进程: %v", stillRunning)
}

// RestartService 重启服务
func RestartService() (string, error) {
	_, _ = StopService()
	time.Sleep(time.Second)
	return StartService()
}

// GetLogs 获取日志
func GetLogs(lines uint32) ([]string, error) {
	if lines == 0 {
		lines = 100
	}

	configDir := GetConfigDir()
	logFiles := []string{
		configDir + "/logs/gateway.log",
		configDir + "/logs/gateway.err.log",
		configDir + "/stderr.log",
		configDir + "/stdout.log",
	}

	var allLines []string
	n := int(lines)

	for _, logFile := range logFiles {
		if _, err := os.Stat(logFile); os.IsNotExist(err) {
			continue
		}

		var cmd string
		if isWindows {
			cmd = fmt.Sprintf("powershell -command \"Get-Content '%s' -Tail %d\"", logFile, n)
		} else {
			cmd = fmt.Sprintf("tail -n %d %s", n, logFile)
		}

		out, err := ExecuteCommand(cmd)
		if err != nil {
			continue
		}

		for _, line := range strings.Split(strings.TrimSpace(out), "\n") {
			trimmed := strings.TrimSpace(line)
			if trimmed != "" {
				allLines = append(allLines, trimmed)
			}
		}
	}

	// 去重并保留最后 N 行
	seen := make(map[string]bool)
	var result []string
	for _, line := range allLines {
		if !seen[line] {
			seen[line] = true
			result = append(result, line)
		}
	}

	total := len(result)
	if total > n {
		result = result[total-n:]
	}

	return result, nil
}
