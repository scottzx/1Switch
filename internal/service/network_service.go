package service

import (
	"bufio"
	"context"
	"fmt"
	"net"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"syscall"
	"time"

	"iclaw-admin-api/internal/model"
)

// NetworkService 网络服务
type NetworkService struct{}

// NewNetworkService 创建网络服务
func NewNetworkService() *NetworkService {
	return &NetworkService{}
}

// GetInterfaces 获取网络接口列表
func (s *NetworkService) GetInterfaces(ctx context.Context) ([]model.NetworkInterface, error) {
	interfaces := []model.NetworkInterface{}

	// 使用 Go 的 net 包获取接口信息
	netInterfaces, err := net.Interfaces()
	if err != nil {
		return nil, fmt.Errorf("failed to get interfaces: %w", err)
	}

	for _, iface := range netInterfaces {
		// 跳过 loopback
		if iface.Name == "lo" || strings.HasPrefix(iface.Name, "lo") {
			continue
		}

		ni := model.NetworkInterface{
			Name: iface.Name,
			MAC:  iface.HardwareAddr.String(),
		}

		// 获取 IP 地址
		addrs, err := iface.Addrs()
		if err == nil {
			for _, addr := range addrs {
				if ipNet, ok := addr.(*net.IPNet); ok && !ipNet.IP.IsLoopback() {
					if ipNet.IP.To4() != nil {
						ni.IP = ipNet.IP.String()
						break
					}
				}
			}
		}

		// 确定接口类型
		ni.Type = s.getInterfaceType(iface.Name)

		// 确定接口状态
		if iface.Flags&net.FlagUp != 0 {
			ni.State = "up"
		} else {
			ni.State = "down"
		}

		interfaces = append(interfaces, ni)
	}

	return interfaces, nil
}

// getInterfaceType 确定接口类型
func (s *NetworkService) getInterfaceType(name string) string {
	// 根据接口名称判断类型
	if strings.HasPrefix(name, "wl") || strings.HasPrefix(name, "wifi") || strings.HasPrefix(name, "wlan") {
		return "wifi"
	}
	if strings.HasPrefix(name, "eth") || strings.HasPrefix(name, "en") {
		return "ethernet"
	}
	if strings.HasPrefix(name, "docker") || strings.HasPrefix(name, "br-") {
		return "bridge"
	}
	if strings.HasPrefix(name, "wg") || strings.HasPrefix(name, "tun") {
		return "vpn"
	}
	return "unknown"
}

// ScanWifi 扫描 WiFi 网络
func (s *NetworkService) ScanWifi(ctx context.Context) ([]model.WifiNetwork, error) {
	networks := []model.WifiNetwork{}
	currentSSID := s.getCurrentWifiSSID(ctx)

	// 优先使用 airport 命令 (macOS, 通常在 /usr/local/bin/airport)
	output, err := s.runCommand(ctx, "/usr/local/bin/airport -s")
	if err == nil && strings.TrimSpace(output) != "" {
		networks = s.parseAirportWifiOutput(output)
	}

	// 如果 airport 失败，尝试使用 nmcli (Linux)
	if len(networks) == 0 {
		output, err := s.runCommand(ctx, "nmcli -t -f SSID,BSSID,SIGNAL,SECURITY,FREQ device wifi list")
		if err == nil && strings.TrimSpace(output) != "" {
			networks = s.parseNmcliWifiOutput(output)
		}
	}

	// 如果都失败，尝试使用 airport 系统路径 (旧版 macOS)
	if len(networks) == 0 {
		output, err := s.runCommand(ctx, "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -s")
		if err == nil && strings.TrimSpace(output) != "" {
			networks = s.parseAirportWifiOutput(output)
		}
	}

	// 如果都失败，尝试 iwlist (Linux)
	if len(networks) == 0 {
		output, err := s.runCommand(ctx, "sudo iwlist wlan0 scan 2>/dev/null | grep -E 'ESSID|Signal|Encryption'")
		if err == nil && strings.TrimSpace(output) != "" {
			networks = s.parseIwlistWifiOutput(output)
		}
	}

	// 如果所有扫描方法都失败，尝试使用 networksetup 获取已保存的网络 (macOS)
	if len(networks) == 0 {
		output, err := s.runCommand(ctx, "networksetup -listpreferredwirelessnetworks en0")
		if err == nil && strings.TrimSpace(output) != "" {
			networks = s.parseNetworkSetupOutput(output)
		}
	}

	// 如果仍然没有网络但有当前 SSID，添加当前连接的
	if len(networks) == 0 && currentSSID != "" {
		networks = append(networks, model.WifiNetwork{
			SSID:     currentSSID,
			BSSID:    "",
			Signal:   100,
			Security: "Unknown",
		})
	}

	return networks, nil
}

