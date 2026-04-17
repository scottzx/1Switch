package service

import (
	"bufio"
	"context"
	"fmt"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"syscall"
	"time"

	"iclaw-admin-api/internal/model"
)

// SystemService 系统服务
type SystemService struct{}

// NewSystemService 创建系统服务
func NewSystemService() *SystemService {
	return &SystemService{}
}

// GetSystemInfo 获取系统信息
func (s *SystemService) GetSystemInfo(ctx context.Context) (*model.SystemHardwareInfo, error) {
	info := &model.SystemHardwareInfo{}

	// 检测操作系统
	isMacOS := s.isMacOS(ctx)

	if isMacOS {
		s.getSystemInfoMac(ctx, info)
	} else {
		s.getSystemInfoLinux(ctx, info)
	}

	return info, nil
}

// getSystemInfoLinux 获取 Linux 系统信息
func (s *SystemService) getSystemInfoLinux(ctx context.Context, info *model.SystemHardwareInfo) {
	// 获取 hostname
	hostname, err := s.runCommand(ctx, "hostname")
	if err == nil {
		info.Hostname = strings.TrimSpace(hostname)
	}

	// 获取 kernel 版本
	kernel, err := s.runCommand(ctx, "uname -r")
	if err == nil {
		info.Kernel = strings.TrimSpace(kernel)
	}

	// 获取 OS 信息
	osInfo, err := s.runCommand(ctx, "cat /etc/os-release")
	if err == nil {
		scanner := bufio.NewScanner(strings.NewReader(osInfo))
		for scanner.Scan() {
			line := scanner.Text()
			if strings.HasPrefix(line, "PRETTY_NAME=") {
				info.OS = strings.Trim(strings.TrimPrefix(line, "PRETTY_NAME="), "\"")
				break
			}
		}
		if info.OS == "" {
			info.OS = "Linux"
		}
	}

	// 获取 CPU 信息
	cpuInfo, err := s.runCommand(ctx, "cat /proc/cpuinfo")
	if err == nil {
		scanner := bufio.NewScanner(strings.NewReader(cpuInfo))
		for scanner.Scan() {
			line := scanner.Text()
			if strings.HasPrefix(line, "model name") {
				parts := strings.SplitN(line, ":", 2)
				if len(parts) == 2 {
					info.CPUModel = strings.TrimSpace(parts[1])
				}
				break
			}
		}
	}

	// 获取 CPU 核心数
	cores, err := s.runCommand(ctx, "nproc")
	if err == nil {
		if c, err := strconv.Atoi(strings.TrimSpace(cores)); err == nil {
			info.CPUCores = c
		}
	}

	// 获取内存信息
	memInfo, err := s.runCommand(ctx, "cat /proc/meminfo")
	if err == nil {
		scanner := bufio.NewScanner(strings.NewReader(memInfo))
		for scanner.Scan() {
			line := scanner.Text()
			if strings.HasPrefix(line, "MemTotal:") {
				parts := strings.Fields(line)
				if len(parts) >= 2 {
					if total, err := strconv.ParseUint(parts[1], 10, 64); err == nil {
						info.MemoryTotal = total * 1024 // KB to bytes
					}
				}
			} else if strings.HasPrefix(line, "MemAvailable:") {
				parts := strings.Fields(line)
				if len(parts) >= 2 {
					if avail, err := strconv.ParseUint(parts[1], 10, 64); err == nil {
						info.MemoryUsed = (info.MemoryTotal - avail*1024)
					}
				}
			}
		}
	}

	// 获取 uptime
	uptime, err := s.runCommand(ctx, "cat /proc/uptime")
	if err == nil {
		parts := strings.Fields(uptime)
		if len(parts) >= 1 {
			if u, err := strconv.ParseInt(parts[0], 10, 64); err == nil {
				info.Uptime = int64(u)
			}
		}
	}
}

