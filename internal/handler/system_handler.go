package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"iclaw-admin-api/internal/model"
	"iclaw-admin-api/internal/service"
)

// SystemHandler 系统处理器
type SystemHandler struct {
	svc *service.SystemService
}

// NewSystemHandler 创建系统处理器
func NewSystemHandler(svc *service.SystemService) *SystemHandler {
	return &SystemHandler{svc: svc}
}

// GetSystemInfo 获取系统信息
// @Summary 获取系统信息
// @Tags System
// @Produce json
// @Success 200 {object} model.SystemHardwareInfo
// @Router /api/system/info [get]
func (h *SystemHandler) GetSystemInfo(c *gin.Context) {
	info, err := h.svc.GetSystemInfo(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, info)
}

// GetSystemStatus 获取系统状态
// @Summary 获取系统状态
// @Tags System
// @Produce json
// @Success 200 {object} model.SystemMonitorStatus
// @Router /api/system/status [get]
func (h *SystemHandler) GetSystemStatus(c *gin.Context) {
	status, err := h.svc.GetSystemStatus(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, status)
}

// GetSystemUsage 获取系统资源使用
// @Summary 获取系统资源使用
// @Tags System
// @Produce json
// @Success 200 {object} model.SystemResourceUsage
// @Router /api/system/usage [get]
func (h *SystemHandler) GetSystemUsage(c *gin.Context) {
	usage, err := h.svc.GetSystemUsage(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, usage)
}

// RestartOpenClaw 重启 OpenClaw
// @Summary 重启 OpenClaw
// @Tags System
// @Produce json
// @Success 200 {string} string
// @Router /api/system/openclaw/restart [post]
func (h *SystemHandler) RestartOpenClaw(c *gin.Context) {
	err := h.svc.RestartOpenClaw(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "OpenClaw restarted"})
}

// GetDeviceInfo 获取设备基本信息
// @Summary 获取设备基本信息
// @Tags System
// @Produce json
// @Success 200 {object} model.DeviceInfo
// @Router /api/deviceinfo [get]
func (h *SystemHandler) GetDeviceInfo(c *gin.Context) {
	info, err := h.svc.GetDeviceInfo(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, info)
}

// UpdateDeviceInfo 更新设备信息
// @Summary 更新设备信息
// @Tags System
// @Accept json
// @Produce json
// @Param request body model.DeviceInfoRequest true "设备信息"
// @Success 200 {object} map[string]string
// @Router /api/deviceinfo [post]
func (h *SystemHandler) UpdateDeviceInfo(c *gin.Context) {
	var req model.DeviceInfoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.svc.UpdateDeviceInfo(c.Request.Context(), req.Hostname, req.Serial, req.IP)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "设备信息更新成功"})
}

// DeployTtyd 部署 ttyd+tmux 服务
// @Summary 部署 ttyd+tmux 服务
// @Tags System
// @Produce json
// @Success 200 {object} map[string]string
// @Router /api/system/ttyd/deploy [post]
func (h *SystemHandler) DeployTtyd(c *gin.Context) {
	err := h.svc.DeployTtydService(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "ttyd service deployed"})
}