// getCurrentWifiSSID 获取当前连接的 WiFi SSID
func (s *NetworkService) getCurrentWifiSSID(ctx context.Context) string {
	// 优先使用 nmcli (Linux)
	_, err := s.runCommand(ctx, "which nmcli")
	if err == nil {
		ssid, err := s.runCommand(ctx, "nmcli -t -f active,ssid dev wifi|grep -E '^(是|yes):'")
		if err == nil && ssid != "" {
			parts := strings.SplitN(ssid, ":", 2)
			if len(parts) >= 2 {
				return strings.TrimSpace(parts[1])
			}
		}
	}

	// macOS: 使用 networksetup
	_, err = s.runCommand(ctx, "which networksetup")
	if err == nil {
		ssid, err := s.runCommand(ctx, "networksetup -getairportnetwork en0")
		if err == nil {
			ssid = strings.TrimSpace(ssid)
			if ssid != "" && !strings.Contains(ssid, "not associated") {
				return ssid
			}
		}
	}

	return ""
}

// parseNmcliWifiOutput 解析 nmcli 输出
func (s *NetworkService) parseNmcliWifiOutput(output string) []model.WifiNetwork {
	networks := []model.WifiNetwork{}
	scanner := bufio.NewScanner(strings.NewReader(output))

	for scanner.Scan() {
		line := scanner.Text()
		// BSSID contains escaped colons, unescape them first
		line = strings.ReplaceAll(line, "\\:", ":")
		fields := strings.Split(line, ":")
		if len(fields) >= 5 {
			network := model.WifiNetwork{
				SSID:     fields[0],
				BSSID:    fields[1],
				Signal:   s.parseIntOrZero(fields[2]),
				Security: fields[3],
				Frequency: s.parseFrequency(fields[4]),
			}
			if network.SSID != "" {
				networks = append(networks, network)
			}
		}
	}

	return networks
}

// parseAirportWifiOutput 解析 airport 输出 (macOS)
func (s *NetworkService) parseAirportWifiOutput(output string) []model.WifiNetwork {
	networks := []model.WifiNetwork{}
	scanner := bufio.NewScanner(strings.NewReader(output))

	// 跳过第一行 (表头)
	if scanner.Scan() {
		_ = scanner.Text()
	}

	re := regexp.MustCompile(`(.+?)\s+([0-9a-f:]+)\s+(-?\d+)\s*(.*)`)

	for scanner.Scan() {
		line := scanner.Text()
		matches := re.FindStringSubmatch(line)
		if len(matches) >= 4 {
			ssid := strings.TrimSpace(matches[1])
			if ssid == "" {
				continue
			}
			network := model.WifiNetwork{
				SSID:   ssid,
				BSSID:  strings.TrimSpace(matches[2]),
				Signal: s.parseIntOrZero(matches[3]),
			}
			security := strings.TrimSpace(matches[4])
			if strings.Contains(security, "NONE") {
				network.Security = "Open"
			} else if security != "" {
				network.Security = security
			}
			networks = append(networks, network)
		}
	}

	return networks
}

// parseNetworkSetupOutput 解析 networksetup 输出 (macOS 获取已保存网络)
func (s *NetworkService) parseNetworkSetupOutput(output string) []model.WifiNetwork {
	networks := []model.WifiNetwork{}
	scanner := bufio.NewScanner(strings.NewReader(output))
	isFirstLine := true

	for scanner.Scan() {
		line := scanner.Text()
		if isFirstLine {
			isFirstLine = false
			continue // 跳过 "Preferred networks on en0:"
		}
		ssid := strings.TrimSpace(line)
		if ssid != "" {
			networks = append(networks, model.WifiNetwork{
				SSID:     ssid,
				BSSID:    "",
				Signal:   100, // 已保存的网络假设信号强
				Security: "Unknown", // networksetup 不提供安全类型
			})
		}
	}

	return networks
}