// getSystemInfoMac 获取 macOS 系统信息
func (s *SystemService) getSystemInfoMac(ctx context.Context, info *model.SystemHardwareInfo) {
	// 获取 hostname
	hostname, err := s.runCommand(ctx, "hostname")
	if err == nil {
		info.Hostname = strings.TrimSpace(hostname)
	}

	// 获取 kernel 版本 (uname -r 在 macOS 也可用)
	kernel, err := s.runCommand(ctx, "uname -r")
	if err == nil {
		info.Kernel = strings.TrimSpace(kernel)
	}

	// 获取 OS 信息 (macOS 版本)
	osVersion, err := s.runCommand(ctx, "sw_vers -productVersion")
	if err == nil {
		info.OS = "macOS " + strings.TrimSpace(osVersion)
	} else {
		info.OS = "macOS"
	}

	// 获取 CPU 信息
	cpuModel, err := s.runCommand(ctx, "sysctl -n machdep.cpu.brand_string")
	if err == nil {
		info.CPUModel = strings.TrimSpace(cpuModel)
	}

	// 获取 CPU 核心数
	cores, err := s.runCommand(ctx, "sysctl -n hw.ncpu")
	if err == nil {
		if c, err := strconv.Atoi(strings.TrimSpace(cores)); err == nil {
			info.CPUCores = c
		}
	}

	// 获取内存总量
	memTotal, err := s.runCommand(ctx, "sysctl -n hw.memsize")
	if err == nil {
		if total, err := strconv.ParseUint(strings.TrimSpace(memTotal), 10, 64); err == nil {
			info.MemoryTotal = total
		}
	}

	// 获取内存使用 (通过 vm_stat)
	vmOutput, err := s.runCommand(ctx, "vm_stat")
	if err == nil {
		var pagesActive, pagesWired uint64
		pageSize := uint64(4096)

		scanner := bufio.NewScanner(strings.NewReader(vmOutput))
		for scanner.Scan() {
			line := scanner.Text()
			if strings.Contains(line, "Pages active:") {
				re := regexp.MustCompile(`(\d+)`)
				if matches := re.FindStringSubmatch(line); len(matches) > 1 {
					pagesActive, _ = strconv.ParseUint(matches[1], 10, 64)
				}
			} else if strings.Contains(line, "Pages wired down:") {
				re := regexp.MustCompile(`(\d+)`)
				if matches := re.FindStringSubmatch(line); len(matches) > 1 {
					pagesWired, _ = strconv.ParseUint(matches[1], 10, 64)
				}
			}
		}

		info.MemoryUsed = (pagesActive + pagesWired) * pageSize
	}

	// 获取 uptime (通过 kern.boottime)
	boottime, err := s.runCommand(ctx, "sysctl -n kern.boottime")
	if err == nil {
		// 格式: { sec = 1234567890, usec = 123456 } ...
		re := regexp.MustCompile(`sec\s*=\s*(\d+)`)
		if matches := re.FindStringSubmatch(boottime); len(matches) > 1 {
			if bootSec, err := strconv.ParseInt(matches[1], 10, 64); err == nil {
				info.Uptime = time.Now().Unix() - bootSec
			}
		}
	}
}

// GetSystemStatus 获取系统状态
func (s *SystemService) GetSystemStatus(ctx context.Context) (*model.SystemMonitorStatus, error) {
	status := &model.SystemMonitorStatus{
		Services: []model.ServiceMonitorStatus{},
	}

	// 定义需要检查的服务
	services := []string{"openclaw", "NetworkManager", "docker"}

	for _, name := range services {
		serviceStatus := model.ServiceMonitorStatus{Name: name}

		// 检查服务是否 active
		active, err := s.runCommand(ctx, fmt.Sprintf("systemctl is-active %s", name))
		serviceStatus.Active = err == nil && strings.TrimSpace(active) == "active"

		// 检查服务是否 running
		running, err := s.runCommand(ctx, fmt.Sprintf("systemctl is-running %s", name))
		serviceStatus.Running = err == nil && strings.TrimSpace(running) == "running"

		// 获取 PID
		pid, err := s.runCommand(ctx, fmt.Sprintf("systemctl show -p MainPID %s", name))
		if err == nil {
			pidStr := strings.TrimSpace(strings.TrimPrefix(pid, "MainPID="))
			if p, err := strconv.Atoi(pidStr); err == nil && p > 0 {
				serviceStatus.PID = p
			}
		}

		status.Services = append(status.Services, serviceStatus)
	}

	return status, nil
}

// GetSystemUsage 获取系统资源使用情况
func (s *SystemService) GetSystemUsage(ctx context.Context) (*model.SystemResourceUsage, error) {
	usage := &model.SystemResourceUsage{}

	// 检测操作系统
	isMacOS := s.isMacOS(ctx)

	if isMacOS {
		s.getSystemUsageMac(ctx, usage)
	} else {
		s.getSystemUsageLinux(ctx, usage)
	}

	return usage, nil
}

