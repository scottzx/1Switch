package handler

import (
	"net/http"
	"runtime"
	"strings"

	"github.com/gin-gonic/gin"
	"iclaw-admin-api/internal/model"
	"iclaw-admin-api/internal/service"
)

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

// InstallNodeJS 安装 Node.js (placeholder)
func InstallNodeJS(c *gin.Context) {
	result := model.InstallResult{
		Success: false,
		Message: "Node.js installation not implemented in Go version",
	}
	c.JSON(http.StatusOK, result)
}

// InstallOpenClaw 安装 OpenClaw (placeholder)
func InstallOpenClaw(c *gin.Context) {
	result := model.InstallResult{
		Success: false,
		Message: "OpenClaw installation not implemented in Go version",
	}
	c.JSON(http.StatusOK, result)
}

// InitOpenClawConfig 初始化配置 (placeholder)
func InitOpenClawConfig(c *gin.Context) {
	result := model.InstallResult{
		Success: false,
		Message: "Config initialization not implemented in Go version",
	}
	c.JSON(http.StatusOK, result)
}

// OpenInstallTerminal 打开安装终端 (placeholder)
func OpenInstallTerminal(c *gin.Context) {
	installType := c.Param("type")
	c.JSON(http.StatusOK, gin.H{"message": "Install terminal opened for " + installType + " (placeholder)"})
}

// UninstallOpenClaw 卸载 OpenClaw (placeholder)
func UninstallOpenClaw(c *gin.Context) {
	result := model.InstallResult{
		Success: false,
		Message: "Uninstall not implemented in Go version",
	}
	c.JSON(http.StatusOK, result)
}

// CheckOpenClawUpdate 检查更新 (placeholder)
func CheckOpenClawUpdate(c *gin.Context) {
	info := model.UpdateInfo{
		UpdateAvailable: false,
	}
	c.JSON(http.StatusOK, info)
}

// UpdateOpenClaw 更新 OpenClaw (placeholder)
func UpdateOpenClaw(c *gin.Context) {
	result := model.InstallResult{
		Success: false,
		Message: "Update not implemented in Go version",
	}
	c.JSON(http.StatusOK, result)
}