// parseIwlistWifiOutput 解析 iwlist 输出
func (s *NetworkService) parseIwlistWifiOutput(output string) []model.WifiNetwork {
	networks := []model.WifiNetwork{}
	scanner := bufio.NewScanner(strings.NewReader(output))

	var currentSSID string
	var signal int
	var security string

	for scanner.Scan() {
		line := scanner.Text()

		if strings.Contains(line, "ESSID:") {
			parts := strings.Split(line, "ESSID:")
			if len(parts) >= 2 {
				currentSSID = strings.Trim(strings.Trim(parts[1], "\""), " ")
			}
		} else if strings.Contains(line, "Signal level") {
			re := regexp.MustCompile(`Signal level[=:](\d+)`)
			matches := re.FindStringSubmatch(line)
			if len(matches) >= 2 {
				signal = s.parseIntOrZero(matches[1])
			}
		} else if strings.Contains(line, "Encryption key:") {
			if strings.Contains(line, "off") {
				security = "Open"
			} else {
				security = "WPA/WPA2"
			}
		}

		// 当遇到新的 ESSID 时，保存上一个网络
		if currentSSID != "" && strings.Contains(line, "ESSID:") && len(networks) > 0 {
			lastNetwork := &networks[len(networks)-1]
			if lastNetwork.SSID == currentSSID {
				lastNetwork.Signal = signal
				lastNetwork.Security = security
			}
		}
	}

	return networks
}

// parseFrequency 解析频率
func (s *NetworkService) parseFrequency(freq string) int {
	// 频率格式可能是 "5180 MHz" 或 "5.180 GHz"
	freq = strings.TrimSpace(freq)
	freq = strings.ReplaceAll(freq, " MHz", "")
	freq = strings.ReplaceAll(freq, " GHz", "000")

	// 提取数字
	re := regexp.MustCompile(`(\d+)`)
	matches := re.FindStringSubmatch(freq)
	if len(matches) >= 2 {
		return s.parseIntOrZero(matches[1])
	}

	return s.parseIntOrZero(freq)
}

// parseIntOrZero 安全解析整数
func (s *NetworkService) parseIntOrZero(str string) int {
	if val, err := strconv.Atoi(strings.TrimSpace(str)); err == nil {
		return val
	}
	return 0
}

// ConnectWifi 连接 WiFi
func (s *NetworkService) ConnectWifi(ctx context.Context, req *model.WifiConnectRequest) error {
	if req.SSID == "" {
		return fmt.Errorf("SSID is required")
	}

	var cmd string
	var err error

	// 优先使用 nmcli (Linux)
	_, err = s.runCommand(ctx, "which nmcli")
	if err == nil {
		// Linux: 使用 nmcli
		if req.Password != "" {
			cmd = fmt.Sprintf("nmcli device wifi connect '%s' password '%s'", req.SSID, req.Password)
		} else {
			cmd = fmt.Sprintf("nmcli device wifi connect '%s'", req.SSID)
		}
		_, err = s.runCommandWithContext(ctx, cmd)
		return err
	}

	// macOS: 使用 networksetup
	_, err = s.runCommand(ctx, "which networksetup")
	if err == nil {
		if req.Password != "" {
			cmd = fmt.Sprintf("networksetup -setairportnetwork en0 '%s' '%s'", req.SSID, req.Password)
		} else {
			cmd = fmt.Sprintf("networksetup -setairportnetwork en0 '%s'", req.SSID)
		}
		_, err = s.runCommandWithContext(ctx, cmd)
		return err
	}

	return fmt.Errorf("neither nmcli nor networksetup is available")
}

