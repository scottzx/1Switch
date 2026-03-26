//go:build windows
// +build windows

package service

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"syscall"
)

const ServicePort = 18789

var (
	isWindows = runtime.GOOS == "windows"
)

// GetOpenClawPath 获取 openclaw 命令路径
func GetOpenClawPath() (string, error) {
	paths := []string{
		"openclaw",
		"openclaw.cmd",
		"openclaw.ps1",
	}

	for _, path := range paths {
		cmd := exec.Command(path, "--version")
		cmd.SysProcAttr = &syscall.SysProcAttr{CreationFlags: 0x08000000}
		if err := cmd.Run(); err == nil {
			return path, nil
		}
	}

	return "", fmt.Errorf("openclaw command not found")
}

// IsOpenClawInstalled 检查 openclaw 是否已安装
func IsOpenClawInstalled() bool {
	_, err := GetOpenClawPath()
	return err == nil
}

// GetOpenClawVersion 获取 openclaw 版本
func GetOpenClawVersion() (string, error) {
	path, err := GetOpenClawPath()
	if err != nil {
		return "", err
	}

	cmd := exec.Command(path, "--version")
	cmd.SysProcAttr = &syscall.SysProcAttr{CreationFlags: 0x08000000}
	var out bytes.Buffer
	cmd.Stdout = &out
	if err := cmd.Run(); err != nil {
		return "", err
	}

	return strings.TrimSpace(out.String()), nil
}

// GetNodeVersion 获取 Node.js 版本
func GetNodeVersion() (string, error) {
	cmd := exec.Command("node", "--version")
	cmd.SysProcAttr = &syscall.SysProcAttr{CreationFlags: 0x08000000}
	var out bytes.Buffer
	cmd.Stdout = &out
	if err := cmd.Run(); err != nil {
		return "", err
	}

	return strings.TrimSpace(out.String()), nil
}

// CheckPortInUse 检查端口是否被占用
func CheckPortInUse(port uint16) bool {
	cmd := exec.Command("netstat", "-ano")
	cmd.SysProcAttr = &syscall.SysProcAttr{CreationFlags: 0x08000000}
	out, err := cmd.Output()
	if err != nil {
		return false
	}
	lines := strings.Split(string(out), "\n")
	for _, line := range lines {
		if strings.Contains(line, fmt.Sprintf(":%d", port)) && strings.Contains(line, "LISTENING") {
			return true
		}
	}
	return false
}

// GetPidsOnPort 获取监听指定端口的所有 PID
func GetPidsOnPort(port uint16) []uint32 {
	cmd := exec.Command("netstat", "-ano")
	cmd.SysProcAttr = &syscall.SysProcAttr{CreationFlags: 0x08000000}
	out, err := cmd.Output()
	if err != nil {
		return nil
	}
	var pids []uint32
	lines := strings.Split(string(out), "\n")
	for _, line := range lines {
		if strings.Contains(line, fmt.Sprintf(":%d", port)) && strings.Contains(line, "LISTENING") {
			parts := strings.Fields(line)
			if len(parts) > 0 {
				pidStr := parts[len(parts)-1]
				var pid uint32
				if _, err := fmt.Sscanf(pidStr, "%d", &pid); err == nil && pid > 0 {
					pids = append(pids, pid)
				}
			}
		}
	}
	return pids
}

// KillProcess 杀死进程
func KillProcess(pid uint32, force bool) bool {
	var cmd *exec.Cmd
	if force {
		cmd = exec.Command("taskkill", "/F", "/PID", fmt.Sprintf("%d", pid))
	} else {
		cmd = exec.Command("taskkill", "/PID", fmt.Sprintf("%d", pid))
	}
	cmd.SysProcAttr = &syscall.SysProcAttr{CreationFlags: 0x08000000}
	return cmd.Run() == nil
}

// GetConfigDir 获取配置目录
func GetConfigDir() string {
	return os.Getenv("USERPROFILE") + "\\.openclaw"
}

// ExecuteCommand 执行 shell 命令
func ExecuteCommand(name string, args ...string) (string, error) {
	cmd := exec.Command("cmd", append([]string{"/c", name}, args...)...)
	cmd.SysProcAttr = &syscall.SysProcAttr{CreationFlags: 0x08000000}

	var out bytes.Buffer
	var errBuf bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &errBuf

	err := cmd.Run()
	if err != nil {
		if errBuf.Len() > 0 {
			return "", fmt.Errorf("%s: %s", err.Error(), errBuf.String())
		}
		return "", err
	}

	return out.String(), nil
}