// getSystemUsageLinux 获取 Linux 系统资源使用情况
func (s *SystemService) getSystemUsageLinux(ctx context.Context, usage *model.SystemResourceUsage) {
	// 获取 CPU 使用率 (通过 top -bn1)
	cpuOutput, err := s.runCommand(ctx, "top -bn1")
	if err == nil {
		scanner := bufio.NewScanner(strings.NewReader(cpuOutput))
		for scanner.Scan() {
			line := scanner.Text()
			if strings.HasPrefix(line, "%Cpu(s):") || strings.HasPrefix(line, "Cpu(s):") {
				fields := strings.Fields(line)
				for i, field := range fields {
					if strings.Contains(field, "id") || strings.Contains(field, "idle") {
						if i > 0 {
							if idle, err := strconv.ParseFloat(fields[i-1], 64); err == nil {
								usage.CPUPercent = 100.0 - idle
							}
						}
						break
					}
				}
				break
			}
		}
	}

	// 获取内存使用情况
	memOutput, err := s.runCommand(ctx, "cat /proc/meminfo")
	if err == nil {
		scanner := bufio.NewScanner(strings.NewReader(memOutput))
		var memTotal, memFree, memAvail uint64
		for scanner.Scan() {
			line := scanner.Text()
			fields := strings.Fields(line)
			if len(fields) >= 2 {
				val, err := strconv.ParseUint(fields[1], 10, 64)
				if err != nil {
					continue
				}
				val *= 1024 // KB to bytes

				switch {
				case strings.HasPrefix(line, "MemTotal:"):
					memTotal = val
				case strings.HasPrefix(line, "MemFree:"):
					memFree = val
				case strings.HasPrefix(line, "MemAvailable:"):
					memAvail = val
				}
			}
		}

		usage.MemoryTotal = memTotal
		if memAvail > 0 {
			usage.MemoryUsed = memTotal - memAvail
		} else {
			usage.MemoryUsed = memTotal - memFree
		}

		if memTotal > 0 {
			usage.MemoryPercent = float64(usage.MemoryUsed) / float64(memTotal) * 100.0
		}
	}

	// 获取磁盘使用情况
	diskOutput, err := s.runCommand(ctx, "df -B1 /")
	if err == nil {
		scanner := bufio.NewScanner(strings.NewReader(diskOutput))
		for scanner.Scan() {
			line := scanner.Text()
			fields := strings.Fields(line)
			if len(fields) >= 5 && !strings.HasPrefix(fields[0], "Filesystem") {
				if total, err := strconv.ParseUint(fields[1], 10, 64); err == nil {
					usage.DiskTotal = total
				}
				if used, err := strconv.ParseUint(fields[2], 10, 64); err == nil {
					usage.DiskUsed = used
				}
				if percentStr := strings.TrimSuffix(fields[4], "%"); len(fields) >= 5 {
					if percent, err := strconv.ParseFloat(percentStr, 64); err == nil {
						usage.DiskPercent = percent
					}
				}
				break
			}
		}
	}
}