// GetApStatus 获取 AP 热点状态
func (s *NetworkService) GetApStatus(ctx context.Context) (*model.ApStatus, error) {
	status := &model.ApStatus{}

	// 优先使用 nmcli (Linux)
	_, err := s.runCommand(ctx, "which nmcli")
	if err == nil {
		// Linux: 使用 nmcli
		// 检查是否有 AP 热点正在运行
		output, err := s.runCommand(ctx, "nmcli device|grep wifi")
		if err == nil {
			scanner := bufio.NewScanner(strings.NewReader(output))
			for scanner.Scan() {
				line := scanner.Text()
				fields := strings.Fields(line)
				if len(fields) >= 4 && fields[1] == "wifi" {
					if fields[2] == "connected" {
						status.Active = true
					}
					break
				}
			}
		}

		// 获取当前连接的 SSID
		ssid, err := s.runCommand(ctx, "nmcli -t -f active,ssid dev wifi|grep -E '^(是|yes):'")
		if err == nil && ssid != "" {
			parts := strings.SplitN(ssid, ":", 2)
			if len(parts) >= 2 {
				status.SSID = strings.TrimSpace(parts[1])
			}
		}
	} else {
		// macOS: 使用 networksetup
		ssid, err := s.runCommand(ctx, "networksetup -getairportnetwork en0")
		if err == nil {
			ssid = strings.TrimSpace(ssid)
			// networksetup 返回 "You are not associated with an AirPort network." 表示未连接
			if ssid != "" && !strings.Contains(ssid, "not associated") {
				status.Active = true
				status.SSID = ssid
			}
		}
	}

	// 获取 IP 地址
	ip, err := s.runCommand(ctx, "hostname -I")
	if err == nil {
		status.IP = strings.TrimSpace(ip)
		if strings.Contains(status.IP, " ") {
			status.IP = strings.Split(status.IP, " ")[0]
		}
	}

	return status, nil
}

// GetWifiStatus 获取 WiFi 连接状态
func (s *NetworkService) GetWifiStatus(ctx context.Context) (*model.WifiStatus, error) {
	status := &model.WifiStatus{
		Connected: false,
		Signal:    0,
	}

	// 优先使用 nmcli (Linux)
	_, err := s.runCommand(ctx, "which nmcli")
	if err == nil {
		// Linux: 使用 nmcli 获取当前连接的 WiFi
		output, err := s.runCommand(ctx, "nmcli -t -f active,ssid,signal dev wifi|grep -E '^(是|yes):'")
		if err == nil && output != "" {
			fields := strings.Split(output, ":")
			if len(fields) >= 4 {
				status.Connected = true
				status.SSID = strings.TrimSpace(fields[1])
				status.Signal = s.parseIntOrZero(fields[2])
				status.IP = strings.TrimSpace(fields[3])
			} else if len(fields) >= 2 {
				status.Connected = true
				status.SSID = strings.TrimSpace(fields[1])
				if len(fields) >= 3 {
					status.Signal = s.parseIntOrZero(fields[2])
				}
			}
		}
	} else {
		// macOS: 使用 networksetup
		ssid, err := s.runCommand(ctx, "networksetup -getairportnetwork en0")
		if err == nil {
			ssid = strings.TrimSpace(ssid)
			if ssid != "" && !strings.Contains(ssid, "not associated") {
				status.Connected = true
				status.SSID = ssid
				status.Signal = 100 // macOS doesn't provide signal strength
			}
		}

		// 获取 IP
		if status.Connected {
			ip, err := s.runCommand(ctx, "ipconfig getifaddr en0")
			if err == nil {
				status.IP = strings.TrimSpace(ip)
			}
		}
	}

	// 如果获取到 SSID 但没有 IP，尝试获取 IP
	if status.Connected && status.IP == "" {
		ip, err := s.runCommand(ctx, "hostname -I")
		if err == nil {
			ips := strings.TrimSpace(ip)
			if strings.Contains(ips, " ") {
				status.IP = strings.Split(ips, " ")[0]
			} else {
				status.IP = ips
			}
		}
	}

	return status, nil
}

// StartAp 启动 AP 热点
func (s *NetworkService) StartAp(ctx context.Context) error {
	// 使用 nmcli 创建 AP 热点
	cmd := "nmcli device wifi hotspot"
	_, err := s.runCommandWithContext(ctx, cmd)
	return err
}

// StopAp 停止 AP 热点
func (s *NetworkService) StopAp(ctx context.Context) error {
	// 断开 WiFi 连接
	cmd := "nmcli device disconnect wlan0"
	_, err := s.runCommandWithContext(ctx, cmd)
	if err != nil {
		// 尝试其他接口名
		_, err = s.runCommandWithContext(ctx, "nmcli device disconnect wifi0")
	}
	return err
}

// runCommand 执行 shell 命令
func (s *NetworkService) runCommand(ctx context.Context, cmd string) (string, error) {
	return s.runCommandWithContext(ctx, cmd)
}

// runCommandWithContext 执行带上下文的命令
func (s *NetworkService) runCommandWithContext(ctx context.Context, cmd string) (string, error) {
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
