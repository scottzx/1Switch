package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	"iclaw-admin-api/internal/model"
	"iclaw-admin-api/internal/service"
)

// npm 镜像配置
var (
	npmMirrorRegistry = "https://registry.npmmirror.com"
	npmMirrorInit     sync.Once
	useNpmMirror      = false
)

// isLinux 检测是否为 Linux 系统
func isLinux() bool {
	return runtime.GOOS == "linux" || (strings.Contains(runtime.GOOS, "linux") && len(runtime.GOOS) == 5)
}

// setupLinuxMirrors 配置 Linux 国内镜像源
func setupLinuxMirrors() {
	if !isLinux() {
		return
	}

	// 设置 npm 镜像（只执行一次）
	npmMirrorInit.Do(func() {
		// 检查是否已配置镜像
		cmd := exec.Command("bash", "-c", "npm config get registry")
		var out bytes.Buffer
		cmd.Stdout = &out
		if err := cmd.Run(); err == nil {
			registry := strings.TrimSpace(out.String())
			// 如果已经是 npmmirror 镜像，跳过
			if strings.Contains(registry, "npmmirror") || strings.Contains(registry, "taobao") {
				useNpmMirror = true
				return
			}
		}

		// 切换到 npmmirror 镜像
		setCmd := exec.Command("npm", "config", "set", "registry", npmMirrorRegistry)
		if err := setCmd.Run(); err == nil {
			useNpmMirror = true
		}
	})
}

// switchAptToChineseMirror 切换 apt 源到国内镜像
func switchAptToChineseMirror() error {
	if !isLinux() {
		return nil
	}

	// 检查是否已经是阿里云源
	checkCmd := exec.Command("bash", "-c", "grep -q 'mirrors.aliyun.com' /etc/apt/sources.list 2>/dev/null && echo 'already' || echo 'not_found'")
	var out bytes.Buffer
	checkCmd.Stdout = &out
	if err := checkCmd.Run(); err == nil {
		if strings.TrimSpace(out.String()) == "already" {
			return nil // 已经是阿里云源
		}
	}

	// 备份当前 sources.list
	backupCmd := exec.Command("bash", "-c", "cp /etc/apt/sources.list /etc/apt/sources.list.bak 2>/dev/null || true")
	backupCmd.Run()

	// 切换到阿里云镜像
	switchMirror := `cat > /etc/apt/sources.list << 'EOF'
# 阿里云 Ubuntu 22.04 镜像源
deb http://mirrors.aliyun.com/ubuntu-ports/ jammy main restricted universe multiverse
deb http://mirrors.aliyun.com/ubuntu-ports/ jammy-updates main restricted universe multiverse
deb http://mirrors.aliyun.com/ubuntu-ports/ jammy-backports main restricted universe multiverse
deb http://mirrors.aliyun.com/ubuntu-ports/ jammy-security main restricted universe multiverse
EOF`
	cmd := exec.Command("bash", "-c", switchMirror)
	return cmd.Run()
}

// CheckEnvironment 检查环境
func CheckEnvironment(c *gin.Context) {
	nodeVersion, nodeErr := service.GetNodeVersion()

	status := model.EnvironmentStatus{
		NodeInstalled:      nodeErr == nil,
		OpenClawInstalled:  service.IsOpenClawInstalled(),
		ConfigDir:          service.GetConfigDir(),
		ConfigDirExists:    true,
		Os:                 runtime.GOOS,
		Ready:              nodeErr == nil && service.IsOpenClawInstalled(),
	}

	if nodeErr == nil {
		status.NodeVersion = &nodeVersion
		status.NodeVersionOk = strings.HasPrefix(nodeVersion, "v22")
	}
	if version, err := service.GetOpenClawVersion(); err == nil {
		status.OpenClawVersion = &version
	}

	c.JSON(http.StatusOK, status)
}

// InstallNodeJS 安装 Node.js
func InstallNodeJS(c *gin.Context) {
	// Check if node is already installed
	if _, err := exec.LookPath("node"); err == nil {
		c.JSON(http.StatusOK, model.InstallResult{
			Success: true,
			Message: "Node.js is already installed",
		})
		return
	}

	// Linux 系统配置国内镜像
	if isLinux() {
		setupLinuxMirrors()
	}

	// Install Node.js via npm install -g openclaw (includes Node.js)
	cmd := exec.Command("npm", "install", "-g", "openclaw")
	output, err := cmd.CombinedOutput()
	if err != nil {
		c.JSON(http.StatusOK, model.InstallResult{
			Success: false,
			Message: "Failed to install Node.js: " + string(output),
		})
		return
	}
	c.JSON(http.StatusOK, model.InstallResult{
		Success: true,
		Message: "Node.js installed successfully via npm",
	})
}