// getSystemUsageMac 获取 macOS 系统资源使用情况
func (s *SystemService) getSystemUsageMac(ctx context.Context, usage *model.SystemResourceUsage) {
	// 获取 CPU 使用率 (通过 top)
	cpuOutput, err := s.runCommand(ctx, "top -l 1 -n 1")
	if err == nil {
		scanner := bufio.NewScanner(strings.NewReader(cpuOutput))
		for scanner.Scan() {
			line := scanner.Text()
			// macOS CPU 行格式: "CPU usage: 4.34% user, 2.56% sys, 92.9% idle"
			if strings.Contains(line, "CPU usage:") {
				re := regexp.MustCompile(`([\d.]+)% user`)
				if matches := re.FindStringSubmatch(line); len(matches) > 1 {
					if userCPU, err := strconv.ParseFloat(matches[1], 64); err == nil {
						// 简单估算总 CPU 使用率 (user + sys)
						re2 := regexp.MustCompile(`([\d.]+)% sys`)
						if sysMatches := re2.FindStringSubmatch(line); len(sysMatches) > 1 {
							if sysCPU, err := strconv.ParseFloat(sysMatches[1], 64); err == nil {
								usage.CPUPercent = userCPU + sysCPU
							}
						} else {
							usage.CPUPercent = userCPU
						}
					}
				}
				break
			}
		}
	}

	// 获取内存信息 (通过 sysctl 和 vm_stat)
	memTotalOutput, err := s.runCommand(ctx, "sysctl -n hw.memsize")
	if err == nil {
		if total, err := strconv.ParseUint(strings.TrimSpace(memTotalOutput), 10, 64); err == nil {
			usage.MemoryTotal = total
		}
	}

	// 获取内存使用 (通过 vm_stat)
	vmOutput, err := s.runCommand(ctx, "vm_stat")
	if err == nil {
		var pagesActive, pagesWired uint64
		pageSize := uint64(4096) // macOS 默认页大小

		scanner := bufio.NewScanner(strings.NewReader(vmOutput))
		for scanner.Scan() {
			line := scanner.Text()
			if strings.Contains(line, "Pages active:") {
				re := regexp.MustCompile(`(\d+)`)
				if matches := re.FindStringSubmatch(line); len(matches) > 1 {
					pagesActive, _ = strconv.ParseUint(matches[1], 10, 64)
				}
			} else if strings.Contains(line, "Pages wired down:") {
				re := regexp.MustCompile(`(\d+)`)
				if matches := re.FindStringSubmatch(line); len(matches) > 1 {
					pagesWired, _ = strconv.ParseUint(matches[1], 10, 64)
				}
			}
		}

		usage.MemoryUsed = (pagesActive + pagesWired) * pageSize
		if usage.MemoryTotal > 0 {
			usage.MemoryPercent = float64(usage.MemoryUsed) / float64(usage.MemoryTotal) * 100.0
		}
	}

	// 获取磁盘使用情况 (通过 df)
	diskOutput, err := s.runCommand(ctx, "df -k /")
	if err == nil {
		scanner := bufio.NewScanner(strings.NewReader(diskOutput))
		for scanner.Scan() {
			line := scanner.Text()
			fields := strings.Fields(line)
			// df -k 输出: Filesystem 1024-blocks Used Available Capacity Mounted
			if len(fields) >= 5 && !strings.HasPrefix(fields[0], "Filesystem") {
				if total, err := strconv.ParseUint(fields[1], 10, 64); err == nil {
					usage.DiskTotal = total * 1024
				}
				if used, err := strconv.ParseUint(fields[2], 10, 64); err == nil {
					usage.DiskUsed = used * 1024
				}
				if percentStr := strings.TrimSuffix(fields[4], "%"); len(fields) >= 5 {
					if percent, err := strconv.ParseFloat(percentStr, 64); err == nil {
						usage.DiskPercent = percent
					}
				}
				break
			}
		}
	}
}

// isMacOS 检测是否为 macOS
func (s *SystemService) isMacOS(ctx context.Context) bool {
	output, err := s.runCommand(ctx, "uname -s")
	if err == nil {
		return strings.TrimSpace(output) == "Darwin"
	}
	// 备用检测
	output, err = s.runCommand(ctx, "sw_vers")
	return err == nil
}

// isLinux 检测是否为 Linux
func (s *SystemService) isLinux(ctx context.Context) bool {
	output, err := s.runCommand(ctx, "uname -s")
	if err == nil {
		return strings.TrimSpace(output) == "Linux"
	}
	// 备用检测：检查是否存在 /etc/os-release
	_, err = s.runCommand(ctx, "cat /etc/os-release")
	return err == nil
}

// RestartOpenClaw 重启 OpenClaw 服务
func (s *SystemService) RestartOpenClaw(ctx context.Context) error {
	_, err := s.runCommandWithContext(ctx, "systemctl restart openclaw")
	return err
}

// DeployTtydService 部署 iClaw TTYD+tmux 服务
func (s *SystemService) DeployTtydService(ctx context.Context) error {
	// ttyd service 文件内容
	serviceContent := `[Unit]
Description=iClaw Terminal
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/ttyd -p 7681 -W tmux new -A -s web-ttyd
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
`
	// 先通过 systemd 停止旧服务，再杀孤儿进程
	if _, err := s.runCommandWithContext(ctx, "systemctl stop iclaw-ttyd 2>/dev/null; pkill -f ttyd || true"); err != nil {
		return fmt.Errorf("停止旧ttyd进程失败: %w", err)
	}

	// 写入 service 文件
	if _, err := s.runCommandWithContext(ctx, "mkdir -p /etc/systemd/system"); err != nil {
		return fmt.Errorf("创建systemd目录失败: %w", err)
	}

	// 使用 tee 写入文件（需要 root 权限，admin-api 通常以 root 运行）
	if _, err := s.runCommandWithContext(ctx, "cat > /etc/systemd/system/iclaw-ttyd.service << 'EOF'\n"+serviceContent+"EOF"); err != nil {
		return fmt.Errorf("写入service文件失败: %w", err)
	}

	// 设置权限
	if _, err := s.runCommandWithContext(ctx, "chmod 644 /etc/systemd/system/iclaw-ttyd.service"); err != nil {
		return fmt.Errorf("设置权限失败: %w", err)
	}

	// reload systemd、设置自启动、启动服务
	if _, err := s.runCommandWithContext(ctx, "systemctl daemon-reload && systemctl enable iclaw-ttyd && systemctl restart iclaw-ttyd"); err != nil {
		return fmt.Errorf("启动ttyd服务失败: %w", err)
	}

	return nil
}

// GetDeviceInfo 获取设备基本信息（hostname、序列号、IP）
func (s *SystemService) GetDeviceInfo(ctx context.Context) (*model.DeviceInfo, error) {
	info := &model.DeviceInfo{}

	// 获取 hostname
	hostname, err := s.runCommand(ctx, "hostname")
	if err == nil {
		info.Hostname = strings.TrimSpace(hostname)
	}

	// 获取序列号
	serial := s.getSerial(ctx)
	info.Serial = serial

	// 获取 IP 地址
	ip, err := s.runCommand(ctx, "hostname -I 2>/dev/null | awk '{print $1}'")
	if err == nil {
		info.IP = strings.TrimSpace(ip)
	}

	return info, nil
}

// UpdateDeviceInfo 更新设备信息
func (s *SystemService) UpdateDeviceInfo(ctx context.Context, hostname, serial, ip string) error {
	// 更新 hostname
	if hostname != "" {
		if _, err := s.runCommandWithContext(ctx, "hostname "+hostname); err != nil {
			return fmt.Errorf("更新hostname失败: %w", err)
		}
	}

	// 保存 serial 到文件
	if serial != "" {
		if _, err := s.runCommandWithContext(ctx, "mkdir -p /var/lib/iclaw && echo '"+serial+"' > /var/lib/iclaw/serial"); err != nil {
			return fmt.Errorf("保存序列号失败: %w", err)
		}
	}

	return nil
}

// getSerial 获取设备序列号
func (s *SystemService) getSerial(ctx context.Context) string {
	// 优先读取静态文件
	serial, err := s.runCommand(ctx, "cat /var/lib/iclaw/serial 2>/dev/null | tr -d '[:space:]'")
	if err == nil && strings.TrimSpace(serial) != "" {
		return strings.TrimSpace(serial)
	}

	// 尝试读取 DMI 信息
	for _, path := range []string{
		"/sys/class/dmi/id/product_uuid",
		"/sys/firmware/devicetree/base/serial-number",
		"/etc/serial-number",
	} {
		serial, err := s.runCommand(ctx, "cat "+path+" 2>/dev/null | tr -d '[:space:]'")
		if err == nil && strings.TrimSpace(serial) != "" {
			return strings.TrimSpace(serial)
		}
	}

	return ""
}

// runCommand 执行 shell 命令
func (s *SystemService) runCommand(ctx context.Context, cmd string) (string, error) {
	return s.runCommandWithContext(ctx, cmd)
}

// runCommandWithContext 执行带上下文的命令
func (s *SystemService) runCommandWithContext(ctx context.Context, cmd string) (string, error) {
	parts := []string{"-c", cmd}
	execCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	cmdExec := exec.CommandContext(execCtx, "/bin/sh", parts...)
	cmdExec.SysProcAttr = &syscall.SysProcAttr{
		Setpgid: true,
	}

	output, err := cmdExec.CombinedOutput()
	if err != nil {
		if execCtx.Err() == context.DeadlineExceeded {
			return "", fmt.Errorf("command timeout: %s", cmd)
		}
		return "", err
	}

	return string(output), nil
}