// InstallOpenClaw 安装 OpenClaw
func InstallOpenClaw(c *gin.Context) {
	// Check if openclaw is already installed
	if service.IsOpenClawInstalled() {
		c.JSON(http.StatusOK, model.InstallResult{
			Success: true,
			Message: "OpenClaw is already installed",
		})
		return
	}

	// Linux 系统配置国内镜像
	if isLinux() {
		setupLinuxMirrors()
	}

	cmd := exec.Command("npm", "install", "-g", "openclaw")
	output, err := cmd.CombinedOutput()
	if err != nil {
		c.JSON(http.StatusOK, model.InstallResult{
			Success: false,
			Message: "Failed to install OpenClaw: " + string(output),
		})
		return
	}
	c.JSON(http.StatusOK, model.InstallResult{
		Success: true,
		Message: "OpenClaw installed successfully",
	})
}

// InitOpenClawConfig 初始化配置
func InitOpenClawConfig(c *gin.Context) {
	cmd := exec.Command("openclaw", "setup")
	output, err := cmd.CombinedOutput()
	if err != nil {
		c.JSON(http.StatusOK, model.InstallResult{
			Success: false,
			Message: "Failed to setup: " + string(output),
		})
		return
	}
	c.JSON(http.StatusOK, model.InstallResult{
		Success: true,
		Message: "OpenClaw configured successfully",
	})
}

// OpenInstallTerminal 打开安装终端
func OpenInstallTerminal(c *gin.Context) {
	message := "Please open your terminal and run: curl -fsSL https://openclaw.io/install.sh | sh"
	if isLinux() {
		message = "Linux 系统建议先切换到国内镜像源:\n" +
			"  npm config set registry https://registry.npmmirror.com\n" +
			"然后安装:\n" +
			"  curl -fsSL https://openclaw.io/install.sh | sh"
	}
	c.JSON(http.StatusOK, gin.H{
		"message": message,
	})
}

// UninstallOpenClaw 卸载 OpenClaw
func UninstallOpenClaw(c *gin.Context) {
	// Try openclaw uninstall first
	cmd := exec.Command("openclaw", "uninstall")
	output, err := cmd.CombinedOutput()
	if err != nil {
		// Fallback to npm uninstall
		cmd = exec.Command("npm", "uninstall", "-g", "openclaw")
		output, err = cmd.CombinedOutput()
	}
	if err != nil {
		c.JSON(http.StatusOK, model.InstallResult{
			Success: false,
			Message: "Failed to uninstall: " + string(output),
		})
		return
	}
	c.JSON(http.StatusOK, model.InstallResult{
		Success: true,
		Message: "OpenClaw uninstalled successfully",
	})
}

// CheckOpenClawUpdate 检查更新
func CheckOpenClawUpdate(c *gin.Context) {
	cmd := exec.Command("openclaw", "update", "--check")
	output, err := cmd.CombinedOutput()
	if err != nil {
		c.JSON(http.StatusOK, model.UpdateInfo{
			UpdateAvailable: false,
		})
		return
	}

	// Parse output to determine if update is available
	outputStr := strings.TrimSpace(string(output))
	updateAvailable := strings.Contains(outputStr, "update") ||
		strings.Contains(outputStr, "new version") ||
		strings.Contains(outputStr, "available")

	info := model.UpdateInfo{
		UpdateAvailable: updateAvailable,
	}
	if updateAvailable {
		info.LatestVersion = &outputStr
	}
	c.JSON(http.StatusOK, info)
}

// UpdateOpenClaw 更新 OpenClaw
func UpdateOpenClaw(c *gin.Context) {
	cmd := exec.Command("openclaw", "update")
	output, err := cmd.CombinedOutput()
	if err != nil {
		c.JSON(http.StatusOK, model.InstallResult{
			Success: false,
			Message: "Failed to update: " + string(output),
		})
		return
	}
	c.JSON(http.StatusOK, model.InstallResult{
		Success: true,
		Message: strings.TrimSpace(string(output)),
	})
}

// CheckOtaUpdate 检查 OTA 更新
func CheckOtaUpdate(c *gin.Context) {
	otaHost := os.Getenv("OTA_HOST")
	if otaHost == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"error":   "OTA_HOST not configured",
		})
		return
	}

	otaUrl := strings.TrimRight(otaHost, "/") + "/api/ota/version/latest"

	resp, err := http.Get(otaUrl)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Failed to connect to OTA server: %v", err),
		})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"error":   "Failed to read OTA response",
		})
		return
	}

	// 转发响应
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		c.Data(resp.StatusCode, resp.Header.Get("Content-Type"), body)
		return
	}

	c.JSON(http.StatusOK, result)
}

// DownloadOtaUpdate 下载 OTA 更新包
func DownloadOtaUpdate(c *gin.Context) {
	downloadType := c.Param("type")
	if downloadType != "web" && downloadType != "api" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid type, must be 'web' or 'api'"})
		return
	}

	otaHost := os.Getenv("OTA_HOST")
	if otaHost == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"error":   "OTA_HOST not configured",
		})
		return
	}

	otaUrl := strings.TrimRight(otaHost, "/") + "/api/ota/download/" + downloadType

	resp, err := http.Get(otaUrl)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Failed to download: %v", err),
		})
		return
	}
	defer resp.Body.Close()

	// 转发文件
	c.DataFromReader(resp.StatusCode, resp.ContentLength, resp.Header.Get("Content-Type"), resp.Body, nil)
}
